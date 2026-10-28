import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Utensils, AlertCircle } from 'lucide-react-native';
import type { ProductAdmin } from '../../data/admin.api';

interface AdminRecipesViewProps {
  products: ProductAdmin[];
  onRefresh: () => void;
}

export const AdminRecipesView: React.FC<AdminRecipesViewProps> = ({ products }) => {
  return (
    <ScrollView className="flex-1 bg-[#fcf9f9] p-8" showsVerticalScrollIndicator={false}>
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-extrabold tracking-tight text-stone-900">
            Recipe BOM & Outside Food Pricing
          </Text>
          <Text className="mt-1 text-base text-stone-500">
            Bill of materials auto-depletes inventory upon order dispatch; outside food enforces
            locked +20% markup.
          </Text>
        </View>
      </View>

      <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
        <View className="space-y-4">
          {products.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <Utensils size={36} color="#a8a29e" />
              <Text className="mt-2 text-base text-stone-500">No products configured.</Text>
            </View>
          ) : (
            products.map((prod) => (
              <View
                key={prod.id}
                className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-4"
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <View className="flex-row items-center space-x-2">
                      <Text className="text-lg font-bold text-stone-900">{prod.name}</Text>
                      {prod.is_resold_outside_food && (
                        <View className="ml-2 rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5">
                          <Text className="text-xs font-bold text-amber-900">
                            +20% Outside Food Markup
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm text-stone-600 mt-0.5">
                      Base Price: ₱{prod.base_price.toFixed(2)} • Target: {prod.station_target}
                    </Text>
                  </View>

                  <View
                    className={`rounded-full px-3 py-1 ${
                      prod.auto_86 ? 'bg-rose-100' : 'bg-emerald-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        prod.auto_86 ? 'text-rose-800' : 'text-emerald-800'
                      }`}
                    >
                      {prod.auto_86 ? 'Auto-86 Disabled' : 'Active On Menu'}
                    </Text>
                  </View>
                </View>

                {prod.ingredients && prod.ingredients.length > 0 ? (
                  <View className="mt-3 border-t border-stone-200 pt-2.5">
                    <Text className="text-xs font-semibold text-stone-500 mb-1">
                      Ingredients Bill of Materials (BOM):
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {prod.ingredients.map((ing) => (
                        <View
                          key={ing.id}
                          className="rounded-lg bg-white border border-stone-200 px-2.5 py-1"
                        >
                          <Text className="text-xs text-stone-700">
                            {ing.inventory_item?.name || 'Item'} — {ing.amount} {ing.unit}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View className="mt-2 flex-row items-center">
                    <AlertCircle size={13} color="#a8a29e" />
                    <Text className="ml-1 text-xs text-stone-400">
                      Direct inventory item (1:1 unit depletion)
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
};
