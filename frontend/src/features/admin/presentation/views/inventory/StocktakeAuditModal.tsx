import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ClipboardCheck, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type InventoryItemAdmin } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';

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
      setNotes('');
    }
  }, [visible, inventory]);

  const handleActualCountChange = (itemId: string, val: string) => {
    setRows((prev) =>
      prev.map((r) => (r.inventory_item_id === itemId ? { ...r, actual_quantity: val } : r))
    );
  };

  const totalVarianceCost = rows.reduce((acc, row) => {
    const act = parseFloat(row.actual_quantity) || 0;
    const diff = act - row.expected_quantity;
    return acc + diff * row.unit_cost;
  }, 0);

  const varianceItemCount = rows.filter((r) => {
    const act = parseFloat(r.actual_quantity) || 0;
    return Math.abs(act - r.expected_quantity) > 0.001;
  }).length;

  const handleSubmit = async () => {
    const itemsToCommit = rows
      .filter((r) => {
        const act = parseFloat(r.actual_quantity);
        return !isNaN(act) && Math.abs(act - r.expected_quantity) > 0.001;
      })
      .map((r) => ({
        inventory_item_id: r.inventory_item_id,
        expected_quantity: r.expected_quantity,
        actual_quantity: parseFloat(r.actual_quantity) || 0,
        unit_cost: r.unit_cost,
      }));

    if (itemsToCommit.length === 0) {
      toast.info('No quantity variances found. Inventory matches counts.', {
        title: 'All Matched',
      });
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.submitStocktakeAudit({
        notes: notes.trim() || 'Physical Stocktake Count',
        items: itemsToCommit,
      });

      toast.success(
        `Adjusted ${itemsToCommit.length} inventory item balances in the general ledger.`,
        { title: 'Stocktake Committed' }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to commit stocktake audit', { title: 'Error' });
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
          {isSubmitting ? 'Committing...' : 'Commit Audit & Adjust Ledger'}
        </Text>
      </Pressable>
    </>
  );

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title="Physical Inventory Count (Stocktake Audit)"
      subtitle="Compare theoretical POS stock against counted on-hand quantity"
      icon={<ClipboardCheck size={22} color="#800020" />}
      size="xl"
      footer={footer}
    >
      <View className="space-y-4">
        {/* Variance Summary Bar */}
        <View className="flex-row items-center justify-between bg-stone-100 p-4 rounded-xl border border-stone-200">
          <View className="flex-row items-center space-x-2">
            <AlertCircle size={20} color={varianceItemCount > 0 ? '#b45309' : '#059669'} />
            <Text className="text-base font-medium text-stone-700 ml-2">
              Items with Discrepancy:{' '}
              <Text className="font-bold text-stone-900">{varianceItemCount}</Text> of {rows.length}
            </Text>
          </View>
          <View className="flex-row items-center space-x-2">
            <Text className="text-base font-medium text-stone-700">Net Variance Cost:</Text>
            <Text
              className={`text-lg font-extrabold ml-1.5 ${
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

        {/* Audit Notes */}
        <AdminInput
          label="Audit Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. End of Month Liquor & Coffee Audit"
        />

        {/* Items Table */}
        <View className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <View className="flex-row items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
            <Text className="flex-1 text-base font-bold text-stone-700">Item & SKU</Text>
            <Text className="w-28 text-center text-base font-bold text-stone-700">Expected</Text>
            <Text className="w-36 text-center text-base font-bold text-stone-700">
              Actual Count
            </Text>
            <Text className="w-32 text-right text-base font-bold text-stone-700">Variance</Text>
          </View>

          <View className="divide-y divide-stone-100">
            {rows.map((row) => {
              const act = parseFloat(row.actual_quantity) || 0;
              const diff = act - row.expected_quantity;
              const hasDiff = Math.abs(diff) > 0.001;
              const diffCost = diff * row.unit_cost;

              return (
                <View
                  key={row.inventory_item_id}
                  className={`flex-row items-center justify-between px-4 py-3 ${
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
                    <AdminNumberInput
                      mode="decimal"
                      value={row.actual_quantity}
                      onChangeText={(v) => handleActualCountChange(row.inventory_item_id, v)}
                      placeholder="0.00"
                      className="text-center font-bold"
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
                        <Text className="text-sm font-medium text-stone-500">
                          ₱{Math.abs(diffCost).toFixed(2)}
                        </Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center space-x-1">
                        <CheckCircle2 size={16} color="#059669" />
                        <Text className="text-base font-medium text-emerald-700 ml-1">Matched</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </AdminModal>
  );
};
