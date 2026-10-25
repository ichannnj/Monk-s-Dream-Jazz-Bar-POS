import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { DrawerEntry } from '../../../../types/floor';
import { formatCurrency } from '@monks/shared';

interface CashDrawerLedgerProps {
  entries: DrawerEntry[];
}

export const CashDrawerLedger: React.FC<CashDrawerLedgerProps> = ({ entries }) => {
  return (
    <View className="bg-white rounded-3xl p-5 border border-gray-100 flex-1 shadow-sm">
      <Text className="text-base font-extrabold text-jazz-text mb-3">
        Shift Cash Ledger & Movement Log
      </Text>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-2.5"
        showsVerticalScrollIndicator={false}
      >
        {entries.map((entry) => {
          const isPositive = entry.amount >= 0;

          return (
            <View
              key={entry.id}
              className="flex-row items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-gray-100"
            >
              <View className="flex-row items-center gap-3 flex-1 mr-3">
                <View
                  className={`px-2.5 py-1 rounded-lg ${
                    entry.type === 'sale'
                      ? 'bg-emerald-100'
                      : entry.type === 'float'
                        ? 'bg-sky-100'
                        : entry.type === 'cash_in'
                          ? 'bg-amber-100'
                          : 'bg-red-100'
                  }`}
                >
                  <Text
                    className={`text-base font-extrabold ${
                      entry.type === 'sale'
                        ? 'text-emerald-700'
                        : entry.type === 'float'
                          ? 'text-sky-700'
                          : entry.type === 'cash_in'
                            ? 'text-amber-700'
                            : 'text-red-700'
                    }`}
                  >
                    {entry.type.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-base font-bold text-jazz-text" numberOfLines={1}>
                    {entry.reason}
                  </Text>
                  <Text className="text-base text-gray-400 mt-0.5">
                    {entry.performedBy} • {entry.timestamp}
                  </Text>
                </View>
              </View>

              <Text
                className={`text-base font-extrabold tabular-nums ${
                  isPositive ? 'text-emerald-600' : 'text-red-600'
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
