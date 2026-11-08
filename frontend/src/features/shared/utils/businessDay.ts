/**
 * Business Day Contract — single source of truth.
 *
 * Monk's Dream operates on an Asia/Manila business day that starts at 06:00.
 * A sale rung at 01:30 belongs to the previous business date (jazz-bar close).
 * Every Admin dashboard, report, Excel export and attendance query MUST use
 * these helpers instead of hand-rolled `new Date(...).toISOString()` math.
 *
 * Asia/Manila has no DST and is a fixed UTC+08:00 offset, so all conversions
 * are deterministic and do not depend on the device/browser timezone.
 */

export const MANILA_TIME_ZONE = 'Asia/Manila';
export const BUSINESS_DAY_CUTOFF_HOUR = 6;

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const CUTOFF_MS = BUSINESS_DAY_CUTOFF_HOUR * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function toInstantMs(value: Date | string | number = new Date()): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

/** Manila wall-clock timestamp expressed as a UTC epoch (for date-part math). */
function manilaWallClockMs(instantMs: number): number {
  return instantMs + MANILA_OFFSET_MS;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Returns the Manila business date (YYYY-MM-DD) that an instant belongs to.
 * Anything before 06:00 Manila resolves to the previous calendar date.
 */
export function toBusinessDate(instant: Date | string | number = new Date()): string {
  const shifted = new Date(manilaWallClockMs(toInstantMs(instant)) - CUTOFF_MS);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/** Alias kept for callers that used the previous admin helper name. */
export const getManilaBusinessDateString = toBusinessDate;

/** Converts a business date (YYYY-MM-DD) to the UTC instant of its 06:00 opening. */
export function businessDateStartMs(businessDate: string): number {
  const [year, month, day] = businessDate.split('-').map(Number);
  if (!year || !month || !day) return Date.now();
  // 06:00 Manila === 22:00 UTC of the previous calendar date.
  return Date.UTC(year, month - 1, day, BUSINESS_DAY_CUTOFF_HOUR) - MANILA_OFFSET_MS;
}

/** UTC instant at which the business day containing `instant` opened. */
export function getBusinessDayStartMs(instant: Date | string | number = new Date()): number {
  const instantMs = toInstantMs(instant);
  const wall = manilaWallClockMs(instantMs);
  const wallDate = new Date(wall);
  const midnightWall = Date.UTC(
    wallDate.getUTCFullYear(),
    wallDate.getUTCMonth(),
    wallDate.getUTCDate()
  );
  const cutoffWall = midnightWall + CUTOFF_MS;
  const startWall = wall >= cutoffWall ? cutoffWall : cutoffWall - DAY_MS;
  return startWall - MANILA_OFFSET_MS;
}

/** UTC instant at which the business day containing `instant` closes (next 06:00). */
export function getBusinessDayEndMs(instant: Date | string | number = new Date()): number {
  return getBusinessDayStartMs(instant) + DAY_MS;
}

/** Adds a number of business days to a business date string. */
export function addBusinessDays(businessDate: string, days: number): string {
  return toBusinessDate(businessDateStartMs(businessDate) + days * DAY_MS + 1000);
}

export function isSameBusinessDate(a: Date | string | number, b: Date | string | number): boolean {
  return toBusinessDate(a) === toBusinessDate(b);
}

export function isFutureBusinessDate(businessDate: string, now: Date = new Date()): boolean {
  return businessDate > toBusinessDate(now);
}

// ---------------------------------------------------------------------------
// Analytics timeframe bounds (Dashboard, Reports, Excel)
// ---------------------------------------------------------------------------

export type AnalyticsTimeframe = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export interface DateBounds {
  /** Inclusive UTC ISO start (undefined = unbounded history). */
  startDate?: string;
  /** Exclusive UTC ISO end (undefined = live / open ended). */
  endDate?: string;
  /** Inclusive business-date start (YYYY-MM-DD) for attendance-style columns. */
  businessStartDate?: string;
  /** Inclusive business-date end (YYYY-MM-DD). */
  businessEndDate?: string;
  label: string;
  benchmarkLabel: string;
  benchmarkStart?: string;
  benchmarkEnd?: string;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function currentBusinessWeekStart(now: Date): string {
  const businessDate = toBusinessDate(now);
  const [year, month, day] = businessDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0=Sun
  const distanceToMonday = (weekday + 6) % 7;
  return toBusinessDate(businessDateStartMs(businessDate) - distanceToMonday * DAY_MS + 1000);
}

export function getAnalyticsBounds(
  timeframe: AnalyticsTimeframe,
  now: Date = new Date()
): DateBounds {
  const nowMs = now.getTime();
  const todayOpen = getBusinessDayStartMs(nowMs);

  if (timeframe === 'today') {
    const startMs = todayOpen;
    const benchmarkStartMs = startMs - 7 * DAY_MS;
    return {
      startDate: iso(startMs),
      businessStartDate: toBusinessDate(startMs),
      businessEndDate: toBusinessDate(startMs),
      label: 'Today (Live Shift)',
      benchmarkLabel: 'vs Same Day Last Week',
      benchmarkStart: iso(benchmarkStartMs),
      benchmarkEnd: iso(benchmarkStartMs + DAY_MS),
    };
  }

  if (timeframe === 'yesterday') {
    const startMs = todayOpen - DAY_MS;
    const benchmarkStartMs = startMs - 7 * DAY_MS;
    return {
      startDate: iso(startMs),
      endDate: iso(todayOpen),
      businessStartDate: toBusinessDate(startMs),
      businessEndDate: toBusinessDate(startMs),
      label: 'Yesterday',
      benchmarkLabel: 'vs Prior Week Same Day',
      benchmarkStart: iso(benchmarkStartMs),
      benchmarkEnd: iso(benchmarkStartMs + DAY_MS),
    };
  }

  if (timeframe === 'week') {
    const weekBusinessDate = currentBusinessWeekStart(now);
    const startMs = businessDateStartMs(weekBusinessDate);
    const benchmarkStartMs = startMs - 7 * DAY_MS;
    return {
      startDate: iso(startMs),
      endDate: iso(todayOpen + DAY_MS),
      businessStartDate: weekBusinessDate,
      businessEndDate: toBusinessDate(nowMs),
      label: 'This Week',
      benchmarkLabel: 'vs Prior Week',
      benchmarkStart: iso(benchmarkStartMs),
      benchmarkEnd: iso(benchmarkStartMs + 7 * DAY_MS),
    };
  }

  if (timeframe === 'month') {
    const businessDate = toBusinessDate(nowMs);
    const [year, month] = businessDate.split('-').map(Number);
    const monthStartBusinessDate = `${year}-${pad2(month)}-01`;
    const startMs = businessDateStartMs(monthStartBusinessDate);
    const previousMonthStartBusinessDate =
      month === 1 ? `${year - 1}-12-01` : `${year}-${pad2(month - 1)}-01`;
    return {
      startDate: iso(startMs),
      endDate: iso(todayOpen + DAY_MS),
      businessStartDate: monthStartBusinessDate,
      businessEndDate: businessDate,
      label: 'This Month',
      benchmarkLabel: 'vs Prior Month',
      benchmarkStart: iso(businessDateStartMs(previousMonthStartBusinessDate)),
      benchmarkEnd: iso(startMs),
    };
  }

  return {
    label: 'All Time Archive',
    benchmarkLabel: 'Historical Ledger',
  };
}

// ---------------------------------------------------------------------------
// Reports & Fiscal Hub timeframe bounds (period pickers)
// ---------------------------------------------------------------------------

export type ReportPeriod =
  | 'daily'
  | 'yesterday'
  | 'weekly'
  | 'select_week'
  | 'monthly'
  | 'select_month'
  | 'yearly'
  | 'custom';

export function getReportBounds(
  period: ReportPeriod,
  specificDate: string,
  selectedWeekRange: { startStr: string; endStr: string } | null,
  selectedMonthYear: { year: number; month: number },
  now: Date = new Date()
): DateBounds {
  const nowMs = now.getTime();
  const todayOpen = getBusinessDayStartMs(nowMs);
  const todayBusinessDate = toBusinessDate(nowMs);

  switch (period) {
    case 'daily':
      return {
        startDate: iso(todayOpen),
        endDate: iso(todayOpen + DAY_MS),
        businessStartDate: todayBusinessDate,
        businessEndDate: todayBusinessDate,
        label: 'Today (Daily)',
        benchmarkLabel: 'vs Previous Day',
      };

    case 'yesterday': {
      const startMs = todayOpen - DAY_MS;
      return {
        startDate: iso(startMs),
        endDate: iso(todayOpen),
        businessStartDate: toBusinessDate(startMs),
        businessEndDate: toBusinessDate(startMs),
        label: 'Yesterday',
        benchmarkLabel: 'vs Day Before',
      };
    }

    case 'weekly': {
      const weekBusinessDate = currentBusinessWeekStart(now);
      return {
        startDate: iso(businessDateStartMs(weekBusinessDate)),
        endDate: iso(todayOpen + DAY_MS),
        businessStartDate: weekBusinessDate,
        businessEndDate: todayBusinessDate,
        label: 'This Week (WTD)',
        benchmarkLabel: 'vs Prior Week',
      };
    }

    case 'select_week': {
      if (!selectedWeekRange) {
        return { label: 'Specific Week', benchmarkLabel: 'Historical' };
      }
      const startBusinessDate = toBusinessDate(selectedWeekRange.startStr);
      const endBusinessDate = toBusinessDate(selectedWeekRange.endStr);
      const startMs = businessDateStartMs(startBusinessDate);
      return {
        startDate: iso(startMs),
        endDate: iso(businessDateStartMs(endBusinessDate) + DAY_MS),
        businessStartDate: startBusinessDate,
        businessEndDate: endBusinessDate,
        label: 'Specific Week',
        benchmarkLabel: 'Historical',
      };
    }

    case 'monthly': {
      const [year, month] = todayBusinessDate.split('-').map(Number);
      return {
        startDate: iso(businessDateStartMs(`${year}-${pad2(month)}-01`)),
        endDate: iso(todayOpen + DAY_MS),
        businessStartDate: `${year}-${pad2(month)}-01`,
        businessEndDate: todayBusinessDate,
        label: 'This Month (MTD)',
        benchmarkLabel: 'vs Prior Month',
      };
    }

    case 'select_month': {
      const startBusinessDate = `${selectedMonthYear.year}-${pad2(selectedMonthYear.month + 1)}-01`;
      const nextMonthStartBusinessDate =
        selectedMonthYear.month === 11
          ? `${selectedMonthYear.year + 1}-01-01`
          : `${selectedMonthYear.year}-${pad2(selectedMonthYear.month + 2)}-01`;
      return {
        startDate: iso(businessDateStartMs(startBusinessDate)),
        endDate: iso(businessDateStartMs(nextMonthStartBusinessDate)),
        businessStartDate: startBusinessDate,
        businessEndDate: toBusinessDate(
          businessDateStartMs(nextMonthStartBusinessDate) - DAY_MS + 1000
        ),
        label: 'Selected Month',
        benchmarkLabel: 'Historical',
      };
    }

    case 'yearly': {
      const year = Number(todayBusinessDate.slice(0, 4));
      return {
        startDate: iso(businessDateStartMs(`${year}-01-01`)),
        endDate: iso(todayOpen + DAY_MS),
        businessStartDate: `${year}-01-01`,
        businessEndDate: todayBusinessDate,
        label: 'This Year (YTD)',
        benchmarkLabel: 'Historical',
      };
    }

    case 'custom': {
      if (!specificDate) {
        return { label: 'Specific Date', benchmarkLabel: 'Historical' };
      }
      const startMs = businessDateStartMs(specificDate);
      return {
        startDate: iso(startMs),
        endDate: iso(startMs + DAY_MS),
        businessStartDate: specificDate,
        businessEndDate: specificDate,
        label: specificDate,
        benchmarkLabel: 'Historical',
      };
    }

    default:
      return { label: 'Today (Daily)', benchmarkLabel: 'vs Previous Day' };
  }
}

/** Formats 24h hour (0-23) as a 12h label, e.g. 0 → 12 AM, 13 → 1 PM. */
export function formatHourLabel(hour24: number): string {
  if (hour24 === 0) return '12 AM';
  if (hour24 === 12) return '12 PM';
  if (hour24 > 12) return `${hour24 - 12} PM`;
  return `${hour24} AM`;
}

/**
 * Hour-of-day in Manila, used for hourly sales charts so the curve is stable
 * regardless of the device/export worker timezone.
 */
export function toManilaHour(instant: Date | string | number): number {
  const wall = new Date(manilaWallClockMs(toInstantMs(instant)));
  return wall.getUTCHours();
}

/** Milliseconds elapsed in the current business day (clamped to 1h minimum). */
export function elapsedBusinessHours(now: Date = new Date()): number {
  const elapsedMs = now.getTime() - getBusinessDayStartMs(now);
  return Math.max(1, elapsedMs / (60 * 60 * 1000));
}
