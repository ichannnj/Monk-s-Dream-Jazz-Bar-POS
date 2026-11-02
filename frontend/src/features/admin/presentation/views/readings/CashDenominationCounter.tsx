import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Calculator, RotateCcw, Check, Plus, Minus } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';

interface DenominationItem {
  label: string;
  value: number;
  count: number;
}

interface CashDenominationCounterProps {
  onApplyTotal: (total: number) => void;
  expectedCash: number;
}

export const CashDenominationCounter: React.FC<CashDenominationCounterProps> = ({
  onApplyTotal,
  expectedCash,
}) => {
  const [denominations, setDenominations] = useState<DenominationItem[]>([
    { label: '₱1,000', value: 1000, count: 0 },
    { label: '₱500', value: 500, count: 0 },
    { label: '₱200', value: 200, count: 0 },
    { label: '₱100', value: 100, count: 0 },
    { label: '₱50', value: 50, count: 0 },
    { label: '₱20', value: 20, count: 0 },
    { label: '₱10', value: 10, count: 0 },
    { label: '₱5', value: 5, count: 0 },
    { label: '₱1', value: 1, count: 0 },
  ]);

  const totalCalculated = denominations.reduce((acc, d) => acc + d.value * d.count, 0);

  const handleIncrement = (index: number, delta: number) => {
    setDenominations((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, count: Math.max(0, item.count + delta) } : item
      )
    );
  };

  const handleReset = () => {
    setDenominations((prev) => prev.map((d) => ({ ...d, count: 0 })));
  };

  const handleApply = () => {
    onApplyTotal(totalCalculated);
  };

  return (
    <View className="bg-stone-50 border border-stone-200 rounded-2xl p-4 my-2">
      <View className="flex-row items-center justify-between pb-3 border-b border-stone-200">
        <View className="flex-row items-center gap-2">
          <Calculator size={18} color="#800020" />
          <Text className="text-base font-extrabold text-stone-900">
            Bill & Coin Breakdown Counter
          </Text>
        </View>
        <Pressable
          onPress={handleReset}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200/70 active:bg-stone-300 min-h-[48px]"
        >
          <RotateCcw size={16} color="#57534e" />
          <Text className="text-base font-bold text-stone-600">Reset</Text>
        </Pressable>
      </View>

      {/* Grid of Denominations */}
      <View className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
        {denominations.map((item, idx) => (
          <View
            key={item.label}
            className={`p-2.5 rounded-xl border items-center justify-between ${
              item.count > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-white border-stone-200'
            }`}
          >
            <Text className="text-base font-black text-stone-800">{item.label}</Text>
            <Text className="text-sm text-stone-500 font-medium">
              = {formatCurrency(item.value * item.count)}
            </Text>

            <View className="flex-row items-center gap-2 mt-2">
              <Pressable
                onPress={() => handleIncrement(idx, -1)}
                disabled={item.count <= 0}
                className="w-10 h-10 rounded-lg bg-stone-100 items-center justify-center active:bg-stone-200 disabled:opacity-30"
              >
                <Minus size={16} color="#57534e" />
              </Pressable>

              <Text className="text-base font-black text-stone-900 min-w-[24px] text-center">
                {item.count}
              </Text>

              <Pressable
                onPress={() => handleIncrement(idx, 1)}
                className="w-10 h-10 rounded-lg bg-stone-900 items-center justify-center active:bg-black"
              >
                <Plus size={16} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      {/* Footer Total & Apply */}
      <View className="flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-stone-200">
        <View>
          <Text className="text-sm font-bold text-stone-500 uppercase">Calculated Total:</Text>
          <Text className="text-xl font-black text-stone-900">
            {formatCurrency(totalCalculated)}
          </Text>
        </View>

        <Pressable
          onPress={handleApply}
          className="flex-row items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#800020] active:bg-[#600018] shadow-xs min-h-[48px]"
        >
          <Check size={18} color="#ffffff" />
          <Text className="text-base font-extrabold text-white">Apply Count</Text>
        </Pressable>
      </View>
    </View>
  );
};
