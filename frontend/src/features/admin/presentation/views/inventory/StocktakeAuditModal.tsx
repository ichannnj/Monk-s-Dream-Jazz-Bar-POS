import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ClipboardCheck, Search, CheckCircle2 } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { PosDropdown, type PosDropdownOption } from '@/features/shared';
import { adminApi, type InventoryItemAdmin } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';
import { CATEGORY_FILTERS } from './components/inventory.types';

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
  category: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showChangedOnly, setShowChangedOnly] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setRows(
        inventory.map((item) => ({
          inventory_item_id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          unit: item.unit,
          expected_quantity: Number(item.current_stock || 0),
          actual_quantity: String(Math.max(0, Number(item.current_stock || 0))),
          unit_cost: Number(item.unit_cost || 0),
        }))
      );
      setNotes('');
      setSearchQuery('');
      setCategoryFilter('ALL');
      setShowChangedOnly(false);
      setErrorMsg(null);
    }
  }, [visible, inventory]);

  const handleActualCountChange = (itemId: string, val: string) => {
    setErrorMsg(null);
    setRows((prev) =>
      prev.map((r) => (r.inventory_item_id === itemId ? { ...r, actual_quantity: val } : r))
    );
  };

  const categoryOptions: PosDropdownOption<string>[] = CATEGORY_FILTERS.map((c) => ({
    value: c.key,
    label: c.label,
  }));

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q || r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q);
      const matchesCat = categoryFilter === 'ALL' || r.category === categoryFilter;
      const act = parseFloat(r.actual_quantity);
      const hasDiff = Number.isFinite(act) && Math.abs(act - r.expected_quantity) > 0.001;
      const matchesChanged = !showChangedOnly || hasDiff;
      return matchesSearch && matchesCat && matchesChanged;
    });
  }, [rows, searchQuery, categoryFilter, showChangedOnly]);

  const totalVarianceCost = rows.reduce((acc, row) => {
    const act = parseFloat(row.actual_quantity);
    if (!Number.isFinite(act)) return acc;
    return acc + (act - row.expected_quantity) * row.unit_cost;
  }, 0);

  const varianceItemCount = rows.filter((r) => {
    const act = parseFloat(r.actual_quantity);
    return Number.isFinite(act) && Math.abs(act - r.expected_quantity) > 0.001;
  }).length;

  const handleSubmit = async () => {
    const invalidRow = rows.find((r) => {
      if (r.actual_quantity.trim() === '') return true;
      const act = parseFloat(r.actual_quantity);
      return !Number.isFinite(act) || act < 0;
    });

    if (invalidRow) {
      setErrorMsg(`Enter a valid non-negative count for "${invalidRow.name}".`);
      return;
    }

    const itemsToCommit = rows
      .filter((r) => {
        const act = parseFloat(r.actual_quantity);
        return Math.abs(act - r.expected_quantity) > 0.001;
      })
      .map((r) => ({
        inventory_item_id: r.inventory_item_id,
        expected_quantity: r.expected_quantity,
        actual_quantity: parseFloat(r.actual_quantity),
        unit_cost: r.unit_cost,
      }));

    if (itemsToCommit.length === 0) {
      toast.info('All physical counts match expected balances.', {
        title: 'No Discrepancies',
      });
      onClose();
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await adminApi.submitStocktakeAudit({
        notes: notes.trim() || 'Physical Stocktake Count',
        items: itemsToCommit,
      });

      toast.success(
        `Committed ${itemsToCommit.length} stocktake ${itemsToCommit.length === 1 ? 'adjustment' : 'adjustments'}.`,
        { title: 'Stocktake Saved' }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to commit stocktake audit.');
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
          {isSubmitting ? 'Committing...' : `Commit Audit (${varianceItemCount})`}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title="Physical Stocktake Audit"
      subtitle="Compare expected POS stock against physical shelf counts"
      icon={<ClipboardCheck size={20} color="#810021" />}
      size="xl"
      footer={footer}
    >
      <View className="gap-4">
        {/* Variance Summary */}
        <View className="flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FAF8F5] p-4 rounded-xl border border-[#E7E5E4]">
          <Text className="text-base font-semibold text-[#1C1917] tabular-nums">
            Discrepancies: <Text className="font-extrabold">{varianceItemCount}</Text> /{' '}
            {rows.length}
          </Text>
          <Text
            className={`text-base font-extrabold tabular-nums ${
              totalVarianceCost < 0
                ? 'text-[#b32638]'
                : totalVarianceCost > 0
                  ? 'text-[#10b981]'
                  : 'text-[#1C1917]'
            }`}
          >
            Net Variance: {totalVarianceCost < 0 ? '-' : '+'}
            {formatCurrency(Math.abs(totalVarianceCost))}
          </Text>
        </View>

        {/* Notes + Filters */}
        <AdminInput
          label="Audit Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Sunday Closing Bar & Kitchen Count"
          clearable
        />

        <View className="flex-col md:flex-row gap-2.5">
          <View className="flex-1">
            <AdminInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Filter items by name or SKU..."
              leftElement={<Search size={18} color="#78716C" />}
              clearable
            />
          </View>
          <View className="w-full md:w-56">
            <PosDropdown
              mode="select"
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          </View>
          <Pressable
            onPress={() => setShowChangedOnly((prev) => !prev)}
            className={`min-h-[48px] px-4 rounded-xl border items-center justify-center ${
              showChangedOnly ? 'bg-[#810021] border-[#810021]' : 'bg-white border-[#E7E5E4]'
            }`}
          >
            <Text
              className={`text-base font-bold ${showChangedOnly ? 'text-white' : 'text-[#1C1917]'}`}
            >
              Changed Only
            </Text>
          </Pressable>
        </View>

        {errorMsg && (
          <View className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3">
            <Text className="text-base font-semibold text-[#b32638]">{errorMsg}</Text>
          </View>
        )}

        {/* Responsive Item List */}
        <View className="rounded-xl border border-[#E7E5E4] bg-white overflow-hidden">
          <View className="hidden md:flex flex-row items-center border-b border-[#E7E5E4] bg-[#FAF8F5] px-4 py-3">
            <Text className="flex-1 text-base font-bold text-[#1C1917]">Item</Text>
            <Text className="w-28 text-center text-base font-bold text-[#1C1917]">Expected</Text>
            <Text className="w-40 text-center text-base font-bold text-[#1C1917]">Actual</Text>
            <Text className="w-32 text-right text-base font-bold text-[#1C1917]">Variance</Text>
          </View>

          {filteredRows.length === 0 ? (
            <View className="py-10 items-center justify-center px-4">
              <Text className="text-base text-[#78716C]">No items match this filter.</Text>
            </View>
          ) : (
            <View className="divide-y divide-[#E7E5E4]">
              {filteredRows.map((row) => {
                const act = parseFloat(row.actual_quantity);
                const isValidNum = Number.isFinite(act) && act >= 0;
                const diff = isValidNum ? act - row.expected_quantity : 0;
                const hasDiff = isValidNum && Math.abs(diff) > 0.001;

                return (
                  <View
                    key={row.inventory_item_id}
                    className={`p-4 ${hasDiff ? 'bg-[#FAF8F5]' : 'bg-white'}`}
                  >
                    {/* Desktop / Tablet Row */}
                    <View className="hidden md:flex flex-row items-center gap-3">
                      <View className="flex-1 min-w-0">
                        <Text className="text-base font-bold text-[#1C1917]" numberOfLines={1}>
                          {row.name}
                        </Text>
                        <Text className="text-base text-[#78716C] tabular-nums">
                          {row.sku} • {formatCurrency(row.unit_cost)}/{row.unit}
                        </Text>
                      </View>

                      <View className="w-28 items-center">
                        <Text className="text-base font-semibold text-[#1C1917] tabular-nums">
                          {row.expected_quantity} {row.unit}
                        </Text>
                      </View>

                      <View className="w-40">
                        <AdminNumberInput
                          mode="decimal"
                          allowNegative={false}
                          value={row.actual_quantity}
                          onChangeText={(v) => handleActualCountChange(row.inventory_item_id, v)}
                          placeholder="0.00"
                          suffix={row.unit}
                        />
                      </View>

                      <View className="w-32 items-end">
                        {hasDiff ? (
                          <Text
                            className={`text-base font-bold tabular-nums ${
                              diff < 0 ? 'text-[#b32638]' : 'text-[#10b981]'
                            }`}
                          >
                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {row.unit}
                          </Text>
                        ) : (
                          <View className="flex-row items-center gap-1">
                            <CheckCircle2 size={16} color="#10b981" />
                            <Text className="text-base font-semibold text-[#78716C]">Matched</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Mobile Stacked Card (< 768px) */}
                    <View className="flex md:hidden gap-3">
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="flex-1 min-w-0">
                          <Text className="text-base font-bold text-[#1C1917]">{row.name}</Text>
                          <Text className="text-base text-[#78716C] tabular-nums">
                            {row.sku} • Expected: {row.expected_quantity} {row.unit}
                          </Text>
                        </View>
                        {hasDiff ? (
                          <Text
                            className={`text-base font-bold tabular-nums ${
                              diff < 0 ? 'text-[#b32638]' : 'text-[#10b981]'
                            }`}
                          >
                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                          </Text>
                        ) : (
                          <Text className="text-base font-semibold text-[#78716C]">Matched</Text>
                        )}
                      </View>

                      <AdminNumberInput
                        label="Actual Count"
                        mode="decimal"
                        allowNegative={false}
                        value={row.actual_quantity}
                        onChangeText={(v) => handleActualCountChange(row.inventory_item_id, v)}
                        placeholder="0.00"
                        suffix={row.unit}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </AdminModal>
  );
};
