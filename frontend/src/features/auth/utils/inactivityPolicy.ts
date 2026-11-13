/**
 * Monk's Dream Jazz Bar POS — Session Inactivity Policy Engine
 *
 * Implements authoritative session timeout calculations aligned with:
 * - 6-hour standard daytime inactivity threshold (6:00 AM - 11:59 PM Asia/Manila)
 * - 3-hour late-night inactivity threshold (12:00 AM - 6:00 AM Asia/Manila)
 * - 60-second interactive warning countdown before session expiration
 * - Fair labor accounting: clock_out_at anchored to last active timestamp
 */

export const DAYTIME_INACTIVITY_LIMIT_MS = 6 * 60 * 60 * 1000; // 6 hours (21,600,000 ms)
export const LATE_NIGHT_INACTIVITY_LIMIT_MS = 3 * 60 * 60 * 1000; // 3 hours (10,800,000 ms)
export const WARNING_WINDOW_SECONDS = 60; // 60 seconds advance warning
export const ACTIVITY_SYNC_THROTTLE_MS = 5 * 60 * 1000; // Throttled server touch: 5 minutes

/**
 * Returns current hour (0-23) in Asia/Manila timezone (UTC+8).
 * Resilient against environments where Intl timezone data may be restricted.
 */
export function getManilaHour(date: Date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      hour12: false,
    });
    const formatted = formatter.format(date);
    const hour = parseInt(formatted, 10);
    return isNaN(hour) ? (date.getUTCHours() + 8) % 24 : hour % 24;
  } catch {
    return (date.getUTCHours() + 8) % 24;
  }
}

/**
 * Determines whether the given date falls into the late-night closing window
 * (12:00:00 AM midnight through 05:59:59 AM Asia/Manila).
 */
export function isLateNightManilaWindow(date: Date = new Date()): boolean {
  const manilaHour = getManilaHour(date);
  return manilaHour >= 0 && manilaHour < 6;
}

/**
 * Returns the authoritative inactivity threshold in milliseconds based on Manila time of day:
 * - 3 hours (10,800,000 ms) between 12:00 AM and 6:00 AM
 * - 6 hours (21,600,000 ms) during daytime service (6:00 AM to 11:59 PM)
 */
export function getInactivityThresholdMs(date: Date = new Date()): number {
  return isLateNightManilaWindow(date)
    ? LATE_NIGHT_INACTIVITY_LIMIT_MS
    : DAYTIME_INACTIVITY_LIMIT_MS;
}

export interface InactivityStatus {
  isExpired: boolean;
  isWarning: boolean;
  idleDurationMs: number;
  remainingMs: number;
  remainingSeconds: number;
  thresholdMs: number;
  isLateNight: boolean;
}

/**
 * Evaluates the session inactivity state given last activity and current time.
 */
export function checkInactivityStatus(
  lastActivityMs: number,
  currentMs: number = Date.now(),
  customThresholdMs?: number
): InactivityStatus {
  const currentDate = new Date(currentMs);
  const isLateNight = isLateNightManilaWindow(currentDate);
  const thresholdMs = customThresholdMs ?? getInactivityThresholdMs(currentDate);
  const idleDurationMs = Math.max(0, currentMs - lastActivityMs);
  const remainingMs = Math.max(0, thresholdMs - idleDurationMs);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  const isExpired = idleDurationMs >= thresholdMs;
  const isWarning = !isExpired && remainingSeconds <= WARNING_WINDOW_SECONDS;

  return {
    isExpired,
    isWarning,
    idleDurationMs,
    remainingMs,
    remainingSeconds,
    thresholdMs,
    isLateNight,
  };
}

/**
 * Formats seconds remaining into MM:SS for user display.
 */
export function formatRemainingSeconds(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
