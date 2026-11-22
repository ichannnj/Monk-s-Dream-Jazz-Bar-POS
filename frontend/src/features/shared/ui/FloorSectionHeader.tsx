import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

export interface FloorSectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    tone?: 'neutral' | 'wine' | 'ready';
  };
  onBack?: () => void;
  backLabel?: string;
  rightSlot?: React.ReactNode;
}

export const FloorSectionHeader: React.FC<FloorSectionHeaderProps> = ({
  title,
  subtitle,
  badge,
  onBack,
  backLabel = 'Back',
  rightSlot,
}) => {
  const badgeClasses =
    badge?.tone === 'wine'
      ? 'bg-[#810021]/10 border-[#810021]/20'
      : badge?.tone === 'ready'
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-[#EFECE6] border-[#E2DED6]';

  const badgeTextClasses =
    badge?.tone === 'wine'
      ? 'text-[#810021]'
      : badge?.tone === 'ready'
        ? 'text-emerald-800'
        : 'text-[#57534E]';

  const dotClasses =
    badge?.tone === 'wine'
      ? 'bg-[#810021]'
      : badge?.tone === 'ready'
        ? 'bg-emerald-500'
        : 'bg-[#78716C]';

  return (
    <View className="bg-white border border-[#E2DED6] rounded-2xl px-4 py-3.5 mb-3.5 flex-col md:flex-row md:items-center md:justify-between gap-3">
      <View className="flex-row items-center gap-3 min-w-0 flex-1">
        {onBack ? (
          <Pressable
            onPress={onBack}
            className="min-h-[48px] min-w-[48px] px-3.5 rounded-xl bg-[#EFECE6] border border-[#E2DED6] flex-row items-center justify-center gap-1.5 active:opacity-85 shrink-0"
            accessibilityRole="button"
            accessibilityLabel={backLabel}
          >
            <ArrowLeft size={18} color="#1A1617" strokeWidth={2.2} />
            <Text className="text-base font-semibold text-[#1A1617]">{backLabel}</Text>
          </Pressable>
        ) : null}

        <View className="min-w-0 flex-1">
          <View className="flex-row items-center flex-wrap gap-2.5">
            <Text className="text-pos-xl font-extrabold text-[#1A1617] tracking-tight">
              {title}
            </Text>

            {badge ? (
              <View
                className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full border ${badgeClasses}`}
              >
                <View className={`w-2 h-2 rounded-full ${dotClasses}`} />
                <Text className={`text-base font-semibold tabular-nums ${badgeTextClasses}`}>
                  {badge.label}
                </Text>
              </View>
            ) : null}
          </View>

          {subtitle ? (
            <Text className="text-base text-[#57534E] mt-0.5" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {rightSlot ? (
        <View className="flex-row flex-wrap items-center gap-2.5 shrink-0">{rightSlot}</View>
      ) : null}
    </View>
  );
};
