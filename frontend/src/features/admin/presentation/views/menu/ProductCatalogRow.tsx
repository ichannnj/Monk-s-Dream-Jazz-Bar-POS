import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Wine, Utensils, Layers, Edit, Trash2 } from 'lucide-react-native';
import type { ProductAdmin } from '../../../data/admin.api';

interface ProductCatalogRowProps {
  prod: ProductAdmin;
  onToggleAuto86: (prod: ProductAdmin) => void;
  onOpenBom: (prod: ProductAdmin) => void;
  onEdit: (prod: ProductAdmin) => void;
  onDelete: (prod: ProductAdmin) => void;
}

export const ProductCatalogRow: React.FC<ProductCatalogRowProps> = ({
  prod,
  onToggleAuto86,
  onOpenBom,
  onEdit,
  onDelete,
}) => {
  return (
    <View className="flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-stone-200 bg-white p-4 gap-3.5 transition-all">
      {/* Left Side: Thumbnail & Product Info */}
      <View className="flex-1 flex-row items-center sm:pr-4">
        <View className="h-14 w-14 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 mr-3.5 items-center justify-center flex-shrink-0">
          {prod.image_url ? (
            <Image
              source={{ uri: prod.image_url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : prod.station_target === 'bar' ? (
            <Wine size={22} color="#a8a29e" />
          ) : (
            <Utensils size={22} color="#a8a29e" />
          )}
        </View>

        <View className="flex-1">
          <View className="flex-row items-center space-x-2.5 flex-wrap gap-1.5">
            <Text className="text-lg font-bold text-stone-900">{prod.name}</Text>
            <View
              className={`rounded-md px-2.5 py-0.5 border ${
                prod.station_target === 'bar'
                  ? 'bg-purple-50 border-purple-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <Text
                className={`text-base font-bold ${
                  prod.station_target === 'bar' ? 'text-purple-800' : 'text-amber-800'
                }`}
              >
                {prod.station_target === 'bar' ? 'Bar' : 'Kitchen'}
              </Text>
            </View>
            {prod.is_resold_outside_food && (
              <View className="rounded-md bg-stone-100 border border-stone-300 px-2.5 py-0.5">
                <Text className="text-base font-medium text-stone-700">+20% Partner</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center space-x-2 mt-1">
            <Text className="text-base text-stone-500">
              {prod.categories?.name || 'Unassigned'}
            </Text>
            <Text className="text-stone-300">•</Text>
            <Text className="text-base font-extrabold text-[#800020]">
              ₱{Number(prod.base_price || 0).toFixed(2)}
            </Text>
            {prod.modifiers && prod.modifiers.length > 0 ? (
              <>
                <Text className="text-stone-300">•</Text>
                <View className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5">
                  <Text className="text-xs font-bold text-purple-700">
                    {prod.modifiers.length} Modifiers
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* Right Side: Availability Pill & Action Icons */}
      <View className="flex-row items-center gap-2 flex-wrap pt-2 sm:pt-0 border-t border-stone-100 sm:border-t-0">
        <Pressable
          onPress={() => onToggleAuto86(prod)}
          className={`min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl border transition-all ${
            prod.auto_86
              ? 'bg-rose-50 border-rose-300 active:bg-rose-100'
              : 'bg-emerald-50 border-emerald-300 active:bg-emerald-100'
          }`}
        >
          <View
            className={`h-2.5 w-2.5 rounded-full mr-2 ${
              prod.auto_86 ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
          />
          <Text
            className={`text-base font-bold ${prod.auto_86 ? 'text-rose-800' : 'text-emerald-800'}`}
          >
            {prod.auto_86 ? 'Sold Out' : 'Available'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onOpenBom(prod)}
          className="min-h-[48px] flex-row items-center rounded-xl border border-stone-300 bg-stone-50 px-3.5 active:bg-stone-100"
        >
          <Layers size={18} color="#800020" />
          <Text className="ml-1.5 text-base font-bold text-[#800020]">Recipe</Text>
        </Pressable>

        <Pressable
          onPress={() => onEdit(prod)}
          className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-stone-300 bg-white active:bg-stone-100"
          accessibilityLabel="Edit product"
        >
          <Edit size={18} color="#44403c" />
        </Pressable>

        <Pressable
          onPress={() => onDelete(prod)}
          className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 active:bg-rose-100"
          accessibilityLabel="Delete product"
        >
          <Trash2 size={18} color="#e11d48" />
        </Pressable>
      </View>
    </View>
  );
};
