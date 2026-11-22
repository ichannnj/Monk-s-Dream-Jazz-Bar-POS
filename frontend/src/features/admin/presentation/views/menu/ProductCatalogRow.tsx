import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Wine, Utensils, Layers, Edit } from 'lucide-react-native';
import type { ProductAdmin } from '../../../data/admin.api';

interface ProductCatalogRowProps {
  prod: ProductAdmin;
  onToggleAuto86: (prod: ProductAdmin) => void;
  onOpenBom: (prod: ProductAdmin) => void;
  onEdit: (prod: ProductAdmin) => void;
  onDelete?: (prod: ProductAdmin) => void;
}

export const ProductCatalogRow: React.FC<ProductCatalogRowProps> = ({
  prod,
  onToggleAuto86,
  onOpenBom,
  onEdit,
}) => {
  const numPrice = Number(prod.base_price || 0);
  const modifierCount = prod.modifiers?.length || 0;

  return (
    <View className="flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-stone-200/90 bg-white p-3.5 sm:p-4 gap-3 transition-colors">
      {/* Left: Thumbnail & Minimal Product Info */}
      <Pressable
        onPress={() => onEdit(prod)}
        className="flex-1 flex-row items-center sm:pr-3 active:opacity-85"
        accessibilityLabel={`Edit ${prod.name}`}
      >
        <View className="h-12 w-12 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 mr-3.5 items-center justify-center flex-shrink-0">
          {prod.image_url ? (
            <Image
              source={{ uri: prod.image_url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : prod.station_target === 'bar' ? (
            <Wine size={20} color="#78716c" />
          ) : (
            <Utensils size={20} color="#78716c" />
          )}
        </View>

        <View className="flex-1 min-w-0">
          {/* Line 1: Name & Price */}
          <View className="flex-row items-baseline justify-between gap-2 pr-1">
            <Text
              className="text-base font-bold text-stone-900 tracking-tight flex-1"
              numberOfLines={1}
            >
              {prod.name}
            </Text>
            <Text className="text-base font-black text-[#810021] ml-2">₱{numPrice.toFixed(2)}</Text>
          </View>

          {/* Line 2: Unified Minimalist Subtitle */}
          <View className="flex-row items-center flex-wrap gap-1 mt-0.5">
            <Text className="text-xs text-stone-500 font-medium">
              {prod.categories?.name || 'Unassigned'}
            </Text>
            <Text className="text-stone-300 text-xs">•</Text>
            <Text className="text-xs text-stone-500 font-medium">
              {prod.station_target === 'bar' ? 'Bar' : 'Kitchen'}
            </Text>
            {prod.is_resold_outside_food && (
              <>
                <Text className="text-stone-300 text-xs">•</Text>
                <Text className="text-xs text-stone-500 font-medium">Partner</Text>
              </>
            )}
            {modifierCount > 0 && (
              <>
                <Text className="text-stone-300 text-xs">•</Text>
                <Text className="text-xs text-stone-500 font-medium">
                  {modifierCount} mod{modifierCount > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </View>
        </View>
      </Pressable>

      {/* Right: Consolidated Minimal Actions */}
      <View className="flex-row items-center justify-end gap-2 pt-2 sm:pt-0 border-t border-stone-100 sm:border-t-0 flex-shrink-0">
        {/* 1-Tap Status Pill (Available vs Sold Out) */}
        <Pressable
          onPress={() => onToggleAuto86(prod)}
          className={`min-h-[44px] sm:min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl border transition-colors ${
            prod.auto_86
              ? 'bg-stone-200 border-stone-300 active:bg-stone-300'
              : 'bg-white border-stone-200 active:bg-stone-50'
          }`}
          accessibilityLabel={`Toggle availability for ${prod.name}, currently ${
            prod.auto_86 ? 'Sold Out' : 'Available'
          }`}
        >
          <View
            className={`h-2 w-2 rounded-full mr-2 ${
              prod.auto_86 ? 'bg-stone-500' : 'bg-stone-800'
            }`}
          />
          <Text
            className={`text-xs sm:text-sm font-bold ${
              prod.auto_86 ? 'text-stone-700' : 'text-stone-800'
            }`}
          >
            {prod.auto_86 ? 'Sold Out' : 'Available'}
          </Text>
        </Pressable>

        {/* Recipe BOM Icon Button */}
        <Pressable
          onPress={() => onOpenBom(prod)}
          className="min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50"
          accessibilityLabel="Recipe BOM & Costing"
        >
          <Layers size={18} color="#810021" />
        </Pressable>

        {/* Edit Button */}
        <Pressable
          onPress={() => onEdit(prod)}
          className="min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50"
          accessibilityLabel="Edit product"
        >
          <Edit size={18} color="#1A1617" />
        </Pressable>
      </View>
    </View>
  );
};
