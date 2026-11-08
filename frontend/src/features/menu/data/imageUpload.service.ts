/**
 * Menu Item Image Upload & Storage Service
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 */

import { supabase } from '../../shared/infrastructure/supabase';
import { PreparedMenuImage } from './imageCompression.utils';

export * from './imageCompression.utils';

export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  storagePath?: string;
  oldStoragePath?: string | null;
  error?: string;
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
        cacheControl: '31536000', // 1 year immutable CDN cache
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

    // 4. Background cleanup of replaced storage object
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
