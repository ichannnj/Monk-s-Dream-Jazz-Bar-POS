import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowRight, Layers } from 'lucide-react-native';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { getLiveStationTurnaround } from '@/features/shared/utils/elapsedTime';
import type { DashboardTelemetry, AdminRoute } from '../../../domain/admin.types';
import { BestSellerFilter, TimeframeOption } from './useAdminDashboardController';

interface DashboardBestSellersAndStationsSectionProps {
  telemetry: DashboardTelemetry;
  activeTimeframeOption: TimeframeOption;
  bestSellerFilter: BestSellerFilter;
  setBestSellerFilter: (filter: BestSellerFilter) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  availableCategories: string[];
  visibleBestSellers: any[];
  nowMs: number;
  onNavigateRoute: (route: AdminRoute) => void;
}

export const DashboardBestSellersAndStationsSection: React.FC<
  DashboardBestSellersAndStationsSectionProps
> = ({
  telemetry,
  bestSellerFilter,
  setBestSellerFilter,
  selectedCategory,
  setSelectedCategory,
  availableCategories,
  visibleBestSellers,
  nowMs,
  onNavigateRoute,
}) => {
  return (
    <View className="flex-col lg:flex-row gap-6">
      {/* Left: Best Sellers Card */}
      <View className="w-full lg:flex-[1.35] min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
        <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
          <Text className="text-lg font-bold tracking-tight text-stone-900">Best Sellers</Text>
          <View className="rounded-full bg-[#FAF8F5] border border-stone-200 px-3 py-1 shrink-0">
            <Text className="text-xs font-bold text-stone-700">By Quantity</Text>
          </View>
        </View>

        <View className="flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 mb-3 gap-2.5">
          <PosDropdown
            options={
              [
                { value: 'top3', label: 'Top 3' },
                { value: 'top5', label: 'Top 5' },
                { value: 'top10', label: 'Top 10' },
                { value: 'all', label: 'All Ranked' },
              ] as PosDropdownOption<BestSellerFilter>[]
            }
            value={bestSellerFilter}
            onChange={setBestSellerFilter}
            prefixLabel="Show:"
            sheetTitle="Select Limit"
            className="flex-1"
          />

          <PosDropdown
            options={availableCategories.map((cat) => ({
              value: cat,
              label: cat,
              icon: Layers,
            }))}
            value={selectedCategory}
            onChange={setSelectedCategory}
            sheetTitle="Filter by Category"
            className="flex-1"
          />
        </View>

        <View className="space-y-3">
          {visibleBestSellers.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <Text className="text-xs text-stone-500 font-medium text-center">
                No items sold for "{selectedCategory}".
              </Text>
            </View>
          ) : (
            visibleBestSellers.map((item) => (
              <View key={item.id} className="pt-1">
                <View className="flex-row items-center justify-between gap-3 flex-wrap">
                  <View className="flex-row items-center flex-1 min-w-[140px]">
                    <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] border border-stone-200 mr-2">
                      <Text className="text-xs font-bold text-stone-700">{item.rank}</Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-bold text-stone-900" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text className="text-[11px] text-stone-500">{item.category}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-baseline gap-3 shrink-0">
                    <View className="items-end">
                      <Text className="text-xs font-bold text-stone-900">{item.soldCount}</Text>
                      <Text className="text-[10px] text-stone-400">sold</Text>
                    </View>
                    <View className="items-end min-w-[60px]">
                      <Text className="text-xs font-black text-stone-900">
                        ₱{Number(item.salesAmount || 0).toFixed(2)}
                      </Text>
                      <Text className="text-[10px] text-stone-400">sales</Text>
                    </View>
                  </View>
                </View>

                <View className="mt-1.5 h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                  <View
                    style={{ width: `${Math.min(100, Math.max(5, item.progressPercent))}%` }}
                    className="h-full rounded-full bg-[#800020]"
                  />
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Right Column: Live Stations + Sales By Category */}
      <View className="w-full lg:flex-1 min-w-0 space-y-6">
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
          <View className="flex-row items-center justify-between mb-3 flex-wrap gap-2">
            <Text className="text-lg font-bold text-stone-900">Live Stations</Text>
            <Pressable
              onPress={() => onNavigateRoute('stations')}
              className="px-2.5 py-1 flex-row items-center rounded-lg bg-stone-50 active:bg-stone-100"
            >
              <Text className="text-xs font-bold text-[#800020]">View Stations</Text>
              <ArrowRight size={13} color="#800020" className="ml-1" />
            </Pressable>
          </View>

          <View className="space-y-3">
            {(telemetry.stations || []).map((station) => {
              const liveStats = getLiveStationTurnaround(
                station.stationKey,
                station.activeTicketTimestamps,
                station.avgTicketTime,
                station.lateTickets,
                nowMs,
                station.isOnline
              );
              return (
                <View
                  key={station.stationKey}
                  className="rounded-xl border border-stone-200/80 bg-[#FAF8F5] p-3"
                >
                  <View className="flex-row items-center justify-between mb-2 flex-wrap gap-2">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-bold text-stone-900">{station.name}</Text>
                      <View className="flex-row items-center rounded-full bg-white border border-stone-200 px-2 py-0.5">
                        <View
                          className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                            station.isOnline ? 'bg-[#800020]' : 'bg-stone-400'
                          }`}
                        />
                        <Text className="text-[10px] font-bold text-stone-700">
                          {station.isOnline ? 'Online' : 'Offline'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-stone-500">
                      Target {station.targetTicketTime}
                    </Text>
                  </View>

                  <View className="flex-row flex-wrap gap-2 pt-1">
                    <View className="flex-1 min-w-[70px] bg-white rounded-lg p-2 border border-stone-200/80 items-center">
                      <Text className="text-base font-black text-stone-900">
                        {station.activeTickets}
                      </Text>
                      <Text className="text-[10px] text-stone-500">Active</Text>
                    </View>

                    <View className="flex-1 min-w-[70px] bg-white rounded-lg p-2 border border-stone-200/80 items-center">
                      <Text className="text-base font-black text-stone-900">
                        {station.avgTicketTime || 'Idle'}
                      </Text>
                      <Text className="text-[10px] text-stone-500">Avg time</Text>
                    </View>

                    <View className="flex-1 min-w-[70px] bg-white rounded-lg p-2 border border-stone-200/80 items-center">
                      <Text
                        className={`text-base font-black ${liveStats.lateTickets > 0 ? 'text-[#800020]' : 'text-stone-900'}`}
                      >
                        {liveStats.lateTickets}
                      </Text>
                      <Text className="text-[10px] text-stone-500">Late</Text>
                    </View>

                    <View className="flex-1 min-w-[70px] bg-white rounded-lg p-2 border border-stone-200/80 items-center">
                      <Text className="text-base font-black text-stone-900">
                        {station.stockoutCount}
                      </Text>
                      <Text className="text-[10px] text-stone-500">Sold out</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Sales By Category Card */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
          <Text className="text-lg font-bold text-stone-900 mb-3">Sales By Category</Text>

          <View className="space-y-3">
            {(telemetry.categorySales || []).length === 0 ? (
              <View className="py-4 items-center">
                <Text className="text-xs text-stone-500 font-medium">
                  No category sales recorded.
                </Text>
              </View>
            ) : (
              (telemetry.categorySales || []).map((cat) => (
                <View key={cat.category} className="min-w-0">
                  <View className="flex-row items-center justify-between gap-2 mb-1 flex-wrap">
                    <Text className="flex-1 min-w-[100px] text-xs font-semibold text-stone-800">
                      {cat.category}
                    </Text>
                    <Text className="shrink-0 text-right text-xs font-bold text-stone-900">
                      ₱{Number(cat.amount || 0).toFixed(2)}
                    </Text>
                  </View>

                  <View className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                    <View
                      style={{ width: `${Math.min(100, Math.max(8, cat.percentage))}%` }}
                      className="h-full rounded-full bg-[#800020]"
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </View>
  );
};
