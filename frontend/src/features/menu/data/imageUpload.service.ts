/**
 * Menu Item Image Upload & Client Optimization Service
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 *
 * Implements:
 * - Client-side image resizing and compression (max 600px, WebP at 75% quality)
 * - Multi-step smooth downscaling for phone camera photos (up to 8MB)
 * - MIME and size validation (8MB max)
 * - Deferred Supabase Storage upload (menu-images bucket)
 * - Atomic database metadata recording and orphan storage cleanup
 */

import { supabase } from '../../shared/infrastructure/supabase';

export interface PreparedMenuImage {
  blob: Blob;
  previewUri: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  originalSizeBytes: number;
  compressionRatioPercent: number; // e.g. 98.5%
  width: number;
  height: number;
  extension: string;
}

export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  storagePath?: string;
  oldStoragePath?: string | null;
  error?: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB raw input limit
const MAX_DIMENSION = 600; // max width or height for POS tablets (600x600 px)
const WEBP_QUALITY = 0.75; // sweet spot: imperceptible loss, ~25-45KB per image

/**
 * Validate a user-selected file before staging.
 */
export function validateMenuImageFile(file: File | Blob): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check MIME type
  const type = file.type?.toLowerCase() || '';
  if (!ALLOWED_MIME_TYPES.includes(type)) {
    return {
      valid: false,
      error: `Unsupported image format (${type || 'unknown'}). Please choose a JPG, PNG, or WebP image.`,
    };
  }

  // Check file size (8MB max)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMb} MB). Maximum allowed input size is 8.0 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Resize and compress an image client-side to keep POS tablet memory usage low
 * and avoid storage/bandwidth bloat.
 * Uses high-quality multi-step downscaling for phone camera photos.
 */
export async function prepareMenuImageForUpload(
  file: File | Blob,
  fallbackName: string = 'product-image'
): Promise<PreparedMenuImage> {
  const originalFilename = (file as File).name || `${fallbackName}.jpg`;
  const originalSizeBytes = file.size;

  // In standard browser / React Native Web DOM environments:
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return new Promise((resolve, reject) => {
      const img = new (window as any).Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          let { naturalWidth: width, naturalHeight: height } = img;
          if (!width || !height) {
            width = img.width || MAX_DIMENSION;
            height = img.height || MAX_DIMENSION;
          }

          // Compute target dimensions preserving aspect ratio
          let targetWidth = width;
          let targetHeight = height;

          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              targetHeight = Math.round((height * MAX_DIMENSION) / width);
              targetWidth = MAX_DIMENSION;
            } else {
              targetWidth = Math.round((width * MAX_DIMENSION) / height);
              targetHeight = MAX_DIMENSION;
            }
          }

          // Multi-step downscaling for large camera photos (e.g. 4000x3000 -> 600x450)
          // Prevents jagged aliasing on glassware, garnishes, and textures
          let currentCanvas = document.createElement('canvas');
          currentCanvas.width = width;
          currentCanvas.height = height;

          const currentCtx = currentCanvas.getContext('2d');
          if (!currentCtx) {
            URL.revokeObjectURL(objectUrl);
            return resolve(createRawPreparedImage(file, originalFilename, width, height));
          }

          currentCtx.imageSmoothingEnabled = true;
          currentCtx.imageSmoothingQuality = 'high';
          currentCtx.drawImage(img, 0, 0, width, height);

          // Step down in halves if source is > 2x target
          let curW = width;
          let curH = height;

          while (curW / 2 > targetWidth && curH / 2 > targetHeight) {
            const nextW = Math.round(curW / 2);
            const nextH = Math.round(curH / 2);

            const nextCanvas = document.createElement('canvas');
            nextCanvas.width = nextW;
            nextCanvas.height = nextH;

            const nextCtx = nextCanvas.getContext('2d');
            if (!nextCtx) break;

            nextCtx.imageSmoothingEnabled = true;
            nextCtx.imageSmoothingQuality = 'high';
            nextCtx.drawImage(currentCanvas, 0, 0, nextW, nextH);

            currentCanvas = nextCanvas;
            curW = nextW;
            curH = nextH;
          }

          // Final draw to exact target dimensions
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = targetWidth;
          finalCanvas.height = targetHeight;

          const finalCtx = finalCanvas.getContext('2d');
          if (!finalCtx) {
            URL.revokeObjectURL(objectUrl);
            return resolve(
              createRawPreparedImage(file, originalFilename, targetWidth, targetHeight)
            );
          }

          finalCtx.imageSmoothingEnabled = true;
          finalCtx.imageSmoothingQuality = 'high';
          finalCtx.drawImage(currentCanvas, 0, 0, targetWidth, targetHeight);

          // Encode to WebP at 0.75 quality
          const targetMime = 'image/webp';
          finalCanvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (!blob) {
                return resolve(
                  createRawPreparedImage(file, originalFilename, targetWidth, targetHeight)
                );
              }

              const previewUri = URL.createObjectURL(blob);
              const compressionRatioPercent = Math.max(
                0,
                Math.round(((originalSizeBytes - blob.size) / originalSizeBytes) * 100)
              );

              resolve({
                blob,
                previewUri,
                originalFilename,
                mimeType: targetMime,
                sizeBytes: blob.size,
                originalSizeBytes,
                compressionRatioPercent,
                width: targetWidth,
                height: targetHeight,
                extension: 'webp',
              });
            },
            targetMime,
            WEBP_QUALITY
          );
        } catch (canvasErr) {
          URL.revokeObjectURL(objectUrl);
          resolve(createRawPreparedImage(file, originalFilename, img.width || 0, img.height || 0));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image for processing'));
      };

      img.src = objectUrl;
    });
  }

  // Fallback for non-DOM contexts
  return createRawPreparedImage(file, originalFilename, 0, 0);
}

function createRawPreparedImage(
  file: File | Blob,
  originalFilename: string,
  width: number,
  height: number
): PreparedMenuImage {
  const mimeType = file.type || 'image/jpeg';
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const previewUri = typeof window !== 'undefined' ? URL.createObjectURL(file) : '';

  return {
    blob: file,
    previewUri,
    originalFilename,
    mimeType,
    sizeBytes: file.size,
    originalSizeBytes: file.size,
    compressionRatioPercent: 0,
    width,
    height,
    extension: ext,
  };
}

/**
 * Upload a prepared image to Supabase Storage and atomically record its metadata
 * into PostgreSQL (products + product_media_uploads).
 */
export async function uploadAndRecordProductImage(
  productId: string,
  image: PreparedMenuImage,
  uploadedByUserId?: string
): Promise<UploadResult> {
  try {
    const slug = image.originalFilename
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .substring(0, 30);

    const timestamp = Date.now();
    const storagePath = `items/${productId}/${timestamp}-${slug}.${image.extension}`;

    // 1. Upload file to Supabase Storage (menu-images)
    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(storagePath, image.blob, {
        contentType: image.mimeType,
        cacheControl: '31536000', // 1 year immutable CDN cache (unique path)
        upsert: false,
      });

    if (uploadError) {
      console.error('[imageUpload.service] Storage upload failed:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // 2. Obtain canonical Public CDN URL
    const { data: publicUrlData } = supabase.storage.from('menu-images').getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    // 3. Atomically record metadata in Postgres
    let oldStoragePath: string | null = null;

    try {
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
        'record_product_image_upload',
        {
          p_product_id: productId,
          p_public_url: publicUrl,
          p_storage_path: storagePath,
          p_mime_type: image.mimeType,
          p_size_bytes: image.sizeBytes,
          p_width: image.width || null,
          p_height: image.height || null,
          p_original_filename: image.originalFilename,
          p_uploaded_by: uploadedByUserId || null,
        }
      );

      if (rpcError) {
        console.warn(
          '[imageUpload.service] RPC error, falling back to direct table update:',
          rpcError
        );
        // Fallback direct table update
        await supabase
          .from('products')
          .update({
            image_url: publicUrl,
            image_storage_path: storagePath,
            image_mime_type: image.mimeType,
            image_size_bytes: image.sizeBytes,
            image_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', productId);
      } else if (rpcData && rpcData.old_storage_path) {
        oldStoragePath = rpcData.old_storage_path;
      }
    } catch (dbErr) {
      console.warn('[imageUpload.service] DB update failed after upload:', dbErr);
    }

    // 4. Background cleanup of replaced storage object (if previous image existed)
    if (oldStoragePath && oldStoragePath !== storagePath) {
      cleanupStorageObject(oldStoragePath);
    }

    return {
      success: true,
      publicUrl,
      storagePath,
      oldStoragePath,
    };
  } catch (err: any) {
    console.error('[imageUpload.service] Unexpected upload error:', err);
    return { success: false, error: err?.message || 'Failed to upload product image' };
  }
}

/**
 * Remove an object from Supabase Storage in the background.
 */
export async function cleanupStorageObject(storagePath: string): Promise<boolean> {
  if (!storagePath) return false;
  try {
    const { error } = await supabase.storage.from('menu-images').remove([storagePath]);
    if (error) {
      console.warn('[imageUpload.service] Failed to delete storage file:', storagePath, error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[imageUpload.service] Error removing storage file:', storagePath, err);
    return false;
  }
}
