import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Layers, BellRing, Utensils, ShoppingBag } from 'lucide-react-native';
import { FloorSectionHeader } from '@/features/shared';

export type FohQueueFilter = 'all' | 'ready' | 'dine_in' | 'off_premise';

interface FohCommandBarProps {
  currentFilter: FohQueueFilter;
  onFilterChange: (filter: FohQueueFilter) => void;
  counts: {
    all: number;
    ready: number;
    dineIn: number;
    offPremise: number;
  };
  isMobile?: boolean;
}

export const FohCommandBar: React.FC<FohCommandBarProps> = ({
  currentFilter,
  onFilterChange,
  counts,
}) => {
  const filterPills: {
    id: FohQueueFilter;
    label: string;
    count: number;
    Icon: React.ComponentType<{ size?: number; color?: string }>;
    isUrgent?: boolean;
  }[] = [
    { id: 'all', label: 'All Active', count: counts.all, Icon: Layers },
    {
      id: 'ready',
      label: 'Buzzout Ready',
      count: counts.ready,
      Icon: BellRing,
      isUrgent: true,
    },
    { id: 'dine_in', label: 'Dine-In', count: counts.dineIn, Icon: Utensils },
    { id: 'off_premise', label: 'Takeout / Online', count: counts.offPremise, Icon: ShoppingBag },
  ];

  return (
    <View className="w-full mb-3.5">
      <FloorSectionHeader
        title="FOH Expediter Pass"
        badge={
          counts.ready > 0
            ? {
                label: `${counts.ready} ${counts.ready === 1 ? 'Order Ready' : 'Orders Ready'}`,
                tone: 'ready',
              }
            : { label: 'Pass Synced', tone: 'neutral' }
        }
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row items-center gap-2">
          {filterPills.map((pill) => {
            const isActive = currentFilter === pill.id;
            const { Icon } = pill;
            const hasUrgent = Boolean(pill.isUrgent && pill.count > 0 && !isActive);

            return (
              <Pressable
                key={pill.id}
                onPress={() => onFilterChange(pill.id)}
                className={`min-h-[48px] flex-row items-center gap-2 rounded-xl border px-3.5 py-2 active:opacity-80 ${
                  isActive
                    ? 'bg-[#810021] border-[#810021]'
                    : hasUrgent
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white border-[#E2DED6]'
                }`}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Icon size={18} color={isActive ? '#F7F5F2' : hasUrgent ? '#065F46' : '#57534E'} />
                <Text
                  className={`text-base font-semibold ${
                    isActive ? 'text-white' : hasUrgent ? 'text-emerald-900' : 'text-[#1A1617]'
                  }`}
                >
                  {pill.label}
                </Text>
                <View
                  className={`rounded-full px-2 py-0.5 ${
                    isActive
                      ? 'bg-white/20'
                      : hasUrgent
                        ? 'bg-emerald-200/80'
                        : 'bg-[#EFECE6] border border-[#E2DED6]'
                  }`}
                >
                  <Text
                    className={`text-base font-bold tabular-nums ${
                      isActive ? 'text-white' : hasUrgent ? 'text-emerald-900' : 'text-[#57534E]'
                    }`}
                  >
                    {pill.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};
