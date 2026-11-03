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
    <View className="flex-1 min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
      {/* Header with flex-wrap to prevent total from colliding with title */}
      <View className="flex-row items-center justify-between mb-4 flex-wrap gap-3">
        <View className="flex-row items-center gap-3 flex-1 min-w-[180px]">
          <View className="w-10 h-10 rounded-xl bg-stone-100 items-center justify-center shrink-0">
            <PieChart size={20} color="#1c1917" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-lg font-extrabold text-stone-900 leading-snug">
              Payment Tender Mix & Settlement Share
            </Text>
            <Text className="text-base text-stone-500 font-medium mt-0.5">
              Distribution across cash, cards, and digital wallets
            </Text>
          </View>
        </View>

        <View className="rounded-xl bg-stone-100/80 px-3.5 py-1.5 shrink-0">
          <Text className="text-base font-semibold text-stone-500">Total Settled</Text>
          <Text className="text-lg font-black text-stone-900">{formatCurrency(total)}</Text>
        </View>
      </View>

      {/* Segmented Progress Bar */}
      <View className="h-3.5 w-full bg-stone-100 rounded-full overflow-hidden flex-row mb-5">
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

      {/* Metric Cards Flex Grid */}
      <View className="flex-row flex-wrap gap-3">
        {/* Cash */}
        <View className="w-full sm:w-[48%] flex-1 min-w-[140px] p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
          <View className="flex-row items-center justify-between mb-1 flex-wrap gap-1">
            <View className="flex-row items-center gap-1.5 min-w-0">
              <View className="w-2.5 h-2.5 shrink-0 rounded-full bg-emerald-500" />
              <Text className="text-base font-bold text-stone-700">Cash</Text>
            </View>
            <Text className="text-base font-extrabold text-emerald-700">{cashPct.toFixed(1)}%</Text>
          </View>
          <Text className="text-lg font-black text-stone-900 mt-0.5">
            {formatCurrency(data.cash)}
          </Text>
        </View>

        {/* Card */}
        <View className="w-full sm:w-[48%] flex-1 min-w-[140px] p-3.5 rounded-xl border border-blue-100 bg-blue-50/50">
          <View className="flex-row items-center justify-between mb-1 flex-wrap gap-1">
            <View className="flex-row items-center gap-1.5 min-w-0">
              <View className="w-2.5 h-2.5 shrink-0 rounded-full bg-blue-600" />
              <Text className="text-base font-bold text-stone-700">Card</Text>
            </View>
            <Text className="text-base font-extrabold text-blue-700">{cardPct.toFixed(1)}%</Text>
          </View>
          <Text className="text-lg font-black text-stone-900 mt-0.5">
            {formatCurrency(data.card)}
          </Text>
        </View>

        {/* Digital Wallet */}
        <View className="w-full sm:w-[48%] flex-1 min-w-[140px] p-3.5 rounded-xl border border-violet-100 bg-violet-50/50">
          <View className="flex-row items-center justify-between mb-1 flex-wrap gap-1">
            <View className="flex-row items-center gap-1.5 min-w-0">
              <View className="w-2.5 h-2.5 shrink-0 rounded-full bg-violet-600" />
              <Text className="text-base font-bold text-stone-700">Digital / GCash</Text>
            </View>
            <Text className="text-base font-extrabold text-violet-700">
              {digitalPct.toFixed(1)}%
            </Text>
          </View>
          <Text className="text-lg font-black text-stone-900 mt-0.5">
            {formatCurrency(data.digital)}
          </Text>
        </View>

        {/* In-App Delivery */}
        <View className="w-full sm:w-[48%] flex-1 min-w-[140px] p-3.5 rounded-xl border border-amber-100 bg-amber-50/50">
          <View className="flex-row items-center justify-between mb-1 flex-wrap gap-1">
            <View className="flex-row items-center gap-1.5 min-w-0">
              <View className="w-2.5 h-2.5 shrink-0 rounded-full bg-amber-500" />
              <Text className="text-base font-bold text-stone-700">Delivery Apps</Text>
            </View>
            <Text className="text-base font-extrabold text-amber-700">
              {deliveryPct.toFixed(1)}%
            </Text>
          </View>
          <Text className="text-lg font-black text-stone-900 mt-0.5">
            {formatCurrency(data.delivery)}
          </Text>
        </View>
      </View>
    </View>
  );
};
