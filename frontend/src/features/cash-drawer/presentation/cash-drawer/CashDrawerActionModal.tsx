import React from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';

export type CashActionType = 'cash_in' | 'cash_out' | 'drop';

interface CashDrawerActionModalProps {
  visible: boolean;
  actionType: CashActionType | null;
  amount: string;
  reason: string;
  onAmountChange: (val: string) => void;
  onReasonChange: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
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
  if (!actionType) return null;

  const title =
    actionType === 'cash_in'
      ? 'Add Cash In (Restock Change)'
      : actionType === 'cash_out'
        ? 'Log Petty Cash Out (Paid-Out)'
        : 'Log Safe Cash Drop';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/75 justify-center items-center p-4">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close modal"
        />
        <View className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
            <Text className="text-base font-extrabold text-jazz-text">{title}</Text>
            <Pressable
              onPress={onClose}
              className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
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
                autoFocus
              />
            </View>

            <View>
              <Text className="text-base font-bold text-gray-500 uppercase tracking-wider">
                Reason / Expense Description:
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-jazz-text mt-1.5"
                placeholder="e.g. Ice bag from store, ₱100 change restock..."
                placeholderTextColor="#9ca3af"
                value={reason}
                onChangeText={onReasonChange}
              />
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row gap-3 pt-2">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3.5 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200 min-h-[48px]"
            >
              <Text className="text-base font-bold text-gray-700">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className="flex-1 py-3.5 rounded-xl bg-wine-700 items-center justify-center active:opacity-90 min-h-[48px]"
            >
              <Text className="text-base font-extrabold text-white">Record Transaction</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
