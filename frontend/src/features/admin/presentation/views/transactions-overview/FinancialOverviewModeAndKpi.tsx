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
      <View className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs mb-6">
        <View className="flex-row items-center justify-between flex-wrap gap-2 mb-3">
          <View className="flex-row items-center gap-2.5">
            <View className="w-8 h-8 rounded-lg bg-stone-100 items-center justify-center">
              <Sparkles size={16} color="#800020" />
            </View>
            <Text className="text-base sm:text-lg font-bold text-stone-900">Revenue Split</Text>
          </View>

          {/* Filter indicator */}
          <View className="px-2.5 py-0.5 rounded-full border border-stone-200 bg-stone-50">
            <Text className="text-xs font-semibold text-stone-700">
              {selectedMode === 'EVENT'
                ? 'Event Mode'
                : selectedMode === 'CAFE'
                  ? 'Cafe Mode'
                  : 'Consolidated'}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs font-bold text-stone-700">
              Cafe ({effectiveAnalytics?.modeBreakdown?.cafePercent || 0}%)
            </Text>
            <Text className="text-xs font-bold text-[#800020]">
              Event ({effectiveAnalytics?.modeBreakdown?.eventPercent || 0}%)
            </Text>
          </View>
          <View className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden flex-row">
            <View
              style={{ width: `${effectiveAnalytics?.modeBreakdown?.cafePercent || 0}%` }}
              className="h-full bg-stone-800 rounded-l-full"
            />
            <View
              style={{ width: `${effectiveAnalytics?.modeBreakdown?.eventPercent || 0}%` }}
              className="h-full bg-[#800020] rounded-r-full"
            />
          </View>
        </View>

        {/* 3 Split Cards */}
        <View className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <View className="p-3.5 rounded-xl border border-stone-200 bg-[#FAF8F5] justify-between">
            <View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold text-stone-600">Cafe Sales</Text>
                <View className="px-1.5 py-0.5 rounded bg-white border border-stone-200">
                  <Text className="text-xs font-bold text-stone-700">
                    {effectiveAnalytics?.modeBreakdown?.cafePercent || 0}%
                  </Text>
                </View>
              </View>
              <Text className="mt-1 text-xl font-bold text-stone-900">
                ₱
                {Number(effectiveAnalytics?.modeBreakdown?.cafeSales || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <Text className="text-xs text-stone-500 mt-1">
              {effectiveAnalytics?.modeBreakdown?.cafeOrderCount || 0} checks
            </Text>
          </View>

          <View className="p-3.5 rounded-xl border border-stone-200 bg-[#FAF8F5] justify-between">
            <View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold text-stone-600">Event Sales</Text>
                <View className="px-1.5 py-0.5 rounded bg-white border border-stone-200">
                  <Text className="text-xs font-bold text-[#800020]">
                    {effectiveAnalytics?.modeBreakdown?.eventPercent || 0}%
                  </Text>
                </View>
              </View>
              <Text className="mt-1 text-xl font-bold text-stone-900">
                ₱
                {Number(effectiveAnalytics?.modeBreakdown?.eventSales || 0).toLocaleString(
                  'en-US',
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </Text>
            </View>
            <Text className="text-xs text-stone-500 mt-1">
              {effectiveAnalytics?.modeBreakdown?.eventOrderCount || 0} checks
            </Text>
          </View>

          <View className="p-3.5 rounded-xl border border-stone-200 bg-[#FAF8F5] justify-between">
            <View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold text-stone-600">Total Net Sales</Text>
                <View className="px-1.5 py-0.5 rounded bg-white border border-stone-200">
                  <Text className="text-xs font-bold text-stone-700">100%</Text>
                </View>
              </View>
              <Text className="mt-1 text-xl font-bold text-stone-900">
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
            <Text className="text-xs text-stone-500 mt-1">{orderCount} checks</Text>
          </View>
        </View>
      </View>

      {/* Top Executive KPI Grid */}
      <View className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Gross Revenue */}
        <View className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs font-bold text-stone-500">Gross Sales</Text>
            <View className="w-7 h-7 rounded-lg bg-stone-100 items-center justify-center print-hidden">
              <DollarSign size={14} color="#1c1917" />
            </View>
          </View>
          <Text className="text-2xl font-black text-stone-900 tracking-tight">
            ₱
            {grossSales.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text className="text-xs text-stone-400 mt-1">Filtered timeframe</Text>
        </View>

        {/* Net Estimated Profit */}
        <View className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs font-bold text-stone-500">Net Profit</Text>
            <View className="w-7 h-7 rounded-lg bg-stone-100 items-center justify-center print-hidden">
              <Sparkles size={14} color="#800020" />
            </View>
          </View>
          <Text className="text-2xl font-black text-[#800020] tracking-tight">
            ₱
            {estimatedNetProfit.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text className="text-xs font-semibold text-[#800020] mt-1">{profitMargin}% Margin</Text>
        </View>

        {/* Settled Orders */}
        <View className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs font-bold text-stone-500">Settled Checks</Text>
            <View className="w-7 h-7 rounded-lg bg-stone-100 items-center justify-center print-hidden">
              <ReceiptText size={14} color="#1c1917" />
            </View>
          </View>
          <Text className="text-2xl font-black text-stone-900 tracking-tight">{orderCount}</Text>
          <Text className="text-xs text-stone-400 mt-1">Completed tabs</Text>
        </View>

        {/* Average Ticket */}
        <View className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs font-bold text-stone-500">Average Ticket</Text>
            <View className="w-7 h-7 rounded-lg bg-stone-100 items-center justify-center print-hidden">
              <Percent size={14} color="#1c1917" />
            </View>
          </View>
          <Text className="text-2xl font-black text-stone-900 tracking-tight">
            ₱
            {averageTicket.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text className="text-xs text-stone-400 mt-1">Per check</Text>
        </View>
      </View>
    </>
  );
};
