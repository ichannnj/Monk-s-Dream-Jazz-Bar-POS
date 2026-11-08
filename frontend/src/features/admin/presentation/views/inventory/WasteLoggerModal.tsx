import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Trash2, DollarSign } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type InventoryItemAdmin } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminNumberInput } from '../../components/AdminNumberInput';

interface WasteLoggerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inventory: InventoryItemAdmin[];
}

const WASTE_REASONS = [
  { key: 'DROPPED_SPILL', label: 'Dropped Bottle / Spill' },
  { key: 'EXPIRED', label: 'Expired / Spoiled' },
  { key: 'PREPARATION_ERROR', label: 'Kitchen Prep Error' },
  { key: 'CUSTOMER_RETURN', label: 'Customer Return' },
  { key: 'STAFF_TASTING', label: 'Staff Tasting / Training' },
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

  const footer = (
    <>
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
    </>
  );

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title="Log Spillage & Waste"
      subtitle="Record spoiled, spilled, or tasted stock against operational overheads"
      icon={<Trash2 size={22} color="#e11d48" />}
      size="md"
      footer={footer}
    >
      <View className="space-y-4">
        {/* Item Selector */}
        <View>
          <Text className="text-base font-semibold text-stone-800 mb-2">Select Item</Text>
          <ScrollView className="max-h-44" showsVerticalScrollIndicator={true}>
            <View className="flex-row flex-wrap gap-2">
              {inventory.map((inv) => {
                const isSel = selectedItemId === inv.id;
                return (
                  <Pressable
                    key={inv.id}
                    onPress={() => setSelectedItemId(inv.id)}
                    className={`min-h-[48px] px-4 items-center justify-center rounded-xl border transition-all ${
                      isSel
                        ? 'bg-[#800020] border-[#800020]'
                        : 'bg-white border-stone-300 active:bg-stone-100 hover:bg-stone-50'
                    }`}
                  >
                    <Text
                      className={`text-base font-semibold ${isSel ? 'text-white' : 'text-stone-700'}`}
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
        <AdminNumberInput
          label={`Quantity Lost (${selectedItem?.unit || 'unit'})`}
          mode="decimal"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="e.g. 1.5"
          suffix={selectedItem?.unit}
        />

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
                  className={`min-h-[48px] px-4 flex-row items-center justify-between rounded-xl border transition-all ${
                    isSel
                      ? 'bg-rose-50 border-rose-300'
                      : 'bg-white border-stone-200 active:bg-stone-100 hover:bg-stone-50'
                  }`}
                >
                  <Text
                    className={`text-base font-medium ${isSel ? 'text-rose-900 font-bold' : 'text-stone-700'}`}
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
            <Text className="text-base font-medium text-stone-700 ml-1.5">Financial Loss:</Text>
          </View>
          <Text className="text-lg font-bold text-rose-700">₱{costLost.toFixed(2)}</Text>
        </View>
      </View>
    </AdminModal>
  );
};
