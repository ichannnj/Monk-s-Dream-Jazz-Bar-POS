import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  Package,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react-native';
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
        <View className="py-16 items-center justify-center">
          <Package size={48} color="#a8a29e" />
          <Text className="mt-3 text-base font-bold text-stone-700">
            No inventory items match the current filters.
          </Text>
          <Text className="text-xs text-stone-400 mt-1">
            Try adjusting search criteria or selecting "All Items".
          </Text>
        </View>
      ) : (
        <View>
          {/* Table Header (Desktop view) */}
          <View className="hidden lg:flex flex-row items-center bg-stone-50/90 border-b border-stone-200 px-6 py-3.5">
            <View className="w-[32%]">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Ingredient &amp; Category
              </Text>
            </View>
            <View className="w-[24%]">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Par Level Health
              </Text>
            </View>
            <View className="w-[16%] text-right">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Stock On-Hand
              </Text>
            </View>
            <View className="w-[14%] text-right">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                MAC &amp; Valuation
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
                  className="p-4 sm:p-5 lg:px-6 lg:py-4 hover:bg-stone-50/60 transition-colors"
                >
                  {/* Desktop Row Layout */}
                  <View className="hidden lg:flex flex-row items-center">
                    {/* Col 1: Ingredient & Category (32%) */}
                    <View className="w-[32%] pr-4">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text className="text-base font-extrabold text-stone-900">{item.name}</Text>

                        {isCritical ? (
                          <View className="rounded-md bg-rose-100 border border-rose-300 px-2 py-0.5 flex-row items-center gap-1">
                            <AlertTriangle size={11} color="#be123c" />
                            <Text className="text-[11px] font-bold text-rose-800">Depleted</Text>
                          </View>
                        ) : isBelowPar ? (
                          <View className="rounded-md bg-amber-50 border border-amber-300 px-2 py-0.5 flex-row items-center gap-1">
                            <AlertCircle size={11} color="#b45309" />
                            <Text className="text-[11px] font-bold text-amber-800">Low Stock</Text>
                          </View>
                        ) : (
                          <View className="rounded-md bg-emerald-50 border border-emerald-300 px-2 py-0.5 flex-row items-center gap-1">
                            <CheckCircle2 size={11} color="#047857" />
                            <Text className="text-[11px] font-bold text-emerald-800">In Par</Text>
                          </View>
                        )}
                      </View>

                      <View className="flex-row items-center gap-2 mt-1">
                        <View className="rounded bg-stone-100 border border-stone-200 px-1.5 py-0.5">
                          <Text className="text-[11px] font-semibold text-stone-600">
                            {item.category}
                          </Text>
                        </View>
                        <Text className="text-xs text-stone-500">
                          SKU: <Text className="font-mono text-stone-700">{item.sku}</Text>
                        </Text>
                        <Text className="text-xs text-stone-400">•</Text>
                        <Text className="text-xs text-stone-600 truncate max-w-[140px]">
                          {item.supplier?.name || item.supplier_name || 'Direct Wholesale'}
                        </Text>
                      </View>
                    </View>

                    {/* Col 2: Par Health & Progress (24%) */}
                    <View className="w-[24%] pr-6">
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text className="text-xs font-semibold text-stone-600">
                          Par:{' '}
                          <Text className="font-bold text-stone-900">
                            {minAlert} {item.unit}
                          </Text>
                        </Text>
                        <Text
                          className={`text-xs font-bold ${
                            isCritical
                              ? 'text-rose-700'
                              : isBelowPar
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                          }`}
                        >
                          {isCritical ? '0% (Depleted)' : `${Math.round(parRatio * 100)}% of Par`}
                        </Text>
                      </View>

                      <View className="h-2 w-full bg-stone-100 rounded-full overflow-hidden border border-stone-200/60">
                        <View
                          className={`h-full rounded-full transition-all ${
                            isCritical
                              ? 'bg-rose-500'
                              : isBelowPar
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </View>
                    </View>

                    {/* Col 3: Stock On-Hand (16%) */}
                    <View className="w-[16%] pr-4">
                      <Text
                        className={`text-lg font-black ${
                          isCritical
                            ? 'text-rose-700'
                            : isBelowPar
                              ? 'text-amber-700'
                              : 'text-stone-900'
                        }`}
                      >
                        {currentStock.toFixed(2)} {item.unit}
                      </Text>
                      <Text className="text-xs text-stone-500 mt-0.5">
                        {currentStock > minAlert
                          ? `+${(currentStock - minAlert).toFixed(2)} above par`
                          : currentStock <= 0
                            ? 'Restock needed'
                            : `${(minAlert - currentStock).toFixed(2)} to par`}
                      </Text>
                    </View>

                    {/* Col 4: Cost & Valuation (14%) */}
                    <View className="w-[14%] pr-4">
                      <Text className="text-sm font-bold text-stone-900">
                        {formatCurrency(itemValuation)}
                      </Text>
                      <Text className="text-xs text-stone-500 mt-0.5">
                        ₱{unitCost.toFixed(2)}/{item.unit}
                      </Text>
                    </View>

                    {/* Col 5: Actions (14%) */}
                    <View className="w-[14%] flex-row items-center justify-end gap-1.5">
                      <Pressable
                        onPress={() => onQuickCount(item)}
                        className="h-9 px-2.5 rounded-lg bg-stone-100 border border-stone-200 flex-row items-center active:bg-stone-200"
                        accessibilityLabel={`Quick count for ${item.name}`}
                      >
                        <Sliders size={14} color="#44403c" />
                        <Text className="ml-1 text-xs font-bold text-stone-800">Count</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onRestock(item)}
                        className="h-9 px-2.5 rounded-lg bg-[#800020] flex-row items-center active:opacity-90 shadow-xs"
                        accessibilityLabel={`Restock ${item.name}`}
                      >
                        <Plus size={14} color="#ffffff" />
                        <Text className="ml-1 text-xs font-bold text-white">Restock</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onEditItem(item)}
                        className="h-9 w-9 items-center justify-center rounded-lg bg-stone-100 active:bg-stone-200"
                        accessibilityLabel={`Edit ${item.name}`}
                      >
                        <Edit size={14} color="#44403c" />
                      </Pressable>

                      <Pressable
                        onPress={() => onDeleteItem(item)}
                        className="h-9 w-9 items-center justify-center rounded-lg bg-rose-50 active:bg-rose-100"
                        accessibilityLabel={`Delete ${item.name}`}
                      >
                        <Trash2 size={14} color="#e11d48" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Mobile / Tablet Card Layout */}
                  <View className="flex lg:hidden flex-col gap-3">
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="text-base font-bold text-stone-900">{item.name}</Text>
                          {isCritical ? (
                            <View className="rounded bg-rose-100 px-1.5 py-0.5">
                              <Text className="text-[10px] font-bold text-rose-800">Depleted</Text>
                            </View>
                          ) : isBelowPar ? (
                            <View className="rounded bg-amber-100 px-1.5 py-0.5">
                              <Text className="text-[10px] font-bold text-amber-800">Low</Text>
                            </View>
                          ) : (
                            <View className="rounded bg-emerald-100 px-1.5 py-0.5">
                              <Text className="text-[10px] font-bold text-emerald-800">In Par</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-stone-500 mt-0.5">
                          SKU: {item.sku} • {item.category}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text
                          className={`text-base font-black ${
                            isCritical
                              ? 'text-rose-700'
                              : isBelowPar
                                ? 'text-amber-700'
                                : 'text-stone-900'
                          }`}
                        >
                          {currentStock.toFixed(2)} {item.unit}
                        </Text>
                        <Text className="text-xs text-stone-500 mt-0.5">
                          Value: {formatCurrency(itemValuation)}
                        </Text>
                      </View>
                    </View>

                    {/* Par bar */}
                    <View>
                      <View className="flex-row items-center justify-between text-xs mb-1">
                        <Text className="text-[11px] font-medium text-stone-500">
                          Par Threshold: {minAlert} {item.unit}
                        </Text>
                        <Text className="text-[11px] font-bold text-stone-700">
                          {Math.round(parRatio * 100)}%
                        </Text>
                      </View>
                      <View className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                        <View
                          className={`h-full rounded-full ${
                            isCritical
                              ? 'bg-rose-500'
                              : isBelowPar
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </View>
                    </View>

                    {/* Mobile Action Buttons */}
                    <View className="flex-row items-center justify-end gap-2 pt-1 border-t border-stone-100">
                      <Pressable
                        onPress={() => onQuickCount(item)}
                        className="h-10 px-3 rounded-xl bg-stone-100 border border-stone-200 flex-row items-center active:bg-stone-200"
                      >
                        <Sliders size={15} color="#44403c" />
                        <Text className="ml-1 text-xs font-bold text-stone-800">Count</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onRestock(item)}
                        className="h-10 px-3.5 rounded-xl bg-[#800020] flex-row items-center active:opacity-90 shadow-xs"
                      >
                        <Plus size={15} color="#ffffff" />
                        <Text className="ml-1 text-xs font-bold text-white">Restock</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onEditItem(item)}
                        className="h-10 w-10 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
                      >
                        <Edit size={16} color="#44403c" />
                      </Pressable>

                      <Pressable
                        onPress={() => onDeleteItem(item)}
                        className="h-10 w-10 items-center justify-center rounded-xl bg-rose-50 active:bg-rose-100"
                      >
                        <Trash2 size={16} color="#e11d48" />
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
