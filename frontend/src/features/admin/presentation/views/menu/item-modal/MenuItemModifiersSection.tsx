import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sliders, Trash2, Check } from 'lucide-react-native';
import { AdminInput } from '../../../components/AdminInput';
import { AdminNumberInput } from '../../../components/AdminNumberInput';
import { ProductModifierOptionAdmin } from '../../../../data/admin.api';
import { ProductModifierStateItem } from './menuItemModal.types';

interface MenuItemModifiersSectionProps {
  catalogModifiers: ProductModifierOptionAdmin[];
  productModifiers: ProductModifierStateItem[];
  modifierFilterCategory: string;
  setModifierFilterCategory: (slug: string) => void;
  onToggleModifierOption: (mod: any) => void;
  onUpdateModifierPrice: (name: string, price: string) => void;
  onSelectAllCategoryModifiers: (catSlug: string) => void;
  onClearCategoryModifiers: (catSlug: string) => void;
  customModName: string;
  setCustomModName: (val: string) => void;
  customModPrice: string;
  setCustomModPrice: (val: string) => void;
  onAddCustomModifier: () => void;
}

export const MenuItemModifiersSection: React.FC<MenuItemModifiersSectionProps> = ({
  catalogModifiers,
  productModifiers,
  modifierFilterCategory,
  setModifierFilterCategory,
  onToggleModifierOption,
  onUpdateModifierPrice,
  onSelectAllCategoryModifiers,
  onClearCategoryModifiers,
  customModName,
  setCustomModName,
  customModPrice,
  setCustomModPrice,
  onAddCustomModifier,
}) => {
  const combinedMap = new Map<string, any>();
  for (const m of catalogModifiers) {
    combinedMap.set(m.name.toLowerCase(), {
      id: m.id,
      name: m.name,
      price_delta: m.price_delta || 0,
      applicable_category: m.applicable_category || 'all',
      inventory_item_id: m.inventory_item_id || null,
      amount_delta: m.amount_delta || 0,
      unit: m.unit || null,
      inventory_item: m.inventory_item,
    });
  }

  for (const pm of productModifiers) {
    const existing = combinedMap.get(pm.name.toLowerCase());
    if (existing) {
      if (pm.applicable_category && pm.applicable_category !== 'all') {
        existing.applicable_category = pm.applicable_category;
      }
    } else {
      combinedMap.set(pm.name.toLowerCase(), {
        id: pm.id || `custom-${pm.name}`,
        name: pm.name,
        price_delta: parseFloat(pm.price_delta) || 0,
        applicable_category: pm.applicable_category || 'all',
        inventory_item_id: pm.inventory_item_id || null,
        amount_delta: pm.amount_delta || 0,
        unit: pm.unit || null,
      });
    }
  }

  const allVisibleModifiers = Array.from(combinedMap.values()).filter((m) => {
    if (modifierFilterCategory === 'all') return true;
    const cat = (m.applicable_category || '').toLowerCase();
    if (cat === modifierFilterCategory) return true;
    if (modifierFilterCategory === 'cocktails_wine' && (cat === 'cocktails' || cat === 'wine'))
      return true;
    return false;
  });

  return (
    <View className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center space-x-3">
          <View className="h-10 w-10 rounded-xl bg-purple-500/10 items-center justify-center border border-purple-500/20">
            <Sliders size={20} color="#7e22ce" />
          </View>
          <View className="ml-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-stone-900">
                Product Modifiers & Add-Ons
              </Text>
              <View className="rounded-md bg-purple-100 border border-purple-200 px-2 py-0.5">
                <Text className="text-xs font-bold text-purple-800">
                  {productModifiers.length} Selected
                </Text>
              </View>
            </View>
            <Text className="text-sm text-stone-500">
              Select available add-ons, extra shots, dairy, and custom toppings for this item
            </Text>
          </View>
        </View>
      </View>

      {/* Category Filter Pills */}
      <View className="space-y-1.5">
        <Text className="text-xs font-bold uppercase tracking-wider text-stone-600">
          Filter Modifiers by Category
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {[
            { slug: 'all', label: 'All Modifiers' },
            { slug: 'coffee', label: 'Coffee & Espresso' },
            { slug: 'cocktails_wine', label: 'Cocktails & Liquor' },
            { slug: 'mains_pasta', label: 'Pasta & Mains' },
            { slug: 'small_plates', label: 'Small Plates' },
            { slug: 'desserts', label: 'Desserts' },
          ].map((catPill) => {
            const isActive = modifierFilterCategory === catPill.slug;
            return (
              <Pressable
                key={catPill.slug}
                onPress={() => setModifierFilterCategory(catPill.slug)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl border flex-row items-center space-x-1.5 ${
                  isActive
                    ? 'bg-purple-900 border-purple-900 shadow-xs'
                    : 'bg-white border-stone-200 active:bg-stone-100'
                }`}
              >
                <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-stone-700'}`}>
                  {catPill.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Bulk Select / Clear Actions */}
      <View className="flex-row items-center justify-between border-t border-stone-200 pt-2.5">
        <Text className="text-xs font-semibold text-stone-500">
          Showing options for{' '}
          {modifierFilterCategory === 'all' ? 'all categories' : modifierFilterCategory}
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => onSelectAllCategoryModifiers(modifierFilterCategory)}
            className="px-2.5 py-1.5 rounded-lg bg-stone-200 active:bg-stone-300"
          >
            <Text className="text-xs font-bold text-stone-700">+ Select All</Text>
          </Pressable>
          <Pressable
            onPress={() => onClearCategoryModifiers(modifierFilterCategory)}
            className="px-2.5 py-1.5 rounded-lg bg-stone-200 active:bg-stone-300"
          >
            <Text className="text-xs font-bold text-stone-700">Clear</Text>
          </Pressable>
        </View>
      </View>

      {/* Modifiers List Grid */}
      <View className="rounded-xl border border-stone-200 bg-white overflow-hidden divide-y divide-stone-100">
        {allVisibleModifiers.length === 0 ? (
          <View className="p-4 items-center justify-center">
            <Text className="text-xs text-stone-400">
              No modifiers found for this category. Use "+ Add Custom Modifier" below to add one.
            </Text>
          </View>
        ) : (
          allVisibleModifiers.map((mod) => {
            const assigned = productModifiers.find(
              (m) => m.name.toLowerCase() === mod.name.toLowerCase()
            );
            const isSelected = Boolean(assigned);
            const currentPrice = assigned
              ? assigned.price_delta
              : (mod.price_delta || 0).toFixed(2);

            return (
              <View
                key={mod.id || mod.name}
                className={`p-3 flex-row items-center justify-between gap-3 ${isSelected ? 'bg-purple-50/40' : 'bg-white'}`}
              >
                <Pressable
                  onPress={() => onToggleModifierOption(mod)}
                  className="flex-row items-center space-x-3 flex-1"
                >
                  <View
                    className={`h-5 w-5 rounded items-center justify-center border ${
                      isSelected ? 'bg-purple-900 border-purple-900' : 'bg-white border-stone-300'
                    }`}
                  >
                    {isSelected && <Check size={14} color="#ffffff" />}
                  </View>
                  <View className="ml-2">
                    <Text
                      className={`text-sm font-bold ${isSelected ? 'text-purple-950 font-black' : 'text-stone-800'}`}
                    >
                      {mod.name}
                    </Text>
                    {mod.inventory_item ? (
                      <Text className="text-xs text-stone-400">
                        Depletes: {mod.inventory_item.name} (-{mod.amount_delta} {mod.unit})
                      </Text>
                    ) : null}
                  </View>
                </Pressable>

                <View className="flex-row items-center space-x-2">
                  <Text className="text-xs font-semibold text-stone-500 mr-1">+₱</Text>
                  <View className="w-24">
                    <AdminNumberInput
                      mode="currency"
                      value={currentPrice}
                      editable={isSelected}
                      onChangeText={(val) => onUpdateModifierPrice(mod.name, val)}
                      placeholder="0.00"
                      className={!isSelected ? 'opacity-40 bg-stone-100' : ''}
                    />
                  </View>
                  {isSelected ? (
                    <Pressable
                      onPress={() => onToggleModifierOption(mod)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md"
                    >
                      <Trash2 size={16} color="#9ca3af" />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Quick Custom Modifier Input Bar */}
      <View className="space-y-1.5 border-t border-stone-200 pt-3">
        <Text className="text-xs font-bold uppercase tracking-wider text-stone-600">
          + Add Custom Modifier / Add-on
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <AdminInput
              value={customModName}
              onChangeText={setCustomModName}
              placeholder="e.g. Extra Rosemary Sprig, Jalapeno Slice..."
            />
          </View>
          <View className="w-28">
            <AdminNumberInput
              mode="currency"
              value={customModPrice}
              onChangeText={setCustomModPrice}
              placeholder="Price"
            />
          </View>
          <Pressable
            onPress={onAddCustomModifier}
            className="min-h-[44px] px-4 rounded-xl bg-purple-900 items-center justify-center active:bg-purple-950"
          >
            <Text className="text-xs font-bold text-white">+ Add</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
