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
    <View className="rounded-2xl border border-stone-200/80 bg-white p-3.5 sm:p-5 lg:p-6 shadow-xs">
      <View className="space-y-3.5">
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
              className="rounded-xl border border-stone-200/90 bg-white p-3.5 sm:p-4 shadow-2xs"
            >
              <View className="flex-col sm:flex-row sm:items-center justify-between gap-3">
                <View className="flex-1 min-w-0 pr-2">
                  <Text
                    className="text-base sm:text-lg font-bold text-stone-900 tracking-tight"
                    numberOfLines={1}
                  >
                    {prod.name}
                  </Text>
                  <View className="flex-row items-center flex-wrap gap-2 mt-1">
                    <Text className="text-xs text-stone-500 font-medium">
                      Price:{' '}
                      <Text className="font-bold text-stone-800">₱{numPrice.toFixed(2)}</Text>
                    </Text>
                    <Text className="text-stone-300 text-xs">•</Text>
                    <Text className="text-xs text-stone-500 font-medium">
                      COGS: <Text className="font-bold text-[#810021]">₱{cogs.toFixed(2)}</Text>
                    </Text>
                    <Text className="text-stone-300 text-xs">•</Text>
                    <View className="rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5">
                      <Text className="text-xs font-bold text-stone-700">
                        {margin.toFixed(1)}% Margin
                      </Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={() => onConfigureRecipe(prod)}
                  className="min-h-[44px] sm:min-h-[48px] px-3.5 sm:px-4 flex-row items-center justify-center rounded-xl bg-[#810021] active:bg-[#600018] flex-shrink-0"
                  accessibilityLabel={`Configure recipe for ${prod.name}`}
                >
                  <Layers size={17} color="#F7F5F2" />
                  <Text className="ml-1.5 text-xs sm:text-sm font-bold text-white">
                    Configure Recipe
                  </Text>
                </Pressable>
              </View>

              <View className="mt-3 border-t border-stone-100 pt-2.5">
                {prod.ingredients && prod.ingredients.length > 0 ? (
                  <View className="flex-row flex-wrap gap-1.5">
                    {prod.ingredients.map((ing) => (
                      <View
                        key={ing.id}
                        className="rounded-lg bg-stone-50 border border-stone-200 px-2.5 py-1"
                      >
                        <Text className="text-xs text-stone-800 font-medium">
                          {ing.inventory_item?.name || 'Raw Item'} · {ing.amount} {ing.unit}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="text-xs text-stone-400 font-medium">
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
