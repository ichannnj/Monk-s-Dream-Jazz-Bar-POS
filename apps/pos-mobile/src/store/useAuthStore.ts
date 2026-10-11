import { create } from 'zustand';

export type ActiveRoleView =
  | 'login'
  | 'waiter_cashier'
  | 'admin'
  | 'barista'
  | 'kitchen'
  | 'bartender'
  | 'chat';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'waiter_cashier' | 'barista' | 'kitchen' | 'bartender';
  isActive: boolean;
}

interface AuthState {
  currentUser: User | null;
  serverUrl: string;
  isOnline: boolean;
  activeRoleView: ActiveRoleView;
  kdsStation?: 'bar' | 'cafe' | 'food';
  setUser: (user: User | null) => void;
  setServerUrl: (url: string) => void;
  setIsOnline: (online: boolean) => void;
  setActiveRoleView: (roleView: ActiveRoleView) => void;
  setKdsStation?: (station: 'bar' | 'cafe' | 'food') => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: {
    id: 'user-waiter-1',
    username: 'waiter1',
    displayName: 'Server Chet',
    role: 'waiter_cashier',
    isActive: true,
  },
  serverUrl: 'http://localhost:3000',
  isOnline: true,
  activeRoleView: 'waiter_cashier',
  kdsStation: 'bar',
  setUser: (user) => set({ currentUser: user }),
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setActiveRoleView: (activeRoleView) => set({ activeRoleView }),
  setKdsStation: (kdsStation) => set({ kdsStation }),
  logout: () => set({ currentUser: null, activeRoleView: 'login' }),
}));
