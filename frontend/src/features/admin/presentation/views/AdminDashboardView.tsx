import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { RefreshCw, TrendingUp, TrendingDown, ArrowRight, ChevronDown } from 'lucide-react-native';
import type { DashboardTelemetry, AdminRoute } from '../../domain/admin.types';

interface AdminDashboardViewProps {
  telemetry: DashboardTelemetry;
  onRefresh: () => void;
  onNavigateRoute: (route: AdminRoute) => void;
  isLoading?: boolean;
}

type BestSellerFilter = 'top3' | 'top5' | 'top10' | 'all';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  telemetry,
  onRefresh,
  onNavigateRoute,
  isLoading = false,
}) => {
  const [bestSellerFilter, setBestSellerFilter] = useState<BestSellerFilter>('top3');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [alerts, setAlerts] = useState(telemetry.alerts);

  const getFilteredBestSellers = () => {
    let items = telemetry.bestSellers;
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
            {/* Comparison Filter */}
            <View className="flex-row items-center rounded-xl border border-stone-200 bg-white px-3.5 py-2 shadow-xs">
              <Text className="text-xs text-stone-400 mr-2">Compare With</Text>
              <Text className="text-sm font-bold text-stone-800 mr-1.5">Last Tuesday</Text>
              <ChevronDown size={14} color="#78716c" />
            </View>

            {/* Refresh Button */}
            <Pressable
              onPress={onRefresh}
              disabled={isLoading}
              className="min-h-[40px] flex-row items-center rounded-xl border border-stone-200 bg-white px-4 py-2 shadow-xs active:bg-stone-50"
            >
              <RefreshCw size={15} color="#44403c" className={isLoading ? 'animate-spin' : ''} />
              <Text className="ml-2 text-sm font-semibold text-stone-800">Refresh</Text>
            </Pressable>
          </View>
        </View>

        {/* KPI Cards Row (4 Columns with clean gutters) */}
        <View className="flex-row gap-5">
          {/* Card 1: Live Sales Total (Burgundy #800020) */}
          <View className="flex-[1.35] rounded-2xl bg-[#800020] p-6 shadow-sm justify-between min-h-[168px]">
            <View className="flex-row items-start justify-between">
              <View>
                <View className="flex-row items-center space-x-2">
                  <Text className="text-sm font-semibold text-white/90">Live Sales Total</Text>
                  <View className="ml-2 flex-row items-center rounded-full bg-white/20 border border-white/25 px-2 py-0.5">
                    <View className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1" />
                    <Text className="text-[11px] font-bold text-white">Live</Text>
                  </View>
                </View>

                <Text className="mt-2 text-3xl font-black tracking-tight text-white">
                  ₱
                  {telemetry.liveSalesTotal.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>

                <View className="mt-2 flex-row items-center">
                  <View className="flex-row items-center rounded-md bg-white/20 px-2 py-0.5">
                    <TrendingUp size={13} color="#ffffff" />
                    <Text className="ml-1 text-xs font-bold text-white">
                      {telemetry.salesGrowthPercent}%
                    </Text>
                  </View>
                  <Text className="ml-2 text-xs text-white/75">vs last Tuesday</Text>
                </View>

                <Text className="mt-3 text-xs font-medium text-white/80">
                  {telemetry.orderCount} orders · {telemetry.guestCount} guests
                </Text>
              </View>

              {/* Mini Hourly Bar Chart (7 AM to Now, Peak at 1 PM) */}
              <View className="items-end pl-3">
                <Text className="text-[11px] font-semibold text-white/90 mb-1">
                  {telemetry.peakHourLabel}
                </Text>
                <View className="flex-row items-end h-16 space-x-1.5 py-1">
                  {telemetry.hourlySales.map((h, idx) => {
                    const maxSales = 840;
                    const barHeight = Math.max(8, Math.round((h.sales / maxSales) * 52));
                    const isPeak = h.isPeak;
                    return (
                      <View key={idx} className="items-center">
                        <View
                          style={{ height: barHeight }}
                          className={`w-1.5 rounded-t-sm ${isPeak ? 'bg-white' : 'bg-white/40'}`}
                        />
                      </View>
                    );
                  })}
                </View>
                <View className="flex-row justify-between w-28 mt-0.5">
                  <Text className="text-[9px] text-white/60">7 AM</Text>
                  <Text className="text-[9px] text-white/60">Now</Text>
                </View>
                <Text className="text-[9px] text-white/60 mt-0.5">Sales by hour · 7 AM to now</Text>
              </View>
            </View>
          </View>

          {/* Card 2: Orders */}
          <View className="flex-1 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs justify-between min-h-[168px]">
            <Text className="text-sm font-semibold text-stone-500">Orders</Text>
            <View className="my-1">
              <Text className="text-3xl font-black text-stone-900 tracking-tight">
                {telemetry.orderCount}
              </Text>
              <View className="mt-1.5 flex-row items-center">
                <View className="flex-row items-center rounded-md bg-emerald-50 px-2 py-0.5">
                  <TrendingUp size={13} color="#059669" />
                  <Text className="ml-1 text-xs font-bold text-emerald-700">
                    {telemetry.ordersGrowthPercent}%
                  </Text>
                </View>
                <Text className="ml-1.5 text-xs text-stone-400">vs last Tue</Text>
              </View>
            </View>
            <Text className="text-xs text-stone-400">about {telemetry.ordersPerHour} per hour</Text>
          </View>

          {/* Card 3: Average Check */}
          <View className="flex-1 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs justify-between min-h-[168px]">
            <Text className="text-sm font-semibold text-stone-500">Average Check</Text>
            <View className="my-1">
              <Text className="text-3xl font-black text-stone-900 tracking-tight">
                ₱{telemetry.averageCheck.toFixed(2)}
              </Text>
              <View className="mt-1.5 flex-row items-center">
                <View className="flex-row items-center rounded-md bg-emerald-50 px-2 py-0.5">
                  <TrendingUp size={13} color="#059669" />
                  <Text className="ml-1 text-xs font-bold text-emerald-700">
                    {telemetry.averageCheckGrowthPercent}%
                  </Text>
                </View>
                <Text className="ml-1.5 text-xs text-stone-400">vs last Tue</Text>
              </View>
            </View>
            <Text className="text-xs text-stone-400">per order</Text>
          </View>

          {/* Card 4: Guests */}
          <View className="flex-1 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs justify-between min-h-[168px]">
            <Text className="text-sm font-semibold text-stone-500">Guests</Text>
            <View className="my-1">
              <Text className="text-3xl font-black text-stone-900 tracking-tight">
                {telemetry.guestCount}
              </Text>
              <View className="mt-1.5 flex-row items-center">
                <View className="flex-row items-center rounded-md bg-rose-50 px-2 py-0.5">
                  <TrendingDown size={13} color="#e11d48" />
                  <Text className="ml-1 text-xs font-bold text-rose-700">
                    {Math.abs(telemetry.guestGrowthPercent)}%
                  </Text>
                </View>
                <Text className="ml-1.5 text-xs text-stone-400">vs last Tue</Text>
              </View>
            </View>
            <Text className="text-xs text-stone-400">
              ₱{telemetry.spendPerGuest.toFixed(2)} per guest
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
                <Text className="text-xs font-medium text-stone-400 mt-0.5">
                  Today · All categories · Top {visibleBestSellers.length} of 38 items
                </Text>
              </View>

              <View className="rounded-full bg-stone-100 px-3 py-1">
                <Text className="text-xs font-bold text-stone-600">By Quantity</Text>
              </View>
            </View>

            {/* Filter Pills & Dropdowns */}
            <View className="flex-row items-center justify-between border-b border-stone-100 pb-3 mb-4">
              {/* Range Pills */}
              <View className="flex-row items-center rounded-xl bg-stone-100/80 p-1 space-x-1">
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
                      className={`rounded-lg px-3 py-1 ${
                        isActive ? 'bg-white shadow-xs' : 'hover:bg-stone-200/50'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isActive ? 'text-stone-900' : 'text-stone-500'
                        }`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Category & Timeframe Dropdowns */}
              <View className="flex-row items-center space-x-2">
                <View className="flex-row items-center rounded-xl border border-stone-200 bg-white px-3 py-1">
                  <Text className="text-xs font-medium text-stone-700 mr-1.5">
                    {selectedCategory}
                  </Text>
                  <ChevronDown size={13} color="#78716c" />
                </View>
                <View className="flex-row items-center rounded-xl border border-stone-200 bg-white px-3 py-1">
                  <Text className="text-xs font-medium text-stone-700 mr-1.5">Today</Text>
                  <ChevronDown size={13} color="#78716c" />
                </View>
              </View>
            </View>

            {/* Ranked List Items with Progress Bar */}
            <View className="space-y-4">
              {visibleBestSellers.map((item) => (
                <View key={item.id} className="pt-1">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center space-x-3">
                      {/* Rank Circle */}
                      <View className="h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-stone-50">
                        <Text className="text-xs font-bold text-stone-700">{item.rank}</Text>
                      </View>
                      <Text className="text-base font-bold text-stone-900 ml-2">{item.name}</Text>
                      <View className="ml-2 rounded-md bg-stone-100 px-2 py-0.5">
                        <Text className="text-[11px] font-medium text-stone-600">
                          {item.category}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-baseline space-x-4">
                      <View className="items-end mr-4">
                        <Text className="text-base font-bold text-stone-900">{item.soldCount}</Text>
                        <Text className="text-[10px] text-stone-400">sold</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-base font-black text-stone-900">
                          ₱{item.salesAmount.toFixed(2)}
                        </Text>
                        <Text className="text-[10px] text-stone-400">sales</Text>
                      </View>
                    </View>
                  </View>

                  {/* Burgundy #800020 Progress Bar */}
                  <View className="mt-2.5 h-1.5 w-full rounded-full bg-stone-100">
                    <View
                      style={{ width: `${item.progressPercent}%` }}
                      className="h-1.5 rounded-full bg-[#800020]"
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Footer Note */}
            <View className="mt-6 flex-row items-center justify-between border-t border-stone-100 pt-3.5">
              <Text className="text-xs text-stone-400">
                Showing top {visibleBestSellers.length} of 38 items
              </Text>
              <Text className="text-xs font-medium text-stone-500">
                Switch to Top 5, Top 10 or All to see more
              </Text>
            </View>
          </View>

          {/* Right Column: Live Stations + Sales By Category */}
          <View className="flex-1 space-y-6">
            {/* Live Stations Card */}
            <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-stone-900">Live Stations</Text>
                <Pressable
                  onPress={() => onNavigateRoute('stations')}
                  className="flex-row items-center space-x-1"
                >
                  <Text className="text-xs font-bold text-[#800020]">Open</Text>
                  <ArrowRight size={13} color="#800020" />
                </Pressable>
              </View>

              {/* Stations Rows */}
              <View className="space-y-3.5">
                {telemetry.stations.map((station) => (
                  <View
                    key={station.stationKey}
                    className="rounded-xl border border-stone-200/70 bg-stone-50/60 p-4"
                  >
                    <View className="flex-row items-center justify-between mb-2.5">
                      <View className="flex-row items-center space-x-2">
                        <Text className="text-base font-bold text-stone-900">{station.name}</Text>
                        <View className="ml-2 flex-row items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                          <View className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />
                          <Text className="text-[10px] font-bold text-emerald-700">Online</Text>
                        </View>
                      </View>
                      <Text className="text-[11px] text-stone-400">
                        target ticket time {station.targetTicketTime}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between pt-1">
                      <View>
                        <Text className="text-lg font-black text-stone-900">
                          {station.activeTickets}
                        </Text>
                        <Text className="text-[10px] text-stone-400">Active tickets</Text>
                      </View>

                      <View>
                        <Text className="text-lg font-black text-stone-900">
                          {station.avgTicketTime}
                        </Text>
                        <Text className="text-[10px] text-stone-400">Avg ticket time</Text>
                      </View>

                      <View>
                        <Text
                          className={`text-lg font-black ${
                            station.lateTickets > 0 ? 'text-rose-600' : 'text-stone-900'
                          }`}
                        >
                          {station.lateTickets}
                        </Text>
                        <Text className="text-[10px] text-stone-400">Late</Text>
                      </View>

                      <View>
                        <Text className="text-lg font-black text-amber-600">
                          {station.stockoutCount}
                        </Text>
                        <Text className="text-[10px] text-stone-400">86'd items</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Sales By Category Card */}
            <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
              <Text className="text-lg font-bold text-stone-900">Sales By Category</Text>
              <Text className="text-xs text-stone-400 mb-4">
                Today · Net sales · scaled to top category
              </Text>

              <View className="space-y-3">
                {telemetry.categorySales.map((cat) => (
                  <View key={cat.category} className="flex-row items-center justify-between">
                    <View className="w-24">
                      <Text className="text-xs font-semibold text-stone-700">{cat.category}</Text>
                    </View>

                    <View className="flex-1 mx-3 h-2 rounded-full bg-stone-100">
                      <View
                        style={{ width: `${cat.percentage}%` }}
                        className="h-2 rounded-full bg-[#800020]"
                      />
                    </View>

                    <Text className="w-20 text-right text-xs font-bold text-stone-900">
                      ₱{cat.amount.toFixed(2)}
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
                <View className="ml-2 h-6 w-6 items-center justify-center rounded-full bg-rose-100 border border-rose-200">
                  <Text className="text-xs font-bold text-rose-700">{alerts.length}</Text>
                </View>
              )}
            </View>

            {alerts.length > 0 && (
              <Pressable
                onPress={handleClearAlerts}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-1.5 active:bg-stone-100"
              >
                <Text className="text-xs font-semibold text-stone-700">Clear All</Text>
              </Pressable>
            )}
          </View>

          {alerts.length === 0 ? (
            <View className="py-6 items-center">
              <Text className="text-sm font-medium text-stone-400">
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
                    <View className="flex-row items-center space-x-4">
                      {/* Badge */}
                      <View
                        className={`rounded-lg px-2.5 py-1 border ${
                          isVoid
                            ? 'bg-rose-50 border-rose-200'
                            : isStock
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-stone-100 border-stone-300'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isVoid ? 'text-rose-700' : isStock ? 'text-amber-800' : 'text-stone-700'
                          }`}
                        >
                          {alert.badgeLabel}
                        </Text>
                      </View>

                      <View className="ml-3">
                        <Text className="text-sm font-bold text-stone-900">{alert.title}</Text>
                        <Text className="text-xs text-stone-500">{alert.description}</Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => onNavigateRoute(alert.targetRoute)}
                      className="px-3 py-1.5 active:opacity-70"
                    >
                      <Text className="text-sm font-bold text-[#800020] underline">View</Text>
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
