import React from 'react';
import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export type AdminButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive' | 'brass';

interface AdminActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: AdminButtonVariant;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  accessibilityLabel?: string;
}

const BUTTON_VARIANTS: Record<
  AdminButtonVariant,
  { container: string; pressed: string; text: string; iconColor: string }
> = {
  primary: {
    container: 'bg-[#6e1d2c] border border-[#541521]',
    pressed: 'active:bg-[#541521]',
    text: 'text-white font-bold',
    iconColor: '#ffffff',
  },
  secondary: {
    container: 'bg-white border border-stone-300 shadow-xs',
    pressed: 'active:bg-stone-50',
    text: 'text-stone-800 font-bold',
    iconColor: '#44403c',
  },
  quiet: {
    container: 'bg-transparent border border-transparent',
    pressed: 'active:bg-stone-100',
    text: 'text-stone-700 font-semibold',
    iconColor: '#57534e',
  },
  destructive: {
    container: 'bg-rose-50 border border-rose-200',
    pressed: 'active:bg-rose-100',
    text: 'text-rose-700 font-bold',
    iconColor: '#b32638',
  },
  brass: {
    container: 'bg-amber-600 border border-amber-700',
    pressed: 'active:bg-amber-700',
    text: 'text-white font-bold',
    iconColor: '#ffffff',
  },
};

export const AdminActionButton: React.FC<AdminActionButtonProps> = ({
  label,
  onPress,
  variant = 'secondary',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className = '',
  accessibilityLabel,
}) => {
  const v = BUTTON_VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      className={`min-h-[48px] px-4 py-2.5 rounded-xl flex-row items-center justify-center transition-all ${
        v.container
      } ${!isDisabled ? v.pressed : 'opacity-50'} ${className}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.iconColor} />
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <View className="mr-2">
              <Icon size={18} color={v.iconColor} />
            </View>
          )}
          <Text className={`text-base tracking-tight ${v.text}`}>{label}</Text>
          {Icon && iconPosition === 'right' && (
            <View className="ml-2">
              <Icon size={18} color={v.iconColor} />
            </View>
          )}
        </>
      )}
    </Pressable>
  );
};
