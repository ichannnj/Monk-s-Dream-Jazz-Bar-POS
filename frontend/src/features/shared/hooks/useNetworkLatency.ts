import { useState, useEffect, useRef } from 'react';
import { systemApi, type SystemHealthStatus } from '../infrastructure/system.api';

export interface NetworkLatencyState {
  isSlow: boolean;
  isOffline: boolean;
  latencyMs: number | null;
  status: 'ok' | 'degraded' | 'offline';
}

/**
 * Monitors network latency and connection state.
 * Flags a connection as slow when roundtrip latency exceeds 2,500ms or health status is degraded.
 */
export function useNetworkLatency(pingIntervalMs = 20000): NetworkLatencyState {
  const [state, setState] = useState<NetworkLatencyState>({
    isSlow: false,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    latencyMs: null,
    status: 'ok',
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const handleOnline = () => {
      if (!isMountedRef.current) return;
      setState((prev) => ({ ...prev, isOffline: false }));
      checkLatency();
    };

    const handleOffline = () => {
      if (!isMountedRef.current) return;
      setState((prev) => ({ ...prev, isOffline: true, isSlow: true, status: 'offline' }));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    const checkLatency = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (isMountedRef.current) {
          setState({ isSlow: true, isOffline: true, latencyMs: null, status: 'offline' });
        }
        return;
      }

      try {
        const health: SystemHealthStatus = await systemApi.checkHealth();
        if (!isMountedRef.current) return;

        const isSlow =
          health.status === 'degraded' ||
          health.status === 'offline' ||
          (health.latencyMs !== undefined && health.latencyMs > 2500);

        setState({
          isSlow,
          isOffline: health.status === 'offline',
          latencyMs: health.latencyMs ?? null,
          status: health.status,
        });
      } catch {
        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, isSlow: true, status: 'degraded' }));
        }
      }
    };

    // Initial check
    checkLatency();

    const interval = setInterval(checkLatency, pingIntervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [pingIntervalMs]);

  return state;
}
