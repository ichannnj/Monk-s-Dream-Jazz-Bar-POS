import React from 'react';
import { View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export type AdminMetricTone = 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'brass';

interface AdminMetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  subLabel?: string;
  icon?: LucideIcon;
  tone?: AdminMetricTone;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    text: string;
  };
  className?: string;
}

const TONE_STYLES: Record<
  AdminMetricTone,
  { iconBg: string; iconColor: string; accentBorder: string }
> = {
  default: {
    iconBg: 'bg-stone-100',
    iconColor: '#57534e',
    accentBorder: 'border-stone-200/90',
  },
  primary: {
    iconBg: 'bg-[#6e1d2c]/10',
    iconColor: '#6e1d2c',
    accentBorder: 'border-[#6e1d2c]/20',
  },
  brass: {
    iconBg: 'bg-amber-100/70',
    iconColor: '#b48a3c',
    accentBorder: 'border-amber-200',
  },
  success: {
    iconBg: 'bg-emerald-100/70',
    iconColor: '#1b7a4b',
    accentBorder: 'border-emerald-200',
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: '#b46d0a',
    accentBorder: 'border-amber-200',
  },
  danger: {
    iconBg: 'bg-rose-100',
    iconColor: '#b32638',
    accentBorder: 'border-rose-200',
  },
};

export const AdminMetricCard: React.FC<AdminMetricCardProps> = ({
  label,
  value,
  subValue,
  subLabel,
  icon: Icon,
  tone = 'default',
  trend,
  className = '',
}) => {
  const toneStyle = TONE_STYLES[tone];

  return (
    <View
      className={`rounded-xl border bg-white p-4 shadow-xs justify-between min-h-[104px] ${toneStyle.accentBorder} ${className}`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-semibold text-stone-500 uppercase tracking-wider">
          {label}
        </Text>
        {Icon && (
          <View className={`h-9 w-9 items-center justify-center rounded-lg ${toneStyle.iconBg}`}>
            <Icon size={18} color={toneStyle.iconColor} />
          </View>
        )}
      </View>

      <View>
        <Text className="text-2xl font-bold tracking-tight text-stone-900" numberOfLines={1}>
          {value}
        </Text>
        {(subValue || subLabel || trend) && (
          <View className="mt-1 flex-row items-center gap-1.5 flex-wrap">
            {trend && (
              <Text
                className={`text-base font-semibold ${
                  trend.direction === 'up'
                    ? 'text-emerald-700'
                    : trend.direction === 'down'
                      ? 'text-rose-700'
                      : 'text-stone-500'
                }`}
              >
                {trend.direction === 'up' ? '↑ ' : trend.direction === 'down' ? '↓ ' : ''}
                {trend.text}
              </Text>
            )}
            {subValue && <Text className="text-base font-bold text-stone-700">{subValue}</Text>}
            {subLabel && <Text className="text-base text-stone-500 font-normal">{subLabel}</Text>}
          </View>
        )}
      </View>
    </View>
  );
};
