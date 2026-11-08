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
    <View className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <View className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
        <Text className="text-xs font-extrabold uppercase tracking-wider text-stone-500">
          Total Cashless Revenue
        </Text>
        <Text className="mt-1 text-2xl font-black text-wine-800">
          {formatCurrency(metrics.totalCashless)}
        </Text>
        <Text className="mt-1 text-xs font-semibold text-stone-400">
          {metrics.count} total non-cash payments
        </Text>
      </View>

      <View className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 shadow-xs">
        <Text className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
          GCash QR Volume
        </Text>
        <Text className="mt-1 text-2xl font-black text-blue-900">
          {formatCurrency(metrics.gcashTotal)}
        </Text>
        <Text className="mt-1 text-xs font-semibold text-blue-600">
          {metrics.gcashCount} settled transactions
        </Text>
      </View>

      <View className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs">
        <Text className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
          Maya QR Volume
        </Text>
        <Text className="mt-1 text-2xl font-black text-emerald-900">
          {formatCurrency(metrics.mayaTotal)}
        </Text>
        <Text className="mt-1 text-xs font-semibold text-emerald-600">
          {metrics.mayaCount} settled transactions
        </Text>
      </View>

      <View className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-4 shadow-xs">
        <Text className="text-xs font-extrabold uppercase tracking-wider text-purple-700">
          QRPH &amp; Card Volume
        </Text>
        <Text className="mt-1 text-2xl font-black text-purple-900">
          {formatCurrency(metrics.qrphTotal + metrics.cardTotal)}
        </Text>
        <Text className="mt-1 text-xs font-semibold text-purple-600">
          {metrics.qrphCount + metrics.cardCount} settled transactions
        </Text>
      </View>
    </View>
  );
};
