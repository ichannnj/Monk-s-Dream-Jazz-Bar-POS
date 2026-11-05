import { supabase } from '@/features/shared/infrastructure/supabase';

export interface QrPaymentChannel {
  id: string;
  name: string;
  channel_code: string;
  account_name: string;
  account_number: string;
  qr_image_url: string;
  qr_storage_path: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PreparedQrImage {
  blob: Blob;
  previewUri: string;
  originalFilename: string;
  sizeBytes: number;
}

const MAX_QR_DIMENSION = 800; // 800x800 px allows sharp display on tablet screens for crisp camera autofocus

/**
 * Client-side smooth image compression for payment QR code photos
 */
export async function prepareQrImageForUpload(
  file: File | Blob,
  fallbackName = 'payment-qr'
): Promise<PreparedQrImage> {
  const originalFilename = (file as File).name || `${fallbackName}.png`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new (window as any).Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          let { naturalWidth: width, naturalHeight: height } = img;
          if (!width || !height) {
            width = img.width || MAX_QR_DIMENSION;
            height = img.height || MAX_QR_DIMENSION;
          }

          let targetWidth = width;
          let targetHeight = height;

          if (width > MAX_QR_DIMENSION || height > MAX_QR_DIMENSION) {
            if (width > height) {
              targetHeight = Math.round((height * MAX_QR_DIMENSION) / width);
              targetWidth = MAX_QR_DIMENSION;
            } else {
              targetWidth = Math.round((width * MAX_QR_DIMENSION) / height);
              targetHeight = MAX_QR_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            return resolve({
              blob: file,
              previewUri: objectUrl,
              originalFilename,
              sizeBytes: file.size,
            });
          }

          // Use white background in case source PNG has transparent background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (!blob) {
                return resolve({
                  blob: file,
                  previewUri: objectUrl,
                  originalFilename,
                  sizeBytes: file.size,
                });
              }
              const previewUri = URL.createObjectURL(blob);
              resolve({
                blob,
                previewUri,
                originalFilename: originalFilename.replace(/\.[^/.]+$/, '') + '.png',
                sizeBytes: blob.size,
              });
            },
            'image/png' // Keep PNG for QR codes to avoid JPEG compression artifacts on QR matrix
          );
        } catch {
          resolve({
            blob: file,
            previewUri: objectUrl,
            originalFilename,
            sizeBytes: file.size,
          });
        }
      };

      img.onerror = () => {
        resolve({
          blob: file,
          previewUri: objectUrl,
          originalFilename,
          sizeBytes: file.size,
        });
      };

      img.src = objectUrl;
    });
  }

  return {
    blob: file,
    previewUri: '',
    originalFilename,
    sizeBytes: file.size,
  };
}

export const qrPaymentChannelsApi = {
  /**
   * Fetch only active channels for cashier/waiter checkout
   */
  async fetchActiveQrPaymentChannels(): Promise<QrPaymentChannel[]> {
    const { data, error } = await (supabase as any)
      .from('venue_qr_payment_channels')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.warn(
        '[qrPaymentChannelsApi.fetchActiveQrPaymentChannels] Supabase query failed:',
        error
      );
      return [];
    }
    return (data || []) as QrPaymentChannel[];
  },

  /**
   * Fetch all channels (active and inactive) for Admin Back-Office configuration
   */
  async fetchAllQrPaymentChannels(): Promise<QrPaymentChannel[]> {
    const { data, error } = await (supabase as any)
      .from('venue_qr_payment_channels')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[qrPaymentChannelsApi.fetchAllQrPaymentChannels] Failed:', error);
      throw error;
    }
    return (data || []) as QrPaymentChannel[];
  },

  /**
   * Upload QR code image to Supabase Storage bucket 'payment-qr-codes'
   */
  async uploadQrImage(
    file: File | Blob,
    channelName: string
  ): Promise<{ publicUrl: string; storagePath: string }> {
    const sanitizedName = channelName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 30);
    const filename = `${sanitizedName}-${Date.now()}.png`;
    const storagePath = `channels/${filename}`;

    const { blob } = await prepareQrImageForUpload(file, sanitizedName);

    const { error: uploadError } = await supabase.storage
      .from('payment-qr-codes')
      .upload(storagePath, blob, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('[qrPaymentChannelsApi.uploadQrImage] Upload error:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage.from('payment-qr-codes').getPublicUrl(storagePath);
    return {
      publicUrl: data.publicUrl,
      storagePath,
    };
  },

  /**
   * Create or update a QR payment channel
   */
  async upsertQrPaymentChannel(
    channel: Partial<QrPaymentChannel> & {
      name: string;
      account_name: string;
      account_number: string;
      qr_image_url: string;
    }
  ): Promise<QrPaymentChannel> {
    const payload = {
      name: channel.name.trim(),
      channel_code: channel.channel_code || channel.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      account_name: channel.account_name.trim(),
      account_number: channel.account_number.trim(),
      qr_image_url: channel.qr_image_url,
      qr_storage_path: channel.qr_storage_path || null,
      sort_order: channel.sort_order ?? 0,
      is_active: channel.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (channel.id) {
      result = await (supabase as any)
        .from('venue_qr_payment_channels')
        .update(payload)
        .eq('id', channel.id)
        .select()
        .single();
    } else {
      result = await (supabase as any)
        .from('venue_qr_payment_channels')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      console.error('[qrPaymentChannelsApi.upsertQrPaymentChannel] Error:', result.error);
      throw result.error;
    }
    return result.data as QrPaymentChannel;
  },

  /**
   * Toggle active state
   */
  async toggleChannelActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await (supabase as any)
      .from('venue_qr_payment_channels')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[qrPaymentChannelsApi.toggleChannelActive] Error:', error);
      throw error;
    }
  },

  /**
   * Delete a QR payment channel and optionally purge its storage asset
   */
  async deleteQrPaymentChannel(id: string, storagePath?: string | null): Promise<void> {
    const { error } = await (supabase as any)
      .from('venue_qr_payment_channels')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[qrPaymentChannelsApi.deleteQrPaymentChannel] Error:', error);
      throw error;
    }

    if (storagePath) {
      try {
        await supabase.storage.from('payment-qr-codes').remove([storagePath]);
      } catch (err) {
        console.warn(
          '[qrPaymentChannelsApi.deleteQrPaymentChannel] Failed to clean up storage image:',
          err
        );
      }
    }
  },
};
