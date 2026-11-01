import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal } from 'react-native';
import {
  X,
  Plus,
  Trash2,
  Layers,
  DollarSign,
  Search,
  Check,
  ChevronDown,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type ProductAdmin, type InventoryItemAdmin } from '../../../data/admin.api';

interface RecipeBomModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: ProductAdmin | null;
  inventoryItems: InventoryItemAdmin[];
}

interface BomLine {
  inventoryItemId: string;
  amount: string;
  unit: string;
  conversionFactor: string;
}

export const RecipeBomModal: React.FC<RecipeBomModalProps> = ({
  visible,
  onClose,
  onSuccess,
  product,
  inventoryItems,
}) => {
  const [lines, setLines] = useState<BomLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickingLineIdx, setPickingLineIdx] = useState<number | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState('');

  useEffect(() => {
    if (product && product.ingredients) {
      setLines(
        product.ingredients.map((ing) => ({
          inventoryItemId: ing.inventory_item_id,
          amount: ing.amount.toString(),
          unit: ing.unit,
          conversionFactor: (ing.conversion_factor || 1).toString(),
        }))
      );
    } else {
      setLines([]);
    }
  }, [product, visible]);

  const handleAddLine = () => {
    const firstItem = inventoryItems[0];
    setLines((prev) => [
      ...prev,
      {
        inventoryItemId: firstItem?.id || '',
        amount: '1',
        unit: firstItem?.unit || 'g',
        conversionFactor: '1',
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: keyof BomLine, value: string) => {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[idx], [field]: value };
      if (field === 'inventoryItemId') {
        const item = inventoryItems.find((inv) => inv.id === value);
        if (item) {
          line.unit = item.unit;
        }
      }
      next[idx] = line;
      return next;
    });
  };

  // Compute live COGS & Gross Margin
  const totalCogs = lines.reduce((acc, line) => {
    const item = inventoryItems.find((inv) => inv.id === line.inventoryItemId);
    if (!item) return acc;
    const amt = parseFloat(line.amount) || 0;
    const factor = parseFloat(line.conversionFactor) || 1;
    const lineCost = amt * factor * Number(item.unit_cost || 0);
    return acc + lineCost;
  }, 0);

  const basePrice = Number(product?.base_price || 0);
  const grossMargin = basePrice > 0 ? ((basePrice - totalCogs) / basePrice) * 100 : 0;

  const handleSubmit = async () => {
    if (!product) return;
    setIsSubmitting(true);
    try {
      const payload = lines
        .filter((l) => l.inventoryItemId && parseFloat(l.amount) > 0)
        .map((l) => ({
          inventoryItemId: l.inventoryItemId,
          amount: parseFloat(l.amount),
          unit: l.unit,
          conversionFactor: parseFloat(l.conversionFactor) || 1,
        }));

      await adminApi.saveProductBOM(product.id, payload);
      toast.success(`Recipe saved for "${product.name}"`, { title: 'Recipe Configured' });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save recipe', { title: 'Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPickerItems = inventoryItems.filter(
    (item) =>
      item.name.toLowerCase().includes(ingredientSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(ingredientSearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  if (!product) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-6">
        <View className="w-full max-w-3xl max-h-[90%] rounded-2xl bg-white shadow-2xl overflow-hidden flex-col">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
            <View className="flex-row items-center space-x-3">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-[#800020]/10">
                <Layers size={22} color="#800020" />
              </View>
              <View>
                <Text className="text-xl font-bold text-stone-900">Recipe & Costing Breakdown</Text>
                <Text className="text-base text-stone-500">
                  {product.name} • Price: ₱{basePrice.toFixed(2)}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl active:bg-stone-200"
            >
              <X size={22} color="#57534e" />
            </Pressable>
          </View>

          {/* Live COGS Metric Bar */}
          <View className="flex-row items-center justify-between bg-stone-100 px-6 py-3.5 border-b border-stone-200">
            <View className="flex-row items-center space-x-2">
              <DollarSign size={20} color="#800020" />
              <Text className="text-base font-medium text-stone-700">Calculated Cost (COGS):</Text>
              <Text className="text-lg font-bold text-[#800020]">₱{totalCogs.toFixed(2)}</Text>
            </View>
            <View className="flex-row items-center space-x-2">
              <Text className="text-base font-medium text-stone-700">Gross Margin:</Text>
              <View
                className={`rounded-lg px-3 py-1 ${
                  grossMargin >= 70 ? 'bg-emerald-100' : 'bg-amber-100'
                }`}
              >
                <Text
                  className={`text-base font-extrabold ${
                    grossMargin >= 70 ? 'text-emerald-800' : 'text-amber-800'
                  }`}
                >
                  {grossMargin.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Ingredients Vertical List */}
          <ScrollView className="p-6 space-y-4" showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-base font-bold text-stone-900">
                Recipe Ingredients ({lines.length})
              </Text>
              <Pressable
                onPress={handleAddLine}
                className="min-h-[48px] flex-row items-center rounded-xl bg-[#800020]/10 px-4 active:bg-[#800020]/20"
              >
                <Plus size={18} color="#800020" />
                <Text className="ml-1.5 text-base font-bold text-[#800020]">Add Ingredient</Text>
              </Pressable>
            </View>

            {lines.length === 0 ? (
              <View className="py-12 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50">
                <Text className="text-base text-stone-500">
                  No ingredients configured for this recipe.
                </Text>
                <Text className="text-base font-medium text-stone-400 mt-1">
                  Tap "Add Ingredient" above to add raw items.
                </Text>
              </View>
            ) : (
              lines.map((line, idx) => {
                const currentItem = inventoryItems.find((inv) => inv.id === line.inventoryItemId);
                const lineCost = currentItem
                  ? (parseFloat(line.amount) || 0) *
                    (parseFloat(line.conversionFactor) || 1) *
                    Number(currentItem.unit_cost || 0)
                  : 0;

                return (
                  <View
                    key={idx}
                    className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-3"
                  >
                    {/* Header Row: Ingredient Selector & Remove */}
                    <View className="flex-row items-center justify-between">
                      <Pressable
                        onPress={() => {
                          setPickingLineIdx(idx);
                          setIngredientSearch('');
                        }}
                        className="min-h-[48px] flex-1 mr-3 flex-row items-center justify-between rounded-xl border border-stone-300 bg-stone-50 px-4 active:bg-stone-100"
                      >
                        <View className="flex-row items-center space-x-2">
                          <Text className="text-base font-bold text-stone-900">
                            {currentItem ? currentItem.name : 'Select Raw Ingredient...'}
                          </Text>
                          {currentItem && (
                            <Text className="text-base text-stone-500 ml-2">
                              • ₱{Number(currentItem.unit_cost || 0).toFixed(2)} /{' '}
                              {currentItem.unit}
                            </Text>
                          )}
                        </View>
                        <ChevronDown size={18} color="#78716c" />
                      </Pressable>

                      <Pressable
                        onPress={() => handleRemoveLine(idx)}
                        className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-rose-50 border border-rose-200 active:bg-rose-100"
                      >
                        <Trash2 size={18} color="#e11d48" />
                      </Pressable>
                    </View>

                    {/* Inputs Row: Quantity, Unit, Line Cost */}
                    <View className="flex-row items-center space-x-4">
                      <View className="flex-1">
                        <Text className="text-base font-medium text-stone-600 mb-1">
                          Amount per Order
                        </Text>
                        <TextInput
                          value={line.amount}
                          onChangeText={(v) => handleLineChange(idx, 'amount', v)}
                          keyboardType="numeric"
                          placeholder="e.g. 1"
                          className="min-h-[48px] rounded-xl border border-stone-300 bg-white px-3.5 text-base text-stone-900"
                        />
                      </View>

                      <View className="w-32">
                        <Text className="text-base font-medium text-stone-600 mb-1">Unit</Text>
                        <TextInput
                          value={line.unit}
                          onChangeText={(v) => handleLineChange(idx, 'unit', v)}
                          placeholder="g, L, pcs"
                          className="min-h-[48px] rounded-xl border border-stone-300 bg-white px-3.5 text-base text-stone-900"
                        />
                      </View>

                      <View className="w-36 items-end justify-center pt-5">
                        <Text className="text-base text-stone-500">Portion Cost</Text>
                        <Text className="text-base font-bold text-stone-900">
                          ₱{lineCost.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View className="flex-row items-center justify-end space-x-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              className="min-h-[48px] px-6 items-center justify-center rounded-xl border border-stone-300 bg-white active:bg-stone-100"
            >
              <Text className="text-base font-semibold text-stone-700">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#800020] active:opacity-90"
            >
              <Text className="text-base font-bold text-white">
                {isSubmitting ? 'Saving...' : 'Save Recipe'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* INGREDIENT PICKER DIALOG (Zero horizontal scroll) */}
        {pickingLineIdx !== null && (
          <View className="absolute inset-0 items-center justify-center bg-black/60 p-6 z-50">
            <View className="w-full max-w-lg max-h-[85%] rounded-2xl bg-white shadow-2xl overflow-hidden flex-col">
              <View className="flex-row items-center justify-between border-b border-stone-200 bg-stone-50 px-5 py-4">
                <Text className="text-lg font-bold text-stone-900">Select Raw Ingredient</Text>
                <Pressable
                  onPress={() => setPickingLineIdx(null)}
                  className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl active:bg-stone-200"
                >
                  <X size={20} color="#57534e" />
                </Pressable>
              </View>

              <View className="p-4 border-b border-stone-200 bg-white">
                <View className="flex-row items-center rounded-xl border border-stone-300 px-3">
                  <Search size={18} color="#78716c" />
                  <TextInput
                    value={ingredientSearch}
                    onChangeText={setIngredientSearch}
                    placeholder="Search by name, category, or SKU..."
                    className="min-h-[48px] flex-1 px-3 text-base text-stone-900"
                    autoFocus
                  />
                </View>
              </View>

              <ScrollView className="p-4 space-y-2" showsVerticalScrollIndicator={true}>
                {filteredPickerItems.length === 0 ? (
                  <View className="py-8 items-center justify-center">
                    <Text className="text-base text-stone-500">No ingredients match search.</Text>
                  </View>
                ) : (
                  filteredPickerItems.map((inv) => {
                    const isSelected = lines[pickingLineIdx]?.inventoryItemId === inv.id;
                    return (
                      <Pressable
                        key={inv.id}
                        onPress={() => {
                          handleLineChange(pickingLineIdx, 'inventoryItemId', inv.id);
                          setPickingLineIdx(null);
                        }}
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
        )}
      </View>
    </Modal>
  );
};
