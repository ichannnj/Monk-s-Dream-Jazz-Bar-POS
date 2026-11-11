import React from 'react';
import { View, Text, ScrollView, SafeAreaView, Platform } from 'react-native';

export interface EventCalendarShellProps {
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
  bannerSlot?: React.ReactNode;
  controlsSlot?: React.ReactNode;
  isLoading?: boolean;
}

export const EventCalendarShell: React.FC<EventCalendarShellProps> = ({
  children,
  headerSlot,
  bannerSlot,
  controlsSlot,
  isLoading = false,
}) => {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: '#FAF8F5',
      }}
    >
      <ScrollView
        className="flex-1 min-w-0 bg-[#FAF8F5]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {headerSlot}

        <View className="w-full min-w-0 max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-16">
          {bannerSlot}

          {controlsSlot ? (
            <View className="border-b border-stone-200/80 pb-4">{controlsSlot}</View>
          ) : null}

          {/* Main Calendar Content or Loading Skeleton */}
          {isLoading ? (
            <View
              className="w-full rounded-2xl border border-stone-200 bg-white p-8 items-center justify-center min-h-[260px]"
              aria-live="polite"
            >
              <Text className="text-sm font-semibold text-stone-500">Loading events…</Text>
            </View>
          ) : (
            <View className="w-full min-w-0">{children}</View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
