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
      {/* 4 Operational KPI Cards (3-Color System: Sand, Charcoal, Burgundy #800020) */}
      <View className="flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-5">
        {/* Card 1: Net Sales Revenue (Focal Burgundy Card) */}
        <View className="w-full sm:w-[48%] xl:flex-1 min-w-0 rounded-2xl bg-[#800020] p-5 sm:p-6 shadow-xs justify-between min-h-[180px]">
          <View className="min-w-0">
            <View className="flex-row items-center justify-between flex-wrap gap-2">
              <Text className="text-sm font-semibold tracking-wide text-white/90">Net Sales</Text>
              <View className="flex-row items-center rounded-full bg-white/20 px-2.5 py-0.5 shrink-0">
                <Text className="text-xs font-bold text-white">
                  {timeframe === 'today' ? 'Live Shift' : activeTimeframeOption.shortLabel}
                </Text>
              </View>
            </View>

            <Text className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
              ₱
              {Number(telemetry.liveSalesTotal || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>

            <View className="mt-2 flex-row items-center flex-wrap gap-2">
              <View className="flex-row items-center rounded-md bg-white/20 px-2 py-0.5 shrink-0">
                <TrendingUp size={14} color="#ffffff" />
                <Text className="ml-1 text-xs font-bold text-white">
                  {telemetry.salesGrowthPercent >= 0 ? '+' : ''}
                  {telemetry.salesGrowthPercent}%
                </Text>
              </View>
              <Text className="text-xs text-white/80 flex-1 min-w-[100px]" numberOfLines={1}>
                {telemetry.benchmarkLabel || activeTimeframeOption.benchmarkLabel}
              </Text>
            </View>
          </View>

          <View className="mt-4 pt-3 border-t border-white/20 flex-row items-center justify-between flex-wrap gap-2">
            <Text className="text-xs font-medium text-white/90">
              {telemetry.orderCount} checks · {telemetry.guestCount} guests
            </Text>
            {telemetry.hourlySales && telemetry.hourlySales.length > 0 && (
              <View className="items-end shrink-0">
                <View className="flex-row items-end h-6 space-x-1">
                  {telemetry.hourlySales.map((h, idx) => {
                    const maxSales = Math.max(...telemetry.hourlySales.map((s) => s.sales), 100);
                    const barHeight = Math.max(4, Math.round((h.sales / maxSales) * 22));
                    return (
                      <View
                        key={idx}
                        style={{ height: barHeight }}
                        className={`w-1 rounded-t-xs ${h.isPeak ? 'bg-white' : 'bg-white/40'}`}
                      />
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Card 2: Average Ticket */}
        <View className="w-full sm:w-[48%] xl:flex-1 min-w-0 rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs justify-between min-h-[180px]">
          <View className="min-w-0">
            <Text className="text-sm font-semibold tracking-wide text-stone-500">
              Average Ticket
            </Text>
            <Text className="mt-2 text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              ₱{Number(telemetry.averageCheck || 0).toFixed(2)}
            </Text>
            <View className="mt-2 flex-row items-center flex-wrap gap-2">
              <View className="flex-row items-center rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 shrink-0">
                <TrendingUp size={14} color="#800020" />
                <Text className="ml-1 text-xs font-bold text-stone-800">
                  {telemetry.averageCheckGrowthPercent >= 0 ? '+' : ''}
                  {telemetry.averageCheckGrowthPercent}%
                </Text>
              </View>
            </View>
          </View>
          <View className="mt-4 pt-3 border-t border-stone-100 flex-row items-center justify-between flex-wrap gap-2">
            <Text className="text-xs text-stone-500">Per Guest</Text>
            <Text className="text-sm font-bold text-stone-900">
              ₱{Number(telemetry.spendPerGuest || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Card 3: Settled Orders */}
        <View className="w-full sm:w-[48%] xl:flex-1 min-w-0 rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs justify-between min-h-[180px]">
          <View className="min-w-0">
            <Text className="text-sm font-semibold tracking-wide text-stone-500">
              Settled Orders
            </Text>
            <Text className="mt-2 text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {telemetry.orderCount}
            </Text>
            <View className="mt-2 flex-row items-center flex-wrap gap-2">
              <View className="flex-row items-center rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 shrink-0">
                <Text className="text-xs font-bold text-stone-700">
                  {telemetry.ordersPerHour} / hr
                </Text>
              </View>
            </View>
          </View>
          <View className="mt-4 pt-3 border-t border-stone-100 space-y-1.5">
            <View className="flex-row items-center justify-between text-xs">
              <View className="flex-row items-center">
                <Banknote size={14} color="#78716c" />
                <Text className="ml-1.5 text-xs text-stone-600">Cash</Text>
              </View>
              <Text className="text-xs font-bold text-stone-900">
                ₱{Number(telemetry.cashSales || 0).toLocaleString()}
              </Text>
            </View>
            <View className="flex-row items-center justify-between text-xs">
              <View className="flex-row items-center">
                <Smartphone size={14} color="#78716c" />
                <Text className="ml-1.5 text-xs text-stone-600">Digital</Text>
              </View>
              <Text className="text-xs font-bold text-stone-900">
                ₱{Number(telemetry.digitalSales || 0).toLocaleString()}
              </Text>
            </View>
            <View className="flex-row items-center justify-between text-xs">
              <View className="flex-row items-center">
                <CreditCard size={14} color="#78716c" />
                <Text className="ml-1.5 text-xs text-stone-600">Card</Text>
              </View>
              <Text className="text-xs font-bold text-stone-900">
                ₱{Number(telemetry.cardSales || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Card 4: Floor Occupancy */}
        <View className="w-full sm:w-[48%] xl:flex-1 min-w-0 rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs justify-between min-h-[180px]">
          <View className="min-w-0">
            <View className="flex-row items-center justify-between flex-wrap gap-1">
              <Text className="text-sm font-semibold tracking-wide text-stone-500">
                Floor & Tables
              </Text>
              <View className="rounded-full bg-stone-100 px-2 py-0.5 shrink-0">
                <Text className="text-xs font-bold text-stone-800">
                  {telemetry.occupancyPercent}%
                </Text>
              </View>
            </View>
            <Text className="mt-2 text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {telemetry.occupiedTables} / {telemetry.totalTables}{' '}
              <Text className="text-base font-normal text-stone-500">Tables</Text>
            </Text>
            <View className="mt-3 h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
              <View
                style={{ width: `${Math.min(100, Math.max(5, telemetry.occupancyPercent))}%` }}
                className="h-full rounded-full bg-[#800020]"
              />
            </View>
          </View>
          <View className="mt-4 pt-3 border-t border-stone-100 flex-row items-center justify-between flex-wrap gap-2">
            <View className="flex-row items-center">
              <LayoutGrid size={14} color="#800020" />
              <Text className="ml-1.5 text-xs font-medium text-stone-700">
                {telemetry.activeOpenTabs} open tab{telemetry.activeOpenTabs === 1 ? '' : 's'}
              </Text>
            </View>
            <Pressable
              onPress={() => onNavigateRoute('tables')}
              className="px-2.5 py-1 flex-row items-center rounded-lg bg-stone-50 active:bg-stone-100"
            >
              <Text className="text-xs font-bold text-[#800020]">Floor</Text>
              <ArrowRight size={13} color="#800020" className="ml-1" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Informative Zero-State Callout (Decluttered) */}
      {hasZeroOrders && (
        <View className="rounded-2xl border border-stone-200/80 bg-white p-5 flex-row items-center justify-between flex-wrap gap-4">
          <View className="flex-row items-center space-x-3 flex-1 min-w-[240px]">
            <View className="h-9 w-9 rounded-full bg-stone-100 items-center justify-center mr-3">
              <Clock size={18} color="#78716c" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-stone-900">
                No settled orders for {activeTimeframeOption.label}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => onSelectTimeframe('all')}
            className="px-4 py-2 items-center justify-center rounded-xl bg-[#800020] active:bg-[#600018]"
          >
            <Text className="text-xs font-bold text-white">View All-Time</Text>
          </Pressable>
        </View>
      )}

      {/* Revenue Split Section (Minimal, 3-Color: Stone, Charcoal, Burgundy #800020) */}
      <View className="w-full min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
        <View className="flex-row items-center justify-between flex-wrap gap-3 mb-4">
          <View className="flex-row items-center gap-2.5">
            <View className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-stone-200 items-center justify-center">
              <Sparkles size={16} color="#800020" />
            </View>
            <Text className="text-lg font-bold text-stone-900">Revenue Split</Text>
          </View>

          <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] border border-stone-200">
            {telemetry.activeOperatingMode === 'EVENT' ? (
              <>
                <Sparkles size={13} color="#800020" />
                <Text className="text-xs font-bold text-[#800020]">Event Mode</Text>
              </>
            ) : (
              <>
                <Coffee size={13} color="#1c1917" />
                <Text className="text-xs font-bold text-stone-900">Cafe Mode</Text>
              </>
            )}
          </View>
        </View>

        {/* Minimal Progress Bar (Burgundy for Cafe, Charcoal for Event) */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between text-xs mb-1.5">
            <Text className="text-xs font-bold text-[#800020]">
              Cafe ({telemetry.cafePercentage || 0}%)
            </Text>
            <Text className="text-xs font-bold text-stone-900">
              Event ({telemetry.eventPercentage || 0}%)
            </Text>
          </View>
          <View className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden flex-row">
            <View
              style={{ width: `${telemetry.cafePercentage || 0}%` }}
              className="h-full bg-[#800020]"
            />
            <View
              style={{ width: `${telemetry.eventPercentage || 0}%` }}
              className="h-full bg-stone-900"
            />
          </View>
        </View>

        {/* 3 Unified Clean Cards */}
        <View className="flex-col md:flex-row gap-4">
          <View className="flex-1 min-w-0 rounded-xl border border-stone-200/80 bg-[#FAF8F5] p-4 justify-between">
            <View className="min-w-0">
              <View className="flex-row items-center justify-between flex-wrap gap-2">
                <Text className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                  Cafe Sales
                </Text>
                <Text className="text-xs font-bold text-[#800020]">
                  {telemetry.cafePercentage || 0}%
                </Text>
              </View>
              <Text className="mt-2 text-xl font-black text-stone-900">
                ₱
                {Number(telemetry.cafeSales || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View className="mt-3 pt-2.5 border-t border-stone-200/80 flex-row items-center justify-between text-xs">
              <Text className="text-xs text-stone-500">
                {telemetry.cafeOrdersCount || 0} checks
              </Text>
              <Text className="text-xs text-stone-600 font-semibold">
                Avg ₱{Number(telemetry.cafeAvgCheck || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          <View className="flex-1 min-w-0 rounded-xl border border-stone-200/80 bg-[#FAF8F5] p-4 justify-between">
            <View className="min-w-0">
              <View className="flex-row items-center justify-between flex-wrap gap-2">
                <Text className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                  Event Sales
                </Text>
                <Text className="text-xs font-bold text-stone-900">
                  {telemetry.eventPercentage || 0}%
                </Text>
              </View>
              <Text className="mt-2 text-xl font-black text-stone-900">
                ₱
                {Number(telemetry.eventSales || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View className="mt-3 pt-2.5 border-t border-stone-200/80 flex-row items-center justify-between text-xs">
              <Text className="text-xs text-stone-500">
                {telemetry.eventOrdersCount || 0} checks
              </Text>
              <Text className="text-xs text-stone-600 font-semibold">
                Avg ₱{Number(telemetry.eventAvgCheck || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          <View className="flex-1 min-w-0 rounded-xl border border-stone-200/80 bg-[#FAF8F5] p-4 justify-between">
            <View className="min-w-0">
              <View className="flex-row items-center justify-between flex-wrap gap-2">
                <Text className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                  Total Sales
                </Text>
                <Text className="text-xs font-bold text-stone-700">100%</Text>
              </View>
              <Text className="mt-2 text-xl font-black text-stone-900">
                ₱
                {Number(telemetry.liveSalesTotal || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View className="mt-3 pt-2.5 border-t border-stone-200/80 flex-row items-center justify-between text-xs">
              <Text className="text-xs text-stone-500">{telemetry.orderCount || 0} checks</Text>
              <Text className="text-xs text-stone-600 font-semibold">
                Avg ₱{Number(telemetry.averageCheck || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
};
