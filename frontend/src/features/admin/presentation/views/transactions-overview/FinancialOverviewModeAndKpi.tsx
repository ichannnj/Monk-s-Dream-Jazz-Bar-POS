import React from 'react';
import { View, Text } from 'react-native';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  ReceiptText,
  Coffee,
  Sparkles,
  Percent,
} from 'lucide-react-native';
import type { SalesAnalyticsOverview } from '../../../data/admin.api';
import { type ModeFilter, type StationOption } from './transactionsOverview.types';

interface FinancialOverviewModeAndKpiProps {
  effectiveAnalytics: SalesAnalyticsOverview | null;
  grossSales: number;
  orderCount: number;
  averageTicket: number;
  estimatedNetProfit: number;
  profitMargin: number;
  timeframeDisplayLabel: string;
  activeStationOption: StationOption;
  selectedMode: ModeFilter;
}

export const FinancialOverviewModeAndKpi: React.FC<FinancialOverviewModeAndKpiProps> = ({
  effectiveAnalytics,
  grossSales,
  orderCount,
  averageTicket,
  estimatedNetProfit,
  profitMargin,
  timeframeDisplayLabel,
  activeStationOption,
  selectedMode,
}) => {
  return (
    <>
      {/* Print-Only Executive 1-Page Summary Sheet */}
      <View className="mb-4 pb-2 border-b-2 border-stone-900 print-only">
        <View className="flex-row justify-between items-end">
          <View>
            <Text className="text-xs font-bold tracking-widest text-[#800020] uppercase">
              Monk's Dream Jazz Bar &amp; Bistro
            </Text>
            <Text className="text-xl font-black text-stone-900 mt-0.5">
              Executive Financial &amp; Sales Summary
            </Text>
            <Text className="text-xs font-medium text-stone-500 mt-0.5">
              Scope:{' '}
              {activeStationOption.key === 'ALL'
                ? 'All Operational Stations'
                : activeStationOption.label}{' '}
              · Timeframe: {timeframeDisplayLabel}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-stone-500">
              Generated: {new Date().toLocaleDateString()}{' '}
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text className="text-xs font-bold text-stone-700">
              Filter:{' '}
              {selectedMode === 'ALL'
                ? 'Consolidated'
                : selectedMode === 'CAFE'
                  ? 'Cafe Mode'
                  : 'Event Mode'}
            </Text>
          </View>
        </View>
      </View>

      {/* Dedicated Operating Mode Revenue Breakdown Card */}
      <View className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs mb-6">
        <View className="flex-row items-center justify-between flex-wrap gap-3 mb-4">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-[#800020]/10 border border-[#800020]/20 items-center justify-center">
              <Sparkles size={20} color="#800020" />
            </View>
            <View>
              <Text className="text-xl font-bold text-stone-900">Operating Mode Breakdown</Text>
              <Text className="text-base text-stone-500 font-medium">
                Segregated performance for Daytime Cafe vs. Live Jazz Events (
                {timeframeDisplayLabel})
              </Text>
            </View>
          </View>

          {/* Filter indicator */}
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-stone-500">Filtered View:</Text>
            <View
              className={`px-3 py-1.5 rounded-full border ${
                selectedMode === 'EVENT'
                  ? 'bg-amber-50 border-amber-300'
                  : selectedMode === 'CAFE'
                    ? 'bg-sky-50 border-sky-300'
                    : 'bg-stone-100 border-stone-300'
              }`}
            >
              <Text
                className={`text-base font-bold ${
                  selectedMode === 'EVENT'
                    ? 'text-amber-800'
                    : selectedMode === 'CAFE'
                      ? 'text-sky-800'
                      : 'text-stone-700'
                }`}
              >
                {selectedMode === 'EVENT'
                  ? 'Event Mode Only'
                  : selectedMode === 'CAFE'
                    ? 'Cafe Mode Only'
                    : 'All Modes (Consolidated)'}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <View className="w-3 h-3 rounded-full bg-sky-500" />
              <Text className="text-base font-bold text-sky-900">
                Daytime Cafe ({effectiveAnalytics?.modeBreakdown?.cafePercent || 0}%)
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-amber-900">
                Live Jazz Event ({effectiveAnalytics?.modeBreakdown?.eventPercent || 0}%)
              </Text>
              <View className="w-3 h-3 rounded-full bg-amber-500" />
            </View>
          </View>
          <View className="h-3.5 w-full bg-stone-100 rounded-full overflow-hidden flex-row">
            <View
              style={{ width: `${effectiveAnalytics?.modeBreakdown?.cafePercent || 0}%` }}
              className="h-full bg-sky-500 rounded-l-full"
            />
            <View
              style={{ width: `${effectiveAnalytics?.modeBreakdown?.eventPercent || 0}%` }}
              className="h-full bg-amber-500 rounded-r-full"
            />
          </View>
        </View>

        {/* 3 Split Cards */}
        <View className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <View className="p-4 rounded-xl border border-sky-200 bg-sky-50/50 justify-between">
            <View>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-sky-900">Cafe Mode Sales</Text>
                <View className="px-2 py-0.5 rounded-md bg-sky-100 border border-sky-300">
                  <Text className="text-base font-bold text-sky-800">
                    {effectiveAnalytics?.modeBreakdown?.cafePercent || 0}%
                  </Text>
                </View>
              </View>
              <Text className="mt-2 text-2xl font-black text-sky-950">
                ₱
                {Number(effectiveAnalytics?.modeBreakdown?.cafeSales || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <Text className="text-base font-medium text-sky-700 mt-2">
              {effectiveAnalytics?.modeBreakdown?.cafeOrderCount || 0} settled checks
            </Text>
          </View>

          <View className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 justify-between">
            <View>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-amber-900">Event Mode Sales</Text>
                <View className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300">
                  <Text className="text-base font-bold text-amber-800">
                    {effectiveAnalytics?.modeBreakdown?.eventPercent || 0}%
                  </Text>
                </View>
              </View>
              <Text className="mt-2 text-2xl font-black text-amber-950">
                ₱
                {Number(effectiveAnalytics?.modeBreakdown?.eventSales || 0).toLocaleString(
                  'en-US',
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </Text>
            </View>
            <Text className="text-base font-medium text-amber-700 mt-2">
              {effectiveAnalytics?.modeBreakdown?.eventOrderCount || 0} settled checks
            </Text>
          </View>

          <View className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 justify-between">
            <View>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-stone-900">Total Consolidated Sales</Text>
                <View className="px-2 py-0.5 rounded-md bg-stone-200 border border-stone-300">
                  <Text className="text-base font-bold text-stone-800">100%</Text>
                </View>
              </View>
              <Text className="mt-2 text-2xl font-black text-stone-900">
                ₱
                {Number(effectiveAnalytics?.modeBreakdown?.totalSales || grossSales).toLocaleString(
                  'en-US',
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </Text>
            </View>
            <Text className="text-base font-medium text-stone-600 mt-2">
              {orderCount} total settled checks
            </Text>
          </View>
        </View>
      </View>

      {/* Top Executive KPI Grid */}
      <View className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Gross Revenue */}
        <View className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base font-semibold text-stone-500">Gross Sales</Text>
            <View className="w-9 h-9 rounded-xl bg-amber-50 items-center justify-center print-hidden">
              <DollarSign size={18} color="#b45309" />
            </View>
          </View>
          <Text className="text-3xl font-black text-stone-900 tracking-tight">
            ₱
            {grossSales.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View className="flex-row items-center mt-2">
            <View className="flex-row items-center bg-emerald-50 px-2 py-0.5 rounded-md">
              <TrendingUp size={14} color="#059669" />
              <Text className="text-base font-bold text-emerald-700 ml-1">Live Revenue</Text>
            </View>
            <Text className="text-base text-stone-400 ml-2">across filter</Text>
          </View>
        </View>

        {/* Net Estimated Profit */}
        <View className="rounded-2xl border border-[#800020]/20 bg-rose-50/20 p-5 shadow-xs">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base font-semibold text-stone-600">Net Estimated Profit</Text>
            <View className="w-9 h-9 rounded-xl bg-[#800020]/10 items-center justify-center print-hidden">
              <Sparkles size={18} color="#800020" />
            </View>
          </View>
          <Text className="text-3xl font-black text-[#800020] tracking-tight">
            ₱
            {estimatedNetProfit.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View className="flex-row items-center mt-2">
            <View className="bg-[#800020]/10 px-2 py-0.5 rounded-md">
              <Text className="text-base font-bold text-[#800020]">{profitMargin}% Margin</Text>
            </View>
            <Text className="text-base text-stone-400 ml-2">after COGS &amp; labor</Text>
          </View>
        </View>

        {/* Settled Orders */}
        <View className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base font-semibold text-stone-500">Settled Checks</Text>
            <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center print-hidden">
              <ReceiptText size={18} color="#2563eb" />
            </View>
          </View>
          <Text className="text-3xl font-black text-stone-900 tracking-tight">{orderCount}</Text>
          <Text className="text-base text-stone-500 mt-2 font-medium">Customer tabs completed</Text>
        </View>

        {/* Average Ticket */}
        <View className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base font-semibold text-stone-500">Average Ticket</Text>
            <View className="w-9 h-9 rounded-xl bg-purple-50 items-center justify-center print-hidden">
              <Percent size={18} color="#9333ea" />
            </View>
          </View>
          <Text className="text-3xl font-black text-stone-900 tracking-tight">
            ₱
            {averageTicket.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text className="text-base text-stone-500 mt-2 font-medium">Per settled transaction</Text>
        </View>
      </View>
    </>
  );
};
