import { create } from 'zustand';
import { supabase } from '../infrastructure/supabase';
import { toast } from '../toast/useToastStore';
import {
  adminApi,
  OperatingMode,
  getLatest6AmCutoff,
  getMsUntilNext6Am,
} from '../../admin/data/admin.api';

interface VenueState {
  operatingMode: OperatingMode;
  venueName: string;
  modeSwitchedAt: string | null;
  isInitialized: boolean;
  setOperatingMode: (mode: OperatingMode) => Promise<void>;
  fetchVenueSettings: () => Promise<void>;
  initRealtimeSubscription: () => () => void;
}

export const useVenueStore = create<VenueState>((set, get) => ({
  operatingMode: 'CAFE',
  venueName: "Monk's Dream Jazz Bar",
  modeSwitchedAt: null,
  isInitialized: false,

  setOperatingMode: async (mode: OperatingMode) => {
    const nowIso = new Date().toISOString();
    // Optimistic state update
    set({ operatingMode: mode, modeSwitchedAt: nowIso });
    try {
      await adminApi.setOperatingMode(mode);
    } catch (err) {
      console.error('[useVenueStore.setOperatingMode] Error saving mode:', err);
      // Revert if failed
      await get().fetchVenueSettings();
      throw err;
    }
  },

  fetchVenueSettings: async () => {
    try {
      const settings = await adminApi.getVenueSettings();
      set({
        operatingMode: settings.operating_mode || 'CAFE',
        venueName: settings.venue_name || "Monk's Dream Jazz Bar",
        modeSwitchedAt: settings.mode_switched_at || settings.updated_at || null,
        isInitialized: true,
      });
    } catch (err) {
      console.warn('[useVenueStore.fetchVenueSettings] Fallback:', err);
      set({ isInitialized: true });
    }
  },

  initRealtimeSubscription: () => {
    // 1. Fetch initial settings (also runs 6:00 AM reconciliation)
    get().fetchVenueSettings();

    // 2. Subscribe to venue_settings changes across all devices
    const channel = supabase
      .channel('pos_venue_settings_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'venue_settings' },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow && newRow.operating_mode) {
            set({
              operatingMode: newRow.operating_mode,
              venueName: newRow.venue_name || "Monk's Dream Jazz Bar",
              modeSwitchedAt: newRow.mode_switched_at || newRow.updated_at || null,
            });
          }
        }
      )
      .subscribe();

    // 3. Exact 6:00 AM daily auto-revert timer + 60-second wake-from-sleep check
    let sixAmTimeout: ReturnType<typeof setTimeout> | null = null;

    const trigger6AmAutoRevert = async () => {
      const { operatingMode } = get();
      if (operatingMode === 'EVENT') {
        try {
          await get().setOperatingMode('CAFE');
          toast.info('☀️ 6:00 AM Auto-Switch: Venue automatically returned to Daytime Cafe Mode.', {
            title: 'Morning Cafe Mode Active',
          });
        } catch (err) {
          console.warn('[useVenueStore] 6:00 AM auto-revert failed:', err);
        }
      }
      scheduleNext6Am();
    };

    const scheduleNext6Am = () => {
      if (sixAmTimeout) clearTimeout(sixAmTimeout);
      const msUntil6Am = getMsUntilNext6Am();
      sixAmTimeout = setTimeout(trigger6AmAutoRevert, msUntil6Am);
    };

    scheduleNext6Am();

    // Periodic 60s check in case tablet slept across 6:00 AM
    const wakeupCheckInterval = setInterval(() => {
      const { operatingMode, modeSwitchedAt } = get();
      if (operatingMode === 'EVENT' && modeSwitchedAt) {
        const switchedDate = new Date(modeSwitchedAt);
        const latest6Am = getLatest6AmCutoff();
        if (!isNaN(switchedDate.getTime()) && switchedDate.getTime() < latest6Am.getTime()) {
          trigger6AmAutoRevert();
        }
      }
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      if (sixAmTimeout) clearTimeout(sixAmTimeout);
      clearInterval(wakeupCheckInterval);
    };
  },
}));
