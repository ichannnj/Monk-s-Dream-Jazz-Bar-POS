import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  TrendingUp,
  Banknote,
  Smartphone,
  CreditCard,
  LayoutGrid,
  ArrowRight,
  Clock,
  Sparkles,
  Coffee,
  Users,
  DollarSign,
} from 'lucide-react-native';
import type { DashboardTelemetry, AdminRoute, TimeframeFilter } from '../../../domain/admin.types';
import { TimeframeOption } from './useAdminDashboardController';

interface DashboardKpiAndModeSectionProps {
  telemetry: DashboardTelemetry;
  timeframe: TimeframeFilter;
  activeTimeframeOption: TimeframeOption;
  onNavigateRoute: (route: AdminRoute) => void;
  onSelectTimeframe: (selectedKey: TimeframeFilter) => void;
}

export const DashboardKpiAndModeSection: React.FC<DashboardKpiAndModeSectionProps> = ({
  telemetry,
  timeframe,
  activeTimeframeOption,
  onNavigateRoute,
  onSelectTimeframe,
}) => {
  const hasZeroOrders = (telemetry.orderCount || 0) === 0;

  return (
    <>
      {/* 4 KPI Cards: Operational Floor Mix */}
      <View className="flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-5">
        {/* Card 1: Net Sales Revenue */}
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

          <View className="mt-4 pt-3 border-t border-white/20 flex-row items-end justify-between flex-wrap gap-2">
            <Text className="text-base font-medium text-white/90">
              {telemetry.orderCount} checks · {telemetry.guestCount} guests
            </Text>
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

      {/* Informative Zero-State Callout */}
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
            onPress={() => onSelectTimeframe('all')}
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
              <Text className="text-xl font-bold text-stone-900">Operating Mode Revenue Split</Text>
              <Text className="text-base text-stone-500 font-medium mt-0.5">
                Segregated sales for Daytime Cafe vs. Evening Live Jazz Sets
              </Text>
            </View>
          </View>
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
                  <Text className="text-base font-bold text-amber-700">Event Mode</Text>
                </>
              ) : (
                <>
                  <Coffee size={14} color="#0284c7" />
                  <Text className="text-base font-bold text-sky-700">Cafe Mode</Text>
                </>
              )}
            </View>
          </View>
        </View>

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

        <View className="flex-col md:flex-row gap-4">
          <View className="flex-1 min-w-0 rounded-xl border border-sky-200 bg-sky-50/50 p-4 justify-between">
            <View className="min-w-0">
              <View className="flex-row items-center justify-between flex-wrap gap-2">
                <View className="flex-row items-center gap-2 flex-1 min-w-[140px]">
                  <Coffee size={18} color="#0284c7" />
                  <Text className="text-base font-bold text-sky-900">Cafe Mode Sales</Text>
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

          <View className="flex-1 min-w-0 rounded-xl border border-amber-200 bg-amber-50/50 p-4 justify-between">
            <View className="min-w-0">
              <View className="flex-row items-center justify-between flex-wrap gap-2">
                <View className="flex-row items-center gap-2 flex-1 min-w-[140px]">
                  <Sparkles size={18} color="#d97706" />
                  <Text className="text-base font-bold text-amber-900">Event Mode Sales</Text>
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
    </>
  );
};
