import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastItemData {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number; // in ms
  action?: ToastAction;
  timestamp: number;
}

export interface ToastOptions {
  title?: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastState {
  toasts: ToastItemData[];
  show: (toast: Omit<ToastItemData, 'id' | 'timestamp'> & { id?: string }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (options) => {
    const id = options.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastItemData = {
      id,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      duration: options.duration ?? 3500,
      action: options.action,
      timestamp: Date.now(),
    };

    set((state) => {
      // Keep up to 4 most recent toasts to avoid clutter
      const filtered = state.toasts.filter((t) => t.id !== id);
      const updated = [newToast, ...filtered].slice(0, 4);
      return { toasts: updated };
    });

    return id;
  },

  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clear: () => set({ toasts: [] }),
}));

/**
 * Global imperative helper functions for triggering toasts from anywhere
 * (store callbacks, async handlers, components, services).
 */
export const toast = {
  success: (message: string, options?: ToastOptions) =>
    useToastStore.getState().show({
      message,
      type: 'success',
      title: options?.title || 'Success',
      duration: options?.duration,
      action: options?.action,
    }),

  error: (message: string, options?: ToastOptions) =>
    useToastStore.getState().show({
      message,
      type: 'error',
      title: options?.title || 'Attention',
      duration: options?.duration ?? 4500,
      action: options?.action,
    }),

  warning: (message: string, options?: ToastOptions) =>
    useToastStore.getState().show({
      message,
      type: 'warning',
      title: options?.title || 'Notice',
      duration: options?.duration,
      action: options?.action,
    }),

  info: (message: string, options?: ToastOptions) =>
    useToastStore.getState().show({
      message,
      type: 'info',
      title: options?.title || 'Information',
      duration: options?.duration,
      action: options?.action,
    }),

  show: (options: Omit<ToastItemData, 'id' | 'timestamp'> & { id?: string }) =>
    useToastStore.getState().show(options),

  dismiss: (id: string) => useToastStore.getState().dismiss(id),

  clear: () => useToastStore.getState().clear(),
};
