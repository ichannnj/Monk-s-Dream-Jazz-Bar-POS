import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LucideIcon, AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react-native';

export type ConfirmationVariant = 'primary' | 'danger' | 'warning' | 'success';

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  icon?: LucideIcon;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  icon: CustomIcon,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const { height } = useWindowDimensions();
  const isCompactHeight = height < 520;

  if (!visible) return null;

  // Determine icon & theme based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          DefaultIcon: AlertCircle,
          iconBg: 'bg-rose-100',
          iconColor: '#dc2626',
          confirmBtn: 'bg-rose-600 active:bg-rose-700',
          confirmText: 'text-white',
        };
      case 'warning':
        return {
          DefaultIcon: AlertTriangle,
          iconBg: 'bg-amber-100',
          iconColor: '#d97706',
          confirmBtn: 'bg-amber-600 active:bg-amber-700',
          confirmText: 'text-white',
        };
      case 'success':
        return {
          DefaultIcon: CheckCircle2,
          iconBg: 'bg-emerald-100',
          iconColor: '#16a34a',
          confirmBtn: 'bg-emerald-600 active:bg-emerald-700',
          confirmText: 'text-white',
        };
      case 'primary':
      default:
        return {
          DefaultIcon: Info,
          iconBg: 'bg-wine-100',
          iconColor: '#832238',
          confirmBtn: 'bg-wine-900 active:bg-wine-950',
          confirmText: 'text-white',
        };
    }
  };

  const currentVariant = getVariantStyles();
  const IconComponent = CustomIcon || currentVariant.DefaultIcon;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        className={`flex-1 bg-black/60 justify-center items-center ${isCompactHeight ? 'p-2.5' : 'p-6'}`}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Dismiss confirmation modal backdrop"
        />

        <View
          className={`w-full max-w-lg bg-white rounded-3xl ${isCompactHeight ? 'p-4 max-h-[96%]' : 'p-6'} shadow-2xl elevation-8 z-10`}
        >
          {/* Header */}
          <View
            className={`flex-row items-start justify-between ${isCompactHeight ? 'mb-2' : 'mb-4'}`}
          >
            <View className="flex-row items-center gap-3.5 flex-1 mr-3">
              <View
                className={`${isCompactHeight ? 'w-10 h-10' : 'w-14 h-14'} rounded-2xl ${currentVariant.iconBg} items-center justify-center`}
              >
                <IconComponent
                  size={isCompactHeight ? 20 : 28}
                  color={currentVariant.iconColor}
                  strokeWidth={2.4}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`${isCompactHeight ? 'text-lg' : 'text-xl'} font-extrabold text-gray-900`}
                  numberOfLines={2}
                >
                  {title}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onCancel}
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-gray-100 active:bg-gray-200"
              accessibilityRole="button"
              accessibilityLabel="Close confirmation modal"
            >
              <X size={18} color="#4b5563" strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Body Message */}
          <ScrollView
            style={{ maxHeight: isCompactHeight ? 120 : 200 }}
            className={`bg-gray-50 rounded-2xl ${isCompactHeight ? 'p-3 mb-3' : 'p-4 mb-6'} border border-gray-100`}
            showsVerticalScrollIndicator={false}
          >
            <Text
              className={`${isCompactHeight ? 'text-sm' : 'text-base'} text-gray-700 font-medium leading-relaxed`}
            >
              {message}
            </Text>
          </ScrollView>

          {/* Action Buttons */}
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={onCancel}
              disabled={isLoading}
              className="flex-1 min-h-[48px] rounded-2xl bg-gray-100 active:bg-gray-200 items-center justify-center px-4"
              accessibilityRole="button"
              accessibilityLabel={cancelText}
            >
              <Text className="text-base font-bold text-gray-700">{cancelText}</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={isLoading}
              className={`flex-1 min-h-[48px] rounded-2xl ${currentVariant.confirmBtn} items-center justify-center px-4 shadow-sm`}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
            >
              <Text className={`text-base font-extrabold ${currentVariant.confirmText}`}>
                {isLoading ? 'Processing...' : confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
