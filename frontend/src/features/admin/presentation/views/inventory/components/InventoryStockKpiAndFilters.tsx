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
      {/* Executive KPI Summary Cards (Strict 3-Color Hierarchy: Sand, Charcoal, Burgundy #800020) */}
      <View className="flex-row flex-wrap gap-3 sm:gap-4">
        {/* Card 1: Total Valuation */}
        <View className="flex-1 min-w-[180px] rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs justify-between">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Total Valuation
            </Text>
            <Boxes size={15} color="#800020" />
          </View>
          <Text className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {formatCurrency(totalValuation)}
          </Text>
          <Text className="text-xs text-stone-500 mt-1">{inventory.length} SKUs total</Text>
        </View>

        {/* Card 2: Healthy In-Par */}
        <Pressable
          onPress={() => setStockStatusFilter(stockStatusFilter === 'IN_PAR' ? 'ALL' : 'IN_PAR')}
          className={`flex-1 min-w-[180px] rounded-2xl border p-4 sm:p-5 shadow-xs transition-all justify-between ${
            stockStatusFilter === 'IN_PAR'
              ? 'border-[#800020] bg-[#FAF8F5]'
              : 'border-stone-200/80 bg-white active:bg-stone-50'
          }`}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              In-Par Stock
            </Text>
            <CheckCircle2 size={15} color="#78716c" />
          </View>
          <Text className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {inParItemsCount}
          </Text>
          <Text className="text-xs text-stone-500 mt-1">
            {inventory.length > 0
              ? `${Math.round((inParItemsCount / inventory.length) * 100)}% healthy`
              : '0%'}
          </Text>
        </Pressable>

        {/* Card 3: Below Par Alerts */}
        <Pressable
          onPress={() =>
            setStockStatusFilter(stockStatusFilter === 'BELOW_PAR' ? 'ALL' : 'BELOW_PAR')
          }
          className={`flex-1 min-w-[180px] rounded-2xl border p-4 sm:p-5 shadow-xs transition-all justify-between ${
            stockStatusFilter === 'BELOW_PAR'
              ? 'border-[#800020] bg-[#FAF8F5]'
              : 'border-stone-200/80 bg-white active:bg-stone-50'
          }`}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-bold text-[#800020] uppercase tracking-wider">
              Below Par
            </Text>
            <AlertCircle size={15} color="#800020" />
          </View>
          <Text className="text-xl sm:text-2xl font-black text-[#800020] tracking-tight">
            {belowParItemsCount}
          </Text>
          <Text className="text-xs text-[#800020] mt-1">Reorder recommended</Text>
        </Pressable>

        {/* Card 4: Depleted / Out of Stock */}
        <Pressable
          onPress={() =>
            setStockStatusFilter(stockStatusFilter === 'DEPLETED' ? 'ALL' : 'DEPLETED')
          }
          className={`flex-1 min-w-[180px] rounded-2xl border p-4 sm:p-5 shadow-xs transition-all justify-between ${
            stockStatusFilter === 'DEPLETED'
              ? 'border-[#800020] bg-[#FAF8F5]'
              : 'border-stone-200/80 bg-white active:bg-stone-50'
          }`}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-bold text-[#800020] uppercase tracking-wider">
              Depleted
            </Text>
            <AlertTriangle size={15} color="#800020" />
          </View>
          <Text className="text-xl sm:text-2xl font-black text-[#800020] tracking-tight">
            {depletedItemsCount}
          </Text>
          <Text className="text-xs text-stone-500 mt-1">0 units remaining</Text>
        </Pressable>
      </View>

      {/* Search Bar, Filter Pills & Category Dropdown */}
      <View className="flex-col gap-2.5">
        <View className="flex-col md:flex-row md:items-center justify-between gap-2.5">
          <View className="flex-1">
            <AdminInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search ingredients, SKUs, suppliers..."
              leftElement={<Search size={16} color="#78716c" />}
            />
          </View>

          <View className="flex-row items-center justify-between md:justify-end gap-2 flex-wrap sm:flex-nowrap">
            {/* Quick Filter Status Pills */}
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Pressable
                onPress={() => setStockStatusFilter('ALL')}
                className={`rounded-xl px-3 py-1.5 border ${
                  stockStatusFilter === 'ALL'
                    ? 'bg-stone-900 border-stone-900'
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
                className={`rounded-xl px-3 py-1.5 border ${
                  stockStatusFilter === 'IN_PAR'
                    ? 'bg-stone-800 border-stone-800'
                    : 'bg-white border-stone-200 active:bg-stone-100'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    stockStatusFilter === 'IN_PAR' ? 'text-white' : 'text-stone-700'
                  }`}
                >
                  In par ({inParItemsCount})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setStockStatusFilter('BELOW_PAR')}
                className={`rounded-xl px-3 py-1.5 border ${
                  stockStatusFilter === 'BELOW_PAR'
                    ? 'bg-[#800020] border-[#800020]'
                    : 'bg-white border-stone-200 active:bg-stone-100'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    stockStatusFilter === 'BELOW_PAR' ? 'text-white' : 'text-[#800020]'
                  }`}
                >
                  Below par ({belowParItemsCount})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setStockStatusFilter('DEPLETED')}
                className={`rounded-xl px-3 py-1.5 border ${
                  stockStatusFilter === 'DEPLETED'
                    ? 'bg-[#800020] border-[#800020]'
                    : 'bg-white border-stone-200 active:bg-stone-100'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    stockStatusFilter === 'DEPLETED' ? 'text-white' : 'text-[#800020]'
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
              sheetTitle="Filter by Category"
              className="w-full sm:w-56"
            />
          </View>
        </View>

        {/* Showing count indicator */}
        <View className="flex-row justify-end items-center px-1">
          <Text className="text-xs font-medium text-stone-500">
            Showing {filteredCount} of {inventory.length} SKUs
          </Text>
        </View>
      </View>
    </>
  );
};
