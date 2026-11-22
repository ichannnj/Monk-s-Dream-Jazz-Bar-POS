import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Flame, Crown, DollarSign, ShoppingBag, Layers } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { PosDropdown, type PosDropdownOption } from '@/features/shared';
import type { BestSellerTrendItem } from '../../../domain/trends.types';

type SortMetric = 'revenue' | 'quantity';
type LimitOption = 'top5' | 'top10' | 'top20' | 'all';

interface BestSellersRankingTableProps {
  items: BestSellerTrendItem[];
  availableCategories: string[];
  totalGrossSales?: number;
}

export const BestSellersRankingTable: React.FC<BestSellersRankingTableProps> = ({
  items,
  availableCategories,
}) => {
  const [metric, setMetric] = useState<SortMetric>('revenue');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [limit, setLimit] = useState<LimitOption>('top10');

  // Filter & Sort Items
  const processedItems = useMemo(() => {
    let result = [...items];

    // Filter by Category
    if (selectedCategory !== 'All Categories') {
      result = result.filter((item) => item.category === selectedCategory);
    }

    // Sort by selected metric
    if (metric === 'revenue') {
      result.sort((a, b) => b.salesAmount - a.salesAmount);
    } else {
      result.sort((a, b) => b.soldCount - a.soldCount);
    }

    // Apply Limit
    let limitNum = result.length;
    if (limit === 'top5') limitNum = 5;
    else if (limit === 'top10') limitNum = 10;
    else if (limit === 'top20') limitNum = 20;

    return result.slice(0, limitNum);
  }, [items, selectedCategory, metric, limit]);

  const maxMetricValue = useMemo(() => {
    if (processedItems.length === 0) return 1;
    return metric === 'revenue'
      ? processedItems[0].salesAmount || 1
      : processedItems[0].soldCount || 1;
  }, [processedItems, metric]);

  const limitOptions: PosDropdownOption<LimitOption>[] = [
    { value: 'top5', label: 'Top 5 Items' },
    { value: 'top10', label: 'Top 10 Items' },
    { value: 'top20', label: 'Top 20 Items' },
    { value: 'all', label: 'All Ranked Items' },
  ];

  const categoryOptions: PosDropdownOption<string>[] = availableCategories.map((cat) => ({
    value: cat,
    label: cat,
    icon: Layers,
  }));

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <View className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 items-center justify-center">
          <Crown size={14} color="#810021" />
        </View>
      );
    }
    return (
      <View className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 items-center justify-center">
        <Text className="text-xs font-bold text-stone-700">{rank}</Text>
      </View>
    );
  };

  return (
    <View className="w-full min-w-0 rounded-xl border border-stone-200/90 bg-white p-3.5 sm:p-5 shadow-xs overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3.5 flex-wrap gap-2.5">
        <View className="flex-row items-center gap-2.5 flex-1 min-w-[180px]">
          <View className="w-8 h-8 shrink-0 rounded-lg bg-stone-100 border border-stone-200 items-center justify-center">
            <Flame size={16} color="#810021" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-base sm:text-lg font-bold text-stone-900 leading-snug">
              Best Sellers
            </Text>
            <Text className="text-xs text-stone-500 font-medium mt-0.5">
              Ranked items by revenue and units sold
            </Text>
          </View>
        </View>

        {/* Dual Metric Toggle Buttons */}
        <View className="flex-row items-center bg-[#EFECE6] p-1 rounded-xl border border-stone-200 shrink-0">
          <Pressable
            onPress={() => setMetric('revenue')}
            className={`min-h-[36px] px-3 rounded-lg flex-row items-center gap-1.5 ${
              metric === 'revenue'
                ? 'bg-white shadow-2xs border border-stone-200'
                : 'active:bg-stone-200/50'
            }`}
          >
            <DollarSign size={13} color={metric === 'revenue' ? '#810021' : '#78716c'} />
            <Text
              className={`text-xs font-bold ${
                metric === 'revenue' ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              By Revenue (₱)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMetric('quantity')}
            className={`min-h-[36px] px-3 rounded-lg flex-row items-center gap-1.5 ${
              metric === 'quantity'
                ? 'bg-white shadow-2xs border border-stone-200'
                : 'active:bg-stone-200/50'
            }`}
          >
            <ShoppingBag size={13} color={metric === 'quantity' ? '#810021' : '#78716c'} />
            <Text
              className={`text-xs font-bold ${
                metric === 'quantity' ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              By Units Sold
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Filter Row: Category & Limit Dropdowns */}
      <View className="flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 mb-3 gap-2.5 print-hidden">
        <PosDropdown
          options={categoryOptions}
          value={selectedCategory}
          onChange={setSelectedCategory}
          prefixLabel="Category:"
          sheetTitle="Filter Best Sellers by Category"
          className="flex-1 min-w-[180px]"
        />

        <PosDropdown
          options={limitOptions}
          value={limit}
          onChange={setLimit}
          prefixLabel="Display:"
          sheetTitle="Select Best Sellers Limit"
          className="w-full sm:w-44"
        />
      </View>

      {/* Items List */}
      {processedItems.length === 0 ? (
        <View className="py-10 items-center justify-center border border-dashed border-stone-200 rounded-xl">
          <Text className="text-sm text-stone-500 font-medium">
            No items recorded for "{selectedCategory}" in this timeframe.
          </Text>
        </View>
      ) : (
        <View className="space-y-2">
          {processedItems.map((item, idx) => {
            const rank = idx + 1;
            const currentVal = metric === 'revenue' ? item.salesAmount : item.soldCount;
            const progress =
              maxMetricValue > 0
                ? Math.min(100, Math.max(8, (currentVal / maxMetricValue) * 100))
                : 8;

            return (
              <View key={item.id} className="p-3 rounded-xl border border-stone-100 bg-[#EFECE6]">
                <View className="flex-row items-center justify-between gap-2.5 flex-wrap">
                  {/* Left: Rank, Item Name, Category, Price */}
                  <View className="flex-row items-center gap-2.5 flex-1 min-w-[180px]">
                    {getRankBadge(rank)}
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text className="text-sm font-bold text-stone-900" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View className="px-1.5 py-0.2 rounded bg-white border border-stone-200">
                          <Text className="text-[11px] font-semibold text-stone-600">
                            {item.category}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-stone-500 mt-0.5">
                        Price: {formatCurrency(item.unitPrice)}
                      </Text>
                    </View>
                  </View>

                  {/* Right: Quantity & Gross Sales */}
                  <View className="flex-row items-center gap-3 sm:gap-5 shrink-0">
                    <View className="items-end">
                      <Text className="text-xs sm:text-sm font-bold text-stone-800">
                        {item.soldCount} {item.soldCount === 1 ? 'unit' : 'units'}
                      </Text>
                      <Text className="text-[11px] text-stone-400">volume</Text>
                    </View>

                    <View className="items-end min-w-[80px]">
                      <Text className="text-sm sm:text-base font-black text-stone-900">
                        {formatCurrency(item.salesAmount)}
                      </Text>
                      <Text className="text-xs font-bold text-[#810021]">
                        {item.revenueSharePercent}% share
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Progress Bar */}
                <View className="mt-2 h-1.5 w-full rounded-full bg-stone-200/80 overflow-hidden">
                  <View
                    style={{ width: `${progress}%` }}
                    className="h-full rounded-full bg-[#810021]"
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Footer Info */}
      <View className="mt-3.5 pt-2.5 border-t border-stone-100 flex-row items-center justify-between flex-wrap gap-2">
        <Text className="text-xs text-stone-500">
          Showing {processedItems.length} ranked item{processedItems.length === 1 ? '' : 's'} ·
          Sorted by {metric === 'revenue' ? 'Gross Revenue' : 'Units Sold'}
        </Text>
        <Text className="text-xs font-medium text-stone-400">
          Calculated from fulfilled order items
        </Text>
      </View>
    </View>
  );
};
