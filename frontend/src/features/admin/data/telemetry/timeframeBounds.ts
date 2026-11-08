import type { TimeframeFilter } from '../../domain/admin.types';
import {
  formatHourLabel,
  getAnalyticsBounds,
  type DateBounds,
} from '@/features/shared/utils/businessDay';

/**
 * Delegates to the shared business-day contract so the Dashboard and the
 * Reports & Fiscal Hub can never disagree about what "Today" means.
 */
export function getTimeframeBounds(timeframe: TimeframeFilter): DateBounds {
  return getAnalyticsBounds(timeframe);
}

export const formatHour = formatHourLabel;

export function formatDuration(totalSec: number): string {
  const safeSec = Math.max(0, Math.round(totalSec || 0));
  const m = Math.floor(safeSec / 60);
  const s = Math.floor(safeSec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatTurnover(mins: number): string {
  const safeMins = Math.max(0, Math.round(mins || 0));
  if (safeMins === 0) return '0 min';
  if (safeMins < 60) return `${safeMins} min`;
  const h = Math.floor(safeMins / 60);
  const m = safeMins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
