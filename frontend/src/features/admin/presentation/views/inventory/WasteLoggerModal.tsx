import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal } from 'react-native';
import { X, Trash2, DollarSign } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type InventoryItemAdmin } from '../../../data/admin.api';

interface WasteLoggerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inventory: InventoryItemAdmin[];
}

const WASTE_REASONS = [
  { key: 'DROPPED_SPILL', label: '🍾 Dropped Bottle / Spill' },
  { key: 'EXPIRED', label: '⏳ Expired / Spoiled' },
  { key: 'PREPARATION_ERROR', label: '🍳 Kitchen Prep Error' },
  { key: 'CUSTOMER_RETURN', label: '↩️ Customer Return' },
  { key: 'STAFF_TASTING', label: '🍷 Staff Tasting / Training' },
];

export const WasteLoggerModal: React.FC<WasteLoggerModalProps> = ({
  visible,
  onClose,
  onSuccess,
  inventory,
}) => {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('DROPPED_SPILL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedItemId(inventory[0]?.id || '');
      setQuantity('');
      setReason('DROPPED_SPILL');
    }
  }, [inventory, visible]);

  const selectedItem = inventory.find((inv) => inv.id === selectedItemId);
  const qtyNum = parseFloat(quantity) || 0;
  const costLost = selectedItem ? qtyNum * selectedItem.unit_cost : 0;

  const handleSubmit = async () => {
    if (!selectedItemId) {
      toast.error('Select an inventory item', { title: 'Validation Error' });
      return;
    }
    if (qtyNum <= 0) {
      toast.error('Waste quantity must be greater than 0', { title: 'Validation Error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.logWaste({
        inventoryItemId: selectedItemId,
        quantity: qtyNum,
        reason: reason as any,
      });

      toast.success(
        `Logged waste: ${qtyNum} ${selectedItem?.unit} of ${selectedItem?.name} (Loss: ₱${costLost.toFixed(2)})`,
        { title: 'Waste Booked to Overheads' }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to log inventory waste', { title: 'Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-6">
        <View className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex-col">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
            <View className="flex-row items-center space-x-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                <Trash2 size={22} color="#e11d48" />
              </View>
              <Text className="text-xl font-bold text-stone-900">Log Spillage & Waste</Text>
            </View>
            <Pressable
              onPress={onClose}
              className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl active:bg-stone-200"
            >
              <X size={22} color="#57534e" />
            </Pressable>
          </View>

          {/* Form */}
          <View className="p-6 space-y-4">
            {/* Item Selector (Zero horizontal scroll) */}
            <View>
              <Text className="text-base font-semibold text-stone-800 mb-1.5">Select Item</Text>
              <ScrollView className="max-h-44" showsVerticalScrollIndicator={true}>
                <View className="flex-row flex-wrap gap-2">
                  {inventory.map((inv) => {
                    const isSel = selectedItemId === inv.id;
                    return (
                      <Pressable
                        key={inv.id}
                        onPress={() => setSelectedItemId(inv.id)}
                        className={`min-h-[48px] px-4 items-center justify-center rounded-xl border ${
                          isSel
                            ? 'bg-[#800020] border-[#800020]'
                            : 'bg-white border-stone-300 active:bg-stone-100'
                        }`}
                      >
                        <Text
                          className={`text-base font-semibold ${
                            isSel ? 'text-white' : 'text-stone-700'
                          }`}
                        >
                          {inv.name} ({Number(inv.current_stock || 0).toFixed(1)} {inv.unit})
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Quantity */}
            <View>
              <Text className="text-base font-semibold text-stone-800 mb-1">
                Quantity Lost ({selectedItem?.unit || 'unit'})
              </Text>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="e.g. 1.5"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900 font-bold"
              />
            </View>

            {/* Waste Reason */}
            <View>
              <Text className="text-base font-semibold text-stone-800 mb-2">Loss Reason</Text>
              <View className="space-y-2">
                {WASTE_REASONS.map((r) => {
                  const isSel = reason === r.key;
                  return (
                    <Pressable
                      key={r.key}
                      onPress={() => setReason(r.key)}
                      className={`min-h-[48px] px-4 flex-row items-center justify-between rounded-xl border ${
                        isSel
                          ? 'bg-rose-50 border-rose-300'
                          : 'bg-white border-stone-200 active:bg-stone-100'
                      }`}
                    >
                      <Text
                        className={`text-base font-medium ${
                          isSel ? 'text-rose-900 font-bold' : 'text-stone-700'
                        }`}
                      >
                        {r.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Financial Loss Preview */}
            <View className="flex-row items-center justify-between rounded-xl bg-stone-100 p-4 border border-stone-200">
              <View className="flex-row items-center space-x-2">
                <DollarSign size={20} color="#e11d48" />
                <Text className="text-base font-medium text-stone-700">Financial Loss:</Text>
              </View>
              <Text className="text-lg font-bold text-rose-700">₱{costLost.toFixed(2)}</Text>
            </View>
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-end space-x-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-stone-200 active:bg-stone-300"
            >
              <Text className="text-base font-bold text-stone-700">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#800020] active:opacity-90"
            >
              <Text className="text-base font-bold text-white">
                {isSubmitting ? 'Logging...' : 'Confirm Waste Entry'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
