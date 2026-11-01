import React from 'react';
import { View, Text } from 'react-native';
import { Vault, Plus, Minus, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';

interface CashDrawerWaterfallCardProps {
  openingFloat: number;
  cashSales: number;
  cashIn: number;
  cashOut: number;
  safeDrops: number;
  expectedCash: number;
  countedCash?: number;
  variance?: number;
  drawerLabel?: string;
}

export const CashDrawerWaterfallCard: React.FC<CashDrawerWaterfallCardProps> = ({
  openingFloat,
  cashSales,
  cashIn,
  cashOut,
  safeDrops,
  expectedCash,
  countedCash,
  variance,
  drawerLabel = 'Main Floor Till',
}) => {
  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
      <View className="flex-row items-center justify-between mb-5 flex-wrap gap-2">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-[#800020]/10 items-center justify-center">
            <Vault size={20} color="#800020" />
          </View>
          <View>
            <Text className="text-lg font-extrabold text-stone-900">
              Cash Drawer Balancing Waterfall
            </Text>
            <Text className="text-base text-stone-500 font-medium">
              Step-by-step float reconciliation for {drawerLabel}
            </Text>
          </View>
        </View>

        <View className="px-3.5 py-1.5 rounded-xl bg-stone-100 border border-stone-200">
          <Text className="text-base font-bold text-stone-700">
            Expected: {formatCurrency(expectedCash)}
          </Text>
        </View>
      </View>

      {/* Waterfall Steps Flow */}
      <View className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
        {/* Step 1: Starting Float */}
        <View className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
          <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Starting Float
          </Text>
          <Text className="text-lg font-black text-stone-900 mt-1">
            {formatCurrency(openingFloat)}
          </Text>
          <Text className="text-xs text-stone-400 mt-0.5">Shift Baseline</Text>
        </View>

        {/* Step 2: Cash Sales (+) */}
        <View className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Cash Sales
            </Text>
            <Plus size={14} color="#059669" />
          </View>
          <Text className="text-lg font-black text-emerald-700 mt-1">
            +{formatCurrency(cashSales)}
          </Text>
          <Text className="text-xs text-emerald-600/80 mt-0.5">Customer tender</Text>
        </View>

        {/* Step 3: Cash In (+) */}
        <View className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Cash In
            </Text>
            <Plus size={14} color="#059669" />
          </View>
          <Text className="text-lg font-black text-emerald-700 mt-1">
            +{formatCurrency(cashIn)}
          </Text>
          <Text className="text-xs text-stone-400 mt-0.5">Change added</Text>
        </View>

        {/* Step 4: Petty Cash Out (-) */}
        <View className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Paid Outs
            </Text>
            <Minus size={14} color="#d97706" />
          </View>
          <Text className="text-lg font-black text-amber-700 mt-1">-{formatCurrency(cashOut)}</Text>
          <Text className="text-xs text-amber-600/80 mt-0.5">Petty expenses</Text>
        </View>

        {/* Step 5: Safe Drops (-) */}
        <View className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold text-rose-800 uppercase tracking-wider">
              Safe Drops
            </Text>
            <Minus size={14} color="#e11d48" />
          </View>
          <Text className="text-lg font-black text-rose-700 mt-1">
            -{formatCurrency(safeDrops)}
          </Text>
          <Text className="text-xs text-rose-600/80 mt-0.5">Safe transfers</Text>
        </View>

        {/* Step 6: Expected In Till */}
        <View className="p-3.5 rounded-xl bg-stone-900 border border-stone-800">
          <Text className="text-xs font-bold text-stone-300 uppercase tracking-wider">
            Expected Cash
          </Text>
          <Text className="text-lg font-black text-white mt-1">{formatCurrency(expectedCash)}</Text>
          <Text className="text-xs text-stone-400 mt-0.5">Calculated total</Text>
        </View>
      </View>

      {/* Discrepancy Reconciliation Row if Counted Cash is Present */}
      {countedCash !== undefined && (
        <View
          className={`p-4 rounded-xl border flex-row items-center justify-between flex-wrap gap-3 ${
            variance === 0
              ? 'bg-emerald-50 border-emerald-200'
              : variance && variance > 0
                ? 'bg-amber-50 border-amber-200'
                : 'bg-red-50 border-red-200'
          }`}
        >
          <View className="flex-row items-center gap-2.5">
            {variance === 0 ? (
              <CheckCircle2 size={22} color="#059669" />
            ) : (
              <AlertTriangle size={22} color={variance && variance > 0 ? '#d97706' : '#dc2626'} />
            )}
            <View>
              <Text
                className={`text-base font-extrabold ${
                  variance === 0
                    ? 'text-emerald-800'
                    : variance && variance > 0
                      ? 'text-amber-800'
                      : 'text-red-800'
                }`}
              >
                {variance === 0
                  ? 'Cash Drawer Perfectly Reconciled'
                  : variance && variance > 0
                    ? 'Cash Drawer Surplus (Overage)'
                    : 'Cash Drawer Discrepancy (Shortage)'}
              </Text>
              <Text className="text-sm text-stone-600">
                Counted: {formatCurrency(countedCash)} vs Expected: {formatCurrency(expectedCash)}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <Text
              className={`text-2xl font-black ${
                variance === 0
                  ? 'text-emerald-800'
                  : variance && variance > 0
                    ? 'text-amber-800'
                    : 'text-red-800'
              }`}
            >
              {variance && variance > 0 ? '+' : ''}
              {formatCurrency(variance || 0)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};
