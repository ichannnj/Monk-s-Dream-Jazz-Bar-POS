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
  activeTimeframeOption,
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
          <View className="flex-1 min-w-[180px]">
            <Text className="text-xl font-bold tracking-tight text-stone-900">Best Sellers</Text>
            <Text className="text-base font-medium text-stone-500 mt-1">
              {activeTimeframeOption.label} · {selectedCategory} · Top {visibleBestSellers.length}{' '}
              items
            </Text>
          </View>
          <View className="rounded-full bg-stone-100 border border-stone-200 px-3.5 py-1.5 shrink-0">
            <Text className="text-base font-bold text-stone-700">By Quantity</Text>
          </View>
        </View>

        <View className="flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-4 mb-4 gap-2.5">
          <PosDropdown
            options={
              [
                { value: 'top3', label: 'Top 3 Items' },
                { value: 'top5', label: 'Top 5 Items' },
                { value: 'top10', label: 'Top 10 Items' },
                { value: 'all', label: 'All Ranked Items' },
              ] as PosDropdownOption<BestSellerFilter>[]
            }
            value={bestSellerFilter}
            onChange={setBestSellerFilter}
            prefixLabel="Show:"
            sheetTitle="Select Best Seller Limit"
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

        <View className="space-y-4">
          {visibleBestSellers.length === 0 ? (
            <View className="py-10 items-center justify-center">
              <Text className="text-base text-stone-500 font-medium text-center">
                No items sold for "{selectedCategory}" in {activeTimeframeOption.label}.
              </Text>
            </View>
          ) : (
            visibleBestSellers.map((item) => (
              <View key={item.id} className="pt-1">
                <View className="flex-row items-start justify-between gap-3 flex-wrap">
                  <View className="flex-row items-start flex-1 min-w-[160px]">
                    <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 mr-2.5 mt-0.5">
                      <Text className="text-base font-bold text-stone-700">{item.rank}</Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-base font-bold text-stone-900">{item.name}</Text>
                      <View className="mt-1 self-start rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5">
                        <Text className="text-base font-medium text-stone-600">
                          {item.category}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row items-baseline gap-4 shrink-0">
                    <View className="items-end">
                      <Text className="text-base font-bold text-stone-900">{item.soldCount}</Text>
                      <Text className="text-base text-stone-400">sold</Text>
                    </View>
                    <View className="items-end min-w-[70px]">
                      <Text className="text-base font-black text-stone-900">
                        ₱{Number(item.salesAmount || 0).toFixed(2)}
                      </Text>
                      <Text className="text-base text-stone-400">sales</Text>
                    </View>
                  </View>
                </View>

                <View className="mt-2 h-2 w-full rounded-full bg-stone-100">
                  <View
                    style={{ width: `${Math.min(100, Math.max(5, item.progressPercent))}%` }}
                    className="h-2 rounded-full bg-[#800020]"
                  />
                </View>
              </View>
            ))
          )}
        </View>

        <View className="mt-6 flex-row items-center justify-between border-t border-stone-100 pt-4 flex-wrap gap-2">
          <Text className="text-base text-stone-500">
            Displaying {visibleBestSellers.length} ranked item
            {visibleBestSellers.length === 1 ? '' : 's'}
          </Text>
          <Text className="text-base font-medium text-stone-600">
            Direct database order item aggregations
          </Text>
        </View>
      </View>

      {/* Right Column: Live Stations + Sales By Category */}
      <View className="w-full lg:flex-1 min-w-0 space-y-6">
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
          <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
            <Text className="text-xl font-bold text-stone-900">Live Stations</Text>
            <Pressable
              onPress={() => onNavigateRoute('stations')}
              className="min-h-[48px] px-3 flex-row items-center rounded-xl bg-stone-50 active:bg-stone-100"
            >
              <Text className="text-base font-bold text-[#800020]">View Stations</Text>
              <ArrowRight size={16} color="#800020" className="ml-1.5" />
            </Pressable>
          </View>

          <View className="space-y-3.5">
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
                  className="rounded-xl border border-stone-200/70 bg-stone-50/60 p-4"
                >
                  <View className="flex-row items-center justify-between mb-3 flex-wrap gap-2">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-lg font-bold text-stone-900">{station.name}</Text>
                      {station.isOnline ? (
                        <View className="flex-row items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                          <View className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />
                          <Text className="text-base font-bold text-emerald-700">Online</Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center rounded-full bg-stone-100 border border-stone-300 px-2.5 py-0.5">
                          <View className="h-2 w-2 rounded-full bg-stone-400 mr-1.5" />
                          <Text className="text-base font-bold text-stone-600">Offline</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-base text-stone-500">
                      Target {station.targetTicketTime}
                    </Text>
                  </View>

                  <View className="flex-row flex-wrap gap-2 pt-1">
                    <View className="flex-1 min-w-[85px] bg-white rounded-lg p-2.5 border border-stone-200/70 items-center">
                      <Text className="text-xl font-black text-stone-900">
                        {station.activeTickets}
                      </Text>
                      <Text className="text-base text-stone-500 mt-0.5">Active</Text>
                      {station.activeTickets > 0 && (
                        <Text
                          className={`text-[10px] font-semibold mt-0.5 ${
                            station.isOnline ? 'text-amber-600' : 'text-stone-400'
                          }`}
                        >
                          {station.isOnline
                            ? `Live: ${liveStats.liveActiveTime}`
                            : 'Queued (Offline)'}
                        </Text>
                      )}
                    </View>

                    <View className="flex-1 min-w-[85px] bg-white rounded-lg p-2.5 border border-stone-200/70 items-center">
                      <Text className="text-xl font-black text-stone-900">
                        {station.avgTicketTime || 'Idle'}
                      </Text>
                      <Text className="text-base text-stone-500 mt-0.5">Avg time</Text>
                      <Text className="text-[10px] text-stone-400 mt-0.5">
                        {station.completedTickets && station.completedTickets > 0
                          ? `${station.completedTickets} fulfilled`
                          : 'No orders yet'}
                      </Text>
                    </View>

                    <View className="flex-1 min-w-[85px] bg-white rounded-lg p-2.5 border border-stone-200/70 items-center">
                      <Text
                        className={`text-xl font-black ${liveStats.lateTickets > 0 ? 'text-rose-600' : 'text-stone-900'}`}
                      >
                        {liveStats.lateTickets}
                      </Text>
                      <Text className="text-base text-stone-500 mt-0.5">Late</Text>
                    </View>

                    <View className="flex-1 min-w-[85px] bg-white rounded-lg p-2.5 border border-stone-200/70 items-center">
                      <Text className="text-xl font-black text-amber-600">
                        {station.stockoutCount}
                      </Text>
                      <Text className="text-base text-stone-500 mt-0.5">Sold out</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Sales By Category Card */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
          <Text className="text-xl font-bold text-stone-900">Sales By Category</Text>
          <Text className="text-base text-stone-500 mb-4">
            {activeTimeframeOption.label} · Scaled to top category
          </Text>

          <View className="space-y-4">
            {(telemetry.categorySales || []).length === 0 ? (
              <View className="py-6 items-center">
                <Text className="text-base text-stone-500 font-medium">
                  No category sales recorded for this period.
                </Text>
              </View>
            ) : (
              (telemetry.categorySales || []).map((cat) => (
                <View key={cat.category} className="min-w-0">
                  <View className="flex-row items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <Text className="flex-1 min-w-[120px] text-base font-semibold text-stone-800">
                      {cat.category}
                    </Text>
                    <Text className="shrink-0 text-right text-base font-bold text-stone-900">
                      ₱{Number(cat.amount || 0).toFixed(2)}
                    </Text>
                  </View>

                  <View className="w-full h-2.5 rounded-full bg-stone-100 overflow-hidden">
                    <View
                      style={{ width: `${Math.min(100, Math.max(8, cat.percentage))}%` }}
                      className="h-2.5 rounded-full bg-[#800020]"
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
