import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Flame, Crown, DollarSign, ShoppingBag, Layers, Filter } from 'lucide-react-native';
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
  totalGrossSales = 0,
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
        <View className="w-7 h-7 rounded-full bg-amber-100 border border-amber-300 items-center justify-center">
          <Crown size={15} color="#b45309" />
        </View>
      );
    }
    if (rank === 2) {
      return (
        <View className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 items-center justify-center">
          <Text className="text-xs font-black text-slate-700">2</Text>
        </View>
      );
    }
    if (rank === 3) {
      return (
        <View className="w-7 h-7 rounded-full bg-amber-700/20 border border-amber-700/30 items-center justify-center">
          <Text className="text-xs font-black text-amber-900">3</Text>
        </View>
      );
    }
    return (
      <View className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 items-center justify-center">
        <Text className="text-xs font-bold text-stone-600">{rank}</Text>
      </View>
    );
  };

  return (
    <View className="w-full min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4 flex-wrap gap-3">
        <View className="flex-row items-center gap-3 flex-1 min-w-[200px]">
          <View className="w-10 h-10 shrink-0 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center">
            <Flame size={20} color="#e11d48" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-lg font-extrabold text-stone-900 leading-snug">
              Best Sellers &amp; Menu Product Demand
            </Text>
            <Text className="text-base text-stone-500 font-medium mt-0.5">
              Ranked items by gross earnings and units sold with category segmentation
            </Text>
          </View>
        </View>

        {/* Dual Metric Toggle Buttons */}
        <View className="flex-row items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80 shrink-0">
          <Pressable
            onPress={() => setMetric('revenue')}
            className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 ${
              metric === 'revenue'
                ? 'bg-white shadow-xs border border-stone-200/60'
                : 'active:bg-stone-200'
            }`}
          >
            <DollarSign size={15} color={metric === 'revenue' ? '#800020' : '#78716c'} />
            <Text
              className={`text-xs sm:text-base font-bold ${
                metric === 'revenue' ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              By Revenue (₱)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMetric('quantity')}
            className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 ${
              metric === 'quantity'
                ? 'bg-white shadow-xs border border-stone-200/60'
                : 'active:bg-stone-200'
            }`}
          >
            <ShoppingBag size={15} color={metric === 'quantity' ? '#800020' : '#78716c'} />
            <Text
              className={`text-xs sm:text-base font-bold ${
                metric === 'quantity' ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              By Units Sold
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Filter Row: Category & Limit Dropdowns */}
      <View className="flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-4 mb-4 gap-3 print-hidden">
        <PosDropdown
          options={categoryOptions}
          value={selectedCategory}
          onChange={setSelectedCategory}
          prefixLabel="Category:"
          sheetTitle="Filter Best Sellers by Category"
          className="flex-1 min-w-[200px]"
        />

        <PosDropdown
          options={limitOptions}
          value={limit}
          onChange={setLimit}
          prefixLabel="Display:"
          sheetTitle="Select Best Sellers Limit"
          className="w-full sm:w-48"
        />
      </View>

      {/* Items List / Table */}
      {processedItems.length === 0 ? (
        <View className="py-12 items-center justify-center border border-dashed border-stone-200 rounded-xl">
          <Text className="text-base text-stone-500 font-medium">
            No items recorded for "{selectedCategory}" in this timeframe.
          </Text>
        </View>
      ) : (
        <View className="space-y-3">
          {processedItems.map((item, idx) => {
            const rank = idx + 1;
            const currentVal = metric === 'revenue' ? item.salesAmount : item.soldCount;
            const progress =
              maxMetricValue > 0
                ? Math.min(100, Math.max(8, (currentVal / maxMetricValue) * 100))
                : 8;

            return (
              <View
                key={item.id}
                className="p-3.5 rounded-xl border border-stone-100 bg-[#fbfaf8] hover:border-stone-200 transition-colors"
              >
                <View className="flex-row items-center justify-between gap-3 flex-wrap">
                  {/* Left: Rank, Item Name, Category, Price */}
                  <View className="flex-row items-center gap-3 flex-1 min-w-[200px]">
                    {getRankBadge(rank)}
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text className="text-base font-bold text-stone-900" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View className="px-2 py-0.5 rounded-md bg-stone-200/80 border border-stone-300">
                          <Text className="text-xs font-semibold text-stone-700">
                            {item.category}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-stone-400 mt-0.5">
                        Base Price: {formatCurrency(item.unitPrice)}
                      </Text>
                    </View>
                  </View>

                  {/* Right: Quantity & Gross Sales */}
                  <View className="flex-row items-center gap-4 sm:gap-6 shrink-0">
                    <View className="items-end">
                      <Text className="text-base font-bold text-stone-800">
                        {item.soldCount} {item.soldCount === 1 ? 'unit' : 'units'}
                      </Text>
                      <Text className="text-xs text-stone-400">volume sold</Text>
                    </View>

                    <View className="items-end min-w-[90px]">
                      <Text className="text-base sm:text-lg font-black text-stone-900">
                        {formatCurrency(item.salesAmount)}
                      </Text>
                      <Text className="text-xs font-bold text-[#800020]">
                        {item.revenueSharePercent}% of sales
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Burgundy Progress Bar */}
                <View className="mt-2.5 h-2 w-full rounded-full bg-stone-200/80 overflow-hidden">
                  <View
                    style={{ width: `${progress}%` }}
                    className="h-full rounded-full bg-[#800020]"
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Footer Info */}
      <View className="mt-4 pt-3 border-t border-stone-100 flex-row items-center justify-between flex-wrap gap-2">
        <Text className="text-xs text-stone-500">
          Showing {processedItems.length} ranked item{processedItems.length === 1 ? '' : 's'} ·
          Sorted by {metric === 'revenue' ? 'Gross Revenue' : 'Units Sold'}
        </Text>
        <Text className="text-xs font-medium text-stone-400">
          Calculated from fulfilled customer order items
        </Text>
      </View>
    </View>
  );
};
