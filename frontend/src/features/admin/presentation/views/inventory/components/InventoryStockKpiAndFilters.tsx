import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Search } from 'lucide-react-native';
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

  const statusPills: Array<{ key: StockStatusFilter; label: string; count: number }> = [
    { key: 'ALL', label: 'All', count: inventory.length },
    { key: 'IN_PAR', label: 'In Par', count: inParItemsCount },
    { key: 'BELOW_PAR', label: 'Low', count: belowParItemsCount },
    { key: 'DEPLETED', label: 'Out', count: depletedItemsCount },
  ];

  return (
    <View className="gap-4">
      {/* Quiet Ledger Summary Strip (2x2 mobile, 4-col desktop, single 1px border) */}
      <View className="rounded-2xl border border-[#E2DED6] bg-white overflow-hidden">
        <View className="flex-row flex-wrap">
          <View className="w-1/2 lg:w-1/4 p-4 border-b lg:border-b-0 border-r border-[#E2DED6]">
            <Text className="text-base font-semibold text-[#78716C]">Stock Value</Text>
            <Text className="text-xl font-extrabold text-[#1A1617] tabular-nums mt-1">
              {formatCurrency(totalValuation)}
            </Text>
          </View>

          <Pressable
            onPress={() => setStockStatusFilter(stockStatusFilter === 'IN_PAR' ? 'ALL' : 'IN_PAR')}
            className={`w-1/2 lg:w-1/4 p-4 border-b lg:border-b-0 lg:border-r border-[#E2DED6] ${
              stockStatusFilter === 'IN_PAR' ? 'bg-[#EFECE6]' : 'bg-white'
            }`}
          >
            <Text className="text-base font-semibold text-[#78716C]">In Par</Text>
            <Text className="text-xl font-extrabold text-[#1A1617] tabular-nums mt-1">
              {inParItemsCount}
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setStockStatusFilter(stockStatusFilter === 'BELOW_PAR' ? 'ALL' : 'BELOW_PAR')
            }
            className={`w-1/2 lg:w-1/4 p-4 border-r border-[#E2DED6] ${
              stockStatusFilter === 'BELOW_PAR' ? 'bg-[#EFECE6]' : 'bg-white'
            }`}
          >
            <Text className="text-base font-semibold text-[#78716C]">Below Par</Text>
            <Text className="text-xl font-extrabold text-[#810021] tabular-nums mt-1">
              {belowParItemsCount}
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setStockStatusFilter(stockStatusFilter === 'DEPLETED' ? 'ALL' : 'DEPLETED')
            }
            className={`w-1/2 lg:w-1/4 p-4 ${
              stockStatusFilter === 'DEPLETED' ? 'bg-[#EFECE6]' : 'bg-white'
            }`}
          >
            <Text className="text-base font-semibold text-[#78716C]">Depleted</Text>
            <Text className="text-xl font-extrabold text-[#b32638] tabular-nums mt-1">
              {depletedItemsCount}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Search + Category + Status Filter Bar */}
      <View className="gap-2.5">
        <View className="flex-col md:flex-row md:items-center gap-2.5">
          <View className="flex-1">
            <AdminInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search ingredients, SKUs, suppliers..."
              leftElement={<Search size={18} color="#78716C" />}
              clearable
            />
          </View>

          <View className="w-full md:w-60">
            <PosDropdown
              mode="select"
              options={categoryDropdownOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between flex-wrap gap-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row items-center gap-2">
              {statusPills.map((pill) => {
                const isActive = stockStatusFilter === pill.key;
                return (
                  <Pressable
                    key={pill.key}
                    onPress={() => setStockStatusFilter(pill.key)}
                    className={`min-h-[48px] px-4 rounded-xl border flex-row items-center justify-center ${
                      isActive
                        ? 'bg-[#810021] border-[#810021]'
                        : 'bg-white border-[#E2DED6] active:bg-[#EFECE6]'
                    }`}
                  >
                    <Text
                      className={`text-base font-bold tabular-nums ${
                        isActive ? 'text-white' : 'text-[#1A1617]'
                      }`}
                    >
                      {pill.label} ({pill.count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Text className="text-base text-[#78716C] tabular-nums">
            Showing {filteredCount} of {inventory.length}
          </Text>
        </View>
      </View>
    </View>
  );
};
