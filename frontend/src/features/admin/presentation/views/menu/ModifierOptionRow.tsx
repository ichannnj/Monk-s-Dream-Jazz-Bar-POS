import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';
import type { InventoryItemAdmin } from '../../../data/admin.api';

export interface TempOption {
  id?: string;
  name: string;
  price_delta: string;
  inventory_item_id: string;
  amount_delta: string;
  unit: string;
}

interface ModifierOptionRowProps {
  opt: TempOption;
  index: number;
  inventoryItems: InventoryItemAdmin[];
  onChange: (index: number, field: keyof TempOption, value: string) => void;
  onRemove: (index: number) => void;
}

export const ModifierOptionRow: React.FC<ModifierOptionRowProps> = ({
  opt,
  index,
  inventoryItems,
  onChange,
  onRemove,
}) => {
  return (
    <View className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3">
      <View className="flex-col sm:flex-row items-start sm:items-center gap-3">
        <View className="flex-1 w-full">
          <AdminInput
            label="Option Label"
            value={opt.name}
            onChangeText={(v) => onChange(index, 'name', v)}
            placeholder="e.g. Barista Oat Milk Swap"
          />
        </View>
        <View className="w-full sm:w-36">
          <AdminNumberInput
            label="Price Delta"
            mode="currency"
            value={opt.price_delta}
            onChangeText={(v) => onChange(index, 'price_delta', v)}
            placeholder="+35.00"
          />
        </View>
        <Pressable
          onPress={() => onRemove(index)}
          className="self-end sm:self-auto sm:mt-7 min-h-[48px] min-w-[48px] items-center justify-center rounded-xl active:bg-rose-100 hover:bg-rose-100 transition-colors"
        >
          <Trash2 size={20} color="#e11d48" />
        </Pressable>
      </View>

      {/* Inventory Ingredient Delta Mapping */}
      <View className="border-t border-stone-200 pt-3">
        <Text className="text-base font-semibold text-stone-600 mb-2">
          Stock Delta Binding (Optional deduction on prep)
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-2">
          <Pressable
            onPress={() => onChange(index, 'inventory_item_id', '')}
            className={`min-h-[48px] px-3.5 items-center justify-center rounded-xl border transition-all ${
              !opt.inventory_item_id
                ? 'bg-stone-800 border-stone-800'
                : 'bg-white border-stone-300 active:bg-stone-100'
            }`}
          >
            <Text
              className={`text-base font-semibold ${
                !opt.inventory_item_id ? 'text-white' : 'text-stone-700'
              }`}
            >
              No Stock Depletion
            </Text>
          </Pressable>
          {inventoryItems.map((inv) => {
            const isSel = opt.inventory_item_id === inv.id;
            return (
              <Pressable
                key={inv.id}
                onPress={() => onChange(index, 'inventory_item_id', inv.id)}
                className={`min-h-[48px] px-3.5 items-center justify-center rounded-xl border transition-all ${
                  isSel
                    ? 'bg-[#800020] border-[#800020]'
                    : 'bg-white border-stone-300 active:bg-stone-100'
                }`}
              >
                <Text
                  className={`text-base font-semibold ${isSel ? 'text-white' : 'text-stone-700'}`}
                >
                  {inv.name} ({inv.unit})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {opt.inventory_item_id ? (
          <View className="w-56">
            <AdminNumberInput
              label="Deduct Amount"
              mode="decimal"
              value={opt.amount_delta}
              onChangeText={(v) => onChange(index, 'amount_delta', v)}
              placeholder="e.g. 200"
              suffix={opt.unit}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
};
