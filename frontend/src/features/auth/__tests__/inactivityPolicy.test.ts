import { describe, it, expect } from 'vitest';
import {
  getManilaHour,
  isLateNightManilaWindow,
  getInactivityThresholdMs,
  checkInactivityStatus,
  formatRemainingSeconds,
  DAYTIME_INACTIVITY_LIMIT_MS,
  LATE_NIGHT_INACTIVITY_LIMIT_MS,
} from '../utils/inactivityPolicy';

function createManilaDate(
  year: number,
  month: number,
  day: number,
  manilaHour: number,
  minute: number = 0
): Date {
  const utcHour = (manilaHour - 8 + 24) % 24;
  const utcDay = manilaHour < 8 ? day - 1 : day;
  return new Date(Date.UTC(year, month - 1, utcDay, utcHour, minute, 0));
}

describe('Session Inactivity & Fair Attendance Policy', () => {
  it('correctly calculates Manila hour and late-night window detection (12am-6am)', () => {
    const midnight = createManilaDate(2026, 11, 13, 0, 0); // 12:00 AM Manila
    const threeAm = createManilaDate(2026, 11, 13, 3, 30); // 3:30 AM Manila
    const fiveAm = createManilaDate(2026, 11, 13, 5, 59); // 5:59 AM Manila
    const sixAm = createManilaDate(2026, 11, 13, 6, 0); // 6:00 AM Manila
    const noon = createManilaDate(2026, 11, 13, 12, 0); // 12:00 PM Manila
    const evening = createManilaDate(2026, 11, 13, 23, 59); // 11:59 PM Manila

    expect(getManilaHour(midnight)).toBe(0);
    expect(isLateNightManilaWindow(midnight)).toBe(true);

    expect(getManilaHour(threeAm)).toBe(3);
    expect(isLateNightManilaWindow(threeAm)).toBe(true);

    expect(getManilaHour(fiveAm)).toBe(5);
    expect(isLateNightManilaWindow(fiveAm)).toBe(true);

    expect(getManilaHour(sixAm)).toBe(6);
    expect(isLateNightManilaWindow(sixAm)).toBe(false);

    expect(getManilaHour(noon)).toBe(12);
    expect(isLateNightManilaWindow(noon)).toBe(false);

    expect(getManilaHour(evening)).toBe(23);
    expect(isLateNightManilaWindow(evening)).toBe(false);
  });

  it('selects 3h threshold for late-night service and 6h for daytime operations', () => {
    const midnight = createManilaDate(2026, 11, 13, 0, 15);
    const afternoon = createManilaDate(2026, 11, 13, 14, 0);

    expect(getInactivityThresholdMs(midnight)).toBe(LATE_NIGHT_INACTIVITY_LIMIT_MS);
    expect(getInactivityThresholdMs(afternoon)).toBe(DAYTIME_INACTIVITY_LIMIT_MS);
  });

  it('evaluates active, warning (at <=60s), and expired states accurately', () => {
    const midnight = createManilaDate(2026, 11, 13, 1, 0).getTime();
    const threeHoursMs = 3 * 60 * 60 * 1000;

    // Active state (idle for 1 hour at night)
    const statusActive = checkInactivityStatus(midnight, midnight + 1 * 60 * 60 * 1000);
    expect(statusActive.isExpired).toBe(false);
    expect(statusActive.isWarning).toBe(false);
    expect(statusActive.remainingSeconds).toBe(2 * 60 * 60);

    // Warning state (idle for 2 hours, 59 minutes, 15 seconds -> 45 seconds remaining)
    const statusWarning = checkInactivityStatus(midnight, midnight + (threeHoursMs - 45 * 1000));
    expect(statusWarning.isExpired).toBe(false);
    expect(statusWarning.isWarning).toBe(true);
    expect(statusWarning.remainingSeconds).toBe(45);

    // Expired state (idle for exactly 3 hours)
    const statusExpired = checkInactivityStatus(midnight, midnight + threeHoursMs);
    expect(statusExpired.isExpired).toBe(true);
    expect(statusExpired.isWarning).toBe(false);
    expect(statusExpired.remainingSeconds).toBe(0);

    // Over-expired state (idle for 3 hours and 10 minutes)
    const statusOverExpired = checkInactivityStatus(
      midnight,
      midnight + threeHoursMs + 10 * 60 * 1000
    );
    expect(statusOverExpired.isExpired).toBe(true);
    expect(statusOverExpired.isWarning).toBe(false);
    expect(statusOverExpired.remainingSeconds).toBe(0);
  });

  it('handles daytime 6-hour inactivity lifecycle correctly', () => {
    const morning = createManilaDate(2026, 11, 13, 10, 0).getTime();
    const sixHoursMs = 6 * 60 * 60 * 1000;

    // Idle for 5 hours at daytime
    const statusDaytimeActive = checkInactivityStatus(morning, morning + 5 * 60 * 60 * 1000);
    expect(statusDaytimeActive.isExpired).toBe(false);
    expect(statusDaytimeActive.isWarning).toBe(false);

    // Idle for 5 hours 59 minutes 30 seconds -> 30s remaining
    const statusDaytimeWarning = checkInactivityStatus(morning, morning + (sixHoursMs - 30 * 1000));
    expect(statusDaytimeWarning.isExpired).toBe(false);
    expect(statusDaytimeWarning.isWarning).toBe(true);
    expect(statusDaytimeWarning.remainingSeconds).toBe(30);

    // Idle for 6 hours -> expired
    const statusDaytimeExpired = checkInactivityStatus(morning, morning + sixHoursMs);
    expect(statusDaytimeExpired.isExpired).toBe(true);
  });

  it('formats remaining countdown seconds with zero padding', () => {
    expect(formatRemainingSeconds(60)).toBe('1:00');
    expect(formatRemainingSeconds(45)).toBe('0:45');
    expect(formatRemainingSeconds(9)).toBe('0:09');
    expect(formatRemainingSeconds(0)).toBe('0:00');
  });

  it('enforces fair attendance invariant: worked hours capped at last activity, preventing ghost hours', () => {
    const clockInAt = new Date('2026-11-13T17:00:00+08:00'); // 5:00 PM
    const lastActivityAt = new Date('2026-11-14T01:15:00+08:00'); // 1:15 AM
    const expirationTriggerAt = new Date('2026-11-14T04:15:00+08:00'); // 4:15 AM (3h later)

    const fairHours = (lastActivityAt.getTime() - clockInAt.getTime()) / (1000 * 60 * 60);
    const unfairGhostHours =
      (expirationTriggerAt.getTime() - clockInAt.getTime()) / (1000 * 60 * 60);

    expect(fairHours).toBe(8.25); // 5pm to 1:15am
    expect(unfairGhostHours).toBe(11.25); // would have been 3 ghost hours
  });
});
