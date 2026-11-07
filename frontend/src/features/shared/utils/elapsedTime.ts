import { useState, useEffect } from 'react';

type TickListener = (nowMs: number) => void;

const listeners = new Set<TickListener>();
let globalIntervalId: ReturnType<typeof setInterval> | null = null;
let latestNowMs = Date.now();

function startGlobalTicker() {
  if (globalIntervalId !== null) return;
  globalIntervalId = setInterval(() => {
    latestNowMs = Date.now();
    listeners.forEach((listener) => listener(latestNowMs));
  }, 1000);
}

function stopGlobalTickerIfIdle() {
  if (listeners.size === 0 && globalIntervalId !== null) {
    clearInterval(globalIntervalId);
    globalIntervalId = null;
  }
}

/**
 * Subscribes a component to the shared 1-second POS real-time clock.
 * All mounted cards/tickets share a single JS interval for zero-overhead synchronization.
 */
export function useLiveNow(enabled = true): number {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!enabled) return;

    const listener: TickListener = (tickMs) => {
      setNowMs(tickMs);
    };

    listeners.add(listener);
    startGlobalTicker();

    return () => {
      listeners.delete(listener);
      stopGlobalTickerIfIdle();
    };
  }, [enabled]);

  return nowMs;
}

/**
 * Parses a legacy fallback string such as "5m", "04:12", or "1:02:10" into seconds.
 */
export function parseFallbackDurationSeconds(fallbackText?: string | null): number {
  if (!fallbackText) return 0;
  const trimmed = fallbackText.trim();
  if (!trimmed || trimmed === '0m' || trimmed === '00:00' || trimmed === 'Idle') return 0;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
  }

  const numMinutes = parseInt(trimmed.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(numMinutes) && numMinutes > 0 ? numMinutes * 60 : 60;
}

/**
 * Computes authoritative elapsed seconds from an ISO timestamp (PostgreSQL created_at).
 */
export function getElapsedSeconds(
  isoTimestamp?: string | null,
  fallbackText?: string | null,
  nowMs: number = Date.now()
): number {
  if (isoTimestamp) {
    const parsedMs = new Date(isoTimestamp).getTime();
    if (Number.isFinite(parsedMs) && parsedMs > 0) {
      return Math.max(1, Math.floor((nowMs - parsedMs) / 1000));
    }
  }
  return parseFallbackDurationSeconds(fallbackText);
}

/**
 * Formats elapsed seconds into tabular live stopwatch format:
 * - Under 60 minutes: "MM:SS" (e.g. "04:18")
 * - 60+ minutes: "H:MM:SS" (e.g. "1:04:18")
 */
export function formatElapsedTimer(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const seconds = safeSec % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Returns elapsed minutes (minimum 1 when active) for FIFO ticket sorting.
 */
export function getElapsedMinutes(
  isoTimestamp?: string | null,
  fallbackText?: string | null,
  nowMs: number = Date.now()
): number {
  const sec = getElapsedSeconds(isoTimestamp, fallbackText, nowMs);
  return Math.max(1, Math.ceil(sec / 60));
}

export type TimerUrgency = 'normal' | 'warning' | 'late';

/**
 * Evaluates SLA urgency against station target times:
 * - runner: 03:00 (180s)
 * - cafe: 06:00 (360s)
 * - bar: 10:00 (600s)
 * - kitchen: 15:00 (900s)
 * - floor: 15:00 (900s)
 */
export function getTimerUrgency(
  totalSeconds: number,
  stationTarget: 'bar' | 'cafe' | 'kitchen' | 'runner' | 'floor' = 'bar'
): TimerUrgency {
  const thresholds: Record<
    'bar' | 'cafe' | 'kitchen' | 'runner' | 'floor',
    { warn: number; urgent: number }
  > = {
    runner: { warn: 120, urgent: 180 },
    cafe: { warn: 240, urgent: 360 },
    bar: { warn: 420, urgent: 600 },
    kitchen: { warn: 600, urgent: 900 },
    floor: { warn: 600, urgent: 900 },
  };

  const t = thresholds[stationTarget] || thresholds.bar;
  if (totalSeconds >= t.urgent) return 'late';
  if (totalSeconds >= t.warn) return 'warning';
  return 'normal';
}

/**
 * Computes real-time ticking station average turnaround time, live active queue timer,
 * and overdue ticket count from active ticket ISO timestamps.
 * If the station is offline or has no active tickets, live active timers do not tick.
 */
export function getLiveStationTurnaround(
  stationKey: string,
  activeTicketTimestamps?: string[],
  fallbackAvg: string = 'Idle',
  fallbackLate: number = 0,
  nowMs: number = Date.now(),
  isStationOnline: boolean = true
): { avgTicketTime: string; liveActiveTime: string; lateTickets: number } {
  const slaSecondsMap: Record<string, number> = {
    runner: 180,
    bar: 600,
    kitchen: 900,
  };
  const slaThreshold = slaSecondsMap[stationKey] || 600;

  // When offline or no tickets exist, preserve completed turnaround and stop live active ticking
  if (!isStationOnline || !activeTicketTimestamps || activeTicketTimestamps.length === 0) {
    return {
      avgTicketTime: fallbackAvg || 'Idle',
      liveActiveTime: 'Idle',
      lateTickets: fallbackLate || 0,
    };
  }

  let elapsedSum = 0;
  let lateCount = 0;

  for (const iso of activeTicketTimestamps) {
    const sec = getElapsedSeconds(iso, undefined, nowMs);
    elapsedSum += sec;
    if (sec > slaThreshold) {
      lateCount++;
    }
  }

  const liveActiveTime = formatElapsedTimer(elapsedSum / activeTicketTimestamps.length);

  return {
    avgTicketTime: fallbackAvg || 'Idle',
    liveActiveTime,
    lateTickets: lateCount,
  };
}

/**
 * Hook that returns a live-ticking timer for any order, round, table, or KDS ticket.
 */
export function useLiveElapsedTimer(
  isoTimestamp?: string | null,
  fallbackText?: string | null,
  stationTarget: 'bar' | 'cafe' | 'kitchen' | 'runner' | 'floor' = 'bar',
  enabled = true
) {
  const nowMs = useLiveNow(enabled);
  const totalSeconds = enabled ? getElapsedSeconds(isoTimestamp, fallbackText, nowMs) : 0;
  const formatted = enabled ? formatElapsedTimer(totalSeconds) : '00:00';
  const minutesElapsed = enabled ? Math.max(1, Math.ceil(totalSeconds / 60)) : 0;
  const urgency = getTimerUrgency(totalSeconds, stationTarget);

  return {
    formatted,
    formattedTimer: formatted,
    totalSeconds,
    minutesElapsed,
    urgency,
    nowMs,
  };
}
