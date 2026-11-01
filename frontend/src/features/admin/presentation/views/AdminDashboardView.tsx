import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
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
} from 'lucide-react-native';
import type { DashboardTelemetry, AdminRoute } from '../../domain/admin.types';
import type { ComparisonPeriod } from '../../data/adminTelemetry';

interface AdminDashboardViewProps {
  telemetry: DashboardTelemetry;
  onRefresh: () => void;
  onNavigateRoute: (route: AdminRoute) => void;
  isLoading?: boolean;
  comparisonPeriod?: ComparisonPeriod;
  onChangeComparisonPeriod?: (period: ComparisonPeriod) => void;
}

type BestSellerFilter = 'top3' | 'top5' | 'top10' | 'all';

interface ComparisonOption {
  key: ComparisonPeriod;
  label: string;
  shortLabel: string;
  description: string;
}

const COMPARISON_OPTIONS: ComparisonOption[] = [
  {
    key: 'last_week',
    label: 'Last Tuesday (Same Day Last Week)',
    shortLabel: 'Last Tuesday',
    description: 'Benchmark against the identical operating day of previous week',
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    shortLabel: 'Yesterday',
    description: 'Immediate preceding business day performance',
  },
  {
    key: 'week_avg',
    label: 'Last Week Average',
    shortLabel: '7-Day Average',
    description: '7-day rolling daily revenue average',
  },
  {
    key: 'none',
    label: 'None (Today Only)',
    shortLabel: 'Today Only',
    description: 'Raw performance numbers without comparison delta',
  },
];

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  telemetry,
  onRefresh,
  onNavigateRoute,
  isLoading = false,
  comparisonPeriod = 'last_week',
  onChangeComparisonPeriod,
}) => {
  const [bestSellerFilter, setBestSellerFilter] = useState<BestSellerFilter>('top3');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [alerts, setAlerts] = useState(telemetry.alerts);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Sync alerts whenever telemetry updates from background refresh
  useEffect(() => {
    setAlerts(telemetry.alerts);
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

  const activeComparisonOption =
    COMPARISON_OPTIONS.find((opt) => opt.key === comparisonPeriod) || COMPARISON_OPTIONS[0];

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

  const handleSelectComparison = (period: ComparisonPeriod) => {
    setIsCompareModalOpen(false);
    onChangeComparisonPeriod?.(period);
  };

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(false);
  };

  return (
    <ScrollView className="flex-1 bg-[#fcf9f9]" showsVerticalScrollIndicator={false}>
      <View className="w-full max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Today's Overview Header */}
        <View className="flex-row items-center justify-between pb-1">
          <View>
            <Text className="text-3xl font-extrabold tracking-tight text-stone-900">
              Today's Overview
            </Text>
            <Text className="mt-1 text-base font-medium text-stone-500">
              Bar and Cafe · all stations · {telemetry.lastUpdated}
            </Text>
          </View>

          <View className="flex-row items-center gap-3">
            {/* Interactive Comparison Filter Picker */}
            <Pressable
              onPress={() => setIsCompareModalOpen(true)}
              className="min-h-[48px] flex-row items-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-xs active:bg-stone-50"
            >
              <Text className="text-base text-stone-500 mr-2">Compare With:</Text>
              <Text className="text-base font-bold text-stone-800 mr-2">
                {activeComparisonOption.shortLabel}
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
                {isLoading ? 'Updating...' : 'Refresh'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* KPI Cards Row (4 Columns with clean gutters) */}
        <View className="flex-row gap-5">
          {/* Card 1: Live Sales Total (Burgundy #800020) */}
          <View className="flex-[1.35] rounded-2xl bg-[#800020] p-6 shadow-sm justify-between min-h-[180px]">
            <View className="flex-row items-start justify-between">
              <View>
                <View className="flex-row items-center space-x-2">
                  <Text className="text-base font-semibold text-white/90">Live Sales Total</Text>
                  <View className="ml-2 flex-row items-center rounded-full bg-white/20 border border-white/25 px-2.5 py-0.5">
                    <View className="h-2 w-2 rounded-full bg-emerald-400 mr-1.5" />
                    <Text className="text-base font-bold text-white">Live</Text>
                  </View>
                </View>

                <Text className="mt-2 text-3xl font-black tracking-tight text-white">
                  ₱
                  {Number(telemetry.liveSalesTotal || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>

                {comparisonPeriod !== 'none' && (
                  <View className="mt-2 flex-row items-center">
                    <View className="flex-row items-center rounded-md bg-white/20 px-2.5 py-0.5">
                      <TrendingUp size={16} color="#ffffff" />
                      <Text className="ml-1.5 text-base font-bold text-white">
                        {telemetry.salesGrowthPercent}%
                      </Text>
                    </View>
                    <Text className="ml-2 text-base text-white/80">
                      vs {activeComparisonOption.shortLabel}
                    </Text>
                  </View>
                )}

                <Text className="mt-3 text-base font-medium text-white/90">
                  {telemetry.orderCount} orders · {telemetry.guestCount} guests
                </Text>
              </View>

              {/* Mini Hourly Bar Chart (7 AM to Now, Peak at 1 PM) */}
              <View className="items-end pl-3">
                <Text className="text-base font-semibold text-white/90 mb-1">
                  {telemetry.peakHourLabel}
                </Text>
                <View className="flex-row items-end h-16 space-x-1.5 py-1">
                  {telemetry.hourlySales.map((h, idx) => {
                    const maxSales = 840;
                    const barHeight = Math.max(10, Math.round((h.sales / maxSales) * 52));
                    const isPeak = h.isPeak;
                    return (
                      <View key={idx} className="items-center">
                        <View
                          style={{ height: barHeight }}
                          className={`w-2 rounded-t-sm ${isPeak ? 'bg-white' : 'bg-white/40'}`}
                        />
                      </View>
                    );
                  })}
                </View>
                <View className="flex-row justify-between w-32 mt-1">
                  <Text className="text-base text-white/70">7 AM</Text>
                  <Text className="text-base text-white/70">Now</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Card 2: Orders */}
          <View className="flex-1 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs justify-between min-h-[180px]">
            <Text className="text-base font-semibold text-stone-500">Orders</Text>
            <View className="my-1">
              <Text className="text-3xl font-black text-stone-900 tracking-tight">
                {telemetry.orderCount}
              </Text>
              {comparisonPeriod !== 'none' && (
                <View className="mt-2 flex-row items-center">
                  <View className="flex-row items-center rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                    <TrendingUp size={16} color="#059669" />
                    <Text className="ml-1 text-base font-bold text-emerald-700">
                      {telemetry.ordersGrowthPercent}%
                    </Text>
                  </View>
                  <Text className="ml-2 text-base text-stone-500">
                    vs {activeComparisonOption.shortLabel}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-base text-stone-500">
              about {telemetry.ordersPerHour} per hour
            </Text>
          </View>

          {/* Card 3: Average Check */}
          <View className="flex-1 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs justify-between min-h-[180px]">
            <Text className="text-base font-semibold text-stone-500">Average Check</Text>
            <View className="my-1">
              <Text className="text-3xl font-black text-stone-900 tracking-tight">
                ₱{Number(telemetry.averageCheck || 0).toFixed(2)}
              </Text>
              {comparisonPeriod !== 'none' && (
                <View className="mt-2 flex-row items-center">
                  <View className="flex-row items-center rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                    <TrendingUp size={16} color="#059669" />
                    <Text className="ml-1 text-base font-bold text-emerald-700">
                      {telemetry.averageCheckGrowthPercent}%
                    </Text>
                  </View>
                  <Text className="ml-2 text-base text-stone-500">
                    vs {activeComparisonOption.shortLabel}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-base text-stone-500">per settled order</Text>
          </View>

          {/* Card 4: Guests */}
          <View className="flex-1 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs justify-between min-h-[180px]">
            <Text className="text-base font-semibold text-stone-500">Guests</Text>
            <View className="my-1">
              <Text className="text-3xl font-black text-stone-900 tracking-tight">
                {telemetry.guestCount}
              </Text>
              {comparisonPeriod !== 'none' && (
                <View className="mt-2 flex-row items-center">
                  <View className="flex-row items-center rounded-md bg-rose-50 border border-rose-200 px-2.5 py-0.5">
                    <TrendingDown size={16} color="#e11d48" />
                    <Text className="ml-1 text-base font-bold text-rose-700">
                      {Math.abs(telemetry.guestGrowthPercent)}%
                    </Text>
                  </View>
                  <Text className="ml-2 text-base text-stone-500">
                    vs {activeComparisonOption.shortLabel}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-base text-stone-500">
              ₱{Number(telemetry.spendPerGuest || 0).toFixed(2)} per guest
            </Text>
          </View>
        </View>

        {/* Middle Section: Best Sellers (Left) & Right Column (Stations + Category Sales) */}
        <View className="flex-row gap-6">
          {/* Left: Best Sellers Card */}
          <View className="flex-[1.35] rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-xl font-bold tracking-tight text-stone-900">
                  Best Sellers
                </Text>
                <Text className="text-base font-medium text-stone-500 mt-1">
                  Today · {selectedCategory} · Top {visibleBestSellers.length} items
                </Text>
              </View>

              <View className="rounded-full bg-stone-100 border border-stone-200 px-3.5 py-1.5">
                <Text className="text-base font-bold text-stone-700">By Quantity</Text>
              </View>
            </View>

            {/* Filter Controls Row (Range Pills + Interactive Category Selector) */}
            <View className="flex-row items-center justify-between border-b border-stone-100 pb-4 mb-4 gap-3">
              {/* Range Pills with >= 48px touch targets */}
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
                      className={`min-h-[48px] px-4 items-center justify-center rounded-lg transition-all ${
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
                <View className="py-8 items-center justify-center">
                  <Text className="text-base text-stone-500">
                    No items found for "{selectedCategory}".
                  </Text>
                </View>
              ) : (
                visibleBestSellers.map((item) => (
                  <View key={item.id} className="pt-1">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center space-x-3">
                        {/* Rank Circle */}
                        <View className="h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50">
                          <Text className="text-base font-bold text-stone-700">{item.rank}</Text>
                        </View>
                        <Text className="text-lg font-bold text-stone-900 ml-2">{item.name}</Text>
                        <View className="ml-2 rounded-md bg-stone-100 border border-stone-200 px-2.5 py-0.5">
                          <Text className="text-base font-medium text-stone-600">
                            {item.category}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-baseline space-x-6">
                        <View className="items-end mr-4">
                          <Text className="text-lg font-bold text-stone-900">{item.soldCount}</Text>
                          <Text className="text-base text-stone-400">sold</Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-lg font-black text-stone-900">
                            ₱{Number(item.salesAmount || 0).toFixed(2)}
                          </Text>
                          <Text className="text-base text-stone-400">sales</Text>
                        </View>
                      </View>
                    </View>

                    {/* Burgundy #800020 Progress Bar */}
                    <View className="mt-2.5 h-2 w-full rounded-full bg-stone-100">
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
            <View className="mt-6 flex-row items-center justify-between border-t border-stone-100 pt-4">
              <Text className="text-base text-stone-500">
                Displaying top {visibleBestSellers.length} items
              </Text>
              <Text className="text-base font-medium text-stone-600">
                Tap Category to filter by menu section
              </Text>
            </View>
          </View>

          {/* Right Column: Live Stations + Sales By Category */}
          <View className="flex-1 space-y-6">
            {/* Live Stations Card */}
            <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
              <View className="flex-row items-center justify-between mb-4">
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
                    <View className="flex-row items-center justify-between mb-2.5">
                      <View className="flex-row items-center space-x-2">
                        <Text className="text-lg font-bold text-stone-900">{station.name}</Text>
                        <View className="ml-2 flex-row items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                          <View className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />
                          <Text className="text-base font-bold text-emerald-700">Online</Text>
                        </View>
                      </View>
                      <Text className="text-base text-stone-500">
                        Target {station.targetTicketTime}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between pt-1">
                      <View>
                        <Text className="text-2xl font-black text-stone-900">
                          {station.activeTickets}
                        </Text>
                        <Text className="text-base text-stone-500">Active tickets</Text>
                      </View>

                      <View>
                        <Text className="text-2xl font-black text-stone-900">
                          {station.avgTicketTime}
                        </Text>
                        <Text className="text-base text-stone-500">Avg ticket time</Text>
                      </View>

                      <View>
                        <Text
                          className={`text-2xl font-black ${
                            station.lateTickets > 0 ? 'text-rose-600' : 'text-stone-900'
                          }`}
                        >
                          {station.lateTickets}
                        </Text>
                        <Text className="text-base text-stone-500">Late</Text>
                      </View>

                      <View>
                        <Text className="text-2xl font-black text-amber-600">
                          {station.stockoutCount}
                        </Text>
                        <Text className="text-base text-stone-500">Sold out</Text>
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
                Today · Net sales · scaled to top category
              </Text>

              <View className="space-y-3.5">
                {(telemetry.categorySales || []).map((cat) => (
                  <View key={cat.category} className="flex-row items-center justify-between">
                    <View className="w-28">
                      <Text className="text-base font-semibold text-stone-800">{cat.category}</Text>
                    </View>

                    <View className="flex-1 mx-3 h-2.5 rounded-full bg-stone-100">
                      <View
                        style={{ width: `${Math.min(100, Math.max(8, cat.percentage))}%` }}
                        className="h-2.5 rounded-full bg-[#800020]"
                      />
                    </View>

                    <Text className="w-24 text-right text-base font-bold text-stone-900">
                      ₱{Number(cat.amount || 0).toFixed(2)}
                    </Text>
                  </View>
                ))}
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
                All station alerts and audit reviews are resolved.
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
                    className="flex-row items-center justify-between rounded-xl border border-stone-100 bg-stone-50/60 p-4"
                  >
                    <View className="flex-row items-center space-x-4 flex-1 pr-4">
                      {/* Badge */}
                      <View
                        className={`rounded-lg px-3 py-1.5 border ${
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

                      <View className="ml-3 flex-1">
                        <Text className="text-base font-bold text-stone-900">{alert.title}</Text>
                        <Text className="text-base text-stone-500">{alert.description}</Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => onNavigateRoute(alert.targetRoute)}
                      className="min-h-[48px] px-4 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
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

      {/* COMPARISON BENCHMARK MODAL */}
      <Modal
        visible={isCompareModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCompareModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <View className="flex-row items-center justify-between border-b border-stone-200 pb-3 mb-4">
              <View className="flex-row items-center space-x-2">
                <Calendar size={22} color="#800020" />
                <Text className="text-xl font-bold text-stone-900">Compare Sales With</Text>
              </View>
              <Pressable
                onPress={() => setIsCompareModalOpen(false)}
                className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl active:bg-stone-100"
              >
                <X size={22} color="#57534e" />
              </Pressable>
            </View>

            <View className="space-y-3">
              {COMPARISON_OPTIONS.map((opt) => {
                const isSelected = opt.key === comparisonPeriod;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => handleSelectComparison(opt.key)}
                    className={`min-h-[48px] p-4 rounded-xl border flex-row items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#800020]/10 border-[#800020]'
                        : 'bg-white border-stone-200 active:bg-stone-50'
                    }`}
                  >
                    <View className="flex-1 pr-3">
                      <Text
                        className={`text-base font-bold ${
                          isSelected ? 'text-[#800020]' : 'text-stone-900'
                        }`}
                      >
                        {opt.label}
                      </Text>
                      <Text className="text-base text-stone-500 mt-0.5">{opt.description}</Text>
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
          </View>
        </View>
      </Modal>

      {/* BEST SELLERS CATEGORY MODAL */}
      <Modal
        visible={isCategoryModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCategoryModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <View className="flex-row items-center justify-between border-b border-stone-200 pb-3 mb-4">
              <View className="flex-row items-center space-x-2">
                <Layers size={22} color="#800020" />
                <Text className="text-xl font-bold text-stone-900">Filter Best Sellers</Text>
              </View>
              <Pressable
                onPress={() => setIsCategoryModalOpen(false)}
                className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl active:bg-stone-100"
              >
                <X size={22} color="#57534e" />
              </Pressable>
            </View>

            <View className="space-y-2.5">
              {availableCategories.map((cat) => {
                const isSelected = cat === selectedCategory;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => handleSelectCategory(cat)}
                    className={`min-h-[48px] px-4 py-3 rounded-xl border flex-row items-center justify-between ${
                      isSelected
                        ? 'bg-[#800020]/10 border-[#800020]'
                        : 'bg-white border-stone-200 active:bg-stone-50'
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
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
