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
    <View className="flex-row gap-3.5 mb-3.5 flex-wrap">
      {/* Highlight Expected in Drawer */}
      <View className="flex-1 min-w-[200px] bg-wine-700 p-4 rounded-2xl shadow-sm">
        <Text className="text-base text-rose-100 font-bold uppercase tracking-wider">
          Expected in Drawer
        </Text>
        <Text className="text-2xl font-black text-white tabular-nums my-1">
          {formatCurrency(metrics.expectedBalance)}
        </Text>
        <Text className="text-base text-rose-200">Calculated physical cash balance</Text>
      </View>

      {/* Starting Float */}
      <View className="flex-1 min-w-[180px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <Text className="text-base text-gray-500 font-bold uppercase tracking-wider">
          Starting Float
        </Text>
        <Text className="text-xl font-black text-jazz-text tabular-nums my-1">
          {formatCurrency(metrics.startingFloat)}
        </Text>
        <Text className="text-base text-gray-400">Opening bank</Text>
      </View>

      {/* Cash Sales */}
      <View className="flex-1 min-w-[180px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <Text className="text-base text-gray-500 font-bold uppercase tracking-wider">
          Cash Sales
        </Text>
        <Text className="text-xl font-black text-emerald-600 tabular-nums my-1">
          +{formatCurrency(metrics.cashSales)}
        </Text>
        <Text className="text-base text-gray-400">Total cash collected</Text>
      </View>

      {/* Cash Out / Safe Drops */}
      <View className="flex-1 min-w-[180px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <Text className="text-base text-gray-500 font-bold uppercase tracking-wider">
          Cash Out / Drops
        </Text>
        <Text className="text-xl font-black text-red-600 tabular-nums my-1">
          -{formatCurrency(metrics.cashOut + metrics.cashDrops)}
        </Text>
        <Text className="text-base text-gray-400">Petty expenses + Safe</Text>
      </View>
    </View>
  );
};
