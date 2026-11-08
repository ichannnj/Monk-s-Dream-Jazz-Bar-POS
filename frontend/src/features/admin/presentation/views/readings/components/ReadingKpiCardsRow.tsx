import React from 'react';
import { View, Text } from 'react-native';
import { ArrowUpRight, Coins } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type { ReadingData } from '../../../../data/readings.api';

interface ReadingKpiCardsRowProps {
  activeReading: ReadingData | null;
}

export const ReadingKpiCardsRow: React.FC<ReadingKpiCardsRowProps> = ({ activeReading }) => {
  return (
    <View className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
      {/* Gross Sales */}
      <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-base font-bold text-stone-500">Gross Sales</Text>
          <ArrowUpRight size={18} color="#059669" />
        </View>
        <Text className="text-3xl font-black text-stone-900">
          {formatCurrency(activeReading?.gross_sales || 0)}
        </Text>
        <Text className="text-base text-stone-500 mt-1">
          {activeReading?.transaction_count || 0} Settled Tabs
        </Text>
      </View>

      {/* Net Sales */}
      <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
        <Text className="text-base font-bold text-stone-500 mb-1">Net Sales</Text>
        <Text className="text-3xl font-black text-[#800020]">
          {formatCurrency(activeReading?.net_sales || 0)}
        </Text>
        <Text className="text-base text-stone-500 mt-1">
          After {formatCurrency(activeReading?.discount_total || 0)} discounts
        </Text>
      </View>

      {/* Expected Cash in Drawer */}
      <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-base font-bold text-stone-500">Expected Cash in Till</Text>
          <Coins size={18} color="#d97706" />
        </View>
        <Text className="text-3xl font-black text-stone-900">
          {formatCurrency(activeReading?.expected_cash || 0)}
        </Text>
        <Text className="text-base text-stone-500 mt-1">
          Float: {formatCurrency(activeReading?.opening_float || 0)} • Cash:{' '}
          {formatCurrency(activeReading?.tender_cash || 0)}
        </Text>
      </View>

      {/* Non-Cash Tenders */}
      <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
        <Text className="text-base font-bold text-stone-500 mb-1">Card & Digital Tenders</Text>
        <Text className="text-3xl font-black text-stone-900">
          {formatCurrency((activeReading?.tender_card || 0) + (activeReading?.tender_digital || 0))}
        </Text>
        <Text className="text-base text-stone-500 mt-1">
          Card: {formatCurrency(activeReading?.tender_card || 0)} • Digital:{' '}
          {formatCurrency(activeReading?.tender_digital || 0)}
        </Text>
      </View>
    </View>
  );
};
