import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { TrendingUp, Crown, Calendar, BarChart2, Layers } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type { TimelineDataPoint } from '../../../domain/trends.types';

type GranularityMode = 'day' | 'week' | 'month';

interface MultiGranularitySalesChartProps {
  dailyData: TimelineDataPoint[];
  weeklyData: TimelineDataPoint[];
  monthlyData: TimelineDataPoint[];
  bestDate?: { formattedDate: string; sales: number } | null;
  bestWeek?: { weekLabel: string; sales: number } | null;
  bestMonth?: { monthLabel: string; sales: number } | null;
}

export const MultiGranularitySalesChart: React.FC<MultiGranularitySalesChartProps> = ({
  dailyData,
  weeklyData,
  monthlyData,
  bestDate,
  bestWeek,
  bestMonth,
}) => {
  const [mode, setMode] = useState<GranularityMode>('day');
  const [selectedPoint, setSelectedPoint] = useState<TimelineDataPoint | null>(null);

  // Select active dataset based on mode
  const activeData = mode === 'day' ? dailyData : mode === 'week' ? weeklyData : monthlyData;

  const maxSales = Math.max(...activeData.map((d) => d.sales), 100);
  const peakPoint = activeData.find((d) => d.isPeak) || activeData[0];

  const getPeakAccoladeLabel = () => {
    if (mode === 'day') {
      return bestDate && bestDate.sales > 0
        ? `Best Date: ${bestDate.formattedDate} (${formatCurrency(bestDate.sales)})`
        : peakPoint && peakPoint.sales > 0
          ? `Best Date: ${peakPoint.label} (${formatCurrency(peakPoint.sales)})`
          : null;
    }
    if (mode === 'week') {
      return bestWeek && bestWeek.sales > 0
        ? `Best Week: ${bestWeek.weekLabel} (${formatCurrency(bestWeek.sales)})`
        : peakPoint && peakPoint.sales > 0
          ? `Best Week: ${peakPoint.label} (${formatCurrency(peakPoint.sales)})`
          : null;
    }
    return bestMonth && bestMonth.sales > 0
      ? `Best Month: ${bestMonth.monthLabel} (${formatCurrency(bestMonth.sales)})`
      : peakPoint && peakPoint.sales > 0
        ? `Best Month: ${peakPoint.label} (${formatCurrency(peakPoint.sales)})`
        : null;
  };

  const peakBadgeText = getPeakAccoladeLabel();

  return (
    <View className="w-full min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
      {/* Header & Granularity Toggle */}
      <View className="flex-row items-center justify-between mb-4 flex-wrap gap-3">
        <View className="flex-row items-center gap-3 flex-1 min-w-[200px]">
          <View className="w-10 h-10 shrink-0 rounded-xl bg-purple-50 border border-purple-200 items-center justify-center">
            <TrendingUp size={20} color="#7c3aed" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-lg font-extrabold text-stone-900 leading-snug">
              Timeline Sales Velocity &amp; Peak Period
            </Text>
            <Text className="text-base text-stone-500 font-medium mt-0.5">
              Compare sales across Days in Month, Weekly intervals, or Monthly trends
            </Text>
          </View>
        </View>

        {/* Granularity Switcher Pills */}
        <View className="flex-row items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80 shrink-0">
          <Pressable
            onPress={() => {
              setMode('day');
              setSelectedPoint(null);
            }}
            className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 ${
              mode === 'day'
                ? 'bg-white shadow-xs border border-stone-200/60'
                : 'active:bg-stone-200'
            }`}
          >
            <Calendar size={14} color={mode === 'day' ? '#800020' : '#78716c'} />
            <Text
              className={`text-xs sm:text-base font-bold ${
                mode === 'day' ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              Daily
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setMode('week');
              setSelectedPoint(null);
            }}
            className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 ${
              mode === 'week'
                ? 'bg-white shadow-xs border border-stone-200/60'
                : 'active:bg-stone-200'
            }`}
          >
            <BarChart2 size={14} color={mode === 'week' ? '#800020' : '#78716c'} />
            <Text
              className={`text-xs sm:text-base font-bold ${
                mode === 'week' ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              Weekly
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setMode('month');
              setSelectedPoint(null);
            }}
            className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 ${
              mode === 'month'
                ? 'bg-white shadow-xs border border-stone-200/60'
                : 'active:bg-stone-200'
            }`}
          >
            <Layers size={14} color={mode === 'month' ? '#800020' : '#78716c'} />
            <Text
              className={`text-xs sm:text-base font-bold ${
                mode === 'month' ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              Monthly
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Peak Badge Banner */}
      {peakBadgeText && (
        <View className="mb-4 flex-row items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
          <View className="flex-row items-center gap-2">
            <Crown size={16} color="#b45309" />
            <Text className="text-base font-bold text-amber-900">{peakBadgeText}</Text>
          </View>
          <Text className="text-xs text-amber-700 font-medium">
            {mode === 'day'
              ? 'Peak Day in Selected Timeframe'
              : mode === 'week'
                ? 'Highest Earning Week'
                : 'Highest Earning Month'}
          </Text>
        </View>
      )}

      {/* Selected Point Insight Banner */}
      {selectedPoint && (
        <View className="bg-stone-50 rounded-xl p-3.5 mb-4 border border-stone-200 flex-row flex-wrap justify-between items-center gap-2">
          <View className="flex-row items-center gap-2.5">
            <View
              className={`w-7 h-7 rounded-lg items-center justify-center ${
                selectedPoint.isPeak
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-purple-100 text-purple-900'
              }`}
            >
              {selectedPoint.isPeak ? (
                <Crown size={15} color="#b45309" />
              ) : (
                <TrendingUp size={15} color="#7c3aed" />
              )}
            </View>
            <Text className="text-base font-bold text-stone-900">{selectedPoint.label}:</Text>
            <Text className="text-base font-black text-[#800020]">
              {formatCurrency(selectedPoint.sales)}
            </Text>
          </View>

          <View className="flex-row items-center gap-3">
            <Text className="text-base text-stone-600 font-medium">
              {selectedPoint.orderCount} orders
            </Text>
            <Text className="text-base text-stone-400">·</Text>
            <Text className="text-base text-stone-600 font-medium">
              Avg Ticket: {formatCurrency(selectedPoint.averageTicket)}
            </Text>
          </View>
        </View>
      )}

      {/* Bar Chart Area (Scrollable if many data points) */}
      {activeData.length === 0 ? (
        <View className="py-12 items-center justify-center border border-dashed border-stone-200 rounded-xl">
          <Text className="text-base text-stone-500 font-medium">
            No sales recorded for the selected timeline period.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full">
          <View
            className="h-48 pt-6 pb-2 border-b border-stone-100 flex-row items-end gap-1.5 sm:gap-2"
            style={{ minWidth: activeData.length > 14 ? activeData.length * 36 : '100%' }}
          >
            {activeData.map((pt) => {
              const heightPercent = maxSales > 0 ? Math.max((pt.sales / maxSales) * 100, 4) : 4;
              const isSelected = selectedPoint?.key === pt.key;
              const isPeak = pt.isPeak && pt.sales > 0;

              return (
                <Pressable
                  key={pt.key}
                  onPress={() => setSelectedPoint(isSelected ? null : pt)}
                  className="flex-1 min-w-[28px] max-w-[64px] items-center h-full justify-end group cursor-pointer"
                >
                  {/* Top value */}
                  <View className="mb-1 items-center">
                    {isPeak && <Crown size={12} color="#d97706" className="mb-0.5" />}
                    <Text
                      className={`text-[10px] font-bold text-center leading-tight ${
                        isPeak
                          ? 'text-amber-800'
                          : isSelected
                            ? 'text-stone-900'
                            : pt.sales > 0
                              ? 'text-stone-500'
                              : 'text-stone-300'
                      }`}
                      numberOfLines={1}
                    >
                      {pt.sales > 0
                        ? `₱${(pt.sales / 1000).toFixed(pt.sales >= 10000 ? 0 : 1)}k`
                        : ''}
                    </Text>
                  </View>

                  {/* Bar */}
                  <View
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all ${
                      isSelected
                        ? 'bg-stone-900 shadow-md ring-2 ring-stone-900'
                        : isPeak
                          ? 'bg-[#800020] shadow-sm'
                          : pt.sales > 0
                            ? 'bg-[#800020]/75 hover:bg-[#800020]'
                            : 'bg-stone-200/60'
                    }`}
                  />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* X-Axis Labels (Scrollable matching) */}
      {activeData.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full">
          <View
            className="flex-row justify-between pt-2"
            style={{ minWidth: activeData.length > 14 ? activeData.length * 36 : '100%' }}
          >
            {activeData.map((pt, idx) => {
              const isPeak = pt.isPeak && pt.sales > 0;
              const isSelected = selectedPoint?.key === pt.key;
              // Show label if not too crowded or if peak
              const shouldShow =
                activeData.length <= 14 || idx % Math.ceil(activeData.length / 12) === 0 || isPeak;

              return (
                <View key={pt.key} className="flex-1 min-w-[28px] max-w-[64px] items-center">
                  <Text
                    className={`text-[11px] font-bold ${
                      isPeak
                        ? 'text-amber-800 font-black'
                        : isSelected
                          ? 'text-stone-900'
                          : 'text-stone-500'
                    }`}
                    numberOfLines={1}
                  >
                    {shouldShow ? pt.shortLabel : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Footer Helper */}
      <View className="mt-3 pt-2.5 border-t border-stone-100 flex-row items-center justify-between text-xs text-stone-400">
        <Text className="text-xs text-stone-500">
          Showing {activeData.length}{' '}
          {mode === 'day' ? 'days' : mode === 'week' ? 'weeks' : 'months'} · Total revenue:{' '}
          <Text className="font-bold text-stone-800">
            {formatCurrency(activeData.reduce((sum, d) => sum + d.sales, 0))}
          </Text>
        </Text>
        <Text className="text-xs text-stone-400">
          Tap any bar for sales &amp; average ticket details
        </Text>
      </View>
    </View>
  );
};
