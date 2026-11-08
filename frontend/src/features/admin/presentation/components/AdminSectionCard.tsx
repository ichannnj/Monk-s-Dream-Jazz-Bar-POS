import React from 'react';
import { View, Text } from 'react-native';

interface AdminSectionCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const AdminSectionCard: React.FC<AdminSectionCardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  noPadding = false,
}) => {
  return (
    <View
      className={`rounded-xl border border-stone-200/90 bg-white shadow-xs overflow-hidden ${className}`}
    >
      {(title || action) && (
        <View className="flex-row items-center justify-between border-b border-stone-100 px-5 py-3.5 bg-stone-50/50">
          <View className="flex-1 pr-3">
            {title && (
              <Text className="text-base font-bold text-stone-900 tracking-tight">{title}</Text>
            )}
            {subtitle && (
              <Text className="mt-0.5 text-base text-stone-500 font-normal">{subtitle}</Text>
            )}
          </View>
          {action && <View className="flex-row items-center">{action}</View>}
        </View>
      )}
      <View className={noPadding ? '' : 'p-5'}>{children}</View>
    </View>
  );
};
