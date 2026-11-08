import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, Trash2 } from 'lucide-react-native';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';
import type { InventoryItemAdmin } from '../../../data/admin.api';

export interface TempBomLine {
  id?: string;
  inventoryItemId: string;
  amount: string;
  unit: string;
  conversionFactor: string;
}

interface RecipeBomLineCardProps {
  line: TempBomLine;
  index: number;
  inventoryItems: InventoryItemAdmin[];
  onOpenPicker: (index: number) => void;
  onRemove: (index: number) => void;
  onChange: (index: number, field: keyof TempBomLine, value: string) => void;
}

export const RecipeBomLineCard: React.FC<RecipeBomLineCardProps> = ({
  line,
  index,
  inventoryItems,
  onOpenPicker,
  onRemove,
  onChange,
}) => {
  const currentItem = inventoryItems.find((inv) => inv.id === line.inventoryItemId);
  const lineCost = currentItem
    ? (parseFloat(line.amount) || 0) *
      (parseFloat(line.conversionFactor) || 1) *
      Number(currentItem.unit_cost || 0)
    : 0;

  return (
    <View className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-3">
      {/* Header Row: Ingredient Selector & Remove */}
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => onOpenPicker(index)}
          className="min-h-[48px] flex-1 mr-3 flex-row items-center justify-between rounded-xl border border-stone-300 bg-stone-50 px-4 active:bg-stone-100"
        >
          <View className="flex-row items-center space-x-2">
            <Text className="text-base font-bold text-stone-900">
              {currentItem ? currentItem.name : 'Select Raw Ingredient...'}
            </Text>
            {currentItem && (
              <Text className="text-base text-stone-500 ml-2">
                • ₱{Number(currentItem.unit_cost || 0).toFixed(2)} / {currentItem.unit}
              </Text>
            )}
          </View>
          <ChevronDown size={18} color="#78716c" />
        </Pressable>

        <Pressable
          onPress={() => onRemove(index)}
          className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-rose-50 border border-rose-200 active:bg-rose-100"
        >
          <Trash2 size={18} color="#e11d48" />
        </Pressable>
      </View>

      {/* Inputs Row: Quantity, Unit, Line Cost */}
      <View className="flex-row items-center space-x-4">
        <View className="flex-1">
          <AdminNumberInput
            label="Amount per Order"
            mode="decimal"
            value={line.amount}
            onChangeText={(v) => onChange(index, 'amount', v)}
            placeholder="e.g. 1"
          />
        </View>

        <View className="w-36">
          <AdminInput
            label="Unit"
            value={line.unit}
            onChangeText={(v) => onChange(index, 'unit', v)}
            placeholder="g, L, pcs"
          />
        </View>

        <View className="w-36 items-end justify-center pt-5">
          <Text className="text-sm text-stone-500">Portion Cost</Text>
          <Text className="text-base font-bold text-stone-900">₱{lineCost.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};
