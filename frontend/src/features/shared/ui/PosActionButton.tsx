import React from 'react';
import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAsyncAction } from '../hooks/useAsyncAction';

export type PosActionButtonVariant =
  'primary' | 'secondary' | 'outline' | 'destructive' | 'brass' | 'ghost' | 'success';

export interface PosActionButtonProps {
  label: string;
  loadingLabel?: string;
  onPress: () => void | Promise<unknown>;
  variant?: PosActionButtonVariant;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  accessibilityLabel?: string;
  autoLock?: boolean;
}

const BUTTON_VARIANTS: Record<
  PosActionButtonVariant,
  { container: string; pressed: string; text: string; spinnerColor: string; iconColor: string }
> = {
  primary: {
    container: 'bg-[#810021] border border-[#630019]',
    pressed: 'active:bg-[#630019]',
    text: 'text-[#F7F5F2] font-bold',
    spinnerColor: '#F7F5F2',
    iconColor: '#F7F5F2',
  },
  secondary: {
    container: 'bg-[#F7F5F2] border border-[#E2DED6] shadow-xs',
    pressed: 'active:bg-[#EFECE6]',
    text: 'text-[#1A1617] font-bold',
    spinnerColor: '#1A1617',
    iconColor: '#1A1617',
  },
  outline: {
    container: 'bg-transparent border border-[#E2DED6]',
    pressed: 'active:bg-stone-100',
    text: 'text-[#1A1617] font-semibold',
    spinnerColor: '#1A1617',
    iconColor: '#706864',
  },
  destructive: {
    container: 'bg-rose-50 border border-rose-200',
    pressed: 'active:bg-rose-100',
    text: 'text-rose-700 font-bold',
    spinnerColor: '#b32638',
    iconColor: '#b32638',
  },
  brass: {
    container: 'bg-amber-600 border border-amber-700',
    pressed: 'active:bg-amber-700',
    text: 'text-[#F7F5F2] font-bold',
    spinnerColor: '#F7F5F2',
    iconColor: '#F7F5F2',
  },
  ghost: {
    container: 'bg-transparent border border-transparent',
    pressed: 'active:bg-stone-200/60',
    text: 'text-stone-700 font-semibold',
    spinnerColor: '#57534e',
    iconColor: '#57534e',
  },
  success: {
    container: 'bg-emerald-50 border border-emerald-300',
    pressed: 'active:bg-emerald-100',
    text: 'text-emerald-900 font-bold',
    spinnerColor: '#065F46',
    iconColor: '#065F46',
  },
};

export const PosActionButton: React.FC<PosActionButtonProps> = ({
  label,
  loadingLabel,
  onPress,
  variant = 'secondary',
  icon: Icon,
  iconPosition = 'left',
  loading: controlledLoading,
  disabled = false,
  fullWidth = false,
  className = '',
  accessibilityLabel,
  autoLock = true,
}) => {
  const { execute, isLoading: hookLoading } = useAsyncAction(async () => {
    await onPress();
  });

  const effectiveLoading =
    controlledLoading !== undefined ? controlledLoading : autoLock ? hookLoading : false;
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.secondary;
  const isDisabled = disabled || effectiveLoading;

  const handlePress = () => {
    if (autoLock && controlledLoading === undefined) {
      execute();
    } else {
      onPress();
    }
  };

  const currentLabel = effectiveLoading ? loadingLabel || label : label;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || currentLabel}
      accessibilityState={{ disabled: isDisabled, busy: effectiveLoading }}
      className={`min-h-[48px] px-4 py-2.5 rounded-xl flex-row items-center justify-center transition-all ${
        fullWidth ? 'w-full' : ''
      } ${v.container} ${!isDisabled ? `${v.pressed} active:scale-[0.985]` : 'opacity-60'} ${className}`}
    >
      {effectiveLoading ? (
        <View className="flex-row items-center justify-center gap-2">
          <ActivityIndicator size="small" color={v.spinnerColor} />
          <Text className={`text-base tracking-tight ${v.text}`}>{currentLabel}</Text>
        </View>
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <View className="mr-2">
              <Icon size={18} color={v.iconColor} />
            </View>
          )}
          <Text className={`text-base tracking-tight ${v.text}`}>{currentLabel}</Text>
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
