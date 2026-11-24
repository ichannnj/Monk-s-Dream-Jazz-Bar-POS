import type { VenueSettings } from '../../../data/admin.types';

export interface OvertimePolicy {
  standardShiftHours: number;
  graceMinutes: number;
  rateMode: 'MULTIPLIER' | 'FLAT_HOURLY';
  multiplier: number;
  flatHourlyRate: number;
}

export interface ComputedShiftOvertime {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  overtimeRateApplied: number;
  overtimePay: number;
}

export const DEFAULT_OVERTIME_POLICY: OvertimePolicy = {
  standardShiftHours: 8,
  graceMinutes: 15,
  rateMode: 'MULTIPLIER',
  multiplier: 1.25,
  flatHourlyRate: 100,
};

export function extractOvertimePolicy(settings?: Partial<VenueSettings> | null): OvertimePolicy {
  return {
    standardShiftHours: Number(settings?.standard_shift_hours ?? 8) || 8,
    graceMinutes: Number(settings?.overtime_grace_minutes ?? 15) || 0,
    rateMode: settings?.overtime_rate_mode === 'FLAT_HOURLY' ? 'FLAT_HOURLY' : 'MULTIPLIER',
    multiplier: Number(settings?.overtime_multiplier ?? 1.25) || 1.25,
    flatHourlyRate: Number(settings?.overtime_flat_hourly_rate ?? 100) || 0,
  };
}

export function computeHoursBetweenIso(startIso?: string | null, endIso?: string | null): number {
  if (!startIso || !endIso) return 0;
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 0;
  return Math.round(((endMs - startMs) / 3600000) * 100) / 100;
}

export function computeShiftOvertime(params: {
  hoursWorked: number;
  baseDailyPay: number;
  isAdmin: boolean;
  userOtOverride?: number | null;
  policy?: OvertimePolicy;
}): ComputedShiftOvertime {
  const totalHours = Math.max(0, Math.round((params.hoursWorked || 0) * 100) / 100);
  if (params.isAdmin) {
    return {
      totalHours,
      regularHours: totalHours,
      overtimeHours: 0,
      overtimeRateApplied: 0,
      overtimePay: 0,
    };
  }

  const policy = params.policy || DEFAULT_OVERTIME_POLICY;
  const stdHours = Math.max(1, policy.standardShiftHours);

  let rate: number;
  if (params.userOtOverride != null && params.userOtOverride >= 0) {
    rate = Math.round(params.userOtOverride * 100) / 100;
  } else if (policy.rateMode === 'FLAT_HOURLY') {
    rate = Math.round(policy.flatHourlyRate * 100) / 100;
  } else {
    rate = Math.round((params.baseDailyPay / stdHours) * policy.multiplier * 100) / 100;
  }

  const excessMins = (totalHours - stdHours) * 60;
  if (excessMins > policy.graceMinutes) {
    const overtimeHours = Math.round((totalHours - stdHours) * 100) / 100;
    const overtimePay = Math.round(overtimeHours * rate * 100) / 100;
    return {
      totalHours,
      regularHours: stdHours,
      overtimeHours,
      overtimeRateApplied: rate,
      overtimePay,
    };
  }

  return {
    totalHours,
    regularHours: totalHours,
    overtimeHours: 0,
    overtimeRateApplied: rate,
    overtimePay: 0,
  };
}

/**
 * Formats an ISO timestamp into `YYYY-MM-DDTHH:mm` in Asia/Manila (UTC+8)
 * for datetime-local inputs.
 */
export function toManilaDateTimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const manila = new Date(ms + 8 * 60 * 60 * 1000);
  const y = manila.getUTCFullYear();
  const m = String(manila.getUTCMonth() + 1).padStart(2, '0');
  const d = String(manila.getUTCDate()).padStart(2, '0');
  const hh = String(manila.getUTCHours()).padStart(2, '0');
  const mm = String(manila.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

/**
 * Converts a `YYYY-MM-DDTHH:mm` Manila wall-clock string into a UTC ISO string.
 */
export function manilaDateTimeLocalToIso(localStr: string): string | null {
  if (!localStr || !localStr.includes('T')) return null;
  const [datePart, timePart] = localStr.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - 8 * 60 * 60 * 1000;
  return new Date(utcMs).toISOString();
}
