import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { useVirtualKeyboard } from '../../../shared';

export type AdminModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface AdminModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: AdminModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  contentClassName?: string;
  closeOnBackdropPress?: boolean;
}

const SIZE_CLASSES: Record<AdminModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

export const AdminModal: React.FC<AdminModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  size = 'lg',
  children,
  footer,
  scrollable = true,
  contentClassName = '',
  closeOnBackdropPress = true,
}) => {
  const maxWClass = SIZE_CLASSES[size] || 'max-w-2xl';
  const { isKeyboardOpen, keyboardHeight, viewportHeight, dismissKeyboard } = useVirtualKeyboard();

  const handleBackdropPress = () => {
    if (isKeyboardOpen) {
      dismissKeyboard();
    }
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View
        className="flex-1 items-center bg-black/60 p-4 sm:p-6"
        style={{
          justifyContent: isKeyboardOpen ? 'flex-start' : 'center',
          paddingTop: isKeyboardOpen ? 12 : undefined,
          paddingBottom: isKeyboardOpen ? Math.min(keyboardHeight, 320) + 16 : undefined,
        }}
      >
        {/* Backdrop Press Area (Click outside to dismiss) */}
        {closeOnBackdropPress && (
          <Pressable
            className="absolute inset-0"
            onPress={handleBackdropPress}
            accessibilityRole="button"
            accessibilityLabel="Close modal backdrop"
          />
        )}

        {/* Modal Card (Stops backdrop click propagation) */}
        <View
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
          className={`w-full ${maxWClass} rounded-2xl bg-white shadow-2xl overflow-hidden flex-col border border-stone-200 z-10`}
          style={{
            maxHeight: isKeyboardOpen ? Math.max(260, viewportHeight - 24) : '92vh',
            ...(Platform.OS === 'web'
              ? ({ pointerEvents: 'auto', onClick: (e: any) => e.stopPropagation() } as any)
              : {}),
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-stone-200 bg-stone-50 px-4 sm:px-6 py-3.5 sm:py-4">
            <View className="flex-row items-center space-x-3 sm:space-x-3.5 flex-1 pr-3">
              {icon && (
                <View className="h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#800020]/10 border border-[#800020]/20">
                  {icon}
                </View>
              )}
              <View className="flex-1 ml-2.5 sm:ml-3">
                <Text className="text-lg sm:text-xl font-bold text-stone-900 leading-tight">
                  {title}
                </Text>
                {subtitle && (
                  <Text className="text-base text-stone-500 font-medium mt-0.5">{subtitle}</Text>
                )}
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl active:bg-stone-200 hover:bg-stone-200 transition-colors"
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <X size={22} color="#57534e" />
            </Pressable>
          </View>

          {/* Modal Body */}
          {scrollable ? (
            <ScrollView
              className={`p-4 sm:p-6 flex-1 ${contentClassName}`}
              contentContainerStyle={isKeyboardOpen ? { paddingBottom: 48 } : undefined}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View className={`p-4 sm:p-6 flex-1 ${contentClassName}`}>{children}</View>
          )}

          {/* Footer (Sticky action buttons) */}
          {footer && (
            <View className="flex-row items-center justify-end space-x-3 border-t border-stone-200 bg-stone-50 px-4 sm:px-6 py-3.5 sm:py-4 flex-wrap gap-2">
              {footer}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
