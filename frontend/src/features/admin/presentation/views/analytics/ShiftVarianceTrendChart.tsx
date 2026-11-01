import React from 'react';
import { View, Text } from 'react-native';
import { Activity, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type { ShiftVariancePoint } from '../../../data/readings.api';

interface ShiftVarianceTrendChartProps {
  data: ShiftVariancePoint[];
}

export const ShiftVarianceTrendChart: React.FC<ShiftVarianceTrendChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs items-center justify-center">
        <ShieldCheck size={32} color="#059669" />
        <Text className="text-base font-bold text-stone-800 mt-2">No Variance Discrepancies</Text>
        <Text className="text-sm text-stone-500 mt-0.5 text-center">
          Past shift handovers and Z-readings have operated with balanced drawers.
        </Text>
      </View>
    );
  }

  // Find max absolute variance for scaling
  const maxAbsVariance = Math.max(...data.map((d) => Math.abs(d.variance)), 50);

  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
      <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-stone-100 items-center justify-center">
            <Activity size={20} color="#1c1917" />
          </View>
          <View>
            <Text className="text-lg font-extrabold text-stone-900">
              Historical Shift Variance Trend
            </Text>
            <Text className="text-base text-stone-500 font-medium">
              Over / Short audit tracking across past {data.length} shifts
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-4">
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <Text className="text-sm font-semibold text-stone-600">Balanced (₱0)</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <Text className="text-sm font-semibold text-stone-600">Surplus (+)</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <Text className="text-sm font-semibold text-stone-600">Deficit (-)</Text>
          </View>
        </View>
      </View>

      {/* Variance Graph */}
      <View className="h-40 relative flex-row items-center justify-between pt-4 pb-2 border-b border-stone-200">
        {/* Zero Center Line */}
        <View className="absolute left-0 right-0 top-1/2 h-0.5 bg-stone-300 -translate-y-0.5" />

        {data.map((pt) => {
          const isZero = pt.variance === 0;
          const isOver = pt.variance > 0;
          const isShort = pt.variance < 0;

          // Height relative to half the chart (from center line)
          const barHeightPercent = Math.min((Math.abs(pt.variance) / maxAbsVariance) * 45, 45);

          return (
            <View
              key={pt.id}
              className="flex-1 items-center h-full justify-center relative min-w-[28px] group"
            >
              {/* Value indicator tooltip */}
              <View className="opacity-0 group-hover:opacity-100 absolute -top-3 z-10 bg-stone-900 px-2 py-0.5 rounded shadow-sm">
                <Text className="text-[10px] font-bold text-white whitespace-nowrap">
                  {pt.type}-{pt.number}: {pt.variance > 0 ? '+' : ''}
                  {formatCurrency(pt.variance)}
                </Text>
              </View>

              {/* Bar */}
              {isZero ? (
                <View className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs z-10" />
              ) : isOver ? (
                <View className="w-full items-center absolute bottom-1/2">
                  <View
                    style={{ height: Math.max(barHeightPercent * 1.5, 6) }}
                    className="w-4 rounded-t bg-amber-500"
                  />
                </View>
              ) : (
                <View className="w-full items-center absolute top-1/2">
                  <View
                    style={{ height: Math.max(barHeightPercent * 1.5, 6) }}
                    className="w-4 rounded-b bg-red-500"
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* X-Axis Shift Labels */}
      <View className="flex-row justify-between pt-2">
        {data.map((pt) => (
          <View key={pt.id} className="items-center flex-1">
            <Text className="text-xs font-bold text-stone-700">
              {pt.type}-{pt.number}
            </Text>
            <Text className="text-[10px] text-stone-400">{pt.date}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};
