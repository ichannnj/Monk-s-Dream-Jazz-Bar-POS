import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Package, Sliders, Plus, Edit, Trash2 } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { InventoryItemAdmin } from '../../../../data/admin.api';
import { getStockStatus } from '../utils/inventoryCalculations';
import type { PhotoLightboxData } from './PhotoLightboxModal';

interface InventoryStockTableProps {
  filteredInventory: InventoryItemAdmin[];
  onQuickCount: (item: InventoryItemAdmin) => void;
  onRestock: (item: InventoryItemAdmin) => void;
  onEditItem: (item: InventoryItemAdmin) => void;
  onDeleteItem: (item: InventoryItemAdmin) => void;
  onPreviewPhoto: (photo: PhotoLightboxData) => void;
}

export const InventoryStockTable: React.FC<InventoryStockTableProps> = ({
  filteredInventory,
  onQuickCount,
  onRestock,
  onEditItem,
  onDeleteItem,
  onPreviewPhoto,
}) => {
  const renderThumb = (item: InventoryItemAdmin) => {
    if (item.reference_image_url) {
      return (
        <Pressable
          onPress={() =>
            onPreviewPhoto({
              url: item.reference_image_url!,
              title: item.name,
              subtitle: `${item.sku} • Par ${item.min_alert_level} ${item.unit}`,
              note: item.grocery_note,
            })
          }
          className="h-12 w-12 rounded-xl border border-[#E7E5E4] overflow-hidden bg-[#FAF8F5] shrink-0 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel={`Preview reference photo for ${item.name}`}
        >
          <Image
            source={{ uri: item.reference_image_url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Pressable>
      );
    }

    return (
      <View className="h-12 w-12 rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] items-center justify-center shrink-0">
        <Package size={18} color="#78716C" />
      </View>
    );
  };

  return (
    <View className="rounded-2xl border border-[#E7E5E4] bg-white overflow-hidden">
      {filteredInventory.length === 0 ? (
        <View className="py-14 px-4 items-center justify-center">
          <Package size={36} color="#78716C" />
          <Text className="mt-3 text-base font-bold text-[#1C1917] text-center">
            No inventory items match the current filters.
          </Text>
        </View>
      ) : (
        <View>
          {/* Desktop Table Header */}
          <View className="hidden lg:flex flex-row items-center bg-[#FAF8F5] border-b border-[#E7E5E4] px-5 py-3.5">
            <View className="w-[34%]">
              <Text className="text-base font-bold text-[#1C1917]">Item</Text>
            </View>
            <View className="w-[20%]">
              <Text className="text-base font-bold text-[#1C1917]">Par Level</Text>
            </View>
            <View className="w-[15%]">
              <Text className="text-base font-bold text-[#1C1917]">On-Hand</Text>
            </View>
            <View className="w-[14%]">
              <Text className="text-base font-bold text-[#1C1917]">Value</Text>
            </View>
            <View className="w-[17%] items-end">
              <Text className="text-base font-bold text-[#1C1917]">Actions</Text>
            </View>
          </View>

          <View className="divide-y divide-[#E7E5E4]">
            {filteredInventory.map((item) => {
              const currentStock = Number(item.current_stock || 0);
              const minAlert = Number(item.min_alert_level || 0);
              const status = getStockStatus(currentStock, minAlert);
              const isBelowPar = status === 'BELOW_PAR';
              const isCritical = status === 'DEPLETED';
              const unitCost = Number(item.unit_cost || 0);
              const itemValuation = Math.max(0, currentStock) * unitCost;
              const parRatio = minAlert > 0 ? currentStock / minAlert : 1;
              const progressPct = Math.min(100, Math.max(0, parRatio * 100));
              const recipeCount = item.linked_recipes?.length || 0;

              return (
                <View key={item.id} className="p-4 lg:px-5 lg:py-4">
                  {/* Desktop Row */}
                  <View className="hidden lg:flex flex-row items-center">
                    <View className="w-[34%] pr-4 flex-row items-center gap-3">
                      {renderThumb(item)}
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="text-base font-bold text-[#1C1917]" numberOfLines={1}>
                            {item.name}
                          </Text>
                          {isCritical ? (
                            <View className="rounded-lg bg-rose-50 border border-rose-200 px-2 py-0.5">
                              <Text className="text-base font-bold text-[#b32638]">Out</Text>
                            </View>
                          ) : isBelowPar ? (
                            <View className="rounded-lg bg-[#FAF8F5] border border-[#E7E5E4] px-2 py-0.5">
                              <Text className="text-base font-bold text-[#810021]">Low</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-base text-[#78716C]" numberOfLines={1}>
                          {item.sku}
                          {recipeCount > 0 ? ` • ${recipeCount} recipes` : ''}
                        </Text>
                      </View>
                    </View>

                    <View className="w-[20%] pr-4">
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text className="text-base text-[#78716C] tabular-nums">
                          Par {minAlert} {item.unit}
                        </Text>
                        <Text
                          className={`text-base font-bold tabular-nums ${
                            isCritical || isBelowPar ? 'text-[#810021]' : 'text-[#1C1917]'
                          }`}
                        >
                          {Math.round(parRatio * 100)}%
                        </Text>
                      </View>
                      <View className="h-2 w-full bg-[#FAF8F5] rounded-full overflow-hidden border border-[#E7E5E4]">
                        <View
                          className={`h-full rounded-full ${
                            isCritical
                              ? 'bg-[#b32638]'
                              : isBelowPar
                                ? 'bg-[#810021]'
                                : 'bg-[#1C1917]'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </View>
                    </View>

                    <View className="w-[15%] pr-4">
                      <Text
                        className={`text-base font-extrabold tabular-nums ${
                          isCritical
                            ? 'text-[#b32638]'
                            : isBelowPar
                              ? 'text-[#810021]'
                              : 'text-[#1C1917]'
                        }`}
                      >
                        {currentStock.toFixed(2)} {item.unit}
                      </Text>
                    </View>

                    <View className="w-[14%] pr-4">
                      <Text className="text-base font-bold text-[#1C1917] tabular-nums">
                        {formatCurrency(itemValuation)}
                      </Text>
                      <Text className="text-base text-[#78716C] tabular-nums">
                        {formatCurrency(unitCost)}/{item.unit}
                      </Text>
                    </View>

                    <View className="w-[17%] flex-row items-center justify-end gap-1.5">
                      <Pressable
                        onPress={() => onQuickCount(item)}
                        className="min-h-[48px] px-3 rounded-xl bg-white border border-[#E7E5E4] flex-row items-center active:opacity-80"
                        accessibilityLabel={`Count ${item.name}`}
                      >
                        <Sliders size={16} color="#1C1917" />
                        <Text className="ml-1.5 text-base font-bold text-[#1C1917]">Count</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onRestock(item)}
                        className="min-h-[48px] px-3 rounded-xl bg-[#810021] flex-row items-center active:opacity-85"
                        accessibilityLabel={`Restock ${item.name}`}
                      >
                        <Plus size={16} color="#F5F5F5" />
                        <Text className="ml-1 text-base font-bold text-white">Restock</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onEditItem(item)}
                        className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-[#E7E5E4] bg-white active:opacity-80"
                        accessibilityLabel={`Edit ${item.name}`}
                      >
                        <Edit size={18} color="#1C1917" />
                      </Pressable>

                      <Pressable
                        onPress={() => onDeleteItem(item)}
                        className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-[#E7E5E4] bg-white active:opacity-80"
                        accessibilityLabel={`Delete ${item.name}`}
                      >
                        <Trash2 size={18} color="#b32638" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Mobile / Tablet Card (< lg) */}
                  <View className="flex lg:hidden gap-3">
                    <View className="flex-row items-start gap-3">
                      {renderThumb(item)}
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="text-base font-bold text-[#1C1917]">{item.name}</Text>
                          {isCritical ? (
                            <View className="rounded-lg bg-rose-50 border border-rose-200 px-2 py-0.5">
                              <Text className="text-base font-bold text-[#b32638]">Out</Text>
                            </View>
                          ) : isBelowPar ? (
                            <View className="rounded-lg bg-[#FAF8F5] border border-[#E7E5E4] px-2 py-0.5">
                              <Text className="text-base font-bold text-[#810021]">Low</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-base text-[#78716C] tabular-nums">
                          {item.sku} • {formatCurrency(itemValuation)}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text
                          className={`text-base font-extrabold tabular-nums ${
                            isCritical
                              ? 'text-[#b32638]'
                              : isBelowPar
                                ? 'text-[#810021]'
                                : 'text-[#1C1917]'
                          }`}
                        >
                          {currentStock.toFixed(2)} {item.unit}
                        </Text>
                      </View>
                    </View>

                    <View>
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text className="text-base text-[#78716C] tabular-nums">
                          Par {minAlert} {item.unit}
                          {recipeCount > 0 ? ` • ${recipeCount} recipes` : ''}
                        </Text>
                        <Text className="text-base font-bold text-[#1C1917] tabular-nums">
                          {Math.round(parRatio * 100)}%
                        </Text>
                      </View>
                      <View className="h-2 w-full bg-[#FAF8F5] rounded-full overflow-hidden border border-[#E7E5E4]">
                        <View
                          className={`h-full rounded-full ${
                            isCritical
                              ? 'bg-[#b32638]'
                              : isBelowPar
                                ? 'bg-[#810021]'
                                : 'bg-[#1C1917]'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </View>
                    </View>

                    <View className="flex-row items-center justify-end flex-wrap gap-2 pt-2 border-t border-[#E7E5E4]">
                      <Pressable
                        onPress={() => onQuickCount(item)}
                        className="min-h-[48px] px-3.5 rounded-xl bg-white border border-[#E7E5E4] flex-row items-center active:opacity-80"
                      >
                        <Sliders size={16} color="#1C1917" />
                        <Text className="ml-1.5 text-base font-bold text-[#1C1917]">Count</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onRestock(item)}
                        className="min-h-[48px] px-3.5 rounded-xl bg-[#810021] flex-row items-center active:opacity-85"
                      >
                        <Plus size={16} color="#F5F5F5" />
                        <Text className="ml-1 text-base font-bold text-white">Restock</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onEditItem(item)}
                        className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-[#E7E5E4] bg-white active:opacity-80"
                        accessibilityLabel={`Edit ${item.name}`}
                      >
                        <Edit size={18} color="#1C1917" />
                      </Pressable>

                      <Pressable
                        onPress={() => onDeleteItem(item)}
                        className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-[#E7E5E4] bg-white active:opacity-80"
                        accessibilityLabel={`Delete ${item.name}`}
                      >
                        <Trash2 size={18} color="#b32638" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};
