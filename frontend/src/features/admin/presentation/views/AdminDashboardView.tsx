import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  RefreshCw,
  TrendingUp,
  ArrowRight,
  Calendar,
  Layers,
  Clock,
  Sparkles,
  LayoutGrid,
  Banknote,
  Smartphone,
  CreditCard,
  Coffee,
  Users,
  DollarSign,
} from 'lucide-react-native';
import type { DashboardTelemetry, AdminRoute, TimeframeFilter } from '../../domain/admin.types';
import { HourlySalesVelocityChart } from './analytics/HourlySalesVelocityChart';
import { PaymentTenderMixBar } from './analytics/PaymentTenderMixBar';
import { DepartmentSalesBreakdown, DepartmentShare } from './analytics/DepartmentSalesBreakdown';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { useLiveNow, getLiveStationTurnaround } from '@/features/shared/utils/elapsedTime';
import { TodaysEventBanner } from '@/features/events';

export interface AdminDashboardViewProps {
  telemetry: DashboardTelemetry;
  onRefresh: () => void;
  onNavigateRoute: (route: AdminRoute) => void;
  isLoading?: boolean;
  timeframe?: TimeframeFilter;
  onChangeTimeframe?: (timeframe: TimeframeFilter) => void;
}

type BestSellerFilter = 'top3' | 'top5' | 'top10' | 'all';

interface TimeframeOption {
  key: TimeframeFilter;
  label: string;
  shortLabel: string;
  benchmarkLabel: string;
  description: string;
}

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
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

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  telemetry,
  onRefresh,
  onNavigateRoute,
  isLoading = false,
  timeframe = 'today',
  onChangeTimeframe,
}) => {
  const [bestSellerFilter, setBestSellerFilter] = useState<BestSellerFilter>('top5');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [alerts, setAlerts] = useState(telemetry.alerts || []);

  const hasActiveTickets = Boolean(
    telemetry?.stations?.some((s) => (s.activeTicketTimestamps?.length || 0) > 0)
  );
  const nowMs = useLiveNow(hasActiveTickets);

  // Sync alerts whenever telemetry updates from refresh
  useEffect(() => {
    setAlerts(telemetry.alerts || []);
  }, [telemetry.alerts]);

  // Extract unique active categories dynamically from telemetry
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

  const getFilteredBestSellers = () => {
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
  };

  const visibleBestSellers = getFilteredBestSellers();

  const handleClearAlerts = () => {
    setAlerts([]);
  };

  const handleSelectTimeframe = (selectedKey: TimeframeFilter) => {
    onChangeTimeframe?.(selectedKey);
  };

  const hasZeroOrders = (telemetry.orderCount || 0) === 0;

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

  return (
    <ScrollView className="flex-1 min-w-0 bg-[#fcf9f9]" showsVerticalScrollIndicator={false}>
      <View className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
        {/* Header: Title, Timeframe Selector, and Refresh */}
        <View className="flex-col sm:flex-row sm:items-center justify-between pb-1 gap-3">
          <View className="flex-1 min-w-0">
            <Text className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              Performance Overview
            </Text>
            <Text className="mt-0.5 text-base font-medium text-stone-500">
              Updated {telemetry.lastUpdated}
            </Text>
          </View>

          <View className="flex-row items-center gap-2.5 flex-wrap">
            {/* Primary Timeframe Selector Dropdown */}
            <PosDropdown
              options={TIMEFRAME_OPTIONS.map((opt) => ({
                value: opt.key,
                label: opt.label,
                description: opt.description,
                icon: Calendar,
              }))}
              value={timeframe}
              onChange={(key) => onChangeTimeframe?.(key)}
              prefixLabel="Period:"
              sheetTitle="Select Analytics Timeframe"
            />

            {/* Refresh Button */}
            <Pressable
              onPress={onRefresh}
              disabled={isLoading}
              className="min-h-[48px] flex-row items-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-xs active:bg-stone-50"
            >
              <RefreshCw size={18} color="#44403c" className={isLoading ? 'animate-spin' : ''} />
              <Text className="ml-2 text-base font-bold text-stone-800">
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Tonight's Event Live Highlight */}
        <TodaysEventBanner />

        {/* 4 KPI Cards: Operational Floor Mix */}
        <View className="flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-5">
          {/* Card 1: Net Sales Revenue (Burgundy #800020) */}
          <View className="w-full sm:w-[48%] xl:flex-1 min-w-0 rounded-2xl bg-[#800020] p-5 sm:p-6 shadow-sm justify-between min-h-[190px]">
            <View className="min-w-0">
              <View className="flex-row items-center justify-between flex-wrap gap-2">
                <Text className="text-base font-semibold text-white/90">Net Sales Revenue</Text>
                {timeframe === 'today' ? (
                  <View className="flex-row items-center rounded-full bg-white/20 border border-white/25 px-2.5 py-0.5 shrink-0">
                    <View className="h-2 w-2 rounded-full bg-emerald-400 mr-1.5" />
                    <Text className="text-base font-bold text-white">Live Shift</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center rounded-full bg-white/20 border border-white/25 px-2.5 py-0.5 shrink-0">
                    <Text className="text-base font-bold text-white">
                      {activeTimeframeOption.shortLabel}
                    </Text>
                  </View>
                )}
              </View>

              <Text className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
                ₱
                {Number(telemetry.liveSalesTotal || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>

              {/* Benchmark delta badge */}
              <View className="mt-2 flex-row items-center flex-wrap gap-2">
                <View className="flex-row items-center rounded-md bg-white/20 px-2.5 py-0.5 shrink-0">
                  <TrendingUp size={16} color="#ffffff" />
                  <Text className="ml-1.5 text-base font-bold text-white">
                    {telemetry.salesGrowthPercent >= 0 ? '+' : ''}
                    {telemetry.salesGrowthPercent}%
                  </Text>
                </View>
                <Text className="text-base text-white/80 flex-1 min-w-[120px]">
                  {telemetry.benchmarkLabel || activeTimeframeOption.benchmarkLabel}
                </Text>
              </View>
            </View>

            {/* Bottom details & hourly chart */}
            <View className="mt-4 pt-3 border-t border-white/20 flex-row items-end justify-between flex-wrap gap-2">
              <Text className="text-base font-medium text-white/90">
                {telemetry.orderCount} checks · {telemetry.guestCount} guests
              </Text>

              {/* Mini Hourly Bar Chart */}
              {telemetry.hourlySales && telemetry.hourlySales.length > 0 && (
                <View className="items-end shrink-0">
                  <View className="flex-row items-end h-8 space-x-1">
                    {telemetry.hourlySales.map((h, idx) => {
                      const maxSales = Math.max(...telemetry.hourlySales.map((s) => s.sales), 100);
                      const barHeight = Math.max(6, Math.round((h.sales / maxSales) * 28));
                      return (
                        <View
                          key={idx}
                          style={{ height: barHeight }}
                          className={`w-1.5 rounded-t-xs ${h.isPeak ? 'bg-white' : 'bg-white/40'}`}
                        />
                      );
                    })}
                  </View>
                  <Text className="text-base text-white/80 mt-1">{telemetry.peakHourLabel}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Card 2: Average Ticket / Check */}
          <View className="w-full sm:w-[48%] xl:flex-1 min-w-0 rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs justify-between min-h-[190px]">
            <View className="min-w-0">
              <Text className="text-base font-semibold text-stone-500">Avg Ticket / Check</Text>
              <Text className="mt-2 text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                ₱{Number(telemetry.averageCheck || 0).toFixed(2)}
              </Text>

              <View className="mt-2 flex-row items-center flex-wrap gap-2">
                <View className="flex-row items-center rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 shrink-0">
                  <TrendingUp size={16} color="#059669" />
                  <Text className="ml-1 text-base font-bold text-emerald-700">
                    {telemetry.averageCheckGrowthPercent >= 0 ? '+' : ''}
                    {telemetry.averageCheckGrowthPercent}%
                  </Text>
                </View>
                <Text className="text-base text-stone-500">per settled order</Text>
              </View>
            </View>

            <View className="mt-4 pt-3 border-t border-stone-100 flex-row items-center justify-between flex-wrap gap-2">
              <Text className="text-base text-stone-500">Spend Per Guest</Text>
              <Text className="text-base font-bold text-stone-800">
                ₱{Number(telemetry.spendPerGuest || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Card 3: Settled Orders & Payment Mix */}
          <View className="w-full sm:w-[48%] xl:flex-1 min-w-0 rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs justify-between min-h-[190px]">
            <View className="min-w-0">
              <Text className="text-base font-semibold text-stone-500">Settled Orders & Mix</Text>
              <Text className="mt-2 text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {telemetry.orderCount}
              </Text>

              <View className="mt-2 flex-row items-center flex-wrap gap-2">
                <View className="flex-row items-center rounded-md bg-stone-100 border border-stone-200 px-2.5 py-0.5 shrink-0">
                  <Text className="text-base font-bold text-stone-700">
                    {telemetry.ordersPerHour} / hr
                  </Text>
                </View>
                <Text className="text-base text-stone-500 flex-1 min-w-[110px]">
                  {telemetry.benchmarkLabel || activeTimeframeOption.benchmarkLabel}
                </Text>
              </View>
            </View>

            {/* Payment Method Breakdown */}
            <View className="mt-4 pt-3 border-t border-stone-100 space-y-1.5">
              <View className="flex-row items-center justify-between flex-wrap gap-1">
                <View className="flex-row items-center">
                  <Banknote size={16} color="#059669" />
                  <Text className="ml-1.5 text-base text-stone-600">Cash</Text>
                </View>
                <Text className="text-base font-bold text-stone-900">
                  ₱{Number(telemetry.cashSales || 0).toLocaleString()}
                </Text>
              </View>

              <View className="flex-row items-center justify-between flex-wrap gap-1">
                <View className="flex-row items-center">
                  <Smartphone size={16} color="#2563eb" />
                  <Text className="ml-1.5 text-base text-stone-600">Digital / GCash</Text>
                </View>
                <Text className="text-base font-bold text-stone-900">
                  ₱{Number(telemetry.digitalSales || 0).toLocaleString()}
                </Text>
              </View>

              <View className="flex-row items-center justify-between flex-wrap gap-1">
                <View className="flex-row items-center">
                  <CreditCard size={16} color="#7c3aed" />
                  <Text className="ml-1.5 text-base text-stone-600">Card</Text>
                </View>
                <Text className="text-base font-bold text-stone-900">
                  ₱{Number(telemetry.cardSales || 0).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Card 4: Live Table & Floor Occupancy */}
          <View className="w-full sm:w-[48%] xl:flex-1 min-w-0 rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs justify-between min-h-[190px]">
            <View className="min-w-0">
              <View className="flex-row items-center justify-between flex-wrap gap-1">
                <Text className="text-base font-semibold text-stone-500">Floor & Tables</Text>
                <View className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 shrink-0">
                  <Text className="text-base font-bold text-emerald-700">
                    {telemetry.occupancyPercent}% Busy
                  </Text>
                </View>
              </View>

              <Text className="mt-2 text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {telemetry.occupiedTables} / {telemetry.totalTables}{' '}
                <Text className="text-xl font-normal text-stone-500">Tables</Text>
              </Text>

              {/* Occupancy progress bar */}
              <View className="mt-3 h-2 w-full rounded-full bg-stone-100">
                <View
                  style={{ width: `${Math.min(100, Math.max(5, telemetry.occupancyPercent))}%` }}
                  className="h-2 rounded-full bg-[#800020]"
                />
              </View>
            </View>

            <View className="mt-4 pt-3 border-t border-stone-100 flex-row items-center justify-between flex-wrap gap-2">
              <View className="flex-row items-center">
                <LayoutGrid size={16} color="#800020" />
                <Text className="ml-1.5 text-base font-medium text-stone-700">
                  {telemetry.activeOpenTabs} open tab{telemetry.activeOpenTabs === 1 ? '' : 's'}
                </Text>
              </View>

              <Pressable
                onPress={() => onNavigateRoute('tables')}
                className="min-h-[48px] px-3 flex-row items-center rounded-xl bg-stone-50 active:bg-stone-100"
              >
                <Text className="text-base font-bold text-[#800020]">Floor View</Text>
                <ArrowRight size={16} color="#800020" className="ml-1" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Informative Zero-State Callout (if 0 orders in selected timeframe) */}
        {hasZeroOrders && (
          <View className="rounded-2xl border border-stone-200 bg-stone-50 p-6 flex-row items-center justify-between flex-wrap gap-4">
            <View className="flex-row items-center space-x-3 flex-1 min-w-[280px]">
              <View className="h-10 w-10 rounded-full bg-stone-200 items-center justify-center mr-3">
                <Clock size={20} color="#78716c" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-stone-900">
                  No settled orders recorded for {activeTimeframeOption.label}
                </Text>
                <Text className="text-base text-stone-500 mt-0.5">
                  The database currently has 0 settled payments matching this time filter. You can
                  switch to All-Time History to inspect lifetime records.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => handleSelectTimeframe('all')}
              className="min-h-[48px] px-5 items-center justify-center rounded-xl bg-[#800020] active:bg-[#600018]"
            >
              <Text className="text-base font-bold text-white">View All-Time History</Text>
            </Pressable>
          </View>
        )}

        {/* Dedicated Operating Mode Revenue Split Section */}
        <View className="w-full min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
          <View className="flex-row items-center justify-between flex-wrap gap-3 mb-5">
            <View className="flex-row items-center gap-3 flex-1 min-w-[200px]">
              <View className="w-10 h-10 shrink-0 rounded-xl bg-[#800020]/10 border border-[#800020]/20 items-center justify-center">
                <Sparkles size={20} color="#800020" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-xl font-bold text-stone-900">
                  Operating Mode Revenue Split
                </Text>
                <Text className="text-base text-stone-500 font-medium mt-0.5">
                  Segregated sales for Daytime Cafe vs. Evening Live Jazz Sets
                </Text>
              </View>
            </View>

            {/* Active Mode Pill */}
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-base font-semibold text-stone-500">Venue Active Mode:</Text>
              <View
                className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                  telemetry.activeOperatingMode === 'EVENT'
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-sky-50 border-sky-300'
                }`}
              >
                {telemetry.activeOperatingMode === 'EVENT' ? (
                  <>
                    <Sparkles size={14} color="#d97706" />
                    <Text className="text-base font-bold text-amber-700">🎷 Event Mode</Text>
                  </>
                ) : (
                  <>
                    <Coffee size={14} color="#0284c7" />
                    <Text className="text-base font-bold text-sky-700">☀️ Cafe Mode</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Dual Segment Split Progress Bar */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between flex-wrap gap-2 mb-2">
              <View className="flex-row items-center gap-2">
                <View className="w-3 h-3 rounded-full bg-sky-500" />
                <Text className="text-base font-bold text-stone-700">
                  Cafe Mode ({telemetry.cafePercentage || 0}%)
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-bold text-stone-700">
                  Event Mode ({telemetry.eventPercentage || 0}%)
                </Text>
                <View className="w-3 h-3 rounded-full bg-amber-500" />
              </View>
            </View>

            {/* Visual ratio bar */}
            <View className="h-4 w-full bg-stone-100 rounded-full overflow-hidden flex-row">
              <View
                style={{ width: `${telemetry.cafePercentage || 0}%` }}
                className="h-full bg-sky-500 rounded-l-full"
              />
              <View
                style={{ width: `${telemetry.eventPercentage || 0}%` }}
                className="h-full bg-amber-500 rounded-r-full"
              />
            </View>
          </View>

          {/* 3 Metric Cards Flex Row: Cafe vs Event vs Consolidated Total */}
          <View className="flex-col md:flex-row gap-4">
            {/* 1. Cafe Mode Card */}
            <View className="flex-1 min-w-0 rounded-xl border border-sky-200 bg-sky-50/50 p-4 justify-between">
              <View className="min-w-0">
                <View className="flex-row items-center justify-between flex-wrap gap-2">
                  <View className="flex-row items-center gap-2 flex-1 min-w-[140px]">
                    <Coffee size={18} color="#0284c7" />
                    <Text className="text-base font-bold text-sky-900">☀️ Cafe Mode Sales</Text>
                  </View>
                  <View className="px-2 py-0.5 rounded-md bg-sky-100 border border-sky-300 shrink-0">
                    <Text className="text-base font-bold text-sky-800">
                      {telemetry.cafePercentage || 0}%
                    </Text>
                  </View>
                </View>
                <Text className="mt-3 text-2xl font-black text-sky-950">
                  ₱
                  {Number(telemetry.cafeSales || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View className="mt-3 pt-3 border-t border-sky-200 flex-row items-center justify-between flex-wrap gap-2">
                <Text className="text-base font-medium text-sky-700">
                  {telemetry.cafeOrdersCount || 0} checks
                </Text>
                <Text className="text-base font-medium text-sky-700">
                  Avg: ₱{Number(telemetry.cafeAvgCheck || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* 2. Event Mode Card */}
            <View className="flex-1 min-w-0 rounded-xl border border-amber-200 bg-amber-50/50 p-4 justify-between">
              <View className="min-w-0">
                <View className="flex-row items-center justify-between flex-wrap gap-2">
                  <View className="flex-row items-center gap-2 flex-1 min-w-[140px]">
                    <Sparkles size={18} color="#d97706" />
                    <Text className="text-base font-bold text-amber-900">🎷 Event Mode Sales</Text>
                  </View>
                  <View className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 shrink-0">
                    <Text className="text-base font-bold text-amber-800">
                      {telemetry.eventPercentage || 0}%
                    </Text>
                  </View>
                </View>
                <Text className="mt-3 text-2xl font-black text-amber-950">
                  ₱
                  {Number(telemetry.eventSales || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View className="mt-3 pt-3 border-t border-amber-200 flex-row items-center justify-between flex-wrap gap-2">
                <Text className="text-base font-medium text-amber-700">
                  {telemetry.eventOrdersCount || 0} checks
                </Text>
                <Text className="text-base font-medium text-amber-700">
                  Avg: ₱{Number(telemetry.eventAvgCheck || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* 3. Consolidated Total Sales Card */}
            <View className="flex-1 min-w-0 rounded-xl border border-stone-200 bg-stone-50/70 p-4 justify-between">
              <View className="min-w-0">
                <View className="flex-row items-center justify-between flex-wrap gap-2">
                  <View className="flex-row items-center gap-2 flex-1 min-w-[140px]">
                    <TrendingUp size={18} color="#800020" />
                    <Text className="text-base font-bold text-stone-900">
                      Total Consolidated Sales
                    </Text>
                  </View>
                  <View className="px-2 py-0.5 rounded-md bg-stone-200/80 border border-stone-300 shrink-0">
                    <Text className="text-base font-bold text-stone-800">100%</Text>
                  </View>
                </View>
                <Text className="mt-3 text-2xl font-black text-stone-900">
                  ₱
                  {Number(telemetry.liveSalesTotal || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View className="mt-3 pt-3 border-t border-stone-200 flex-row items-center justify-between flex-wrap gap-2">
                <Text className="text-base font-medium text-stone-600">
                  {telemetry.orderCount || 0} checks combined
                </Text>
                <Text className="text-base font-medium text-stone-600">
                  Avg: ₱{Number(telemetry.averageCheck || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Real Labor, Attendance & Payroll Cost Snapshot */}
        <View className="w-full min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
          <View className="flex-row items-center justify-between flex-wrap gap-3 mb-5">
            <View className="flex-row items-center gap-3 flex-1 min-w-[200px]">
              <View className="w-10 h-10 shrink-0 rounded-xl bg-purple-50 border border-purple-200 items-center justify-center">
                <Users size={20} color="#7c3aed" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-xl font-bold text-stone-900">
                  Labor, Attendance & Payroll
                </Text>
                <Text className="text-base text-stone-500 font-medium mt-0.5">
                  Authoritative attendance payroll expenses & prime cost telemetry (
                  {activeTimeframeOption.label})
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => onNavigateRoute('attendance')}
              className="min-h-[44px] px-4 flex-row items-center gap-1.5 rounded-xl bg-purple-50 border border-purple-200 active:bg-purple-100"
            >
              <Text className="text-base font-bold text-purple-800">Open Attendance Ledger</Text>
              <ArrowRight size={16} color="#7c3aed" />
            </Pressable>
          </View>

          {/* 4 Cards Grid: Total Labor Expense, Labor Cost %, Active Headcount, Net Profit */}
          <View className="flex-col sm:flex-row flex-wrap gap-4">
            {/* Card 1: Total Labor Expense */}
            <View className="flex-1 min-w-[220px] rounded-xl border border-stone-200 bg-stone-50/70 p-4 justify-between">
              <View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-stone-500">Total Payroll Cost</Text>
                  <DollarSign size={16} color="#7c3aed" />
                </View>
                <Text className="mt-2 text-2xl font-black text-stone-900">
                  ₱
                  {Number(telemetry.totalPayrollExpense || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View className="mt-3 pt-2.5 border-t border-stone-200 flex-row items-center justify-between text-base">
                <Text className="text-base text-stone-500">
                  Base: ₱{Number(telemetry.basePayrollTotal || 0).toLocaleString()}
                </Text>
                <Text className="text-base font-semibold text-amber-700">
                  OT/Bonus: ₱{Number(telemetry.bonusPayrollTotal || 0).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Card 2: Labor Cost Percentage */}
            <View className="flex-1 min-w-[220px] rounded-xl border border-stone-200 bg-stone-50/70 p-4 justify-between">
              <View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-stone-500">Labor Cost %</Text>
                  <TrendingUp size={16} color="#059669" />
                </View>
                <Text className="mt-2 text-2xl font-black text-stone-900">
                  {telemetry.laborCostPercent || 0}%
                </Text>
              </View>
              <View className="mt-3 pt-2.5 border-t border-stone-200 flex-row items-center justify-between text-base">
                <Text className="text-base text-stone-500">Benchmark</Text>
                <Text
                  className={`text-base font-bold ${(telemetry.laborCostPercent || 0) <= 25 ? 'text-emerald-700' : (telemetry.laborCostPercent || 0) <= 35 ? 'text-amber-700' : 'text-rose-700'}`}
                >
                  {(telemetry.laborCostPercent || 0) <= 25
                    ? 'Healthy (<25%)'
                    : (telemetry.laborCostPercent || 0) <= 35
                      ? 'Moderate'
                      : 'High (>35%)'}
                </Text>
              </View>
            </View>

            {/* Card 3: Clocked In / Present Staff */}
            <View className="flex-1 min-w-[220px] rounded-xl border border-stone-200 bg-stone-50/70 p-4 justify-between">
              <View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-stone-500">Staff Present</Text>
                  <Users size={16} color="#0284c7" />
                </View>
                <Text className="mt-2 text-2xl font-black text-stone-900">
                  {telemetry.presentStaffCount || 0}
                  <Text className="text-base font-normal text-stone-500">
                    {' '}
                    / {telemetry.totalActiveStaffCount || 0} staff
                  </Text>
                </Text>
              </View>
              <View className="mt-3 pt-2.5 border-t border-stone-200 flex-row items-center justify-between text-base">
                <Text className="text-base text-stone-500">
                  {telemetry.clockedInStaffCount || 0} Active On-Shift
                </Text>
                <Text className="text-base text-emerald-700 font-bold">
                  {telemetry.completedShiftsCount || 0} Completed
                </Text>
              </View>
            </View>

            {/* Card 4: Estimated Net Operating Profit */}
            <View className="flex-1 min-w-[220px] rounded-xl border border-stone-200 bg-stone-50/70 p-4 justify-between">
              <View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-stone-500">Est. Net Profit</Text>
                  <TrendingUp size={16} color="#800020" />
                </View>
                <Text
                  className={`mt-2 text-2xl font-black ${(telemetry.estimatedNetProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                >
                  ₱
                  {Number(telemetry.estimatedNetProfit || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View className="mt-3 pt-2.5 border-t border-stone-200 flex-row items-center justify-between text-base">
                <Text className="text-base text-stone-500">Sales - (Labor + COGS)</Text>
                <Text className="text-base text-stone-500 font-medium">
                  COGS: ₱{Number(telemetry.estimatedCogs || 0).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Executive Visual Analytics Trio: Hourly Velocity + Tender Mix + Department Split */}
        <View className="w-full min-w-0 space-y-6">
          {/* 1. Hourly Sales Velocity & Peak Pacing Curve */}
          <HourlySalesVelocityChart
            data={(telemetry.hourlySales || []).map((pt) => ({
              hour: pt.hourLabel,
              sales: pt.sales,
            }))}
            peakHourLabel={telemetry.peakHourLabel}
            totalSales={telemetry.liveSalesTotal}
          />

          {/* 2 & 3: Tender Mix & Department Breakdown Flex Row */}
          <View className="flex-col lg:flex-row gap-6">
            <PaymentTenderMixBar
              data={{
                cash: telemetry.cashSales || 0,
                card: telemetry.cardSales || 0,
                digital: telemetry.digitalSales || 0,
                delivery: 0,
                total: telemetry.liveSalesTotal || 0,
              }}
            />

            <DepartmentSalesBreakdown
              departments={departmentShares}
              totalSales={telemetry.liveSalesTotal}
            />
          </View>
        </View>

        {/* Middle Section: Best Sellers (Left) & Right Column (Stations + Category Sales) */}
        <View className="flex-col lg:flex-row gap-6">
          {/* Left: Best Sellers Card */}
          <View className="w-full lg:flex-[1.35] min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
            <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
              <View className="flex-1 min-w-[180px]">
                <Text className="text-xl font-bold tracking-tight text-stone-900">
                  Best Sellers
                </Text>
                <Text className="text-base font-medium text-stone-500 mt-1">
                  {activeTimeframeOption.label} · {selectedCategory} · Top{' '}
                  {visibleBestSellers.length} items
                </Text>
              </View>

              <View className="rounded-full bg-stone-100 border border-stone-200 px-3.5 py-1.5 shrink-0">
                <Text className="text-base font-bold text-stone-700">By Quantity</Text>
              </View>
            </View>

            {/* Filter Controls Row (Dropdowns for Rank Limit & Category) */}
            <View className="flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-4 mb-4 gap-2.5">
              <PosDropdown
                options={
                  [
                    { value: 'top3', label: 'Top 3 Items' },
                    { value: 'top5', label: 'Top 5 Items' },
                    { value: 'top10', label: 'Top 10 Items' },
                    { value: 'all', label: 'All Ranked Items' },
                  ] as PosDropdownOption<BestSellerFilter>[]
                }
                value={bestSellerFilter}
                onChange={setBestSellerFilter}
                prefixLabel="Show:"
                sheetTitle="Select Best Seller Limit"
                className="flex-1"
              />

              <PosDropdown
                options={availableCategories.map((cat) => ({
                  value: cat,
                  label: cat,
                  icon: Layers,
                }))}
                value={selectedCategory}
                onChange={setSelectedCategory}
                sheetTitle="Filter by Category"
                className="flex-1"
              />
            </View>

            {/* Ranked List Items with Progress Bar */}
            <View className="space-y-4">
              {visibleBestSellers.length === 0 ? (
                <View className="py-10 items-center justify-center">
                  <Text className="text-base text-stone-500 font-medium text-center">
                    No items sold for "{selectedCategory}" in {activeTimeframeOption.label}.
                  </Text>
                </View>
              ) : (
                visibleBestSellers.map((item) => (
                  <View key={item.id} className="pt-1">
                    <View className="flex-row items-start justify-between gap-3 flex-wrap">
                      {/* Left: Rank, Name, and Category */}
                      <View className="flex-row items-start flex-1 min-w-[160px]">
                        {/* Rank Circle */}
                        <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 mr-2.5 mt-0.5">
                          <Text className="text-base font-bold text-stone-700">{item.rank}</Text>
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className="text-base font-bold text-stone-900">{item.name}</Text>
                          <View className="mt-1 self-start rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5">
                            <Text className="text-base font-medium text-stone-600">
                              {item.category}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Right: Sold & Sales amounts */}
                      <View className="flex-row items-baseline gap-4 shrink-0">
                        <View className="items-end">
                          <Text className="text-base font-bold text-stone-900">
                            {item.soldCount}
                          </Text>
                          <Text className="text-base text-stone-400">sold</Text>
                        </View>
                        <View className="items-end min-w-[70px]">
                          <Text className="text-base font-black text-stone-900">
                            ₱{Number(item.salesAmount || 0).toFixed(2)}
                          </Text>
                          <Text className="text-base text-stone-400">sales</Text>
                        </View>
                      </View>
                    </View>

                    {/* Burgundy #800020 Progress Bar */}
                    <View className="mt-2 h-2 w-full rounded-full bg-stone-100">
                      <View
                        style={{ width: `${Math.min(100, Math.max(5, item.progressPercent))}%` }}
                        className="h-2 rounded-full bg-[#800020]"
                      />
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Footer Note */}
            <View className="mt-6 flex-row items-center justify-between border-t border-stone-100 pt-4 flex-wrap gap-2">
              <Text className="text-base text-stone-500">
                Displaying {visibleBestSellers.length} ranked item
                {visibleBestSellers.length === 1 ? '' : 's'}
              </Text>
              <Text className="text-base font-medium text-stone-600">
                Direct database order item aggregations
              </Text>
            </View>
          </View>

          {/* Right Column: Live Stations + Sales By Category */}
          <View className="w-full lg:flex-1 min-w-0 space-y-6">
            {/* Live Stations Card */}
            <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
              <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
                <Text className="text-xl font-bold text-stone-900">Live Stations</Text>
                <Pressable
                  onPress={() => onNavigateRoute('stations')}
                  className="min-h-[48px] px-3 flex-row items-center rounded-xl bg-stone-50 active:bg-stone-100"
                >
                  <Text className="text-base font-bold text-[#800020]">View Stations</Text>
                  <ArrowRight size={16} color="#800020" className="ml-1.5" />
                </Pressable>
              </View>

              {/* Stations Rows */}
              <View className="space-y-3.5">
                {(telemetry.stations || []).map((station) => {
                  const liveStats = getLiveStationTurnaround(
                    station.stationKey,
                    station.activeTicketTimestamps,
                    station.avgTicketTime,
                    station.lateTickets,
                    nowMs
                  );
                  return (
                    <View
                      key={station.stationKey}
                      className="rounded-xl border border-stone-200/70 bg-stone-50/60 p-4"
                    >
                      <View className="flex-row items-center justify-between mb-3 flex-wrap gap-2">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="text-lg font-bold text-stone-900">{station.name}</Text>
                          {station.isOnline ? (
                            <View className="flex-row items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                              <View className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />
                              <Text className="text-base font-bold text-emerald-700">Online</Text>
                            </View>
                          ) : (
                            <View className="flex-row items-center rounded-full bg-stone-100 border border-stone-300 px-2.5 py-0.5">
                              <View className="h-2 w-2 rounded-full bg-stone-400 mr-1.5" />
                              <Text className="text-base font-bold text-stone-600">Offline</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-base text-stone-500">
                          Target {station.targetTicketTime}
                        </Text>
                      </View>

                      <View className="flex-row flex-wrap gap-2 pt-1">
                        <View className="flex-1 min-w-[85px] bg-white rounded-lg p-2.5 border border-stone-200/70 items-center">
                          <Text className="text-xl font-black text-stone-900">
                            {station.activeTickets}
                          </Text>
                          <Text className="text-base text-stone-500 mt-0.5">Active</Text>
                        </View>

                        <View className="flex-1 min-w-[85px] bg-white rounded-lg p-2.5 border border-stone-200/70 items-center">
                          <Text className="text-xl font-black text-stone-900">
                            {liveStats.avgTicketTime}
                          </Text>
                          <Text className="text-base text-stone-500 mt-0.5">Avg time</Text>
                        </View>

                        <View className="flex-1 min-w-[85px] bg-white rounded-lg p-2.5 border border-stone-200/70 items-center">
                          <Text
                            className={`text-xl font-black ${
                              liveStats.lateTickets > 0 ? 'text-rose-600' : 'text-stone-900'
                            }`}
                          >
                            {liveStats.lateTickets}
                          </Text>
                          <Text className="text-base text-stone-500 mt-0.5">Late</Text>
                        </View>

                        <View className="flex-1 min-w-[85px] bg-white rounded-lg p-2.5 border border-stone-200/70 items-center">
                          <Text className="text-xl font-black text-amber-600">
                            {station.stockoutCount}
                          </Text>
                          <Text className="text-base text-stone-500 mt-0.5">Sold out</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Sales By Category Card */}
            <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
              <Text className="text-xl font-bold text-stone-900">Sales By Category</Text>
              <Text className="text-base text-stone-500 mb-4">
                {activeTimeframeOption.label} · Scaled to top category
              </Text>

              <View className="space-y-4">
                {(telemetry.categorySales || []).length === 0 ? (
                  <View className="py-6 items-center">
                    <Text className="text-base text-stone-500 font-medium">
                      No category sales recorded for this period.
                    </Text>
                  </View>
                ) : (
                  (telemetry.categorySales || []).map((cat) => (
                    <View key={cat.category} className="min-w-0">
                      <View className="flex-row items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <Text className="flex-1 min-w-[120px] text-base font-semibold text-stone-800">
                          {cat.category}
                        </Text>
                        <Text className="shrink-0 text-right text-base font-bold text-stone-900">
                          ₱{Number(cat.amount || 0).toFixed(2)}
                        </Text>
                      </View>

                      <View className="w-full h-2.5 rounded-full bg-stone-100 overflow-hidden">
                        <View
                          style={{ width: `${Math.min(100, Math.max(8, cat.percentage))}%` }}
                          className="h-2.5 rounded-full bg-[#800020]"
                        />
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Full-Width Card: Needs Attention */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs mb-8 overflow-hidden">
          <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-bold text-stone-900">Needs Attention</Text>
              {alerts.length > 0 && (
                <View className="h-7 w-7 items-center justify-center rounded-full bg-rose-100 border border-rose-200">
                  <Text className="text-base font-bold text-rose-700">{alerts.length}</Text>
                </View>
              )}
            </View>

            {alerts.length > 0 && (
              <Pressable
                onPress={handleClearAlerts}
                className="min-h-[48px] px-4 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 active:bg-stone-100"
              >
                <Text className="text-base font-semibold text-stone-700">Clear All Alerts</Text>
              </Pressable>
            )}
          </View>

          {alerts.length === 0 ? (
            <View className="py-6 items-center">
              <Text className="text-base font-medium text-stone-500 text-center">
                All station alerts and inventory items are at healthy levels.
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {alerts.map((alert) => {
                const isVoid = alert.type === 'void';
                const isStock = alert.type === 'low_stock';
                return (
                  <View
                    key={alert.id}
                    className="flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-stone-100 bg-stone-50/60 p-4 gap-3"
                  >
                    <View className="flex-row items-start flex-1 min-w-0 gap-3">
                      {/* Badge */}
                      <View
                        className={`rounded-lg px-3 py-1.5 border shrink-0 ${
                          isVoid
                            ? 'bg-rose-50 border-rose-200'
                            : isStock
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-stone-100 border-stone-300'
                        }`}
                      >
                        <Text
                          className={`text-base font-bold ${
                            isVoid ? 'text-rose-700' : isStock ? 'text-amber-800' : 'text-stone-700'
                          }`}
                        >
                          {alert.badgeLabel}
                        </Text>
                      </View>

                      <View className="flex-1 min-w-0">
                        <Text className="text-base font-bold text-stone-900">{alert.title}</Text>
                        <Text className="text-base text-stone-500 mt-0.5">{alert.description}</Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => onNavigateRoute(alert.targetRoute)}
                      className="min-h-[48px] px-4 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200 shrink-0 self-end sm:self-center"
                    >
                      <Text className="text-base font-bold text-[#800020]">View Details</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};
