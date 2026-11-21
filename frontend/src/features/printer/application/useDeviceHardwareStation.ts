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

let activeDeviceStationCleanup: (() => void) | null = null;
let deviceStationRefCount = 0;

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

    deviceStationRefCount++;
    if (!activeDeviceStationCleanup) {
      set({ isInitialized: true });
      activeDeviceStationCleanup = usePrinterStationStore.getState().initStation();
    }

    let released = false;
    return () => {
      if (released) return;
      released = true;
      deviceStationRefCount = Math.max(0, deviceStationRefCount - 1);
      if (deviceStationRefCount === 0 && activeDeviceStationCleanup) {
        activeDeviceStationCleanup();
        activeDeviceStationCleanup = null;
        set({ isInitialized: false });
      }
    };
  },
}));
