import React from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { useVirtualKeyboard } from '../../../shared';
import { PosActionButton } from '@/features/shared/ui/PosActionButton';
import { useAsyncAction } from '@/features/shared/hooks/useAsyncAction';

export type CashActionType = 'cash_in' | 'cash_out' | 'drop';

interface CashDrawerActionModalProps {
  visible: boolean;
  actionType: CashActionType | null;
  amount: string;
  reason: string;
  onAmountChange: (val: string) => void;
  onReasonChange: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export const CashDrawerActionModal: React.FC<CashDrawerActionModalProps> = ({
  visible,
  actionType,
  amount,
  reason,
  onAmountChange,
  onReasonChange,
  onClose,
  onConfirm,
}) => {
  const { isKeyboardOpen, keyboardHeight, viewportHeight, dismissKeyboard } = useVirtualKeyboard();
  const { execute: executeConfirm, isLoading: isRecording } = useAsyncAction(async () => {
    await onConfirm();
  });

  if (!actionType) return null;

  const title =
    actionType === 'cash_in'
      ? 'Add Cash In (Restock Change)'
      : actionType === 'cash_out'
        ? 'Log Petty Cash Out (Paid-Out)'
        : 'Log Safe Cash Drop';

  const handleClose = () => {
    if (isRecording) return;
    if (isKeyboardOpen) {
      dismissKeyboard();
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View
        className="flex-1 bg-black/75 items-center p-4"
        style={{
          justifyContent: isKeyboardOpen ? 'flex-start' : 'center',
          paddingTop: isKeyboardOpen ? 16 : undefined,
          paddingBottom: isKeyboardOpen ? Math.min(keyboardHeight, 320) + 16 : undefined,
        }}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          disabled={isRecording}
          accessibilityLabel="Close modal"
        />
        <View
          className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl"
          style={{
            maxHeight: isKeyboardOpen ? Math.max(260, viewportHeight - 24) : undefined,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
            <Text className="text-base font-extrabold text-jazz-text">{title}</Text>
            <Pressable
              onPress={handleClose}
              disabled={isRecording}
              className={`w-9 h-9 rounded-xl bg-gray-100 items-center justify-center ${
                isRecording ? 'opacity-40' : 'active:bg-gray-200'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
            >
              <X size={18} color="#6b7280" />
            </Pressable>
          </View>

          {/* Form */}
          <View className="my-4 gap-4">
            <View>
              <Text className="text-base font-bold text-gray-500 uppercase tracking-wider">
                Amount (₱):
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-extrabold text-jazz-text mt-1.5"
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                value={amount}
                onChangeText={onAmountChange}
                editable={!isRecording}
                autoFocus
              />
            </View>

            <View>
              <Text className="text-base font-bold text-gray-500 uppercase tracking-wider">
                Reason / Expense Description:
              </Text>
              <View className="relative justify-center mt-1.5">
                <TextInput
                  className={`bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-jazz-text ${
                    reason.length > 0 ? 'pr-10' : ''
                  }`}
                  placeholder="e.g. Ice bag from store, ₱100 change restock..."
                  placeholderTextColor="#9ca3af"
                  value={reason}
                  onChangeText={onReasonChange}
                  editable={!isRecording}
                />
                {reason.length > 0 && !isRecording && (
                  <Pressable
                    onPress={() => onReasonChange('')}
                    hitSlop={8}
                    className="absolute right-2.5 h-7 w-7 items-center justify-center rounded-full active:bg-gray-200"
                    accessibilityRole="button"
                    accessibilityLabel="Clear reason"
                  >
                    <X size={14} color="#6b7280" />
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row gap-3 pt-2">
            <Pressable
              onPress={handleClose}
              disabled={isRecording}
              className={`flex-1 py-3.5 rounded-xl bg-gray-100 items-center justify-center min-h-[48px] ${
                isRecording ? 'opacity-40' : 'active:bg-gray-200'
              }`}
            >
              <Text className="text-base font-bold text-gray-700">Cancel</Text>
            </Pressable>
            <View className="flex-1">
              <PosActionButton
                label="Record Transaction"
                loadingLabel="Recording…"
                variant="primary"
                fullWidth
                loading={isRecording}
                onPress={() => executeConfirm()}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
