import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Zap, AlertCircle } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';

interface ShiftExpectedCashHeroProps {
  expectedCash: number;
  outgoingStaffName: string;
  openTabCount: number;
  onQuickMatch: () => void;
}

export const ShiftExpectedCashHero: React.FC<ShiftExpectedCashHeroProps> = ({
  expectedCash,
  outgoingStaffName,
  openTabCount,
  onQuickMatch,
}) => {
  return (
    <>
      {openTabCount > 0 && (
        <View className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 flex-row items-start gap-3">
          <AlertCircle size={22} color="#b45309" className="mt-0.5" />
          <View className="flex-1">
            <Text className="text-base font-black text-amber-900">
              Notice: {openTabCount} Active Tab{openTabCount > 1 ? 's' : ''} Open on Floor
            </Text>
            <Text className="text-base text-amber-800 mt-1">
              Unsettled tables remain open. Ensure incoming cashier is briefed on active customer
              tabs.
            </Text>
          </View>
        </View>
      )}

      <View className="bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-4 items-center">
        <Text className="text-base text-stone-500 font-bold uppercase tracking-wider">
          System Calculated Cash Expected:
        </Text>
        <Text className="text-3xl font-black text-stone-900 mt-1">
          {formatCurrency(expectedCash)}
        </Text>
        <Text className="text-base text-stone-500 mt-1">
          Outgoing Cashier: <Text className="font-bold text-stone-800">{outgoingStaffName}</Text>
        </Text>

        <Pressable
          onPress={onQuickMatch}
          className="mt-3 flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 active:bg-emerald-700 shadow-xs min-h-[48px]"
        >
          <Zap size={18} color="#ffffff" />
          <Text className="text-base font-extrabold text-white">
            1-Click Match Expected (₱0.00 Variance)
          </Text>
        </Pressable>
      </View>
    </>
  );
};
