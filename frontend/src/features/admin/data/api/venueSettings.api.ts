import { supabase } from '@/features/shared/infrastructure/supabase';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';
import {
  getBusinessDayEndMs,
  getBusinessDayStartMs,
  toBusinessDate,
} from '@/features/shared/utils/businessDay';
import type { OperatingMode, VenueSettings } from '../admin.types';

/**
 * Returns the most recent Asia/Manila 6:00:00 AM boundary as a Date.
 * Any Event Mode activated before this cutoff automatically reverts to Cafe Mode.
 * Delegates to the shared business-day contract (never device-local time).
 */
export function getLatest6AmCutoff(now: Date = new Date()): Date {
  return new Date(getBusinessDayStartMs(now));
}

/**
 * Returns the active Asia/Manila 6:00 AM business date string (YYYY-MM-DD).
 * Late-night shifts between 12:00 AM and 5:59 AM belong to the preceding day's business date.
 */
export function getManilaBusinessDateString(date: Date = new Date()): string {
  return toBusinessDate(date);
}

/**
 * Returns milliseconds remaining until the next 6:00:00 AM Manila boundary.
 */
export function getMsUntilNext6Am(now: Date = new Date()): number {
  return Math.max(1000, getBusinessDayEndMs(now) - now.getTime());
}

export const venueSettingsApi = {
  async getVenueSettings(): Promise<VenueSettings> {
    try {
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
        'reconcile_operating_mode_6am'
      );
      if (!rpcError && rpcData && rpcData.id) {
        return rpcData as VenueSettings;
      }
    } catch {
      // Fallback to standard select if migration RPC is not yet applied
    }

    const { data, error } = await (supabase.from as any)('venue_settings')
      .select('*')
      .limit(1)
      .single();
    if (error) {
      console.warn(
        '[venueSettingsApi.getVenueSettings] Falling back to default settings:',
        error.message
      );
      return {
        id: 'default',
        operating_mode: 'CAFE',
        venue_name: "Monk's Dream Jazz Bar",
        daily_overhead_cost: 150,
        vat_rate: 12,
        vat_inclusive: true,
        service_charge_rate: 10,
        service_charge_enabled: true,
        cafe_food_service_charge_rate: 10,
        event_service_charge_rate: 10,
        discounts_config: {
          senior_pwd_percent: 20,
          musician_comp_percent: 100,
          staff_discount_percent: 50,
        },
      };
    }

    const settings = data as VenueSettings;
    if (settings.operating_mode === 'EVENT') {
      const switchedAtStr = settings.mode_switched_at || settings.updated_at;
      if (switchedAtStr) {
        const switchedAt = new Date(switchedAtStr);
        const cutoff6Am = getLatest6AmCutoff();
        if (!isNaN(switchedAt.getTime()) && switchedAt.getTime() < cutoff6Am.getTime()) {
          const nowIso = new Date().toISOString();
          settings.operating_mode = 'CAFE';
          settings.mode_switched_at = nowIso;
          settings.updated_at = nowIso;
          await (supabase.from as any)('venue_settings')
            .update({ operating_mode: 'CAFE', updated_at: nowIso })
            .eq('id', settings.id);
        }
      }
    }

    return settings;
  },

  async setOperatingMode(mode: OperatingMode): Promise<void> {
    const targetId = '00000000-0000-0000-0000-000000000001';
    const nowIso = new Date().toISOString();

    const { error } = await (supabase.from as any)('venue_settings')
      .update({ operating_mode: mode, updated_at: nowIso })
      .eq('id', targetId);

    if (error) {
      console.error('[venueSettingsApi.setOperatingMode] Failed:', error);
      throw error;
    }
    realtimeGateway.broadcastPosSync('operating_mode_switched');
  },

  async updateVenueSettings(updates: Partial<VenueSettings>): Promise<void> {
    const current = await venueSettingsApi.getVenueSettings();
    const targetId =
      current?.id && current.id !== 'default' ? current.id : '00000000-0000-0000-0000-000000000001';

    const { error } = await (supabase.from as any)('venue_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', targetId);

    if (error) throw error;
    realtimeGateway.broadcastPosSync('venue_settings_updated');
  },
};
