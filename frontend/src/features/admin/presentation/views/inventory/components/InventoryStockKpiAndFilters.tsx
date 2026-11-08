import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Boxes, CheckCircle2, AlertCircle, AlertTriangle, Search } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { AdminInput } from '../../../components';
import { InventoryItemAdmin } from '../../../../data/admin.api';
import { StockStatusFilter, CATEGORY_FILTERS } from './inventory.types';

interface InventoryStockKpiAndFiltersProps {
  inventory: InventoryItemAdmin[];
  totalValuation: number;
  inParItemsCount: number;
  belowParItemsCount: number;
  depletedItemsCount: number;
  stockStatusFilter: StockStatusFilter;
  setStockStatusFilter: (val: StockStatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  categoryFilter: string;
  setCategoryFilter: (val: string) => void;
  filteredCount: number;
}

export const InventoryStockKpiAndFilters: React.FC<InventoryStockKpiAndFiltersProps> = ({
  inventory,
  totalValuation,
  inParItemsCount,
  belowParItemsCount,
  depletedItemsCount,
  stockStatusFilter,
  setStockStatusFilter,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  filteredCount,
}) => {
  const categoryDropdownOptions: PosDropdownOption<string>[] = CATEGORY_FILTERS.map((f) => ({
    value: f.key,
    label: f.label,
  }));

  return (
    <>
      {/* Executive KPI Summary Cards */}
      <View className="flex-row flex-wrap gap-4">
        {/* Card 1: Total Valuation */}
        <View className="flex-1 min-w-[200px] sm:min-w-[220px] rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs justify-between">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Total Valuation
            </Text>
            <View className="h-8 w-8 rounded-lg bg-[#800020]/10 items-center justify-center">
              <Boxes size={17} color="#800020" />
            </View>
          </View>
          <Text className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {formatCurrency(totalValuation)}
          </Text>
          <Text className="text-xs font-medium text-stone-500 mt-2">
            {inventory.length} SKUs across all stations
          </Text>
        </View>

        {/* Card 2: Healthy In-Par */}
        <Pressable
          onPress={() => setStockStatusFilter(stockStatusFilter === 'IN_PAR' ? 'ALL' : 'IN_PAR')}
          className={`flex-1 min-w-[200px] sm:min-w-[220px] rounded-2xl border p-5 sm:p-6 shadow-xs transition-all justify-between ${
            stockStatusFilter === 'IN_PAR'
              ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
              : 'border-stone-200 bg-white active:bg-stone-50'
          }`}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              In-Par Healthy
            </Text>
            <View className="h-8 w-8 rounded-lg bg-emerald-100 items-center justify-center">
              <CheckCircle2 size={17} color="#059669" />
            </View>
          </View>
          <Text className="text-2xl sm:text-3xl font-black text-emerald-900 tracking-tight">
            {inParItemsCount}
          </Text>
          <Text className="text-xs font-medium text-emerald-700 mt-2">
            {inventory.length > 0
              ? `${Math.round((inParItemsCount / inventory.length) * 100)}% of stock healthy`
              : '0%'}
          </Text>
        </Pressable>

        {/* Card 3: Below Par Alerts */}
        <Pressable
          onPress={() =>
            setStockStatusFilter(stockStatusFilter === 'BELOW_PAR' ? 'ALL' : 'BELOW_PAR')
          }
          className={`flex-1 min-w-[200px] sm:min-w-[220px] rounded-2xl border p-5 sm:p-6 shadow-xs transition-all justify-between ${
            stockStatusFilter === 'BELOW_PAR'
              ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
              : 'border-stone-200 bg-white active:bg-stone-50'
          }`}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Below Par (Reorder)
            </Text>
            <View className="h-8 w-8 rounded-lg bg-amber-100 items-center justify-center">
              <AlertCircle size={17} color="#d97706" />
            </View>
          </View>
          <Text className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight">
            {belowParItemsCount}
          </Text>
          <Text className="text-xs font-medium text-amber-700 mt-2">
            {belowParItemsCount > 0 ? 'Replenishment recommended' : 'Zero items below par'}
          </Text>
        </Pressable>

        {/* Card 4: Depleted / Out of Stock */}
        <Pressable
          onPress={() =>
            setStockStatusFilter(stockStatusFilter === 'DEPLETED' ? 'ALL' : 'DEPLETED')
          }
          className={`flex-1 min-w-[200px] sm:min-w-[220px] rounded-2xl border p-5 sm:p-6 shadow-xs transition-all justify-between ${
            stockStatusFilter === 'DEPLETED'
              ? 'border-rose-600 bg-rose-50/70 ring-2 ring-rose-500/20'
              : 'border-stone-200 bg-white active:bg-stone-50'
          }`}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-bold text-rose-800 uppercase tracking-wider">
              Depleted / Overdrawn
            </Text>
            <View className="h-8 w-8 rounded-lg bg-rose-100 items-center justify-center">
              <AlertTriangle size={17} color="#e11d48" />
            </View>
          </View>
          <Text className="text-2xl sm:text-3xl font-black text-rose-900 tracking-tight">
            {depletedItemsCount}
          </Text>
          <Text className="text-xs font-medium text-rose-700 mt-2">
            Orders active (soft warnings)
          </Text>
        </Pressable>
      </View>

      {/* Search Bar, Filter Pills & Category Dropdown */}
      <View className="flex-col gap-3">
        <View className="flex-col md:flex-row md:items-center justify-between gap-3">
          <View className="flex-1">
            <AdminInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search ingredients, SKUs, suppliers..."
              leftElement={<Search size={18} color="#78716c" />}
            />
          </View>

          <View className="flex-row items-center justify-between md:justify-end gap-3 flex-wrap sm:flex-nowrap">
            {/* Quick Filter Status Pills */}
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1">
                Status:
              </Text>
              <Pressable
                onPress={() => setStockStatusFilter('ALL')}
                className={`rounded-xl px-3 py-2 border ${
                  stockStatusFilter === 'ALL'
                    ? 'bg-stone-900 border-stone-900 text-white'
                    : 'bg-white border-stone-200 active:bg-stone-100'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    stockStatusFilter === 'ALL' ? 'text-white' : 'text-stone-700'
                  }`}
                >
                  All ({inventory.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setStockStatusFilter('IN_PAR')}
                className={`rounded-xl px-3 py-2 border ${
                  stockStatusFilter === 'IN_PAR'
                    ? 'bg-emerald-700 border-emerald-700 text-white'
                    : 'bg-white border-stone-200 active:bg-stone-100'
                }`}
              >
                <Text
                  className={`text-base font-bold ${
                    stockStatusFilter === 'IN_PAR' ? 'text-white' : 'text-emerald-800'
                  }`}
                >
                  In par ({inParItemsCount})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setStockStatusFilter('BELOW_PAR')}
                className={`rounded-xl px-3 py-2 border ${
                  stockStatusFilter === 'BELOW_PAR'
                    ? 'bg-amber-600 border-amber-600 text-white'
                    : 'bg-white border-stone-200 active:bg-stone-100'
                }`}
              >
                <Text
                  className={`text-base font-bold ${
                    stockStatusFilter === 'BELOW_PAR' ? 'text-white' : 'text-amber-800'
                  }`}
                >
                  Below par ({belowParItemsCount})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setStockStatusFilter('DEPLETED')}
                className={`rounded-xl px-3 py-2 border ${
                  stockStatusFilter === 'DEPLETED'
                    ? 'bg-rose-700 border-rose-700 text-white'
                    : 'bg-white border-stone-200 active:bg-stone-100'
                }`}
              >
                <Text
                  className={`text-base font-bold ${
                    stockStatusFilter === 'DEPLETED' ? 'text-white' : 'text-rose-800'
                  }`}
                >
                  Depleted ({depletedItemsCount})
                </Text>
              </Pressable>
            </View>

            {/* Category Dropdown */}
            <PosDropdown
              options={categoryDropdownOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              sheetTitle="Filter Inventory by Category"
              className="w-full sm:w-60"
            />
          </View>
        </View>

        {/* Showing count indicator */}
        <View className="flex-row justify-end items-center px-1">
          <Text className="text-xs font-semibold text-stone-500">
            Showing {filteredCount} of {inventory.length} ingredients
          </Text>
        </View>
      </View>
    </>
  );
};
