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

export const HourlySalesVelocityChart: React.FC<HourlySalesVelocityChartProps> = ({
  data,
  peakHourLabel,
  totalSales,
}) => {
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
    <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-[#800020]/10 items-center justify-center">
            <TrendingUp size={20} color="#800020" />
          </View>
          <View>
            <Text className="text-lg font-extrabold text-stone-900">
              Hourly Sales Velocity & Peak Pacing
            </Text>
            <Text className="text-base text-stone-500 font-medium">
              Real-time revenue pacing across service day-parts
            </Text>
          </View>
        </View>

        {/* Peak Badge */}
        {peakPoint.sales > 0 && (
          <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
            <Sparkles size={16} color="#d97706" />
            <Text className="text-base font-bold text-amber-800">
              Peak: {peakPoint.hour} ({formatCurrency(peakPoint.sales)})
            </Text>
          </View>
        )}
      </View>

      {/* Selected Hour Insight Banner */}
      {selectedHour && (
        <View className="bg-stone-50 rounded-xl p-3 mb-4 flex-row justify-between items-center border border-stone-200">
          <View className="flex-row items-center gap-2">
            <Clock size={16} color="#57534e" />
            <Text className="text-base font-bold text-stone-700">Hour {selectedHour.hour}:</Text>
            <Text className="text-base font-black text-[#800020]">
              {formatCurrency(selectedHour.sales)}
            </Text>
          </View>
          {selectedHour.orderCount !== undefined && (
            <Text className="text-base text-stone-500 font-semibold">
              {selectedHour.orderCount} orders fulfilled
            </Text>
          )}
        </View>
      )}

      {/* Chart Bars */}
      <View className="h-44 flex-row items-end justify-between pt-6 pb-2 border-b border-stone-100 gap-1.5">
        {hoursList.map((pt) => {
          const heightPercent = Math.max((pt.sales / maxSales) * 100, 4);
          const isPeak = pt.hour === peakPoint.hour && pt.sales > 0;
          const isSelected = selectedHour?.hour === pt.hour;

          return (
            <Pressable
              key={pt.hour}
              onPress={() => setSelectedHour(isSelected ? null : pt)}
              className="flex-1 items-center h-full justify-end group min-w-[18px]"
            >
              {/* Tooltip on hover/active */}
              {pt.sales > 0 && (
                <Text className="text-[10px] font-bold text-stone-400 mb-1 opacity-0 group-hover:opacity-100">
                  {Math.round(pt.sales)}
                </Text>
              )}

              {/* Bar Fill */}
              <View
                style={{ height: `${heightPercent}%` }}
                className={`w-full rounded-t-md transition-all ${
                  isSelected
                    ? 'bg-stone-900 shadow-md'
                    : isPeak
                      ? 'bg-[#800020]'
                      : pt.sales > 0
                        ? 'bg-[#800020]/75 hover:bg-[#800020]'
                        : 'bg-stone-200/60'
                }`}
              />
            </Pressable>
          );
        })}
      </View>

      {/* X-Axis Hour Labels */}
      <View className="flex-row justify-between pt-2">
        {hoursList.map((pt, index) => {
          // Show every 2nd or 3rd hour to avoid crowding
          const shouldShowLabel = index % 2 === 0 || index === hoursList.length - 1;
          return (
            <Text
              key={pt.hour}
              className={`text-xs font-semibold ${
                shouldShowLabel ? 'text-stone-400' : 'opacity-0'
              }`}
            >
              {pt.hour.slice(0, 2)}
            </Text>
          );
        })}
      </View>
    </View>
  );
};
