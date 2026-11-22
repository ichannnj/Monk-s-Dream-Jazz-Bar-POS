import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { AlertTriangle, Trash2, X } from 'lucide-react-native';
import { OrderLineItem } from '../../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { toast } from '../../../shared/toast/useToastStore';
import { posApi } from '../../../shared/infrastructure/api';

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

  const isDoorCharge =
    item.categorySlug === 'door_charge' ||
    item.productId === 'd1000001-0000-0000-0000-000000000001' ||
    item.productName?.toLowerCase().includes('door charge');

  // Door charge is admission cover, not kitchen/bar prep: no waste logging & no manager PIN required
  const isPostPrep =
    !isDoorCharge &&
    (item.status === 'preparing' || item.status === 'ready' || item.status === 'served');

  const handleConfirm = async () => {
    if (isPostPrep) {
      const pinResult = await posApi.verifyManagerPin(managerPin);
      if (!pinResult.success) {
        setPinError(pinResult.error || 'Invalid Manager PIN. Contact Supervisor.');
        toast.error(pinResult.error || 'Invalid Manager PIN. Action denied.', {
          title: 'Supervisor PIN Required',
        });
        return;
      }
    }
    onConfirmVoid(voidReason, managerPin);
  };

  const { height } = useWindowDimensions();
  const isCompactHeight = height < 520;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className={`flex-1 bg-wine-950/75 justify-center items-center ${isCompactHeight ? 'p-2' : 'p-5'}`}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close void modal"
        />
        <View
          className={`w-full max-w-md bg-white rounded-3xl ${isCompactHeight ? 'p-4 max-h-[96%]' : 'p-5 sm:p-6 max-h-[92%]'} shadow-2xl flex-col`}
        >
          {/* Header */}
          <View
            className={`flex-row items-center justify-between ${isCompactHeight ? 'mb-2' : 'mb-4'}`}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-2xl bg-[#EFECE6] border border-stone-200 items-center justify-center">
                <Trash2 size={18} color="#810021" />
              </View>
              <Text className="text-xl font-extrabold text-stone-900">Void Item</Text>
            </View>
            <Pressable
              onPress={onClose}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-[#EFECE6] border border-stone-200 items-center justify-center active:bg-stone-100"
              accessibilityRole="button"
              accessibilityLabel="Close void dialog"
            >
              <X size={18} color="#1A1617" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {/* Item details */}
            <View className="bg-[#EFECE6] rounded-2xl p-3.5 border border-stone-200 mb-3.5">
              <Text className="text-base font-bold text-stone-900">
                {item.quantity}x {item.productName}
              </Text>
              <Text className="text-sm text-stone-500 font-medium mt-0.5">
                {formatCurrency(item.unitPrice * item.quantity)} · Round {item.roundNumber || 1}
              </Text>
            </View>

            {/* Notice */}
            {isDoorCharge ? (
              <View className="bg-[#EFECE6] border border-stone-200 rounded-xl p-3 mb-3.5">
                <Text className="text-xs text-stone-600 font-medium">
                  Door cover will be removed from tab without waste logging.
                </Text>
              </View>
            ) : isPostPrep ? (
              <View className="bg-[#EFECE6] border border-stone-200 rounded-xl p-3 mb-3.5 flex-row items-center gap-2">
                <AlertTriangle size={15} color="#810021" />
                <Text className="text-xs text-[#810021] font-semibold flex-1">
                  Item in prep ({item.status}). Waste recorded; Manager PIN required.
                </Text>
              </View>
            ) : null}

            {/* Reason Selector */}
            <Text className="text-sm font-bold text-stone-800 mb-1.5">Reason:</Text>
            <View className="gap-1.5 mb-3.5">
              {[
                'Customer Changed Mind',
                'Accidental Entry',
                'Preparation Error',
                'Customer Return',
              ].map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setVoidReason(r)}
                  className={`min-h-[44px] py-2 px-3.5 rounded-xl border justify-center active:opacity-90 ${
                    voidReason === r
                      ? 'border-[#810021] bg-[#810021]/5'
                      : 'border-stone-200 bg-[#EFECE6]'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      voidReason === r ? 'text-[#810021]' : 'text-stone-700'
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
                <Text className="text-sm font-bold text-stone-800 mb-1.5">Manager PIN:</Text>
                <TextInput
                  value={managerPin}
                  onChangeText={(txt) => {
                    setManagerPin(txt);
                    setPinError('');
                  }}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  placeholder="••••"
                  placeholderTextColor="#a8a29e"
                  className={`min-h-[48px] border-[1.5px] rounded-xl px-4 text-center text-lg font-bold tracking-widest bg-white ${
                    pinError ? 'border-rose-500' : 'border-stone-300'
                  }`}
                />
                {pinError ? <Text className="text-xs text-rose-600 mt-1">{pinError}</Text> : null}
              </View>
            ) : null}
          </ScrollView>

          {/* Action buttons */}
          <View className="flex-row gap-2.5 pt-2">
            <Pressable
              onPress={onClose}
              className="flex-1 min-h-[48px] py-3 rounded-2xl bg-[#EFECE6] border border-stone-200 items-center justify-center active:bg-stone-100"
            >
              <Text className="text-sm font-bold text-stone-700">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              className="flex-1 min-h-[48px] py-3 rounded-2xl bg-[#810021] items-center justify-center active:opacity-90 shadow-xs"
            >
              <Text className="text-sm font-extrabold text-white">Void Item</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
