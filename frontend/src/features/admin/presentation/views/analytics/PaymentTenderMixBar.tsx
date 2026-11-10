import React from 'react';
import { View, Text } from 'react-native';
import { PieChart } from 'lucide-react-native';
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
      {/* Header (Minimal, No Subtitles) */}
      <View className="flex-row items-center justify-between mb-4 flex-wrap gap-3">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-stone-200 items-center justify-center">
            <PieChart size={16} color="#800020" />
          </View>
          <Text className="text-lg font-bold text-stone-900">Payment Tender Mix</Text>
        </View>

        <View className="rounded-xl bg-[#FAF8F5] border border-stone-200 px-3 py-1 shrink-0">
          <Text className="text-xs text-stone-500 font-medium">Total</Text>
          <Text className="text-sm font-black text-stone-900">{formatCurrency(total)}</Text>
        </View>
      </View>

      {/* Segmented Progress Bar (3-Color Scheme: Burgundy #800020, Charcoal, Muted Stone) */}
      <View className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden flex-row mb-4">
        {cashPct > 0 && (
          <View
            style={{ width: `${cashPct}%` }}
            className="h-full bg-stone-800"
            accessibilityLabel={`Cash: ${cashPct.toFixed(1)}%`}
          />
        )}
        {digitalPct > 0 && (
          <View
            style={{ width: `${digitalPct}%` }}
            className="h-full bg-[#800020]"
            accessibilityLabel={`Digital: ${digitalPct.toFixed(1)}%`}
          />
        )}
        {cardPct > 0 && (
          <View
            style={{ width: `${cardPct}%` }}
            className="h-full bg-stone-500"
            accessibilityLabel={`Card: ${cardPct.toFixed(1)}%`}
          />
        )}
        {deliveryPct > 0 && (
          <View
            style={{ width: `${deliveryPct}%` }}
            className="h-full bg-stone-400"
            accessibilityLabel={`Delivery: ${deliveryPct.toFixed(1)}%`}
          />
        )}
        {total === 0 && <View className="h-full w-full bg-stone-200" />}
      </View>

      {/* Metric Cards Flex Grid */}
      <View className="flex-row flex-wrap gap-2.5">
        {/* Cash */}
        <View className="w-full sm:w-[48%] flex-1 min-w-[130px] p-3 rounded-xl border border-stone-200/80 bg-[#FAF8F5]">
          <View className="flex-row items-center justify-between mb-0.5">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-stone-800" />
              <Text className="text-xs font-bold text-stone-700">Cash</Text>
            </View>
            <Text className="text-xs font-bold text-stone-800">{cashPct.toFixed(1)}%</Text>
          </View>
          <Text className="text-base font-black text-stone-900">{formatCurrency(data.cash)}</Text>
        </View>

        {/* Digital */}
        <View className="w-full sm:w-[48%] flex-1 min-w-[130px] p-3 rounded-xl border border-stone-200/80 bg-[#FAF8F5]">
          <View className="flex-row items-center justify-between mb-0.5">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-[#800020]" />
              <Text className="text-xs font-bold text-stone-700">Digital / QR</Text>
            </View>
            <Text className="text-xs font-bold text-[#800020]">{digitalPct.toFixed(1)}%</Text>
          </View>
          <Text className="text-base font-black text-stone-900">
            {formatCurrency(data.digital)}
          </Text>
        </View>

        {/* Card */}
        <View className="w-full sm:w-[48%] flex-1 min-w-[130px] p-3 rounded-xl border border-stone-200/80 bg-[#FAF8F5]">
          <View className="flex-row items-center justify-between mb-0.5">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-stone-500" />
              <Text className="text-xs font-bold text-stone-700">Card</Text>
            </View>
            <Text className="text-xs font-bold text-stone-700">{cardPct.toFixed(1)}%</Text>
          </View>
          <Text className="text-base font-black text-stone-900">{formatCurrency(data.card)}</Text>
        </View>

        {/* Delivery */}
        {deliveryPct > 0 && (
          <View className="w-full sm:w-[48%] flex-1 min-w-[130px] p-3 rounded-xl border border-stone-200/80 bg-[#FAF8F5]">
            <View className="flex-row items-center justify-between mb-0.5">
              <View className="flex-row items-center gap-1.5">
                <View className="w-2 h-2 rounded-full bg-stone-400" />
                <Text className="text-xs font-bold text-stone-700">Delivery</Text>
              </View>
              <Text className="text-xs font-bold text-stone-600">{deliveryPct.toFixed(1)}%</Text>
            </View>
            <Text className="text-base font-black text-stone-900">
              {formatCurrency(data.delivery)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
