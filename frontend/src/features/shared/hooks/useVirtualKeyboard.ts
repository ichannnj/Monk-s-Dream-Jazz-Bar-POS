import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

export interface VirtualKeyboardState {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
  viewportHeight: number;
  dismissKeyboard: () => void;
  scrollActiveInputIntoView: (targetElement?: HTMLElement | null, buffer?: number) => void;
}

/**
 * Reusable reactive hook to monitor virtual/software keyboard appearance on touch screen devices.
 * Uses window.visualViewport on Web/Mobile browsers to track actual available screen height,
 * calculate keyboard height, and provide smooth auto-scroll into view with safe breathing room.
 */
export function useVirtualKeyboard(): VirtualKeyboardState {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.visualViewport?.height || window.innerHeight;
    }
    return 800;
  });

  const dismissKeyboard = useCallback(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable)
      ) {
        activeEl.blur();
      }
    }
  }, []);

  const scrollActiveInputIntoView = useCallback(
    (targetElement?: HTMLElement | null, buffer = 32) => {
      if (Platform.OS !== 'web' || typeof window === 'undefined') return;

      const el = targetElement || (document.activeElement as HTMLElement | null);
      if (!el) return;

      setTimeout(() => {
        try {
          if (typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        } catch {
          // Fallback if smooth scrolling is not supported
          el.scrollIntoView(true);
        }
      }, 50);
    },
    []
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const handleViewportChange = () => {
      const currentHeight = visualViewport.height;
      const windowHeight = window.innerHeight;
      const diff = windowHeight - currentHeight;

      // When the virtual keyboard appears on mobile devices, diff is typically > 100px
      const open = diff > 100;
      setIsKeyboardOpen(open);
      setKeyboardHeight(open ? diff : 0);
      setViewportHeight(currentHeight);

      // If keyboard opened and an input is focused, smoothly auto-scroll into view
      if (open) {
        const active = document.activeElement as HTMLElement | null;
        if (
          active &&
          (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
        ) {
          scrollActiveInputIntoView(active, 32);
        }
      }
    };

    visualViewport.addEventListener('resize', handleViewportChange);
    visualViewport.addEventListener('scroll', handleViewportChange);

    return () => {
      visualViewport.removeEventListener('resize', handleViewportChange);
      visualViewport.removeEventListener('scroll', handleViewportChange);
    };
  }, [scrollActiveInputIntoView]);

  return {
    isKeyboardOpen,
    keyboardHeight,
    viewportHeight,
    dismissKeyboard,
    scrollActiveInputIntoView,
  };
}
