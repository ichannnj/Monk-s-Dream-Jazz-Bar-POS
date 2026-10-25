import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, StyleSheet } from 'react-native';
import { AlertTriangle, Trash2, X } from 'lucide-react-native';
import { OrderLineItem } from '../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { toast } from '../../../features/shared/toast/useToastStore';

interface TableActionVoidModalProps {
  visible: boolean;
  item: OrderLineItem;
  onClose: () => void;
  onConfirmVoid: (reason: string, pin?: string) => void;
}

export const TableActionVoidModal: React.FC<TableActionVoidModalProps> = ({
  visible,
  item,
  onClose,
  onConfirmVoid,
}) => {
  const [voidReason, setVoidReason] = useState<string>('Customer Changed Mind');
  const [managerPin, setManagerPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  const isPostPrep = item.status === 'preparing' || item.status === 'ready';

  const handleConfirm = () => {
    if (isPostPrep) {
      if (managerPin !== '9999') {
        setPinError('Invalid Manager PIN. Contact Supervisor.');
        toast.error('Invalid Manager PIN. Action denied.', {
          title: 'Supervisor PIN Required',
        });
        return;
      }
    }
    onConfirmVoid(voidReason, managerPin);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-wine-950/75 justify-center items-center p-5">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close void modal"
        />
        <View className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl elevation-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-2xl bg-rose-100 items-center justify-center">
                <Trash2 size={22} color="#dc2626" />
              </View>
              <View>
                <Text className="text-xl font-extrabold text-gray-900">Void Order Item</Text>
                <Text className="text-base text-gray-500 font-medium">Shift Audit Record</Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="min-w-[48px] min-h-[48px] rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
              accessibilityRole="button"
              accessibilityLabel="Close void dialog"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Item details */}
          <View className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-4">
            <Text className="text-base font-bold text-gray-900">
              {item.quantity}x {item.productName}
            </Text>
            <Text className="text-base text-gray-500 mt-1">
              {formatCurrency(item.unitPrice * item.quantity)} · Round {item.roundNumber || 1}
            </Text>
          </View>

          {/* Warning or Pre-Prep notice */}
          {isPostPrep ? (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center gap-2 mb-1.5">
                <AlertTriangle size={18} color="#b45309" />
                <Text className="text-base font-bold text-amber-900">
                  Item already in {item.status.toUpperCase()} stage!
                </Text>
              </View>
              <Text className="text-base text-amber-800 leading-6">
                Ingredients were used. Voiding will record a loss in waste logs and requires Manager
                PIN (9999).
              </Text>
            </View>
          ) : (
            <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
              <Text className="text-base font-bold text-emerald-900">
                Pre-Preparation Cancellation
              </Text>
              <Text className="text-base text-emerald-700 mt-1">
                Item is PENDING. Voiding will restore ingredient stocks to inventory.
              </Text>
            </View>
          )}

          {/* Reason Selector */}
          <Text className="text-base font-bold text-gray-700 mb-2">Cancellation Reason:</Text>
          <View className="gap-2 mb-4">
            {[
              'Customer Changed Mind',
              'Accidental Entry',
              'Preparation Error / Spoilage',
              'Customer Return',
            ].map((r) => (
              <Pressable
                key={r}
                onPress={() => setVoidReason(r)}
                className={`min-h-[48px] py-3 px-4 rounded-xl border justify-center active:opacity-90 ${
                  voidReason === r ? 'border-wine-800 bg-wine-50' : 'border-gray-200 bg-white'
                }`}
              >
                <Text
                  className={`text-base font-semibold ${
                    voidReason === r ? 'text-wine-800' : 'text-gray-700'
                  }`}
                >
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Manager PIN */}
          {isPostPrep ? (
            <View className="mb-4">
              <Text className="text-base font-bold text-gray-700 mb-2">
                Manager 4-Digit PIN (9999):
              </Text>
              <TextInput
                value={managerPin}
                onChangeText={(txt) => {
                  setManagerPin(txt);
                  setPinError('');
                }}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                placeholder="Enter 4-digit PIN"
                placeholderTextColor="#9ca3af"
                className={`min-h-[48px] border-[1.5px] rounded-xl px-4 text-center text-lg font-bold tracking-widest bg-white ${
                  pinError ? 'border-rose-500' : 'border-gray-300'
                }`}
              />
              {pinError ? <Text className="text-base text-rose-600 mt-1">{pinError}</Text> : null}
            </View>
          ) : null}

          {/* Action buttons */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={onClose}
              className="flex-1 min-h-[48px] py-3.5 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
            >
              <Text className="text-base font-bold text-gray-700">Keep Item</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              className="flex-1 min-h-[48px] py-3.5 rounded-xl bg-rose-600 items-center justify-center active:bg-rose-700 shadow-sm"
            >
              <Text className="text-base font-extrabold text-white">Confirm Void</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
