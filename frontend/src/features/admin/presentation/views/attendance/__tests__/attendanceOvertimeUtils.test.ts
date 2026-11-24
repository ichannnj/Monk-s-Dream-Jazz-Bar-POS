import { describe, it, expect } from 'vitest';
import {
  computeHoursBetweenIso,
  computeShiftOvertime,
  manilaDateTimeLocalToIso,
  toManilaDateTimeLocal,
  type OvertimePolicy,
} from '../attendanceOvertimeUtils';

describe('attendanceOvertimeUtils', () => {
  const defaultPolicy: OvertimePolicy = {
    standardShiftHours: 8,
    graceMinutes: 15,
    rateMode: 'MULTIPLIER',
    multiplier: 1.25,
    flatHourlyRate: 100,
  };

  it('computes overnight shift duration accurately', () => {
    const start = manilaDateTimeLocalToIso('2026-11-24T18:00');
    const end = manilaDateTimeLocalToIso('2026-11-25T02:30');
    expect(computeHoursBetweenIso(start, end)).toBe(8.5);
  });

  it('round-trips Manila datetime-local strings', () => {
    const iso = manilaDateTimeLocalToIso('2026-11-24T21:45');
    expect(iso).toBeTruthy();
    expect(toManilaDateTimeLocal(iso)).toBe('2026-11-24T21:45');
  });

  it('respects overtime grace period', () => {
    const withinGrace = computeShiftOvertime({
      hoursWorked: 8.2, // 12 mins over 8h (< 15m grace)
      baseDailyPay: 645,
      isAdmin: false,
      policy: defaultPolicy,
    });
    expect(withinGrace.overtimeHours).toBe(0);
    expect(withinGrace.overtimePay).toBe(0);

    const pastGrace = computeShiftOvertime({
      hoursWorked: 9.5,
      baseDailyPay: 645,
      isAdmin: false,
      policy: defaultPolicy,
    });
    // 645 / 8 * 1.25 = 100.78/hr * 1.5h = 151.17
    expect(pastGrace.regularHours).toBe(8);
    expect(pastGrace.overtimeHours).toBe(1.5);
    expect(pastGrace.overtimeRateApplied).toBe(100.78);
    expect(pastGrace.overtimePay).toBe(151.17);
  });

  it('supports FLAT_HOURLY mode and per-staff override', () => {
    const flat = computeShiftOvertime({
      hoursWorked: 10,
      baseDailyPay: 645,
      isAdmin: false,
      policy: { ...defaultPolicy, rateMode: 'FLAT_HOURLY', flatHourlyRate: 120 },
    });
    expect(flat.overtimeHours).toBe(2);
    expect(flat.overtimePay).toBe(240);

    const override = computeShiftOvertime({
      hoursWorked: 10,
      baseDailyPay: 645,
      isAdmin: false,
      userOtOverride: 150,
      policy: defaultPolicy,
    });
    expect(override.overtimePay).toBe(300);
  });

  it('exempts admin accounts from overtime pay', () => {
    const res = computeShiftOvertime({
      hoursWorked: 12,
      baseDailyPay: 0,
      isAdmin: true,
      policy: defaultPolicy,
    });
    expect(res.overtimeHours).toBe(0);
    expect(res.overtimePay).toBe(0);
  });
});
