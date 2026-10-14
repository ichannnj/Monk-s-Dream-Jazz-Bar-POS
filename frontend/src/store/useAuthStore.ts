import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'waiter' | 'cashier' | 'barista' | 'kitchen' | 'bartender';
  isActive?: boolean;
}

interface AuthState {
  currentUser: User | null;
  serverUrl: string;
  isOnline: boolean;
  setUser: (user: User | null) => void;
  setServerUrl: (url: string) => void;
  setIsOnline: (online: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  serverUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  isOnline: true,
  setUser: (user) => set({ currentUser: user }),
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setIsOnline: (isOnline) => set({ isOnline }),
  logout: () => set({ currentUser: null }),
}));
