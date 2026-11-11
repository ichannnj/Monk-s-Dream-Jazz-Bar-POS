import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Package, Sliders, Plus, Edit, Trash2 } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { InventoryItemAdmin } from '../../../../data/admin.api';

interface InventoryStockTableProps {
  filteredInventory: InventoryItemAdmin[];
  onQuickCount: (item: InventoryItemAdmin) => void;
  onRestock: (item: InventoryItemAdmin) => void;
  onEditItem: (item: InventoryItemAdmin) => void;
  onDeleteItem: (item: InventoryItemAdmin) => void;
}

export const InventoryStockTable: React.FC<InventoryStockTableProps> = ({
  filteredInventory,
  onQuickCount,
  onRestock,
  onEditItem,
  onDeleteItem,
}) => {
  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-xs">
      {filteredInventory.length === 0 ? (
        <View className="py-12 items-center justify-center">
          <Package size={40} color="#a8a29e" />
          <Text className="mt-2 text-sm font-bold text-stone-700">
            No inventory items match the current filters.
          </Text>
        </View>
      ) : (
        <View>
          {/* Table Header (Desktop view) */}
          <View className="hidden lg:flex flex-row items-center bg-[#FAF8F5] border-b border-stone-200 px-6 py-3">
            <View className="w-[32%]">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Ingredient
              </Text>
            </View>
            <View className="w-[24%]">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Par Level
              </Text>
            </View>
            <View className="w-[16%]">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                On-Hand
              </Text>
            </View>
            <View className="w-[14%]">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Valuation
              </Text>
            </View>
            <View className="w-[14%] text-right">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Actions
              </Text>
            </View>
          </View>

          {/* Table Rows */}
          <View className="divide-y divide-stone-100">
            {filteredInventory.map((item) => {
              const currentStock = Number(item.current_stock || 0);
              const minAlert = Number(item.min_alert_level || 0);
              const isBelowPar = currentStock <= minAlert && currentStock > 0;
              const isCritical = currentStock <= 0;
              const unitCost = Number(item.unit_cost || 0);
              const itemValuation = Math.max(0, currentStock) * unitCost;

              const parRatio = minAlert > 0 ? currentStock / minAlert : 1;
              const progressPct = Math.min(100, Math.max(0, parRatio * 100));

              return (
                <View
                  key={item.id}
                  className="p-4 sm:p-5 lg:px-6 lg:py-3.5 hover:bg-stone-50/60 transition-colors"
                >
                  {/* Desktop Row Layout */}
                  <View className="hidden lg:flex flex-row items-center">
                    {/* Col 1: Ingredient & Category (32%) */}
                    <View className="w-[32%] pr-4">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text className="text-sm font-bold text-stone-900">{item.name}</Text>

                        {isCritical ? (
                          <View className="rounded bg-[#FAF8F5] border border-stone-200 px-1.5 py-0.5">
                            <Text className="text-[10px] font-bold text-[#800020]">Depleted</Text>
                          </View>
                        ) : isBelowPar ? (
                          <View className="rounded bg-[#FAF8F5] border border-stone-200 px-1.5 py-0.5">
                            <Text className="text-[10px] font-bold text-[#800020]">Low</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-xs text-stone-500 mt-0.5">
                        {item.sku} • {item.category}
                      </Text>
                    </View>

                    {/* Col 2: Par Level Health (24%) */}
                    <View className="w-[24%] pr-4">
                      <View className="flex-row items-center justify-between text-xs mb-1">
                        <Text className="text-xs text-stone-500">
                          Par {minAlert} {item.unit}
                        </Text>
                        <Text
                          className={`text-xs font-bold ${
                            isCritical || isBelowPar ? 'text-[#800020]' : 'text-stone-700'
                          }`}
                        >
                          {Math.round(parRatio * 100)}%
                        </Text>
                      </View>

                      <View className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                        <View
                          className={`h-full rounded-full ${
                            isCritical || isBelowPar ? 'bg-[#800020]' : 'bg-stone-800'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </View>
                    </View>

                    {/* Col 3: Stock On-Hand (16%) */}
                    <View className="w-[16%] pr-4">
                      <Text
                        className={`text-sm font-black ${
                          isCritical || isBelowPar ? 'text-[#800020]' : 'text-stone-900'
                        }`}
                      >
                        {currentStock.toFixed(2)} {item.unit}
                      </Text>
                    </View>

                    {/* Col 4: Cost & Valuation (14%) */}
                    <View className="w-[14%] pr-4">
                      <Text className="text-xs font-bold text-stone-900">
                        {formatCurrency(itemValuation)}
                      </Text>
                      <Text className="text-[11px] text-stone-500 mt-0.5">
                        ₱{unitCost.toFixed(2)}/{item.unit}
                      </Text>
                    </View>

                    {/* Col 5: Actions (14%) */}
                    <View className="w-[14%] flex-row items-center justify-end gap-1.5">
                      <Pressable
                        onPress={() => onQuickCount(item)}
                        className="h-8 px-2.5 rounded-lg bg-stone-100 border border-stone-200 flex-row items-center active:bg-stone-200"
                        accessibilityLabel={`Quick count for ${item.name}`}
                      >
                        <Sliders size={13} color="#1c1917" />
                        <Text className="ml-1 text-xs font-bold text-stone-800">Count</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onRestock(item)}
                        className="h-8 px-2.5 rounded-lg bg-[#800020] flex-row items-center active:bg-[#600018]"
                        accessibilityLabel={`Restock ${item.name}`}
                      >
                        <Plus size={13} color="#ffffff" />
                        <Text className="ml-1 text-xs font-bold text-white">Restock</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onEditItem(item)}
                        className="h-8 w-8 items-center justify-center rounded-lg bg-stone-100 active:bg-stone-200"
                        accessibilityLabel={`Edit ${item.name}`}
                      >
                        <Edit size={13} color="#1c1917" />
                      </Pressable>

                      <Pressable
                        onPress={() => onDeleteItem(item)}
                        className="h-8 w-8 items-center justify-center rounded-lg bg-stone-100 active:bg-rose-50"
                        accessibilityLabel={`Delete ${item.name}`}
                      >
                        <Trash2 size={13} color="#800020" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Mobile Card Layout */}
                  <View className="flex lg:hidden flex-col gap-2.5">
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="text-sm font-bold text-stone-900">{item.name}</Text>
                          {isCritical ? (
                            <View className="rounded bg-[#FAF8F5] border border-stone-200 px-1.5 py-0.2">
                              <Text className="text-[10px] font-bold text-[#800020]">Depleted</Text>
                            </View>
                          ) : isBelowPar ? (
                            <View className="rounded bg-[#FAF8F5] border border-stone-200 px-1.5 py-0.2">
                              <Text className="text-[10px] font-bold text-[#800020]">Low</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-xs text-stone-500 mt-0.5">
                          {item.sku} • {item.category}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text
                          className={`text-sm font-black ${
                            isCritical || isBelowPar ? 'text-[#800020]' : 'text-stone-900'
                          }`}
                        >
                          {currentStock.toFixed(2)} {item.unit}
                        </Text>
                        <Text className="text-xs text-stone-500 mt-0.5">
                          {formatCurrency(itemValuation)}
                        </Text>
                      </View>
                    </View>

                    {/* Par bar */}
                    <View>
                      <View className="flex-row items-center justify-between text-xs mb-1">
                        <Text className="text-[11px] font-medium text-stone-500">
                          Par: {minAlert} {item.unit}
                        </Text>
                        <Text className="text-[11px] font-bold text-stone-700">
                          {Math.round(parRatio * 100)}%
                        </Text>
                      </View>
                      <View className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                        <View
                          className={`h-full rounded-full ${
                            isCritical || isBelowPar ? 'bg-[#800020]' : 'bg-stone-800'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </View>
                    </View>

                    {/* Mobile Action Buttons */}
                    <View className="flex-row items-center justify-end gap-1.5 pt-1 border-t border-stone-100">
                      <Pressable
                        onPress={() => onQuickCount(item)}
                        className="h-9 px-3 rounded-lg bg-stone-100 border border-stone-200 flex-row items-center active:bg-stone-200"
                      >
                        <Sliders size={13} color="#1c1917" />
                        <Text className="ml-1 text-xs font-bold text-stone-800">Count</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onRestock(item)}
                        className="h-9 px-3 rounded-lg bg-[#800020] flex-row items-center active:bg-[#600018]"
                      >
                        <Plus size={13} color="#ffffff" />
                        <Text className="ml-1 text-xs font-bold text-white">Restock</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onEditItem(item)}
                        className="h-9 w-9 items-center justify-center rounded-lg bg-stone-100 active:bg-stone-200"
                      >
                        <Edit size={14} color="#1c1917" />
                      </Pressable>

                      <Pressable
                        onPress={() => onDeleteItem(item)}
                        className="h-9 w-9 items-center justify-center rounded-lg bg-stone-100 active:bg-rose-50"
                      >
                        <Trash2 size={14} color="#800020" />
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
