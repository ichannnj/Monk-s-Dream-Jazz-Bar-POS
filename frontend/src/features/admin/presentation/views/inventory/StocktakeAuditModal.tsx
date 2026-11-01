import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal } from 'react-native';
import { X, ClipboardCheck, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type InventoryItemAdmin } from '../../../data/admin.api';

interface StocktakeAuditModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inventory: InventoryItemAdmin[];
}

interface CountRow {
  inventory_item_id: string;
  name: string;
  sku: string;
  unit: string;
  expected_quantity: number;
  actual_quantity: string;
  unit_cost: number;
}

export const StocktakeAuditModal: React.FC<StocktakeAuditModalProps> = ({
  visible,
  onClose,
  onSuccess,
  inventory,
}) => {
  const [rows, setRows] = useState<CountRow[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setRows(
        inventory.map((item) => ({
          inventory_item_id: item.id,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          expected_quantity: item.current_stock,
          actual_quantity: item.current_stock.toString(),
          unit_cost: item.unit_cost,
        }))
      );
      setNotes('Routine weekly inventory cycle count audit');
    }
  }, [inventory, visible]);

  const handleActualCountChange = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.inventory_item_id === id ? { ...r, actual_quantity: value } : r))
    );
  };

  // Calculate live aggregate variance
  const totalVarianceCost = rows.reduce((acc, r) => {
    const actual = parseFloat(r.actual_quantity);
    if (isNaN(actual)) return acc;
    const diff = actual - r.expected_quantity;
    return acc + diff * r.unit_cost;
  }, 0);

  const varianceItemCount = rows.filter((r) => {
    const actual = parseFloat(r.actual_quantity);
    return !isNaN(actual) && Math.abs(actual - r.expected_quantity) > 0.001;
  }).length;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const itemsPayload = rows.map((r) => ({
        inventory_item_id: r.inventory_item_id,
        expected_quantity: r.expected_quantity,
        actual_quantity: parseFloat(r.actual_quantity) || 0,
        unit_cost: r.unit_cost,
      }));

      await adminApi.submitStocktakeAudit({
        notes: notes.trim(),
        items: itemsPayload,
      });

      toast.success(
        `Audit committed: ${varianceItemCount} items reconciled (Variance: ₱${totalVarianceCost.toFixed(2)})`,
        { title: 'Stocktake Complete' }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit stocktake audit', { title: 'Audit Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-6">
        <View className="w-full max-w-4xl max-h-[92%] rounded-2xl bg-white shadow-2xl overflow-hidden flex-col">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
            <View className="flex-row items-center space-x-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10">
                <ClipboardCheck size={22} color="#800020" />
              </View>
              <View>
                <Text className="text-xl font-bold text-stone-900">
                  Physical Inventory Count (Stocktake Audit)
                </Text>
                <Text className="text-base text-stone-500">
                  Compare theoretical POS stock against counted on-hand quantity
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl active:bg-stone-200"
            >
              <X size={22} color="#57534e" />
            </Pressable>
          </View>

          {/* Variance Summary Bar */}
          <View className="flex-row items-center justify-between bg-stone-100 px-6 py-3 border-b border-stone-200">
            <View className="flex-row items-center space-x-2">
              <AlertCircle size={20} color={varianceItemCount > 0 ? '#b45309' : '#059669'} />
              <Text className="text-base font-medium text-stone-700">
                Items with Discrepancy:{' '}
                <Text className="font-bold text-stone-900">{varianceItemCount}</Text> of{' '}
                {rows.length}
              </Text>
            </View>
            <View className="flex-row items-center space-x-2">
              <Text className="text-base font-medium text-stone-700">Net Variance Cost:</Text>
              <Text
                className={`text-lg font-extrabold ${
                  totalVarianceCost < 0
                    ? 'text-rose-700'
                    : totalVarianceCost > 0
                      ? 'text-emerald-700'
                      : 'text-stone-700'
                }`}
              >
                {totalVarianceCost < 0 ? '-' : '+'}₱{Math.abs(totalVarianceCost).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Items Table */}
          <ScrollView className="p-6 space-y-3" showsVerticalScrollIndicator={false}>
            <View className="mb-2">
              <Text className="text-base font-semibold text-stone-800 mb-1">Audit Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. End of Month Liquor & Coffee Audit"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-base text-stone-900"
              />
            </View>

            <View className="rounded-xl border border-stone-200 bg-white overflow-hidden">
              <View className="flex-row items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
                <Text className="flex-1 text-base font-bold text-stone-700">Item & SKU</Text>
                <Text className="w-28 text-center text-base font-bold text-stone-700">
                  Expected
                </Text>
                <Text className="w-36 text-center text-base font-bold text-stone-700">
                  Actual Count
                </Text>
                <Text className="w-32 text-right text-base font-bold text-stone-700">Variance</Text>
              </View>

              {rows.map((row) => {
                const actual = parseFloat(row.actual_quantity);
                const hasDiff = !isNaN(actual) && Math.abs(actual - row.expected_quantity) > 0.001;
                const diff = (actual || 0) - row.expected_quantity;
                const diffCost = diff * row.unit_cost;

                return (
                  <View
                    key={row.inventory_item_id}
                    className={`flex-row items-center justify-between border-b border-stone-100 px-4 py-3 ${
                      hasDiff ? 'bg-amber-50/50' : 'bg-white'
                    }`}
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-bold text-stone-900">{row.name}</Text>
                      <Text className="text-base text-stone-500">
                        {row.sku} • ₱{row.unit_cost.toFixed(2)}/{row.unit}
                      </Text>
                    </View>

                    <View className="w-28 items-center">
                      <Text className="text-base font-medium text-stone-700">
                        {row.expected_quantity} {row.unit}
                      </Text>
                    </View>

                    <View className="w-36 items-center">
                      <TextInput
                        value={row.actual_quantity}
                        onChangeText={(v) => handleActualCountChange(row.inventory_item_id, v)}
                        keyboardType="numeric"
                        className="min-h-[48px] w-full rounded-xl border border-stone-300 bg-white px-3 text-center text-base font-bold text-stone-900"
                      />
                    </View>

                    <View className="w-32 items-end">
                      {hasDiff ? (
                        <View className="items-end">
                          <Text
                            className={`text-base font-bold ${
                              diff < 0 ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {row.unit}
                          </Text>
                          <Text className="text-base text-stone-500">
                            ₱{Math.abs(diffCost).toFixed(2)}
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center space-x-1">
                          <CheckCircle2 size={16} color="#059669" />
                          <Text className="text-base font-medium text-emerald-700">Matched</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

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
                {isSubmitting ? 'Committing...' : 'Commit Audit & Adjust Ledger'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
