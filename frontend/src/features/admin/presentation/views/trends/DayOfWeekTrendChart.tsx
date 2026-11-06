import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Calendar, Crown, Sparkles, TrendingUp, DollarSign, Receipt } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type { DayOfWeekTrend } from '../../../domain/trends.types';

interface DayOfWeekTrendChartProps {
  data: DayOfWeekTrend[];
  bestDayName?: string;
  totalSales?: number;
}

export const DayOfWeekTrendChart: React.FC<DayOfWeekTrendChartProps> = ({
  data,
  bestDayName,
  totalSales = 0,
}) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeekTrend | null>(null);

  const maxSales = Math.max(...data.map((d) => d.totalSales), 100);
  const bestDay = data.find((d) => d.isBestDay || d.dayName === bestDayName) || data[0];

  // Weekday (Mon-Thu) vs Weekend (Fri-Sun) computation
  const weekdaySales = data
    .filter((d) => [1, 2, 3, 4].includes(d.dayIndex))
    .reduce((sum, d) => sum + d.totalSales, 0);
  const weekendSales = data
    .filter((d) => [5, 6, 0].includes(d.dayIndex))
    .reduce((sum, d) => sum + d.totalSales, 0);

  const weekdayPct = totalSales > 0 ? Math.round((weekdaySales / totalSales) * 100) : 0;
  const weekendPct = totalSales > 0 ? Math.round((weekendSales / totalSales) * 100) : 0;

  return (
    <View className="w-full min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4 flex-wrap gap-3">
        <View className="flex-row items-center gap-3 flex-1 min-w-[200px]">
          <View className="w-10 h-10 shrink-0 rounded-xl bg-[#800020]/10 border border-[#800020]/20 items-center justify-center">
            <Calendar size={20} color="#800020" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-lg font-extrabold text-stone-900 leading-snug">
              Day-of-Week Sales Velocity
            </Text>
            <Text className="text-base text-stone-500 font-medium mt-0.5">
              Revenue distribution and peak pacing from Monday through Sunday
            </Text>
          </View>
        </View>

        {/* Best Day Crown Pill */}
        {bestDay && bestDay.totalSales > 0 && (
          <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 shrink-0 shadow-xs">
            <Crown size={16} color="#b45309" />
            <Text className="text-base font-bold text-amber-900">
              Best Day: {bestDay.dayName} ({formatCurrency(bestDay.totalSales)})
            </Text>
          </View>
        )}
      </View>

      {/* Selected Day Insight Card */}
      {selectedDay && (
        <View className="bg-stone-50 rounded-xl p-3.5 mb-4 border border-stone-200 flex-row flex-wrap justify-between items-center gap-2">
          <View className="flex-row items-center gap-2.5">
            <View
              className={`w-7 h-7 rounded-lg items-center justify-center ${
                selectedDay.isBestDay
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-stone-200 text-stone-700'
              }`}
            >
              {selectedDay.isBestDay ? (
                <Crown size={15} color="#b45309" />
              ) : (
                <Calendar size={15} color="#57534e" />
              )}
            </View>
            <Text className="text-base font-bold text-stone-900">
              {selectedDay.dayName} Breakdown:
            </Text>
            <Text className="text-base font-black text-[#800020]">
              {formatCurrency(selectedDay.totalSales)}
            </Text>
            <View className="bg-stone-200/80 px-2 py-0.5 rounded-md">
              <Text className="text-xs font-bold text-stone-700">
                {selectedDay.percentageOfWeeklyTotal}% of total
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <Text className="text-base text-stone-600 font-medium">
              {selectedDay.orderCount} checks settled
            </Text>
            <Text className="text-base text-stone-400">·</Text>
            <Text className="text-base text-stone-600 font-medium">
              Avg/Day: {formatCurrency(selectedDay.averageSales)}
            </Text>
          </View>
        </View>
      )}

      {/* Bar Chart Container */}
      <View className="h-48 w-full min-w-0 flex-row items-end justify-between pt-6 pb-2 border-b border-stone-100 gap-2 sm:gap-3">
        {data.map((day) => {
          const heightPercent = maxSales > 0 ? Math.max((day.totalSales / maxSales) * 100, 5) : 5;
          const isSelected = selectedDay?.dayIndex === day.dayIndex;
          const isBest = day.isBestDay && day.totalSales > 0;

          return (
            <Pressable
              key={day.dayName}
              onPress={() => setSelectedDay(isSelected ? null : day)}
              className="flex-1 min-w-0 items-center h-full justify-end group cursor-pointer"
            >
              {/* Sales Value on top of bar on hover/desktop */}
              <View className="mb-1.5 items-center">
                {isBest && (
                  <View className="mb-0.5">
                    <Crown size={14} color="#d97706" />
                  </View>
                )}
                <Text
                  className={`text-[11px] font-bold text-center leading-tight ${
                    isBest
                      ? 'text-amber-800'
                      : isSelected
                        ? 'text-stone-900'
                        : day.totalSales > 0
                          ? 'text-stone-600'
                          : 'text-stone-400'
                  }`}
                  numberOfLines={1}
                >
                  {day.totalSales > 0
                    ? `₱${(day.totalSales / 1000).toFixed(day.totalSales >= 10000 ? 0 : 1)}k`
                    : '₱0'}
                </Text>
              </View>

              {/* Bar Column */}
              <View
                style={{ height: `${heightPercent}%` }}
                className={`w-full rounded-t-lg transition-all ${
                  isSelected
                    ? 'bg-stone-900 shadow-md ring-2 ring-stone-900'
                    : isBest
                      ? 'bg-[#800020] shadow-sm'
                      : day.totalSales > 0
                        ? 'bg-[#800020]/75 hover:bg-[#800020]'
                        : 'bg-stone-200/70'
                }`}
              />
            </Pressable>
          );
        })}
      </View>

      {/* X-Axis Labels */}
      <View className="w-full min-w-0 flex-row justify-between pt-2.5">
        {data.map((day) => {
          const isBest = day.isBestDay && day.totalSales > 0;
          const isSelected = selectedDay?.dayIndex === day.dayIndex;

          return (
            <View key={day.dayName} className="flex-1 items-center">
              <Text
                className={`text-xs sm:text-base font-bold ${
                  isBest
                    ? 'text-amber-800 font-black'
                    : isSelected
                      ? 'text-stone-900'
                      : 'text-stone-600'
                }`}
              >
                {day.shortName}
              </Text>
              <Text className="text-[10px] sm:text-xs text-stone-400 mt-0.5">
                {day.orderCount} chk
              </Text>
            </View>
          );
        })}
      </View>

      {/* Weekday vs Weekend Footnote Comparison */}
      <View className="mt-4 pt-3 border-t border-stone-100 flex-row items-center justify-between flex-wrap gap-2">
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-stone-400" />
            <Text className="text-base text-stone-600">
              Weekdays (Mon–Thu): <Text className="font-bold">{formatCurrency(weekdaySales)}</Text>{' '}
              ({weekdayPct}%)
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-[#800020]" />
            <Text className="text-base text-stone-600">
              Weekend Sets (Fri–Sun):{' '}
              <Text className="font-bold text-[#800020]">{formatCurrency(weekendSales)}</Text> (
              {weekendPct}%)
            </Text>
          </View>
        </View>

        <Text className="text-xs text-stone-400">Tap any day column to view detailed metrics</Text>
      </View>
    </View>
  );
};
