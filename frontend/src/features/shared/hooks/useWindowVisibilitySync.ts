import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

/**
 * useWindowVisibilitySync
 *
 * Automatically triggers a callback whenever the user focuses the window,
 * returns to the browser tab, or unlocks/wakes their mobile/tablet device.
 * Eliminates the need for manual browser refreshes after screen sleep or tab switching.
 *
 * @param onSync Callback to execute on focus/wake
 * @param options Configuration options (debounceMs, enabled)
 */
export function useWindowVisibilitySync(
  onSync: () => void | Promise<void>,
  options: { debounceMs?: number; enabled?: boolean } = {}
) {
  const { debounceMs = 300, enabled = true } = options;
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const triggerSync = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        try {
          onSyncRef.current();
        } catch (err) {
          console.warn('[useWindowVisibilitySync] Error during sync trigger:', err);
        }
      }, debounceMs);
    };

    // 1. React Native AppState listener (Active on Tablets & Mobile)
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        triggerSync();
      }
    });

    // 2. Web visibilitychange & window focus listeners (Browsers & PWA)
    let removeWebListeners = () => {};
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          triggerSync();
        }
      };

      const handleWindowFocus = () => {
        triggerSync();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleWindowFocus);

      removeWebListeners = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleWindowFocus);
      };
    }

    return () => {
      appStateSub.remove();
      removeWebListeners();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [debounceMs, enabled]);
}
