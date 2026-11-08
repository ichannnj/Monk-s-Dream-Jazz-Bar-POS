import type { SalesAnalyticsOverview } from '../../../data/admin.api';

export interface AdminTransactionsViewProps {
  analytics: SalesAnalyticsOverview | null;
  onRefresh: () => void;
}

export type StationFilter = 'ALL' | 'CAFE_AREA' | 'BAR_AREA' | 'TAKEOUT_COUNTER' | 'GRAB_FOOD';
export type ModeFilter = 'ALL' | 'CAFE' | 'EVENT';

export type TimeframePeriod =
  | 'daily'
  | 'yesterday'
  | 'weekly'
  | 'select_week'
  | 'monthly'
  | 'select_month'
  | 'yearly'
  | 'custom';

export interface TimeframeChipOption {
  key: TimeframePeriod;
  label: string;
  description: string;
}

export const TIMEFRAME_OPTIONS: TimeframeChipOption[] = [
  { key: 'daily', label: 'Today (Daily)', description: 'Today’s live sales and shift metrics' },
  { key: 'yesterday', label: 'Yesterday', description: 'Full previous business day performance' },
  { key: 'weekly', label: 'This Week (WTD)', description: 'Current week-to-date starting Monday' },
  {
    key: 'select_week',
    label: 'Select Specific Week...',
    description: 'Pick any historical week by selecting a day or week in calendar',
  },
  {
    key: 'monthly',
    label: 'This Month (MTD)',
    description: 'Current month-to-date operational aggregate',
  },
  {
    key: 'select_month',
    label: 'Select Specific Month...',
    description: 'Pick any past month and year from the interactive selector',
  },
  { key: 'yearly', label: 'Yearly (YTD)', description: 'Full calendar year fiscal performance' },
  {
    key: 'custom',
    label: 'Select Specific Day...',
    description: 'Select an exact historical day from the calendar',
  },
];

export interface StationOption {
  key: StationFilter;
  label: string;
  description: string;
}

export const STATION_OPTIONS: StationOption[] = [
  {
    key: 'ALL',
    label: 'All Stations',
    description: 'Consolidated venue performance across all stations',
  },
  {
    key: 'CAFE_AREA',
    label: 'Cafe Area',
    description: 'Artisan espresso bar & handcrafted beverages',
  },
  {
    key: 'BAR_AREA',
    label: 'Bar Area',
    description: 'Cocktails, draft beer, fine wines & spirits',
  },
  {
    key: 'TAKEOUT_COUNTER',
    label: 'Takeout Counter',
    description: 'Direct customer walk-in counter intake',
  },
  {
    key: 'GRAB_FOOD',
    label: 'GrabFood Delivery',
    description: 'Online delivery marketplace fulfillment',
  },
];
