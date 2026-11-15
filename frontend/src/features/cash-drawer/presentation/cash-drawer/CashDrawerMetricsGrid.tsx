import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '@monks/shared';

export interface CashDrawerMetrics {
  startingFloat: number;
  cashSales: number;
  cashIn: number;
  cashOut: number;
  cashDrops: number;
  expectedBalance: number;
}

interface CashDrawerMetricsGridProps {
  metrics: CashDrawerMetrics;
}

export const CashDrawerMetricsGrid: React.FC<CashDrawerMetricsGridProps> = ({ metrics }) => {
  return (
    <View className="flex-row gap-3 mb-4 flex-wrap">
      {/* Expected in Drawer (Primary Monk's Wine Accent) */}
      <View className="flex-1 min-w-[150px] sm:min-w-[180px] bg-[#810021] p-4 rounded-2xl shadow-xs justify-center">
        <Text className="text-xs text-rose-100 font-extrabold uppercase tracking-wider">
          Expected in Drawer
        </Text>
        <Text className="text-2xl font-black text-white tabular-nums mt-1">
          {formatCurrency(metrics.expectedBalance)}
        </Text>
      </View>

      {/* Starting Float */}
      <View className="flex-1 min-w-[150px] sm:min-w-[180px] bg-white p-4 rounded-2xl border border-stone-200 shadow-xs justify-center">
        <Text className="text-xs text-stone-500 font-extrabold uppercase tracking-wider">
          Starting Float
        </Text>
        <Text className="text-xl font-black text-stone-900 tabular-nums mt-1">
          {formatCurrency(metrics.startingFloat)}
        </Text>
      </View>

      {/* Cash Sales */}
      <View className="flex-1 min-w-[150px] sm:min-w-[180px] bg-white p-4 rounded-2xl border border-stone-200 shadow-xs justify-center">
        <Text className="text-xs text-stone-500 font-extrabold uppercase tracking-wider">
          Cash Sales
        </Text>
        <Text className="text-xl font-black text-stone-900 tabular-nums mt-1">
          +{formatCurrency(metrics.cashSales)}
        </Text>
      </View>

      {/* Cash Out / Safe Drops */}
      <View className="flex-1 min-w-[150px] sm:min-w-[180px] bg-white p-4 rounded-2xl border border-stone-200 shadow-xs justify-center">
        <Text className="text-xs text-stone-500 font-extrabold uppercase tracking-wider">
          Cash Out / Drops
        </Text>
        <Text className="text-xl font-black text-stone-900 tabular-nums mt-1">
          -{formatCurrency(metrics.cashOut + metrics.cashDrops)}
        </Text>
      </View>
    </View>
  );
};
