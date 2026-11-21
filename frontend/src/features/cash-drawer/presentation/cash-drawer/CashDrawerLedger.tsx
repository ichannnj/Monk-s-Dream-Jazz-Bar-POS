import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { DrawerEntry } from '../../../../types/floor';
import { formatCurrency } from '@monks/shared';

interface CashDrawerLedgerProps {
  entries: DrawerEntry[];
}

export const CashDrawerLedger: React.FC<CashDrawerLedgerProps> = ({ entries }) => {
  return (
    <View className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 flex-1 shadow-xs">
      <Text className="text-base font-extrabold text-stone-900 mb-3">
        Cash Ledger &amp; Movements
      </Text>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-2"
        showsVerticalScrollIndicator={false}
      >
        {entries.map((entry) => {
          const isPositive = entry.amount >= 0;

          return (
            <View
              key={entry.id}
              className="flex-row items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-stone-200/80"
            >
              <View className="flex-row items-center gap-3 flex-1 mr-3">
                <View
                  className={`px-2.5 py-1 rounded-lg border ${
                    entry.type === 'sale'
                      ? 'bg-white border-[#810021]'
                      : 'bg-white border-stone-300'
                  }`}
                >
                  <Text
                    className={`text-base font-bold uppercase ${
                      entry.type === 'sale' ? 'text-[#810021]' : 'text-[#1C1917]'
                    }`}
                  >
                    {entry.type.replace('_', ' ')}
                  </Text>
                </View>

                <View className="flex-1 min-w-0">
                  <Text className="text-base font-bold text-[#1C1917]" numberOfLines={1}>
                    {entry.reason}
                  </Text>
                  <Text className="text-base text-[#57534E] mt-0.5" numberOfLines={1}>
                    {entry.performedBy} · {entry.timestamp}
                  </Text>
                </View>
              </View>

              <Text
                className={`text-base font-black tabular-nums ${
                  entry.type === 'sale' ? 'text-[#810021]' : 'text-stone-900'
                }`}
              >
                {isPositive ? '+' : '-'}
                {formatCurrency(Math.abs(entry.amount))}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
