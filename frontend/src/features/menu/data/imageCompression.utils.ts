export interface PreparedMenuImage {
  blob: Blob;
  previewUri: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  originalSizeBytes: number;
  compressionRatioPercent: number;
  width: number;
  height: number;
  extension: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB raw input limit
const MAX_DIMENSION = 600; // max width or height for POS tablets (600x600 px)
const WEBP_QUALITY = 0.75; // sweet spot: imperceptible loss, ~25-45KB per image

export function validateMenuImageFile(file: File | Blob): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  const type = file.type?.toLowerCase() || '';
  if (!ALLOWED_MIME_TYPES.includes(type)) {
    return {
      valid: false,
      error: `Unsupported image format (${type || 'unknown'}). Please choose a JPG, PNG, or WebP image.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMb} MB). Maximum allowed input size is 8.0 MB.`,
    };
  }

  return { valid: true };
}

export async function prepareMenuImageForUpload(
  file: File | Blob,
  fallbackName: string = 'product-image'
): Promise<PreparedMenuImage> {
  const originalFilename = (file as File).name || `${fallbackName}.jpg`;
  const originalSizeBytes = file.size;

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

  return createRawPreparedImage(file, originalFilename, 0, 0);
}

export function createRawPreparedImage(
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
