import React from 'react';
import { View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  actions,
}) => {
  return (
    <View className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200/80 bg-white px-4 sm:px-6 py-4">
      <View className="flex-row items-center gap-3">
        {Icon && (
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-stone-100 border border-stone-200/80">
            <Icon size={22} color="#6e1d2c" />
          </View>
        )}
        <View className="justify-center">
          <View className="flex-row items-center gap-2">
            <Text className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              {title}
            </Text>
            {badge}
          </View>
          {description && (
            <Text className="mt-0.5 text-base text-stone-500 font-normal">{description}</Text>
          )}
        </View>
      </View>
      {actions && <View className="flex-row items-center flex-wrap gap-2">{actions}</View>}
    </View>
  );
};
