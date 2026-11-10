/**
 * Event Date & Time Formatting Utilities for Monk's Dream Jazz Bar POS.
 *
 * Guaranteed Asia/Manila boundary-safe date calculations without UTC shift bugs.
 * Compliant with Web Interface Guidelines:
 * - Proper typographics: '…' for ellipsis, '–' (en-dash) for ranges
 * - Standardized Intl.DateTimeFormat
 */

export const MANILA_TIMEZONE = 'Asia/Manila';

/**
 * Parses 'YYYY-MM-DD' safely into year, month (0-indexed), and day
 * without timezone boundary shifting.
 */
export function parseDateStringParts(dateStr: string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = dateStr.split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10) - 1,
    day: parseInt(parts[2], 10),
  };
}

/**
 * Returns today's date formatted as 'YYYY-MM-DD' in Asia/Manila timezone.
 */
export function getManilaTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: MANILA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Formats a time string ('HH:MM:SS' or 'HH:MM') into readable 12-hour format ('8:00 PM').
 */
export function formatEventTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  if (h === undefined || m === undefined) return '';
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return '';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

/**
 * Formats a showtime range ('8:00 PM – 11:30 PM' or '8:00 PM' if no end time).
 */
export function formatShowtimeRange(startStr?: string | null, endStr?: string | null): string {
  const start = formatEventTime(startStr);
  if (!start) return '';
  const end = formatEventTime(endStr);
  return end ? `${start} – ${end}` : start;
}

/**
 * Formats 'YYYY-MM-DD' into human-readable full date, e.g. "Friday, November 14, 2026".
 */
export function formatFullDate(dateStr: string): string {
  try {
    const { year, month, day } = parseDateStringParts(dateStr);
    const date = new Date(year, month, day);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Formats 'YYYY-MM-DD' into compact date, e.g. "Fri, Nov 14".
 */
export function formatShortDate(dateStr: string): string {
  try {
    const { year, month, day } = parseDateStringParts(dateStr);
    const date = new Date(year, month, day);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Formats calendar month title, e.g. "November 2026".
 */
export function formatMonthYearTitle(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats week period title, e.g. "Nov 8 – Nov 14, 2026".
 */
export function formatWeekPeriodTitle(currentDate: Date): string {
  const start = new Date(currentDate);
  start.setDate(currentDate.getDate() - currentDate.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startFormatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(start);

  const endFormatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(end);

  return `${startFormatted} – ${endFormatted}`;
}
