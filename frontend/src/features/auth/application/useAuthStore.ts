import { create } from 'zustand';

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
}

interface AuthState {
  currentUser: User | null;
  serverUrl: string;
  isOnline: boolean;
  isTrainingMode: boolean;
  setUser: (user: User | null) => void;
  setServerUrl: (url: string) => void;
  setIsOnline: (online: boolean) => void;
  setIsTrainingMode: (val: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  serverUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  isOnline: true,
  isTrainingMode: false,
  setUser: (user) => set({ currentUser: user }),
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setIsTrainingMode: (isTrainingMode) => set({ isTrainingMode }),
  logout: () => set({ currentUser: null }),
}));
