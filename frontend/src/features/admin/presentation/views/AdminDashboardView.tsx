import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronDown,
  X,
  Check,
  Calendar,
  Layers,
  Clock,
  Sparkles,
  AlertTriangle,
  LayoutGrid,
  Banknote,
  Smartphone,
  CreditCard,
} from 'lucide-react-native';
import type { DashboardTelemetry, AdminRoute, TimeframeFilter } from '../../domain/admin.types';
import { HourlySalesVelocityChart } from './analytics/HourlySalesVelocityChart';
import { PaymentTenderMixBar } from './analytics/PaymentTenderMixBar';
import { DepartmentSalesBreakdown, DepartmentShare } from './analytics/DepartmentSalesBreakdown';
import { AdminModal } from '../components/AdminModal';

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
  const [isTimeframeModalOpen, setIsTimeframeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

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
    setIsTimeframeModalOpen(false);
    onChangeTimeframe?.(selectedKey);
  };

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(false);
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
    <ScrollView className="flex-1 bg-[#fcf9f9]" showsVerticalScrollIndicator={false}>
      <View className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header: Title, Timeframe Selector, and Refresh */}
        <View className="flex-col sm:flex-row sm:items-center justify-between pb-1 gap-4">
          <View className="flex-1 min-w-[260px]">
            <View className="flex-row items-center space-x-2">
              <Text className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
                Performance Overview
              </Text>
              <View className="ml-2 rounded-full bg-stone-100 border border-stone-200 px-3 py-1">
                <Text className="text-base font-bold text-stone-700">100% Live DB</Text>
              </View>
            </View>
            <Text className="mt-1 text-base font-medium text-stone-500">
              Bar & Cafe · all stations · Updated {telemetry.lastUpdated}
            </Text>
          </View>

          <View className="flex-row items-center gap-3 flex-wrap">
            {/* Primary Timeframe Selector Trigger */}
            <Pressable
              onPress={() => setIsTimeframeModalOpen(true)}
              className="min-h-[48px] flex-row items-center rounded-xl border border-stone-300 bg-white px-4 py-2.5 shadow-xs active:bg-stone-50"
            >
              <Calendar size={18} color="#800020" />
              <Text className="text-base text-stone-500 ml-2 mr-1.5">Period:</Text>
              <Text className="text-base font-bold text-stone-900 mr-2">
                {activeTimeframeOption.label}
              </Text>
              <ChevronDown size={18} color="#78716c" />
            </Pressable>

            {/* Refresh Button */}
            <Pressable
              onPress={onRefresh}
              disabled={isLoading}
              className="min-h-[48px] flex-row items-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 shadow-xs active:bg-stone-50"
            >
              <RefreshCw size={18} color="#44403c" className={isLoading ? 'animate-spin' : ''} />
              <Text className="ml-2 text-base font-bold text-stone-800">
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 4 KPI Cards: Operational Floor Mix */}
        <View className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Net Sales Revenue (Burgundy #800020) */}
          <View className="rounded-2xl bg-[#800020] p-5 sm:p-6 shadow-sm justify-between min-h-[190px]">
            <View>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-white/90">Net Sales Revenue</Text>
                {timeframe === 'today' ? (
                  <View className="flex-row items-center rounded-full bg-white/20 border border-white/25 px-2.5 py-0.5">
                    <View className="h-2 w-2 rounded-full bg-emerald-400 mr-1.5" />
                    <Text className="text-base font-bold text-white">Live Shift</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center rounded-full bg-white/20 border border-white/25 px-2.5 py-0.5">
                    <Text className="text-base font-bold text-white">
                      {activeTimeframeOption.shortLabel}
                    </Text>
                  </View>
                )}
              </View>

              <Text className="mt-3 text-3xl font-black tracking-tight text-white">
                ₱
                {Number(telemetry.liveSalesTotal || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>

              {/* Benchmark delta badge */}
              <View className="mt-2 flex-row items-center flex-wrap gap-2">
                <View className="flex-row items-center rounded-md bg-white/20 px-2.5 py-0.5">
                  <TrendingUp size={16} color="#ffffff" />
                  <Text className="ml-1.5 text-base font-bold text-white">
                    {telemetry.salesGrowthPercent >= 0 ? '+' : ''}
                    {telemetry.salesGrowthPercent}%
                  </Text>
                </View>
                <Text className="text-base text-white/80">
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
                <View className="items-end">
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
                  <Text className="text-sm text-white/70 mt-1">{telemetry.peakHourLabel}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Card 2: Average Ticket / Check */}
          <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs justify-between min-h-[190px]">
            <View>
              <Text className="text-base font-semibold text-stone-500">Avg Ticket / Check</Text>
              <Text className="mt-2 text-3xl font-black text-stone-900 tracking-tight">
                ₱{Number(telemetry.averageCheck || 0).toFixed(2)}
              </Text>

              <View className="mt-2 flex-row items-center flex-wrap gap-2">
                <View className="flex-row items-center rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                  <TrendingUp size={16} color="#059669" />
                  <Text className="ml-1 text-base font-bold text-emerald-700">
                    {telemetry.averageCheckGrowthPercent >= 0 ? '+' : ''}
                    {telemetry.averageCheckGrowthPercent}%
                  </Text>
                </View>
                <Text className="text-base text-stone-500">per settled order</Text>
              </View>
            </View>

            <View className="mt-4 pt-3 border-t border-stone-100 flex-row items-center justify-between">
              <Text className="text-base text-stone-500">Spend Per Guest</Text>
              <Text className="text-base font-bold text-stone-800">
                ₱{Number(telemetry.spendPerGuest || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Card 3: Settled Orders & Payment Mix */}
          <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs justify-between min-h-[190px]">
            <View>
              <Text className="text-base font-semibold text-stone-500">Settled Orders & Mix</Text>
              <Text className="mt-2 text-3xl font-black text-stone-900 tracking-tight">
                {telemetry.orderCount}
              </Text>

              <View className="mt-2 flex-row items-center flex-wrap gap-2">
                <View className="flex-row items-center rounded-md bg-stone-100 border border-stone-200 px-2.5 py-0.5">
                  <Text className="text-base font-bold text-stone-700">
                    {telemetry.ordersPerHour} / hr
                  </Text>
                </View>
                <Text className="text-base text-stone-500">
                  {telemetry.benchmarkLabel || activeTimeframeOption.benchmarkLabel}
                </Text>
              </View>
            </View>

            {/* Payment Method Breakdown */}
            <View className="mt-4 pt-3 border-t border-stone-100 space-y-1.5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Banknote size={16} color="#059669" />
                  <Text className="ml-1.5 text-base text-stone-600">Cash</Text>
                </View>
                <Text className="text-base font-bold text-stone-900">
                  ₱{Number(telemetry.cashSales || 0).toLocaleString()}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Smartphone size={16} color="#2563eb" />
                  <Text className="ml-1.5 text-base text-stone-600">Digital / GCash</Text>
                </View>
                <Text className="text-base font-bold text-stone-900">
                  ₱{Number(telemetry.digitalSales || 0).toLocaleString()}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
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
          <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs justify-between min-h-[190px]">
            <View>
              <View className="flex-row items-center justify-between flex-wrap gap-1">
                <Text className="text-base font-semibold text-stone-500">Floor & Tables</Text>
                <View className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                  <Text className="text-base font-bold text-emerald-700">
                    {telemetry.occupancyPercent}% Busy
                  </Text>
                </View>
              </View>

              <Text className="mt-2 text-3xl font-black text-stone-900 tracking-tight">
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

        {/* Executive Visual Analytics Trio: Hourly Velocity + Tender Mix + Department Split */}
        <View className="space-y-6">
          {/* 1. Hourly Sales Velocity & Peak Pacing Curve */}
          <HourlySalesVelocityChart
            data={(telemetry.hourlySales || []).map((pt) => ({
              hour: pt.hourLabel,
              sales: pt.sales,
            }))}
            peakHourLabel={telemetry.peakHourLabel}
            totalSales={telemetry.liveSalesTotal}
          />

          {/* 2 & 3: Tender Mix & Department Breakdown Grid */}
          <View className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <View className="w-full lg:flex-[1.35] rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs">
            <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
              <View>
                <Text className="text-xl font-bold tracking-tight text-stone-900">
                  Best Sellers
                </Text>
                <Text className="text-base font-medium text-stone-500 mt-1">
                  {activeTimeframeOption.label} · {selectedCategory} · Top{' '}
                  {visibleBestSellers.length} items
                </Text>
              </View>

              <View className="rounded-full bg-stone-100 border border-stone-200 px-3.5 py-1.5">
                <Text className="text-base font-bold text-stone-700">By Quantity</Text>
              </View>
            </View>

            {/* Filter Controls Row (Range Pills + Interactive Category Selector) */}
            <View className="flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-4 mb-4 gap-3">
              {/* Range Pills with >= 48px touch targets */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                <View className="flex-row items-center rounded-xl bg-stone-100/90 p-1 space-x-1">
                  {(['top3', 'top5', 'top10', 'all'] as BestSellerFilter[]).map((tab) => {
                    const label =
                      tab === 'top3'
                        ? 'Top 3'
                        : tab === 'top5'
                          ? 'Top 5'
                          : tab === 'top10'
                            ? 'Top 10'
                            : 'All';
                    const isActive = bestSellerFilter === tab;
                    return (
                      <Pressable
                        key={tab}
                        onPress={() => setBestSellerFilter(tab)}
                        className={`min-h-[48px] px-3.5 sm:px-4 items-center justify-center rounded-lg transition-all ${
                          isActive ? 'bg-white shadow-xs' : 'active:bg-stone-200/60'
                        }`}
                      >
                        <Text
                          className={`text-base font-bold ${
                            isActive ? 'text-stone-900' : 'text-stone-600'
                          }`}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Interactive Category Selector Modal Trigger */}
              <Pressable
                onPress={() => setIsCategoryModalOpen(true)}
                className="min-h-[48px] flex-row items-center rounded-xl border border-stone-300 bg-white px-4 active:bg-stone-50"
              >
                <Layers size={18} color="#800020" />
                <Text className="ml-2 text-base font-bold text-stone-800">{selectedCategory}</Text>
                <ChevronDown size={18} color="#78716c" className="ml-2" />
              </Pressable>
            </View>

            {/* Ranked List Items with Progress Bar */}
            <View className="space-y-4">
              {visibleBestSellers.length === 0 ? (
                <View className="py-10 items-center justify-center">
                  <Text className="text-base text-stone-500 font-medium">
                    No items sold for "{selectedCategory}" in {activeTimeframeOption.label}.
                  </Text>
                </View>
              ) : (
                visibleBestSellers.map((item) => (
                  <View key={item.id} className="pt-1">
                    <View className="flex-row items-center justify-between gap-3">
                      {/* Left: Rank, Name, and Category */}
                      <View className="flex-row items-center flex-1 min-w-0 mr-2">
                        {/* Rank Circle */}
                        <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 mr-2.5">
                          <Text className="text-base font-bold text-stone-700">{item.rank}</Text>
                        </View>
                        <Text
                          className="text-base font-bold text-stone-900 shrink truncate"
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <View className="ml-2 shrink-0 rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5">
                          <Text className="text-sm font-medium text-stone-600">
                            {item.category}
                          </Text>
                        </View>
                      </View>

                      {/* Right: Sold & Sales amounts */}
                      <View className="flex-row items-baseline gap-4 shrink-0">
                        <View className="items-end">
                          <Text className="text-base font-bold text-stone-900">
                            {item.soldCount}
                          </Text>
                          <Text className="text-sm text-stone-400">sold</Text>
                        </View>
                        <View className="items-end min-w-[70px]">
                          <Text className="text-base font-black text-stone-900">
                            ₱{Number(item.salesAmount || 0).toFixed(2)}
                          </Text>
                          <Text className="text-sm text-stone-400">sales</Text>
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
                100% direct database order item aggregations
              </Text>
            </View>
          </View>

          {/* Right Column: Live Stations + Sales By Category */}
          <View className="w-full lg:flex-1 space-y-6">
            {/* Live Stations Card */}
            <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs">
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
                {(telemetry.stations || []).map((station) => (
                  <View
                    key={station.stationKey}
                    className="rounded-xl border border-stone-200/70 bg-stone-50/60 p-4"
                  >
                    <View className="flex-row items-center justify-between mb-2.5 flex-wrap gap-2">
                      <View className="flex-row items-center space-x-2">
                        <Text className="text-lg font-bold text-stone-900">{station.name}</Text>
                        {station.isOnline ? (
                          <View className="ml-2 flex-row items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                            <View className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />
                            <Text className="text-base font-bold text-emerald-700">Online</Text>
                          </View>
                        ) : (
                          <View className="ml-2 flex-row items-center rounded-full bg-stone-100 border border-stone-300 px-2.5 py-0.5">
                            <View className="h-2 w-2 rounded-full bg-stone-400 mr-1.5" />
                            <Text className="text-base font-bold text-stone-600">Offline</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-base text-stone-500">
                        Target {station.targetTicketTime}
                      </Text>
                    </View>

                    <View className="grid grid-cols-4 gap-2 pt-1 text-center">
                      <View>
                        <Text className="text-xl font-black text-stone-900">
                          {station.activeTickets}
                        </Text>
                        <Text className="text-xs text-stone-500 mt-0.5">Active</Text>
                      </View>

                      <View>
                        <Text className="text-xl font-black text-stone-900">
                          {station.avgTicketTime}
                        </Text>
                        <Text className="text-xs text-stone-500 mt-0.5">Avg time</Text>
                      </View>

                      <View>
                        <Text
                          className={`text-xl font-black ${
                            station.lateTickets > 0 ? 'text-rose-600' : 'text-stone-900'
                          }`}
                        >
                          {station.lateTickets}
                        </Text>
                        <Text className="text-xs text-stone-500 mt-0.5">Late</Text>
                      </View>

                      <View>
                        <Text className="text-xl font-black text-amber-600">
                          {station.stockoutCount}
                        </Text>
                        <Text className="text-xs text-stone-500 mt-0.5">Sold out</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Sales By Category Card */}
            <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
              <Text className="text-xl font-bold text-stone-900">Sales By Category</Text>
              <Text className="text-base text-stone-500 mb-4">
                {activeTimeframeOption.label} · Scaled to top category
              </Text>

              <View className="space-y-3.5">
                {(telemetry.categorySales || []).length === 0 ? (
                  <View className="py-6 items-center">
                    <Text className="text-base text-stone-500 font-medium">
                      No category sales recorded for this period.
                    </Text>
                  </View>
                ) : (
                  (telemetry.categorySales || []).map((cat) => (
                    <View
                      key={cat.category}
                      className="flex-row items-center justify-between gap-2"
                    >
                      <View className="w-32 shrink-0">
                        <Text className="text-base font-semibold text-stone-800" numberOfLines={1}>
                          {cat.category}
                        </Text>
                      </View>

                      <View className="flex-1 min-w-[50px] mx-2 h-2.5 rounded-full bg-stone-100">
                        <View
                          style={{ width: `${Math.min(100, Math.max(8, cat.percentage))}%` }}
                          className="h-2.5 rounded-full bg-[#800020]"
                        />
                      </View>

                      <Text className="w-28 shrink-0 text-right text-base font-bold text-stone-900">
                        ₱{Number(cat.amount || 0).toFixed(2)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Full-Width Card: Needs Attention */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center space-x-2">
              <Text className="text-xl font-bold text-stone-900">Needs Attention</Text>
              {alerts.length > 0 && (
                <View className="ml-3 h-7 w-7 items-center justify-center rounded-full bg-rose-100 border border-rose-200">
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
              <Text className="text-base font-medium text-stone-500">
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
                    className="flex-row items-center justify-between rounded-xl border border-stone-100 bg-stone-50/60 p-4 flex-wrap gap-3"
                  >
                    <View className="flex-row items-center flex-1 min-w-[260px] mr-2">
                      {/* Badge */}
                      <View
                        className={`rounded-lg px-3 py-1.5 border shrink-0 mr-3 ${
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

                      <View className="flex-1">
                        <Text className="text-base font-bold text-stone-900">{alert.title}</Text>
                        <Text className="text-base text-stone-500 mt-0.5">{alert.description}</Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => onNavigateRoute(alert.targetRoute)}
                      className="min-h-[48px] px-4 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200 shrink-0"
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

      {/* TIMEFRAME SELECTOR MODAL */}
      <AdminModal
        visible={isTimeframeModalOpen}
        onClose={() => setIsTimeframeModalOpen(false)}
        title="Select Timeframe"
        subtitle="Filter dashboard analytics, sales velocity, and station speed"
        icon={<Calendar size={22} color="#800020" />}
        size="md"
      >
        <View className="space-y-3">
          {TIMEFRAME_OPTIONS.map((opt) => {
            const isSelected = opt.key === timeframe;
            return (
              <Pressable
                key={opt.key}
                onPress={() => handleSelectTimeframe(opt.key)}
                className={`min-h-[48px] p-4 rounded-xl border flex-row items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-[#800020]/10 border-[#800020]'
                    : 'bg-white border-stone-200 active:bg-stone-50 hover:bg-stone-50'
                }`}
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center space-x-2">
                    <Text
                      className={`text-base font-bold ${
                        isSelected ? 'text-[#800020]' : 'text-stone-900'
                      }`}
                    >
                      {opt.label}
                    </Text>
                    <Text className="text-base text-stone-500 ml-2">({opt.benchmarkLabel})</Text>
                  </View>
                  <Text className="text-base text-stone-500 mt-1">{opt.description}</Text>
                </View>
                <View
                  className={`h-6 w-6 rounded-full items-center justify-center border ${
                    isSelected ? 'bg-[#800020] border-[#800020]' : 'border-stone-400'
                  }`}
                >
                  {isSelected && <Check size={14} color="#ffffff" />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </AdminModal>

      {/* BEST SELLERS CATEGORY MODAL */}
      <AdminModal
        visible={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Filter Best Sellers"
        subtitle="Focus leaderboard ranking on specific beverage or kitchen group"
        icon={<Layers size={22} color="#800020" />}
        size="sm"
      >
        <View className="space-y-2.5">
          {availableCategories.map((cat) => {
            const isSelected = cat === selectedCategory;
            return (
              <Pressable
                key={cat}
                onPress={() => handleSelectCategory(cat)}
                className={`min-h-[48px] px-4 py-3 rounded-xl border flex-row items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-[#800020]/10 border-[#800020]'
                    : 'bg-white border-stone-200 active:bg-stone-50 hover:bg-stone-50'
                }`}
              >
                <Text
                  className={`text-base font-bold ${
                    isSelected ? 'text-[#800020]' : 'text-stone-800'
                  }`}
                >
                  {cat}
                </Text>
                {isSelected && <Check size={18} color="#800020" />}
              </Pressable>
            );
          })}
        </View>
      </AdminModal>
    </ScrollView>
  );
};
