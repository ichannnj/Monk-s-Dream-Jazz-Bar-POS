import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from './useAuthStore';
import { authApi } from '../data/auth.api';
import { toast } from '../../shared/toast/useToastStore';
import {
  checkInactivityStatus,
  ACTIVITY_SYNC_THROTTLE_MS,
  type InactivityStatus,
} from '../utils/inactivityPolicy';

function playWarningChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Graceful fallback if Web Audio is restricted by browser policy
  }
}

export function useInactivityWatchdog(enabled: boolean = true) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  const [status, setStatus] = useState<InactivityStatus>(() =>
    checkInactivityStatus(Date.now(), Date.now())
  );

  const lastActivityMsRef = useRef<number>(Date.now());
  const lastSyncMsRef = useRef<number>(Date.now());
  const isWarningChimedRef = useRef<boolean>(false);
  const isExecutingLogoutRef = useRef<boolean>(false);

  // Reset activity timestamp locally and sync to database if throttled window passed
  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityMsRef.current = now;
    isWarningChimedRef.current = false;

    // Throttled database touch
    if (currentUser?.id && now - lastSyncMsRef.current >= ACTIVITY_SYNC_THROTTLE_MS) {
      lastSyncMsRef.current = now;
      authApi.touchActivity(currentUser.id).catch(() => {});
    }
  }, [currentUser?.id]);

  // Explicit action when user clicks "Stay Signed In"
  const staySignedIn = useCallback(() => {
    recordActivity();
    if (currentUser?.id) {
      authApi.touchActivity(currentUser.id).catch(() => {});
    }
    setStatus(checkInactivityStatus(Date.now(), Date.now()));
  }, [recordActivity, currentUser?.id]);

  // Execute clean auto-logout and fair attendance clock-out
  const handleAutoLogout = useCallback(async () => {
    if (isExecutingLogoutRef.current) return;
    isExecutingLogoutRef.current = true;

    const user = currentUser;
    const lastActiveIso = new Date(lastActivityMsRef.current).toISOString();

    try {
      if (user?.id) {
        // Auto clock out attendance record with clock_out_at anchored to last activity
        await authApi.autoClockOutInactiveUser(user.id, lastActiveIso);
      }
    } catch (err) {
      console.warn('[InactivityWatchdog] Error closing attendance:', err);
    } finally {
      logout();
      toast.info('Session signed out due to inactivity. Attendance record updated.', {
        title: 'Auto Sign Out',
      });
      isExecutingLogoutRef.current = false;
    }
  }, [currentUser, logout]);

  // Manual sign out now from warning modal
  const signOutNow = useCallback(() => {
    handleAutoLogout();
  }, [handleAutoLogout]);

  // Register global DOM interaction listeners on web
  useEffect(() => {
    if (!enabled || !currentUser || typeof window === 'undefined') return;

    const handleDomEvent = () => recordActivity();

    window.addEventListener('mousemove', handleDomEvent, { passive: true });
    window.addEventListener('mousedown', handleDomEvent, { passive: true });
    window.addEventListener('keydown', handleDomEvent, { passive: true });
    window.addEventListener('touchstart', handleDomEvent, { passive: true });
    window.addEventListener('pointerdown', handleDomEvent, { passive: true });
    window.addEventListener('scroll', handleDomEvent, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleDomEvent);
      window.removeEventListener('mousedown', handleDomEvent);
      window.removeEventListener('keydown', handleDomEvent);
      window.removeEventListener('touchstart', handleDomEvent);
      window.removeEventListener('pointerdown', handleDomEvent);
      window.removeEventListener('scroll', handleDomEvent);
    };
  }, [enabled, currentUser, recordActivity]);

  // Evaluate inactivity state every second and on visibility wake-up
  useEffect(() => {
    if (!enabled || !currentUser) {
      return;
    }

    const evaluateState = () => {
      const now = Date.now();
      const nextStatus = checkInactivityStatus(lastActivityMsRef.current, now);
      setStatus(nextStatus);

      if (nextStatus.isWarning && !isWarningChimedRef.current) {
        isWarningChimedRef.current = true;
        playWarningChime();
      }

      if (nextStatus.isExpired) {
        handleAutoLogout();
      }
    };

    const intervalId = setInterval(evaluateState, 1000);

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        evaluateState();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('focus', handleVisibility);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('focus', handleVisibility);
      }
    };
  }, [enabled, currentUser, handleAutoLogout]);

  return {
    isWarning: status.isWarning,
    remainingSeconds: status.remainingSeconds,
    isLateNight: status.isLateNight,
    staySignedIn,
    signOutNow,
    recordActivity,
  };
}
