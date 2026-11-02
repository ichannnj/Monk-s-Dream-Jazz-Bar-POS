import { create } from 'zustand';
import { supabase } from '../infrastructure/supabase';
import { adminApi, OperatingMode } from '../../admin/data/admin.api';

interface VenueState {
  operatingMode: OperatingMode;
  venueName: string;
  isInitialized: boolean;
  setOperatingMode: (mode: OperatingMode) => Promise<void>;
  fetchVenueSettings: () => Promise<void>;
  initRealtimeSubscription: () => () => void;
}

export const useVenueStore = create<VenueState>((set, get) => ({
  operatingMode: 'CAFE',
  venueName: "Monk's Dream Jazz Bar",
  isInitialized: false,

  setOperatingMode: async (mode: OperatingMode) => {
    // Optimistic state update
    set({ operatingMode: mode });
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
        isInitialized: true,
      });
    } catch (err) {
      console.warn('[useVenueStore.fetchVenueSettings] Fallback:', err);
      set({ isInitialized: true });
    }
  },

  initRealtimeSubscription: () => {
    // Fetch initial
    get().fetchVenueSettings();

    // Subscribe to venue_settings changes across all devices
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
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
