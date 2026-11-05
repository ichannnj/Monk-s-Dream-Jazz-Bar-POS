import { create } from 'zustand';
import { usePrinterStationStore } from './usePrinterStationStore';

const STORAGE_KEY = 'monks_is_hardware_station';

interface DeviceHardwareStationState {
  isHardwareStation: boolean;
  isInitialized: boolean;
  setHardwareStation: (enabled: boolean) => void;
  initDeviceStation: () => () => void;
}

export const useDeviceHardwareStation = create<DeviceHardwareStationState>((set, get) => ({
  isHardwareStation:
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) === 'true' : false,
  isInitialized: false,

  setHardwareStation: (enabled: boolean) => {
    if (typeof window !== 'undefined') {
      if (enabled) {
        localStorage.setItem(STORAGE_KEY, 'true');
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    set({ isHardwareStation: enabled });
  },

  initDeviceStation: () => {
    // If not enabled on this device, do nothing
    if (!get().isHardwareStation) {
      return () => {};
    }

    set({ isInitialized: true });
    // Initialize the background printer station lifecycle
    const cleanup = usePrinterStationStore.getState().initStation();

    return () => {
      cleanup();
      set({ isInitialized: false });
    };
  },
}));
