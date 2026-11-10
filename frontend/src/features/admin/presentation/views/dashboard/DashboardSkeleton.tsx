import React from 'react';
import { View } from 'react-native';

export const DashboardSkeleton: React.FC = () => {
  return (
    <View className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Placeholder */}
      <View className="flex-row items-center justify-between pb-1">
        <View className="h-8 w-44 rounded-xl bg-stone-200/80 animate-pulse" />
        <View className="h-11 w-36 rounded-xl bg-stone-200/80 animate-pulse" />
      </View>

      {/* KPI Cards Placeholder (4 cards) */}
      <View className="flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            className="w-full sm:w-[48%] xl:flex-1 min-w-0 rounded-2xl border border-stone-200/70 bg-white p-5 sm:p-6 min-h-[170px] justify-between shadow-xs"
          >
            <View className="space-y-3">
              <View className="h-4 w-28 rounded-md bg-stone-200/80 animate-pulse" />
              <View className="h-8 w-36 rounded-lg bg-stone-200/80 animate-pulse" />
            </View>
            <View className="h-4 w-full rounded-md bg-stone-100 animate-pulse" />
          </View>
        ))}
      </View>

      {/* Revenue Split Placeholder */}
      <View className="w-full min-w-0 rounded-2xl border border-stone-200/70 bg-white p-6 shadow-xs space-y-4">
        <View className="h-6 w-36 rounded-md bg-stone-200/80 animate-pulse" />
        <View className="h-3 w-full rounded-full bg-stone-100 animate-pulse" />
        <View className="flex-col sm:flex-row gap-4 pt-2">
          <View className="flex-1 h-24 rounded-xl bg-stone-100/70 animate-pulse" />
          <View className="flex-1 h-24 rounded-xl bg-stone-100/70 animate-pulse" />
        </View>
      </View>

      {/* Section Placeholder */}
      <View className="w-full min-w-0 rounded-2xl border border-stone-200/70 bg-white p-6 shadow-xs space-y-4">
        <View className="h-6 w-48 rounded-md bg-stone-200/80 animate-pulse" />
        <View className="h-40 w-full rounded-xl bg-stone-100/70 animate-pulse" />
      </View>
    </View>
  );
};
