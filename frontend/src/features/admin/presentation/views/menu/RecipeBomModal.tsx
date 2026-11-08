import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Plus, Layers, DollarSign } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type ProductAdmin, type InventoryItemAdmin } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { IngredientPickerDialog } from './IngredientPickerDialog';
import { RecipeBomLineCard, type TempBomLine } from './RecipeBomLineCard';

interface RecipeBomModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: ProductAdmin | null;
  inventoryItems: InventoryItemAdmin[];
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
                    v.temperature === 'HOT' ? 'Hot' : v.temperature === 'COLD' ? 'Iced' : ''
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
              {lines.map((line, idx) => (
                <RecipeBomLineCard
                  key={idx}
                  line={line}
                  index={idx}
                  inventoryItems={inventoryItems}
                  onOpenPicker={(i) => {
                    setPickingLineIdx(i);
                    setIngredientSearch('');
                  }}
                  onRemove={handleRemoveLine}
                  onChange={handleLineChange}
                />
              ))}
            </View>
          )}
        </View>
      </AdminModal>

      {/* Ingredient Picker Dialog */}
      <IngredientPickerDialog
        visible={pickingLineIdx !== null}
        search={ingredientSearch}
        onSearchChange={setIngredientSearch}
        items={filteredPickerItems}
        selectedItemId={
          pickingLineIdx !== null ? lines[pickingLineIdx]?.inventoryItemId : undefined
        }
        onSelect={(inv) => {
          if (pickingLineIdx !== null) {
            handleLineChange(pickingLineIdx, 'inventoryItemId', inv.id);
            setPickingLineIdx(null);
          }
        }}
        onClose={() => setPickingLineIdx(null)}
      />
    </>
  );
};
