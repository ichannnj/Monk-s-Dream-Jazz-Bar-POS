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
    <View className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {/* Expected in Drawer */}
      <View className="bg-white p-4 rounded-2xl border border-[#810021]/30 justify-center">
        <Text className="text-base text-[#810021] font-semibold">Expected in Drawer</Text>
        <Text className="text-pos-xl font-extrabold text-[#810021] tabular-nums mt-1">
          {formatCurrency(metrics.expectedBalance)}
        </Text>
      </View>

      {/* Starting Float */}
      <View className="bg-white p-4 rounded-2xl border border-[#E2DED6] justify-center">
        <Text className="text-base text-[#57534E] font-semibold">Starting Float</Text>
        <Text className="text-pos-xl font-extrabold text-[#1A1617] tabular-nums mt-1">
          {formatCurrency(metrics.startingFloat)}
        </Text>
      </View>

      {/* Cash Sales */}
      <View className="bg-white p-4 rounded-2xl border border-[#E2DED6] justify-center">
        <Text className="text-base text-[#57534E] font-semibold">Cash Sales</Text>
        <Text className="text-pos-xl font-extrabold text-[#1A1617] tabular-nums mt-1">
          +{formatCurrency(metrics.cashSales)}
        </Text>
      </View>

      {/* Cash Out / Safe Drops */}
      <View className="bg-white p-4 rounded-2xl border border-[#E2DED6] justify-center">
        <Text className="text-base text-[#57534E] font-semibold">Cash Out / Drops</Text>
        <Text className="text-pos-xl font-extrabold text-[#1A1617] tabular-nums mt-1">
          -{formatCurrency(metrics.cashOut + metrics.cashDrops)}
        </Text>
      </View>
    </View>
  );
};
