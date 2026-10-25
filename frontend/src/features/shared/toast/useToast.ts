import { toast, useToastStore, ToastOptions, ToastItemData } from './useToastStore';

export const useToast = () => {
  const toasts = useToastStore((state) => state.toasts);

  return {
    toasts,
    toast,
    success: toast.success,
    error: toast.error,
    info: toast.info,
    warning: toast.warning,
    show: toast.show,
    dismiss: toast.dismiss,
    clear: toast.clear,
  };
};

export { toast };
export type { ToastOptions, ToastItemData };
