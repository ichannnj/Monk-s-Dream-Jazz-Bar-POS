import React from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { PosActionButton, PosActionButtonVariant } from '@/features/shared/ui/PosActionButton';

export type AdminButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive' | 'brass';

interface AdminActionButtonProps {
  label: string;
  loadingLabel?: string;
  onPress: () => void | Promise<unknown>;
  variant?: AdminButtonVariant;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  accessibilityLabel?: string;
}

const VARIANT_MAP: Record<AdminButtonVariant, PosActionButtonVariant> = {
  primary: 'primary',
  secondary: 'secondary',
  quiet: 'ghost',
  destructive: 'destructive',
  brass: 'brass',
};

export const AdminActionButton: React.FC<AdminActionButtonProps> = ({
  label,
  loadingLabel,
  onPress,
  variant = 'secondary',
  icon,
  iconPosition = 'left',
  loading,
  disabled = false,
  className = '',
  accessibilityLabel,
}) => {
  return (
    <PosActionButton
      label={label}
      loadingLabel={loadingLabel}
      onPress={onPress}
      variant={VARIANT_MAP[variant] || 'secondary'}
      icon={icon}
      iconPosition={iconPosition}
      loading={loading}
      disabled={disabled}
      className={className}
      accessibilityLabel={accessibilityLabel}
    />
  );
};
