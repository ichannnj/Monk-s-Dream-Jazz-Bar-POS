import { create } from 'zustand';
import { authApi } from '../data/auth.api';
import { toast } from '../../shared/toast/useToastStore';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role:
    | 'admin'
    | 'waiter'
    | 'cashier'
    | 'barista'
    | 'kitchen'
    | 'bartender'
    | 'station_bar'
    | 'station_cafe'
    | 'station_food'
    | 'foh_runner'
    | 'printer_station';
  isActive?: boolean;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  baseDailyRate?: number;
  jobTitle?: string;
  lastLoginAt?: string;
  passwordUpdatedAt?: string;
  pinUpdatedAt?: string;
}

interface AuthState {
  currentUser: User | null;
  serverUrl: string;
  isOnline: boolean;
  isTrainingMode: boolean;
  setUser: (user: User | null) => void;
  updateCurrentUser: (patch: Partial<User>) => void;
  setServerUrl: (url: string) => void;
  setIsOnline: (online: boolean) => void;
  setIsTrainingMode: (val: boolean) => void;
  lockTerminal: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  serverUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  isOnline: true,
  isTrainingMode: false,
  setUser: (user) => set({ currentUser: user }),
  updateCurrentUser: (patch) =>
    set((state) => ({
      currentUser: state.currentUser ? { ...state.currentUser, ...patch } : null,
    })),
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setIsTrainingMode: (isTrainingMode) => set({ isTrainingMode }),
  lockTerminal: () => {
    // Lock screen locally without terminating or pausing attendance shift
    set({ currentUser: null });
    toast.info('Terminal locked. Active shift continues in background.', {
      title: 'Terminal Locked',
    });
  },
  logout: () => {
    const user = get().currentUser;
    // Auto-record punch pause for operational POS users (exempts admin/managers)
    if (user && user.role !== 'admin') {
      authApi
        .recordPosStaffLogoutPunch(user.id)
        .then((res) => {
          if (res?.success && !res.exempt) {
            const hrs = res.totalHours !== undefined ? `${res.totalHours.toFixed(2)}h` : '';
            toast.info(
              `Shift paused for ${user.displayName || user.username}. ${hrs ? `Accumulated: ${hrs}` : ''}`,
              { title: 'Timeclock Paused' }
            );
          }
        })
        .catch((err) => {
          console.warn('Auto logout punch error:', err);
        });
    }

    set({ currentUser: null });
  },
}));
