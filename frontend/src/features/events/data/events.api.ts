import { supabase } from '@/features/shared/infrastructure/supabase';
import type {
  VenueEvent,
  CreateEventInput,
  UpdateEventInput,
  EventDoorChargeSummary,
} from '../domain/event.types';

export interface PreparedPosterImage {
  blob: Blob;
  previewUri: string;
  originalFilename: string;
  sizeBytes: number;
}

export interface UploadPosterResult {
  publicUrl: string;
  storagePath: string;
}

const MAX_POSTER_DIMENSION = 1200;
const POSTER_WEBP_QUALITY = 0.85;

/**
 * Client-side smooth image compression for event hero posters
 */
export async function prepareEventPosterForUpload(
  file: File | Blob,
  fallbackName = 'event-poster'
): Promise<PreparedPosterImage> {
  const originalFilename = (file as File).name || `${fallbackName}.jpg`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new (window as any).Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          let { naturalWidth: width, naturalHeight: height } = img;
          if (!width || !height) {
            width = img.width || MAX_POSTER_DIMENSION;
            height = img.height || MAX_POSTER_DIMENSION;
          }

          let targetWidth = width;
          let targetHeight = height;

          if (width > MAX_POSTER_DIMENSION || height > MAX_POSTER_DIMENSION) {
            if (width > height) {
              targetHeight = Math.round((height * MAX_POSTER_DIMENSION) / width);
              targetWidth = MAX_POSTER_DIMENSION;
            } else {
              targetWidth = Math.round((width * MAX_POSTER_DIMENSION) / height);
              targetHeight = MAX_POSTER_DIMENSION;
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

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
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
                originalFilename: originalFilename.replace(/\.[^/.]+$/, '') + '.webp',
                sizeBytes: blob.size,
              });
            },
            'image/webp',
            POSTER_WEBP_QUALITY
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

export const eventsApi = {
  /**
   * Fetch all venue events, optionally filtered by date range
   */
  async getEvents(startDate?: string, endDate?: string): Promise<VenueEvent[]> {
    let query = (supabase as any)
      .from('venue_events')
      .select('*')
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (startDate) {
      query = query.gte('event_date', startDate);
    }
    if (endDate) {
      query = query.lte('event_date', endDate);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[eventsApi.getEvents] Error:', error);
      throw error;
    }
    return (data || []) as VenueEvent[];
  },

  /**
   * Create a new event record
   */
  async createEvent(input: CreateEventInput): Promise<VenueEvent> {
    const { data, error } = await (supabase as any)
      .from('venue_events')
      .insert({
        title: input.title.trim(),
        event_date: input.event_date,
        start_time: input.start_time,
        end_time: input.end_time || null,
        poster_url: input.poster_url || null,
        poster_storage_path: input.poster_storage_path || null,
        performer_name: input.performer_name ? input.performer_name.trim() : null,
        genre: input.genre ? input.genre.trim() : null,
        description: input.description ? input.description.trim() : null,
        sound_check_time: input.sound_check_time || null,
        gear_requirements: input.gear_requirements ? input.gear_requirements.trim() : null,
        reserved_tables: input.reserved_tables ? input.reserved_tables.trim() : null,
        special_requests: input.special_requests ? input.special_requests.trim() : null,
        status: input.status || 'scheduled',
        has_door_charge: Boolean(input.has_door_charge),
        door_charge_amount: Number(input.door_charge_amount || 0),
        split_type: input.split_type || 'percentage',
        artist_split_value: Number(input.artist_split_value ?? 50),
        venue_split_value: Number(input.venue_split_value ?? 50),
        artist_payout_status: input.artist_payout_status || 'unsettled',
        artist_payout_notes: input.artist_payout_notes || null,
        artist_payout_at: input.artist_payout_at || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[eventsApi.createEvent] Error:', error);
      throw error;
    }
    return data as VenueEvent;
  },

  /**
   * Update an existing event
   */
  async updateEvent(id: string, input: UpdateEventInput): Promise<VenueEvent> {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.event_date !== undefined) updatePayload.event_date = input.event_date;
    if (input.start_time !== undefined) updatePayload.start_time = input.start_time;
    if (input.end_time !== undefined) updatePayload.end_time = input.end_time || null;
    if (input.poster_url !== undefined) updatePayload.poster_url = input.poster_url || null;
    if (input.poster_storage_path !== undefined)
      updatePayload.poster_storage_path = input.poster_storage_path || null;
    if (input.performer_name !== undefined)
      updatePayload.performer_name = input.performer_name ? input.performer_name.trim() : null;
    if (input.genre !== undefined) updatePayload.genre = input.genre ? input.genre.trim() : null;
    if (input.description !== undefined)
      updatePayload.description = input.description ? input.description.trim() : null;
    if (input.sound_check_time !== undefined)
      updatePayload.sound_check_time = input.sound_check_time || null;
    if (input.gear_requirements !== undefined)
      updatePayload.gear_requirements = input.gear_requirements
        ? input.gear_requirements.trim()
        : null;
    if (input.reserved_tables !== undefined)
      updatePayload.reserved_tables = input.reserved_tables ? input.reserved_tables.trim() : null;
    if (input.special_requests !== undefined)
      updatePayload.special_requests = input.special_requests
        ? input.special_requests.trim()
        : null;
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.has_door_charge !== undefined)
      updatePayload.has_door_charge = Boolean(input.has_door_charge);
    if (input.door_charge_amount !== undefined)
      updatePayload.door_charge_amount = Number(input.door_charge_amount || 0);
    if (input.split_type !== undefined) updatePayload.split_type = input.split_type;
    if (input.artist_split_value !== undefined)
      updatePayload.artist_split_value = Number(input.artist_split_value ?? 50);
    if (input.venue_split_value !== undefined)
      updatePayload.venue_split_value = Number(input.venue_split_value ?? 50);
    if (input.artist_payout_status !== undefined)
      updatePayload.artist_payout_status = input.artist_payout_status;
    if (input.artist_payout_notes !== undefined)
      updatePayload.artist_payout_notes = input.artist_payout_notes;
    if (input.artist_payout_at !== undefined)
      updatePayload.artist_payout_at = input.artist_payout_at;

    const { data, error } = await (supabase as any)
      .from('venue_events')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[eventsApi.updateEvent] Error:', error);
      throw error;
    }
    return data as VenueEvent;
  },

  /**
   * Delete an event and clean up its storage poster if hosted on Supabase
   */
  async deleteEvent(id: string, storagePath?: string | null): Promise<void> {
    const { error } = await (supabase as any).from('venue_events').delete().eq('id', id);

    if (error) {
      console.error('[eventsApi.deleteEvent] Error:', error);
      throw error;
    }

    if (storagePath) {
      try {
        await supabase.storage.from('event-posters').remove([storagePath]);
      } catch (storageErr) {
        console.warn('[eventsApi.deleteEvent] Non-fatal poster cleanup error:', storageErr);
      }
    }
  },

  /**
   * Upload an event hero poster image to Supabase Storage bucket 'event-posters'
   */
  async uploadEventPoster(file: File | Blob): Promise<UploadPosterResult> {
    const prepared = await prepareEventPosterForUpload(file);
    const timestamp = Date.now();
    const sanitizedName = prepared.originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
    const storagePath = `posters/${timestamp}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('event-posters')
      .upload(storagePath, prepared.blob, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      console.error('[eventsApi.uploadEventPoster] Storage upload error:', uploadError);
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from('event-posters')
      .getPublicUrl(storagePath);

    return {
      publicUrl: publicUrlData.publicUrl,
      storagePath,
    };
  },

  /**
   * Fetch real-time Door Charge revenue and artist payout breakdown for an event
   */
  async getEventDoorChargeSummary(eventId: string): Promise<EventDoorChargeSummary> {
    const { data, error } = await (supabase.rpc as any)('get_event_door_charge_summary', {
      p_event_id: eventId,
    });
    if (error) {
      console.warn('[eventsApi.getEventDoorChargeSummary] RPC error, falling back:', error);
      return {
        event_id: eventId,
        title: '',
        has_door_charge: false,
        door_charge_amount: 0,
        split_type: 'percentage',
        artist_split_value: 50,
        venue_split_value: 50,
        tickets_sold: 0,
        gross_sales: 0,
        artist_share: 0,
        venue_share: 0,
        artist_payout_status: 'unsettled',
      };
    }
    return data as EventDoorChargeSummary;
  },

  /**
   * Settle and mark artist door charge payout as paid
   */
  async settleArtistDoorChargePayout(
    eventId: string,
    staffId: string,
    notes?: string
  ): Promise<void> {
    const { error } = await (supabase.rpc as any)('settle_artist_door_charge_payout', {
      p_event_id: eventId,
      p_staff_id: staffId,
      p_notes: notes || null,
    });
    if (error) {
      console.error('[eventsApi.settleArtistDoorChargePayout] Error:', error);
      throw error;
    }
  },
};
