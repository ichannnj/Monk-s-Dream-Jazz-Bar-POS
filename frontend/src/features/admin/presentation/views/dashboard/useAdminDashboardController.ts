import { useState, useEffect, useMemo } from 'react';
import type { DashboardTelemetry, TimeframeFilter } from '../../../domain/admin.types';
import { useLiveNow } from '@/features/shared/utils/elapsedTime';
import { DepartmentShare } from '../analytics/DepartmentSalesBreakdown';

export type BestSellerFilter = 'top3' | 'top5' | 'top10' | 'all';

export interface TimeframeOption {
  key: TimeframeFilter;
  label: string;
  shortLabel: string;
  benchmarkLabel: string;
  description: string;
}

export const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  {
    key: 'today',
    label: 'Today (Live Shift)',
    shortLabel: 'Today',
    benchmarkLabel: 'vs Same Day Last Week',
    description: 'Real-time sales and floor activity for current operating day',
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    shortLabel: 'Yesterday',
    benchmarkLabel: 'vs Day Before Yesterday',
    description: 'Completed revenue and checks from preceding business day',
  },
  {
    key: 'week',
    label: 'This Week (WTD)',
    shortLabel: 'This Week',
    benchmarkLabel: 'vs Prior Week',
    description: 'Aggregated week-to-date sales starting from Monday',
  },
  {
    key: 'month',
    label: 'This Month (MTD)',
    shortLabel: 'This Month',
    benchmarkLabel: 'vs Prior Month',
    description: 'Month-to-date volume and revenue performance',
  },
  {
    key: 'all',
    label: 'All-Time History',
    shortLabel: 'All-Time',
    benchmarkLabel: 'Lifetime Aggregate',
    description: 'All recorded payments and checks directly in database',
  },
];

export function useAdminDashboardController({
  telemetry,
  timeframe = 'today',
  onChangeTimeframe,
}: {
  telemetry: DashboardTelemetry;
  timeframe?: TimeframeFilter;
  onChangeTimeframe?: (timeframe: TimeframeFilter) => void;
}) {
  const [bestSellerFilter, setBestSellerFilter] = useState<BestSellerFilter>('top5');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [alerts, setAlerts] = useState(telemetry.alerts || []);

  const hasActiveTickets = Boolean(
    telemetry?.stations?.some((s) => s.isOnline && (s.activeTicketTimestamps?.length || 0) > 0)
  );
  const nowMs = useLiveNow(hasActiveTickets);

  useEffect(() => {
    setAlerts(telemetry.alerts || []);
  }, [telemetry.alerts]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    (telemetry.bestSellers || []).forEach((item) => {
      if (item.category) set.add(item.category);
    });
    (telemetry.categorySales || []).forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ['All Categories', ...Array.from(set)];
  }, [telemetry.bestSellers, telemetry.categorySales]);

  const activeTimeframeOption =
    TIMEFRAME_OPTIONS.find((opt) => opt.key === timeframe) || TIMEFRAME_OPTIONS[0];

  const visibleBestSellers = useMemo(() => {
    let items = telemetry.bestSellers || [];
    if (selectedCategory !== 'All Categories') {
      items = items.filter((i) => i.category === selectedCategory);
    }
    switch (bestSellerFilter) {
      case 'top3':
        return items.slice(0, 3);
      case 'top5':
        return items.slice(0, 5);
      case 'top10':
        return items.slice(0, 10);
      case 'all':
      default:
        return items;
    }
  }, [telemetry.bestSellers, selectedCategory, bestSellerFilter]);

  const handleClearAlerts = () => {
    setAlerts([]);
  };

  const departmentShares: DepartmentShare[] = useMemo(() => {
    return (telemetry.categorySales || []).map((cat) => {
      const lower = cat.category.toLowerCase();
      let categoryType: DepartmentShare['category'] = 'kitchen';
      if (
        lower.includes('coffee') ||
        lower.includes('espresso') ||
        lower.includes('tea') ||
        lower.includes('cafe')
      ) {
        categoryType = 'coffee';
      } else if (
        lower.includes('cocktail') ||
        lower.includes('spirit') ||
        lower.includes('liquor')
      ) {
        categoryType = 'cocktails';
      } else if (lower.includes('wine') || lower.includes('beer')) {
        categoryType = 'wine_beer';
      }
      return {
        name: cat.category,
        category: categoryType,
        sales: cat.amount,
        itemCount: Math.round(cat.amount / 150) || 1,
      };
    });
  }, [telemetry.categorySales]);

  return {
    bestSellerFilter,
    setBestSellerFilter,
    selectedCategory,
    setSelectedCategory,
    alerts,
    setAlerts,
    handleClearAlerts,
    nowMs,
    availableCategories,
    activeTimeframeOption,
    visibleBestSellers,
    departmentShares,
  };
}
