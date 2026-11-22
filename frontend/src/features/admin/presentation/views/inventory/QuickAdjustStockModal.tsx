import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sliders, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type InventoryItemAdmin } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminNumberInput } from '../../components/AdminNumberInput';
import { AdminInput } from '../../components/AdminInput';
import { validateQuickAdjustInput } from './utils/inventoryCalculations';

interface QuickAdjustStockModalProps {
  visible: boolean;
  onClose: () => void;
  item: InventoryItemAdmin | null;
  onSuccess: () => void;
}

const PRESET_REASONS = [
  'Routine Cycle Count',
  'Physical Shelf Audit',
  'Unrecorded Prep Spillage',
  'Delivery Correction',
  'Shift Handover Count',
];

export const QuickAdjustStockModal: React.FC<QuickAdjustStockModalProps> = ({
  visible,
  onClose,
  item,
  onSuccess,
}) => {
  const [newStock, setNewStock] = useState('');
  const [parLevel, setParLevel] = useState('');
  const [reason, setReason] = useState('Routine Cycle Count');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && item) {
      setNewStock(String(Math.max(0, Number(item.current_stock ?? 0))));
      setParLevel(String(item.min_alert_level ?? 1));
      setReason('Routine Cycle Count');
      setErrorMsg(null);
    }
  }, [item, visible]);

  if (!item) return null;

  const currentStockNum = Number(item.current_stock || 0);
  const parsedNewStock = parseFloat(newStock);
  const newStockNum = Number.isFinite(parsedNewStock) ? parsedNewStock : 0;
  const variance = newStockNum - currentStockNum;
  const unitCost = Number(item.unit_cost || 0);
  const varianceCost = variance * unitCost;
  const linkedCount = item.linked_recipes?.length || 0;
  const triggersAuto86 = newStockNum <= 0 && linkedCount > 0;

  const handleSave = async () => {
    const validation = validateQuickAdjustInput(newStock, parLevel);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Invalid stock or par level.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (variance !== 0) {
        await adminApi.quickAdjustStock({
          inventoryItemId: item.id,
          newStock: newStockNum,
          reason: reason.trim() || 'Manual quick count adjustment',
        });
      }

      const parsedPar = parseFloat(parLevel);
      if (Number.isFinite(parsedPar) && parsedPar !== Number(item.min_alert_level || 0)) {
        await adminApi.updateParLevel({
          inventoryItemId: item.id,
          newPar: parsedPar,
        });
      }

      toast.success(`Updated "${item.name}" to ${newStockNum.toFixed(2)} ${item.unit}`, {
        title: 'Stock Adjusted',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to adjust stock count.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title="Quick Stock Count"
      subtitle={item.name}
      icon={<Sliders size={20} color="#810021" />}
      size="md"
      footer={
        <View className="flex-row items-center justify-end gap-2.5 w-full">
          <Pressable
            onPress={onClose}
            disabled={isSubmitting}
            className="min-h-[48px] px-5 rounded-xl border border-[#E7E5E4] bg-white items-center justify-center active:opacity-80"
          >
            <Text className="text-base font-bold text-[#1C1917]">Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={isSubmitting}
            className="min-h-[48px] flex-1 sm:flex-initial px-5 rounded-xl bg-[#810021] flex-row items-center justify-center active:opacity-85"
          >
            <Text className="text-base font-bold text-white">
              {isSubmitting ? 'Saving...' : 'Save Adjustment'}
            </Text>
            <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </Pressable>
        </View>
      }
    >
      <View className="gap-4">
        {/* Item Snapshot */}
        <View className="rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 flex-row items-center justify-between gap-3">
          <View className="flex-1 min-w-0">
            <Text className="text-base font-bold text-[#1C1917]" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-base text-[#78716C]">{item.sku}</Text>
          </View>
          <View className="items-end">
            <Text className="text-base text-[#78716C]">Recorded</Text>
            <Text className="text-lg font-extrabold text-[#1C1917] tabular-nums">
              {currentStockNum.toFixed(2)} {item.unit}
            </Text>
          </View>
        </View>

        <AdminNumberInput
          label={`Actual Shelf Count (${item.unit})`}
          required
          value={newStock}
          onChangeText={(val) => {
            setErrorMsg(null);
            setNewStock(val);
          }}
          placeholder="0.00"
          mode="decimal"
          allowNegative={false}
          suffix={item.unit}
        />

        {/* Variance Summary */}
        <View
          className={`flex-row items-center justify-between flex-wrap gap-2 rounded-xl px-4 py-3 border ${
            variance === 0
              ? 'bg-[#FAF8F5] border-[#E7E5E4]'
              : variance > 0
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-rose-50 border-rose-200'
          }`}
        >
          <View className="flex-row items-center gap-2">
            {variance === 0 ? (
              <CheckCircle2 size={18} color="#78716C" />
            ) : (
              <AlertTriangle size={18} color={variance > 0 ? '#10b981' : '#b32638'} />
            )}
            <Text className="text-base font-bold text-[#1C1917] tabular-nums">
              {variance === 0
                ? 'Matches recorded stock'
                : `Variance: ${variance > 0 ? '+' : ''}${variance.toFixed(2)} ${item.unit}`}
            </Text>
          </View>

          {variance !== 0 && (
            <Text className="text-base font-bold text-[#1C1917] tabular-nums">
              {varianceCost > 0 ? '+' : ''}
              {formatCurrency(varianceCost)}
            </Text>
          )}
        </View>

        {triggersAuto86 && (
          <View className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
            <Text className="text-base font-semibold text-amber-900">
              Setting stock to 0 will Auto-86 {linkedCount} linked menu{' '}
              {linkedCount === 1 ? 'item' : 'items'}.
            </Text>
          </View>
        )}

        <AdminNumberInput
          label={`Min Par Alert (${item.unit})`}
          value={parLevel}
          onChangeText={(val) => {
            setErrorMsg(null);
            setParLevel(val);
          }}
          placeholder="1.00"
          mode="decimal"
          allowNegative={false}
          suffix={item.unit}
        />

        <View className="gap-2">
          <Text className="text-base font-semibold text-[#1C1917]">Adjustment Reason</Text>
          <View className="flex-row flex-wrap gap-2">
            {PRESET_REASONS.map((p) => {
              const isSelected = reason === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setReason(p)}
                  className={`min-h-[48px] px-3.5 rounded-xl border justify-center ${
                    isSelected ? 'bg-[#810021] border-[#810021]' : 'bg-white border-[#E7E5E4]'
                  }`}
                >
                  <Text
                    className={`text-base font-semibold ${
                      isSelected ? 'text-white' : 'text-[#1C1917]'
                    }`}
                  >
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <AdminInput
            value={reason}
            onChangeText={setReason}
            placeholder="Custom reason..."
            clearable
          />
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
