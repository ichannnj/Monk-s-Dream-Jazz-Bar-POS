import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Clock, TrendingUp, Sparkles } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';

export interface HourlyPoint {
  hour: string; // e.g. "08:00", "09:00", ...
  sales: number;
  orderCount?: number;
}

interface HourlySalesVelocityChartProps {
  data: HourlyPoint[];
  peakHourLabel?: string;
  totalSales?: number;
}

export const HourlySalesVelocityChart: React.FC<HourlySalesVelocityChartProps> = ({ data }) => {
  const [selectedHour, setSelectedHour] = useState<HourlyPoint | null>(null);

  // Fallback default operational hours (08:00 to 23:00) if data is empty
  const hoursList =
    data && data.length > 0
      ? data
      : Array.from({ length: 16 }, (_, i) => {
          const h = (i + 8).toString().padStart(2, '0') + ':00';
          return { hour: h, sales: 0, orderCount: 0 };
        });

  const maxSales = Math.max(...hoursList.map((d) => d.sales), 100);
  const peakPoint = hoursList.reduce(
    (max, pt) => (pt.sales > max.sales ? pt : max),
    hoursList[0] || { hour: '20:00', sales: 0 }
  );

  return (
    <View className="w-full min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
      {/* Header (Minimal, No Subtitle) */}
      <View className="flex-row items-center justify-between mb-4 flex-wrap gap-3">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-stone-200 items-center justify-center">
            <TrendingUp size={16} color="#800020" />
          </View>
          <Text className="text-lg font-bold text-stone-900">Hourly Sales Velocity</Text>
        </View>

        {/* Peak Badge */}
        {peakPoint.sales > 0 && (
          <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] border border-stone-200 shrink-0">
            <Sparkles size={13} color="#800020" />
            <Text className="text-xs font-bold text-stone-800">
              Peak: {peakPoint.hour} ({formatCurrency(peakPoint.sales)})
            </Text>
          </View>
        )}
      </View>

      {/* Selected Hour Insight Banner */}
      {selectedHour && (
        <View className="bg-[#FAF8F5] rounded-xl p-2.5 mb-3 flex-row flex-wrap justify-between items-center gap-2 border border-stone-200">
          <View className="flex-row items-center gap-2">
            <Clock size={14} color="#78716c" />
            <Text className="text-xs font-bold text-stone-700">Hour {selectedHour.hour}:</Text>
            <Text className="text-xs font-black text-[#800020]">
              {formatCurrency(selectedHour.sales)}
            </Text>
          </View>
          {selectedHour.orderCount !== undefined && (
            <Text className="text-xs text-stone-500 font-medium">
              {selectedHour.orderCount} orders
            </Text>
          )}
        </View>
      )}

      {/* Chart Bars */}
      <View className="h-40 w-full min-w-0 flex-row items-end justify-between pt-4 pb-2 border-b border-stone-100 gap-1 sm:gap-1.5">
        {hoursList.map((pt) => {
          const heightPercent = Math.max((pt.sales / maxSales) * 100, 4);
          const isPeak = pt.hour === peakPoint.hour && pt.sales > 0;
          const isSelected = selectedHour?.hour === pt.hour;

          return (
            <Pressable
              key={pt.hour}
              onPress={() => setSelectedHour(isSelected ? null : pt)}
              className="flex-1 min-w-0 items-center h-full justify-end"
            >
              <View
                style={{ height: `${heightPercent}%` }}
                className={`w-full rounded-t-sm transition-all ${
                  isSelected
                    ? 'bg-stone-900'
                    : isPeak
                      ? 'bg-[#800020]'
                      : pt.sales > 0
                        ? 'bg-[#800020]/70'
                        : 'bg-stone-100'
                }`}
              />
            </Pressable>
          );
        })}
      </View>

      {/* X-Axis Hour Labels */}
      <View className="w-full min-w-0 flex-row justify-between pt-2">
        {hoursList.map((pt, index) => {
          const shouldShowLabel = index % 3 === 0 || index === hoursList.length - 1;
          return shouldShowLabel ? (
            <Text key={pt.hour} className="text-xs font-medium text-stone-500">
              {pt.hour.slice(0, 2)}h
            </Text>
          ) : null;
        })}
      </View>
    </View>
  );
};
