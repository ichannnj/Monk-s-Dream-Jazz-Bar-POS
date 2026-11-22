/**
 * Inventory Reference Photo Upload & Storage Service
 * Stores compressed WebP reference images in Supabase Storage ('inventory-images')
 */

import { supabase } from '@/features/shared/infrastructure/supabase';
import { type PreparedMenuImage } from '@/features/menu/data/imageCompression.utils';

export {
  validateMenuImageFile as validateInventoryImageFile,
  prepareMenuImageForUpload as prepareInventoryImageForUpload,
  type PreparedMenuImage as PreparedInventoryImage,
} from '@/features/menu/data/imageCompression.utils';

export interface InventoryImageUploadResult {
  success: boolean;
  publicUrl?: string;
  storagePath?: string;
  error?: string;
}

const INVENTORY_BUCKET = 'inventory-images';

export async function uploadInventoryReferenceImage(
  inventoryItemId: string,
  image: PreparedMenuImage
): Promise<InventoryImageUploadResult> {
  try {
    const slug = image.originalFilename
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .substring(0, 30);

    const timestamp = Date.now();
    const storagePath = `items/${inventoryItemId}/${timestamp}-${slug}.${image.extension}`;

    const { error: uploadError } = await supabase.storage
      .from(INVENTORY_BUCKET)
      .upload(storagePath, image.blob, {
        contentType: image.mimeType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(INVENTORY_BUCKET)
      .getPublicUrl(storagePath);

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
      storagePath,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to upload reference image',
    };
  }
}

export async function cleanupInventoryImageObject(storagePath?: string | null): Promise<boolean> {
  if (!storagePath) return false;
  try {
    const { error } = await supabase.storage.from(INVENTORY_BUCKET).remove([storagePath]);
    return !error;
  } catch {
    return false;
  }
}
