import type { OperatingMode } from '../data/admin.api';

export interface DayOfWeekTrend {
  dayIndex: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string; // 'Monday', 'Tuesday', etc.
  shortName: string; // 'Mon', 'Tue', etc.
  totalSales: number;
  orderCount: number;
  averageSales: number;
  isBestDay: boolean;
  percentageOfWeeklyTotal: number;
}

export interface TimelineDataPoint {
  key: string; // e.g. "2026-11-01", "Week 44", "Nov 2026"
  label: string; // Human formatted display e.g. "Nov 1", "Week 44 (Nov 1-7)", "November 2026"
  shortLabel: string; // e.g. "01", "W44", "Nov"
  sales: number;
  orderCount: number;
  averageTicket: number;
  isPeak: boolean;
  periodType: 'day' | 'week' | 'month';
}

export interface BestSellerTrendItem {
  id: string;
  rank: number;
  name: string;
  category: string;
  soldCount: number;
  salesAmount: number;
  unitPrice: number;
  progressPercent: number; // relative to #1 item (10 - 100)
  revenueSharePercent: number; // % of total gross sales
}

export interface BestAccoladeItem {
  label: string;
  subtext: string;
  sales: number;
  orderCount?: number;
  secondaryLabel?: string;
}

export interface SalesTrendsReport {
  timeframeLabel: string;
  totalGrossSales: number;
  totalOrders: number;
  averageTicket: number;

  // Executive Best Highlights
  bestDayOfWeek: {
    dayName: string;
    totalSales: number;
    averageSales: number;
    orderCount: number;
    percentage: number;
  } | null;

  bestDate: {
    dateStr: string;
    formattedDate: string;
    sales: number;
    orderCount: number;
  } | null;

  bestWeek: {
    weekLabel: string;
    sales: number;
    orderCount: number;
  } | null;

  bestMonth: {
    monthLabel: string;
    sales: number;
    orderCount: number;
  } | null;

  topSellingProduct: BestSellerTrendItem | null;

  // Breakdown Collections
  dayOfWeekTrends: DayOfWeekTrend[];
  dailyTimeline: TimelineDataPoint[];
  weeklyTimeline: TimelineDataPoint[];
  monthlyTimeline: TimelineDataPoint[];
  bestSellers: BestSellerTrendItem[];
  availableCategories: string[];
}

export interface SalesTrendsFilterParams {
  filterMode?: OperatingMode | 'ALL';
  startDate?: string;
  endDate?: string;
  station?: string;
}
