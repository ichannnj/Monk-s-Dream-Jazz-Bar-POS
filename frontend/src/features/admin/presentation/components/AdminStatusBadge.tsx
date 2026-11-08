import React from 'react';
import { View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export type AdminStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface AdminStatusBadgeProps {
  label: string;
  tone?: AdminStatusTone;
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  className?: string;
}

const BADGE_TONES: Record<
  AdminStatusTone,
  { bg: string; text: string; border: string; iconColor: string }
> = {
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    iconColor: '#1b7a4b',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    iconColor: '#b46d0a',
  },
  danger: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    iconColor: '#b32638',
  },
  info: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    iconColor: '#0284c7',
  },
  neutral: {
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-200',
    iconColor: '#57534e',
  },
  primary: {
    bg: 'bg-[#6e1d2c]/10',
    text: 'text-[#6e1d2c]',
    border: 'border-[#6e1d2c]/20',
    iconColor: '#6e1d2c',
  },
};

export const AdminStatusBadge: React.FC<AdminStatusBadgeProps> = ({
  label,
  tone = 'neutral',
  icon: Icon,
  size = 'md',
  className = '',
}) => {
  const t = BADGE_TONES[tone];
  const py = size === 'sm' ? 'py-0.5' : 'py-1';
  const px = size === 'sm' ? 'px-2' : 'px-2.5';
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <View
      className={`flex-row items-center rounded-md border ${t.bg} ${t.border} ${px} ${py} ${className}`}
    >
      {Icon && (
        <View className="mr-1.5">
          <Icon size={iconSize} color={t.iconColor} />
        </View>
      )}
      <Text className={`text-base font-semibold leading-none ${t.text}`}>{label}</Text>
    </View>
  );
};
