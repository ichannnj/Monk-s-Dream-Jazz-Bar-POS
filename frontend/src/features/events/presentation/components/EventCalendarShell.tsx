import React from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';

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
        backgroundColor: '#EFECE6',
      }}
    >
      <ScrollView
        className="flex-1 min-w-0 bg-[#EFECE6]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {headerSlot}

        <View className="w-full min-w-0 max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-16">
          {bannerSlot}

          {controlsSlot ? (
            <View className="border-b border-stone-200/80 pb-4">{controlsSlot}</View>
          ) : null}

          {/* Main Calendar Content or Velvet Ledger Loading Skeleton */}
          {isLoading ? (
            <View
              className="w-full rounded-2xl border border-[#E2DED6] bg-[#F7F5F2] p-6 sm:p-8 min-h-[320px] justify-between shadow-xs"
              aria-live="polite"
              accessibilityRole="progressbar"
            >
              <View className="flex-row items-center justify-between pb-4 border-b border-[#E2DED6]/80">
                <View className="flex-row items-center gap-3">
                  <ActivityIndicator size="small" color="#810021" />
                  <Text className="text-base font-bold text-[#1A1617]">
                    Loading performance calendar…
                  </Text>
                </View>
                <Text className="text-base font-medium text-[#706864]">
                  Syncing stage logistics
                </Text>
              </View>

              {/* Skeleton Grid Placeholders matching month/week cells */}
              <View className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 my-4">
                {[1, 2, 3, 4, 5, 6, 7].map((cell) => (
                  <View
                    key={cell}
                    className="h-28 rounded-xl border border-[#E2DED6] bg-[#EFECE6]/70 p-3 justify-between opacity-80"
                  >
                    <View className="h-4 w-6 rounded bg-[#E2DED6]" />
                    <View className="space-y-1.5">
                      <View className="h-3 w-full rounded bg-[#E2DED6]" />
                      <View className="h-2.5 w-2/3 rounded bg-[#E2DED6]" />
                    </View>
                  </View>
                ))}
              </View>

              <View className="flex-row items-center justify-between pt-3 border-t border-[#E2DED6]/80">
                <View className="h-3.5 w-32 rounded bg-[#E2DED6]" />
                <View className="h-3.5 w-24 rounded bg-[#E2DED6]" />
              </View>
            </View>
          ) : (
            <View className="w-full min-w-0">{children}</View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
