import { create } from 'zustand';
import { usePrinterStationStore } from './usePrinterStationStore';

const STORAGE_KEY = 'monks_is_hardware_station';

const getInitialStationStatus = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.location?.search?.includes('mode=printer')) return true;
  if (localStorage.getItem(STORAGE_KEY) === 'true') return true;
  if (localStorage.getItem('monks_bound_printer_device') !== null) return true;
  return false;
};

interface DeviceHardwareStationState {
  isHardwareStation: boolean;
  isInitialized: boolean;
  setHardwareStation: (enabled: boolean) => void;
  initDeviceStation: () => () => void;
}

export const useDeviceHardwareStation = create<DeviceHardwareStationState>((set, get) => ({
  isHardwareStation: getInitialStationStatus(),
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
