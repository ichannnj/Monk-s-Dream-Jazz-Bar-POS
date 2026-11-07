import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  Plus,
  Trash2,
  Layers,
  DollarSign,
  ChevronDown,
  Check,
  Search,
  X,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type ProductAdmin, type InventoryItemAdmin } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';

interface RecipeBomModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: ProductAdmin | null;
  inventoryItems: InventoryItemAdmin[];
}

interface TempBomLine {
  id?: string;
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
  const [lines, setLines] = useState<TempBomLine[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickingLineIdx, setPickingLineIdx] = useState<number | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState('');

  useEffect(() => {
    if (product && visible) {
      setSelectedVariantId(null);
      const filtered = (product.ingredients || []).filter((b: any) => !b.variant_id);
      setLines(
        filtered.map((b) => ({
          id: b.id,
          inventoryItemId: b.inventory_item_id,
          amount: b.amount.toString(),
          unit: b.unit,
          conversionFactor: b.conversion_factor ? b.conversion_factor.toString() : '1',
        }))
      );
    } else {
      setLines([]);
    }
    setPickingLineIdx(null);
    setIngredientSearch('');
  }, [product, visible]);

  const handleSelectScope = (variantId: string | null) => {
    setSelectedVariantId(variantId);
    if (!product) return;
    const filtered = (product.ingredients || []).filter((b: any) =>
      variantId ? b.variant_id === variantId : !b.variant_id
    );
    setLines(
      filtered.map((b: any) => ({
        id: b.id,
        inventoryItemId: b.inventory_item_id,
        amount: b.amount.toString(),
        unit: b.unit,
        conversionFactor: b.conversion_factor ? b.conversion_factor.toString() : '1',
      }))
    );
  };

  const handleAddLine = () => {
    const firstInv = inventoryItems[0];
    setLines((prev) => [
      ...prev,
      {
        inventoryItemId: firstInv?.id || '',
        amount: '1',
        unit: firstInv?.unit || 'pcs',
        conversionFactor: '1',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof TempBomLine, value: string) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const updated = { ...l, [field]: value };
        if (field === 'inventoryItemId') {
          const inv = inventoryItems.find((item) => item.id === value);
          if (inv) {
            updated.unit = inv.unit;
          }
        }
        return updated;
      })
    );
  };

  // Live total COGS calculation
  const totalCogs = lines.reduce((acc, line) => {
    const item = inventoryItems.find((inv) => inv.id === line.inventoryItemId);
    if (!item) return acc;
    const qty = parseFloat(line.amount) || 0;
    const factor = parseFloat(line.conversionFactor) || 1;
    return acc + qty * factor * Number(item.unit_cost || 0);
  }, 0);

  const basePrice = product ? Number(product.base_price) : 0;
  const grossMargin = basePrice > 0 ? Math.max(0, ((basePrice - totalCogs) / basePrice) * 100) : 0;

  const handleSubmit = async () => {
    if (!product) return;

    for (const line of lines) {
      if (!line.inventoryItemId) {
        toast.error('All recipe items must select an inventory ingredient', {
          title: 'Validation Error',
        });
        return;
      }
      const amt = parseFloat(line.amount);
      if (isNaN(amt) || amt <= 0) {
        toast.error('Recipe amount must be greater than 0', { title: 'Validation Error' });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await adminApi.saveProductBOM(
        product.id,
        lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          amount: parseFloat(l.amount) || 0,
          unit: l.unit.trim(),
          conversionFactor: parseFloat(l.conversionFactor) || 1,
        })),
        selectedVariantId
      );

      toast.success(
        `Updated BOM for "${product.name}". Calculated cost: ₱${totalCogs.toFixed(2)} (${grossMargin.toFixed(1)}% margin).`,
        { title: 'Recipe Saved' }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save recipe breakdown', { title: 'Error' });
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

  const footer = (
    <>
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
    </>
  );

  return (
    <>
      <AdminModal
        visible={visible}
        onClose={onClose}
        title="Recipe & Costing Breakdown"
        subtitle={`${product.name} • Price: ₱${basePrice.toFixed(2)}`}
        icon={<Layers size={22} color="#800020" />}
        size="xl"
        footer={footer}
      >
        <View className="space-y-4">
          {/* Live COGS Metric Bar */}
          <View className="flex-row items-center justify-between bg-stone-100 p-4 rounded-xl border border-stone-200">
            <View className="flex-row items-center space-x-2">
              <DollarSign size={20} color="#800020" />
              <Text className="text-base font-medium text-stone-700 ml-1.5">
                Calculated Cost (COGS):
              </Text>
              <Text className="text-lg font-bold text-[#800020] ml-1">₱{totalCogs.toFixed(2)}</Text>
            </View>
            <View className="flex-row items-center space-x-2">
              <Text className="text-base font-medium text-stone-700">Gross Margin:</Text>
              <View
                className={`rounded-lg px-3 py-1 ml-1.5 ${
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

          {/* Variant Scope Selector */}
          {product?.variants && product.variants.length > 0 && (
            <View className="mb-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                Recipe Target Scope:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                <Pressable
                  onPress={() => handleSelectScope(null)}
                  className={`mr-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${
                    selectedVariantId === null
                      ? 'bg-[#800020] border-[#800020]'
                      : 'bg-white border-stone-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      selectedVariantId === null ? 'text-white' : 'text-stone-700'
                    }`}
                  >
                    Base Recipe (Default)
                  </Text>
                </Pressable>

                {product.variants.map((v) => {
                  const isSelected = selectedVariantId === v.id;
                  const label = `${
                    v.temperature === 'HOT' ? '🔥 Hot' : v.temperature === 'COLD' ? '❄️ Iced' : ''
                  } ${v.size_label || (v as any).sizeLabel}`.trim();
                  return (
                    <Pressable
                      key={v.id || `${v.temperature}-${v.size_label}`}
                      onPress={() => handleSelectScope(v.id || null)}
                      className={`mr-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${
                        isSelected ? 'bg-[#800020] border-[#800020]' : 'bg-white border-stone-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-white' : 'text-stone-700'
                        }`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Ingredients Vertical List */}
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
            <View className="space-y-3">
              {lines.map((line, idx) => {
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
                        <AdminNumberInput
                          label="Amount per Order"
                          mode="decimal"
                          value={line.amount}
                          onChangeText={(v) => handleLineChange(idx, 'amount', v)}
                          placeholder="e.g. 1"
                        />
                      </View>

                      <View className="w-36">
                        <AdminInput
                          label="Unit"
                          value={line.unit}
                          onChangeText={(v) => handleLineChange(idx, 'unit', v)}
                          placeholder="g, L, pcs"
                        />
                      </View>

                      <View className="w-36 items-end justify-center pt-5">
                        <Text className="text-sm text-stone-500">Portion Cost</Text>
                        <Text className="text-base font-bold text-stone-900">
                          ₱{lineCost.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </AdminModal>

      {/* INGREDIENT PICKER DIALOG */}
      {pickingLineIdx !== null && (
        <View className="absolute inset-0 items-center justify-center bg-black/60 p-6 z-50">
          <Pressable
            className="absolute inset-0"
            onPress={() => setPickingLineIdx(null)}
            accessibilityRole="button"
            accessibilityLabel="Close ingredient picker"
          />
          <View className="w-full max-w-lg max-h-[85%] rounded-2xl bg-white shadow-2xl overflow-hidden flex-col z-10">
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
              <AdminInput
                value={ingredientSearch}
                onChangeText={setIngredientSearch}
                placeholder="Search by name, category, or SKU..."
                leftElement={<Search size={18} color="#78716c" />}
                autoFocus
              />
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
    </>
  );
};
