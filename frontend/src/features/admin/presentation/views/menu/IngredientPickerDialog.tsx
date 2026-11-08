import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { X, Search, Check } from 'lucide-react-native';
import { AdminInput } from '../../components/AdminInput';
import type { InventoryItemAdmin } from '../../../data/admin.api';

interface IngredientPickerDialogProps {
  visible: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  items: InventoryItemAdmin[];
  selectedItemId?: string;
  onSelect: (item: InventoryItemAdmin) => void;
  onClose: () => void;
}

export const IngredientPickerDialog: React.FC<IngredientPickerDialogProps> = ({
  visible,
  search,
  onSearchChange,
  items,
  selectedItemId,
  onSelect,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 items-center justify-center bg-black/60 p-6 z-50">
      <Pressable
        className="absolute inset-0"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close ingredient picker"
      />
      <View className="w-full max-w-lg max-h-[85%] rounded-2xl bg-white shadow-2xl overflow-hidden flex-col z-10">
        <View className="flex-row items-center justify-between border-b border-stone-200 bg-stone-50 px-5 py-4">
          <Text className="text-lg font-bold text-stone-900">Select Raw Ingredient</Text>
          <Pressable
            onPress={onClose}
            className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl active:bg-stone-200"
          >
            <X size={20} color="#57534e" />
          </Pressable>
        </View>

        <View className="p-4 border-b border-stone-200 bg-white">
          <AdminInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search by name, category, or SKU..."
            leftElement={<Search size={18} color="#78716c" />}
            autoFocus
          />
        </View>

        <ScrollView className="p-4 space-y-2" showsVerticalScrollIndicator={true}>
          {items.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <Text className="text-base text-stone-500">No ingredients match search.</Text>
            </View>
          ) : (
            items.map((inv) => {
              const isSelected = selectedItemId === inv.id;
              return (
                <Pressable
                  key={inv.id}
                  onPress={() => onSelect(inv)}
                  className={`min-h-[48px] flex-row items-center justify-between rounded-xl p-3.5 border transition-all ${
                    isSelected
                      ? 'bg-[#800020]/10 border-[#800020]'
                      : 'bg-white border-stone-200 active:bg-stone-50'
                  }`}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-bold text-stone-900">{inv.name}</Text>
                    <Text className="text-base text-stone-500 mt-0.5">
                      {inv.category} • Current Stock: {inv.current_stock} {inv.unit}
                    </Text>
                  </View>
                  <View className="flex-row items-center space-x-2">
                    <Text className="text-base font-extrabold text-[#800020]">
                      ₱{Number(inv.unit_cost || 0).toFixed(2)}/{inv.unit}
                    </Text>
                    {isSelected && <Check size={18} color="#800020" />}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
};
