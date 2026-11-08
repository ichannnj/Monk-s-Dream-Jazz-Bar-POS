import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Layers } from 'lucide-react-native';
import type { ProductAdmin } from '../../../data/admin.api';

interface RecipeBomCostingTabProps {
  products: ProductAdmin[];
  onConfigureRecipe: (prod: ProductAdmin) => void;
}

export const RecipeBomCostingTab: React.FC<RecipeBomCostingTabProps> = ({
  products,
  onConfigureRecipe,
}) => {
  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
      <View className="space-y-4">
        {products.map((prod) => {
          const cogs = (prod.ingredients || []).reduce((acc, ing) => {
            const unitCost = ing.inventory_item?.unit_cost || 0;
            return acc + ing.amount * (ing.conversion_factor || 1) * unitCost;
          }, 0);
          const numPrice = Number(prod.base_price || 0);
          const margin = numPrice > 0 ? ((numPrice - cogs) / numPrice) * 100 : 0;

          return (
            <View
              key={prod.id}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-lg font-bold text-stone-900">{prod.name}</Text>
                  <View className="flex-row items-center space-x-3 mt-1">
                    <Text className="text-base text-stone-500">
                      Price:{' '}
                      <Text className="font-bold text-stone-800">₱{numPrice.toFixed(2)}</Text>
                    </Text>
                    <Text className="text-stone-300">•</Text>
                    <Text className="text-base text-stone-500">
                      COGS: <Text className="font-bold text-[#800020]">₱{cogs.toFixed(2)}</Text>
                    </Text>
                    <Text className="text-stone-300">•</Text>
                    <View
                      className={`rounded-md px-2.5 py-0.5 border ${
                        margin >= 70
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <Text
                        className={`text-base font-bold ${
                          margin >= 70 ? 'text-emerald-800' : 'text-amber-800'
                        }`}
                      >
                        {margin.toFixed(1)}% Margin
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => onConfigureRecipe(prod)}
                  className="min-h-[48px] flex-row items-center rounded-xl bg-[#800020] px-4 active:opacity-90"
                >
                  <Layers size={18} color="#ffffff" />
                  <Text className="ml-1.5 text-base font-bold text-white">Configure Recipe</Text>
                </Pressable>
              </View>

              <View className="mt-3 border-t border-stone-200 pt-2">
                {prod.ingredients && prod.ingredients.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {prod.ingredients.map((ing) => (
                      <View
                        key={ing.id}
                        className="rounded-lg bg-white border border-stone-300 px-3 py-1.5"
                      >
                        <Text className="text-base text-stone-800">
                          {ing.inventory_item?.name || 'Raw Item'} — {ing.amount} {ing.unit}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="text-base text-stone-400">
                    Direct inventory item (1:1 unit depletion or no sub-ingredients)
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};
