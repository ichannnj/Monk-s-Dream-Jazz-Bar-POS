import {
  getReportBounds,
  type DateBounds,
  type ReportPeriod,
} from '@/features/shared/utils/businessDay';
import { type TimeframePeriod } from './transactionsOverview.types';

/**
 * Delegates to the shared Asia/Manila 6:00 AM business-day contract.
 * Every Reports & Fiscal Hub view uses this single implementation.
 */
export function calculateDateBounds(
  selectedPeriod: TimeframePeriod,
  specificDate: string,
  selectedWeekRange: { startStr: string; endStr: string } | null,
  selectedMonthYear: { year: number; month: number }
): DateBounds {
  return getReportBounds(
    selectedPeriod as ReportPeriod,
    specificDate,
    selectedWeekRange,
    selectedMonthYear
  );
}

export function formatTimeframeDisplayLabel(
  selectedPeriod: TimeframePeriod,
  specificDate: string,
  selectedWeekRange: { startStr: string; endStr: string } | null,
  selectedMonthYear: { year: number; month: number }
): string {
  const bounds = calculateDateBounds(
    selectedPeriod,
    specificDate,
    selectedWeekRange,
    selectedMonthYear
  );

  switch (selectedPeriod) {
    case 'daily':
      return 'Today (Daily)';
    case 'yesterday':
      return 'Yesterday';
    case 'weekly':
      return 'This Week (WTD)';
    case 'select_week': {
      if (!bounds.businessStartDate || !bounds.businessEndDate) return 'Specific Week';
      const start = new Date(`${bounds.businessStartDate}T00:00:00`);
      const end = new Date(`${bounds.businessEndDate}T00:00:00`);
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    case 'monthly':
      return 'This Month (MTD)';
    case 'select_month': {
      const d = new Date(selectedMonthYear.year, selectedMonthYear.month, 1);
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    case 'yearly':
      return 'This Year (YTD)';
    case 'custom':
      return specificDate ? `Specific Date: ${specificDate}` : 'Specific Date';
    default:
      return 'Today (Daily)';
  }
}
