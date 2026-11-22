import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '@monks/shared';

export interface CashlessKpiCardsRowProps {
  metrics: {
    totalCashless: number;
    count: number;
    gcashTotal: number;
    gcashCount: number;
    mayaTotal: number;
    mayaCount: number;
    qrphTotal: number;
    qrphCount: number;
    cardTotal: number;
    cardCount: number;
  };
}

export const CashlessKpiCardsRow: React.FC<CashlessKpiCardsRowProps> = ({ metrics }) => {
  return (
    <View className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
      <View className="rounded-xl border border-stone-200/90 bg-white p-3 sm:p-3.5 shadow-xs">
        <Text className="text-xs font-bold text-stone-500">Total Cashless</Text>
        <Text className="mt-1 text-lg sm:text-xl font-black text-[#810021]">
          {formatCurrency(metrics.totalCashless)}
        </Text>
        <Text className="mt-0.5 text-xs text-stone-400">{metrics.count} payments</Text>
      </View>

      <View className="rounded-xl border border-stone-200/90 bg-[#EFECE6] p-3 sm:p-3.5 shadow-xs">
        <Text className="text-xs font-bold text-stone-600">GCash QR</Text>
        <Text className="mt-1 text-lg sm:text-xl font-black text-stone-900">
          {formatCurrency(metrics.gcashTotal)}
        </Text>
        <Text className="mt-0.5 text-xs text-stone-400">{metrics.gcashCount} checks</Text>
      </View>

      <View className="rounded-xl border border-stone-200/90 bg-[#EFECE6] p-3 sm:p-3.5 shadow-xs">
        <Text className="text-xs font-bold text-stone-600">Maya QR</Text>
        <Text className="mt-1 text-lg sm:text-xl font-black text-stone-900">
          {formatCurrency(metrics.mayaTotal)}
        </Text>
        <Text className="mt-0.5 text-xs text-stone-400">{metrics.mayaCount} checks</Text>
      </View>

      <View className="rounded-xl border border-stone-200/90 bg-[#EFECE6] p-3 sm:p-3.5 shadow-xs">
        <Text className="text-xs font-bold text-stone-600">QRPH &amp; Card</Text>
        <Text className="mt-1 text-lg sm:text-xl font-black text-stone-900">
          {formatCurrency(metrics.qrphTotal + metrics.cardTotal)}
        </Text>
        <Text className="mt-0.5 text-xs text-stone-400">
          {metrics.qrphCount + metrics.cardCount} checks
        </Text>
      </View>
    </View>
  );
};
