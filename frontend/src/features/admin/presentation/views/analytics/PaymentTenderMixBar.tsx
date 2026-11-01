import React from 'react';
import { View, Text } from 'react-native';
import { CreditCard, Coins, Smartphone, Bike, PieChart } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';

interface TenderBreakdownData {
  cash: number;
  card: number;
  digital: number;
  delivery: number;
  total?: number;
}

interface PaymentTenderMixBarProps {
  data: TenderBreakdownData;
}

export const PaymentTenderMixBar: React.FC<PaymentTenderMixBarProps> = ({ data }) => {
  const total = data.total || data.cash + data.card + data.digital + data.delivery;

  const cashPct = total > 0 ? (data.cash / total) * 100 : 0;
  const cardPct = total > 0 ? (data.card / total) * 100 : 0;
  const digitalPct = total > 0 ? (data.digital / total) * 100 : 0;
  const deliveryPct = total > 0 ? (data.delivery / total) * 100 : 0;

  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-stone-100 items-center justify-center">
            <PieChart size={20} color="#1c1917" />
          </View>
          <View>
            <Text className="text-lg font-extrabold text-stone-900">
              Payment Tender Mix & Settlement Share
            </Text>
            <Text className="text-base text-stone-500 font-medium">
              Distribution between cash, electronic cards, and digital wallets
            </Text>
          </View>
        </View>

        <Text className="text-lg font-black text-stone-900">Total: {formatCurrency(total)}</Text>
      </View>

      {/* Segmented Progress Bar */}
      <View className="h-4 w-full bg-stone-100 rounded-full overflow-hidden flex-row mb-6">
        {cashPct > 0 && (
          <View
            style={{ width: `${cashPct}%` }}
            className="h-full bg-emerald-500"
            accessibilityLabel={`Cash: ${cashPct.toFixed(1)}%`}
          />
        )}
        {cardPct > 0 && (
          <View
            style={{ width: `${cardPct}%` }}
            className="h-full bg-blue-600"
            accessibilityLabel={`Card: ${cardPct.toFixed(1)}%`}
          />
        )}
        {digitalPct > 0 && (
          <View
            style={{ width: `${digitalPct}%` }}
            className="h-full bg-violet-600"
            accessibilityLabel={`Digital: ${digitalPct.toFixed(1)}%`}
          />
        )}
        {deliveryPct > 0 && (
          <View
            style={{ width: `${deliveryPct}%` }}
            className="h-full bg-amber-500"
            accessibilityLabel={`Delivery: ${deliveryPct.toFixed(1)}%`}
          />
        )}
        {total === 0 && <View className="h-full w-full bg-stone-200" />}
      </View>

      {/* Metric Cards Grid */}
      <View className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Cash */}
        <View className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <Text className="text-base font-bold text-stone-700">Cash</Text>
            </View>
            <Text className="text-base font-extrabold text-emerald-700">{cashPct.toFixed(1)}%</Text>
          </View>
          <Text className="text-xl font-black text-stone-900">{formatCurrency(data.cash)}</Text>
        </View>

        {/* Card */}
        <View className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <Text className="text-base font-bold text-stone-700">Card</Text>
            </View>
            <Text className="text-base font-extrabold text-blue-700">{cardPct.toFixed(1)}%</Text>
          </View>
          <Text className="text-xl font-black text-stone-900">{formatCurrency(data.card)}</Text>
        </View>

        {/* Digital Wallet */}
        <View className="p-3.5 rounded-xl border border-violet-100 bg-violet-50/50">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-violet-600" />
              <Text className="text-base font-bold text-stone-700">GCash / Maya</Text>
            </View>
            <Text className="text-base font-extrabold text-violet-700">
              {digitalPct.toFixed(1)}%
            </Text>
          </View>
          <Text className="text-xl font-black text-stone-900">{formatCurrency(data.digital)}</Text>
        </View>

        {/* In-App Delivery */}
        <View className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <Text className="text-base font-bold text-stone-700">Delivery Apps</Text>
            </View>
            <Text className="text-base font-extrabold text-amber-700">
              {deliveryPct.toFixed(1)}%
            </Text>
          </View>
          <Text className="text-xl font-black text-stone-900">{formatCurrency(data.delivery)}</Text>
        </View>
      </View>
    </View>
  );
};
