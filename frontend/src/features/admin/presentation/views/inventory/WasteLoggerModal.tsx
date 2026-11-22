import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Trash2, Search } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type InventoryItemAdmin } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';
import { validateWasteInput } from './utils/inventoryCalculations';

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
  const [itemSearch, setItemSearch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('DROPPED_SPILL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedItemId(inventory[0]?.id || '');
      setItemSearch('');
      setQuantity('');
      setReason('DROPPED_SPILL');
      setErrorMsg(null);
    }
  }, [inventory, visible]);

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter(
      (i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
    );
  }, [inventory, itemSearch]);

  const selectedItem = inventory.find((inv) => inv.id === selectedItemId);
  const qtyNum = parseFloat(quantity) || 0;
  const currentStock = Number(selectedItem?.current_stock || 0);
  const resultingStock = currentStock - qtyNum;
  const costLost = selectedItem ? qtyNum * Number(selectedItem.unit_cost || 0) : 0;

  const handleSubmit = async () => {
    if (!selectedItemId) {
      setErrorMsg('Please select an inventory item.');
      return;
    }
    const validation = validateWasteInput(quantity);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Enter a valid waste quantity.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await adminApi.logWaste({
        inventoryItemId: selectedItemId,
        quantity: qtyNum,
        reason: reason as any,
      });

      toast.success(
        `Logged ${qtyNum} ${selectedItem?.unit} of ${selectedItem?.name} (${formatCurrency(costLost)} loss)`,
        { title: 'Waste Recorded' }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to log inventory waste.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <View className="flex-row items-center justify-end gap-2.5 w-full">
      <Pressable
        onPress={onClose}
        disabled={isSubmitting}
        className="min-h-[48px] px-5 items-center justify-center rounded-xl border border-[#E7E5E4] bg-white active:opacity-80"
      >
        <Text className="text-base font-bold text-[#1C1917]">Cancel</Text>
      </Pressable>
      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        className="min-h-[48px] flex-1 sm:flex-initial px-6 items-center justify-center rounded-xl bg-[#810021] active:opacity-85"
      >
        <Text className="text-base font-bold text-white">
          {isSubmitting ? 'Logging...' : 'Confirm Waste Entry'}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title="Log Spillage & Waste"
      subtitle="Deduct spilled, expired, or spoiled stock"
      icon={<Trash2 size={20} color="#810021" />}
      size="md"
      footer={footer}
    >
      <View className="gap-4">
        {/* Searchable Item Picker */}
        <View className="gap-2">
          <Text className="text-base font-semibold text-[#1C1917]">Select Item</Text>
          <AdminInput
            value={itemSearch}
            onChangeText={setItemSearch}
            placeholder="Search ingredient or SKU..."
            leftElement={<Search size={18} color="#78716C" />}
            clearable
          />
          <View className="rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] max-h-48 overflow-hidden">
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              <View className="divide-y divide-[#E7E5E4]">
                {filteredItems.map((inv) => {
                  const isSel = selectedItemId === inv.id;
                  return (
                    <Pressable
                      key={inv.id}
                      onPress={() => {
                        setErrorMsg(null);
                        setSelectedItemId(inv.id);
                      }}
                      className={`min-h-[48px] px-3.5 py-2.5 flex-row items-center justify-between gap-2 ${
                        isSel ? 'bg-[#810021]' : 'bg-white'
                      }`}
                    >
                      <Text
                        className={`flex-1 text-base font-semibold ${
                          isSel ? 'text-white' : 'text-[#1C1917]'
                        }`}
                        numberOfLines={1}
                      >
                        {inv.name}
                      </Text>
                      <Text
                        className={`text-base font-bold tabular-nums ${
                          isSel ? 'text-white' : 'text-[#78716C]'
                        }`}
                      >
                        {Number(inv.current_stock || 0).toFixed(1)} {inv.unit}
                      </Text>
                    </Pressable>
                  );
                })}
                {filteredItems.length === 0 && (
                  <View className="p-4 items-center">
                    <Text className="text-base text-[#78716C]">No matching items.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>

        <AdminNumberInput
          label={`Quantity Lost (${selectedItem?.unit || 'unit'})`}
          required
          mode="decimal"
          allowNegative={false}
          value={quantity}
          onChangeText={(val) => {
            setErrorMsg(null);
            setQuantity(val);
          }}
          placeholder="0.00"
          suffix={selectedItem?.unit}
        />

        {/* Reason */}
        <View className="gap-2">
          <Text className="text-base font-semibold text-[#1C1917]">Loss Reason</Text>
          <View className="gap-2">
            {WASTE_REASONS.map((r) => {
              const isSel = reason === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setReason(r.key)}
                  className={`min-h-[48px] px-4 flex-row items-center justify-between rounded-xl border ${
                    isSel ? 'bg-[#810021] border-[#810021]' : 'bg-white border-[#E7E5E4]'
                  }`}
                >
                  <Text
                    className={`text-base font-semibold ${isSel ? 'text-white' : 'text-[#1C1917]'}`}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Financial Loss & Remaining Stock Preview */}
        <View className="rounded-xl bg-[#FAF8F5] p-4 border border-[#E7E5E4] gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-[#78716C]">Estimated Loss</Text>
            <Text className="text-lg font-extrabold text-[#b32638] tabular-nums">
              {formatCurrency(costLost)}
            </Text>
          </View>
          {selectedItem && qtyNum > 0 && (
            <View className="flex-row items-center justify-between pt-2 border-t border-[#E7E5E4]">
              <Text className="text-base text-[#78716C]">Remaining After Waste</Text>
              <Text
                className={`text-base font-bold tabular-nums ${
                  resultingStock <= 0 ? 'text-[#b32638]' : 'text-[#1C1917]'
                }`}
              >
                {resultingStock.toFixed(2)} {selectedItem.unit}
                {resultingStock <= 0 && (selectedItem.linked_recipes?.length || 0) > 0
                  ? ' (Auto-86)'
                  : ''}
              </Text>
            </View>
          )}
        </View>

        {errorMsg && (
          <View className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3">
            <Text className="text-base font-semibold text-[#b32638]">{errorMsg}</Text>
          </View>
        )}
      </View>
    </AdminModal>
  );
};
