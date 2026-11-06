import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Sliders, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type InventoryItemAdmin } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminNumberInput } from '../../components/AdminNumberInput';
import { AdminInput } from '../../components/AdminInput';
import { formatCurrency } from '@monks/shared';

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
  'Supplier Delivery Correction',
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setNewStock(String(item.current_stock ?? 0));
      setParLevel(String(item.min_alert_level ?? 1));
      setReason('Routine Cycle Count');
    }
  }, [item]);

  if (!item) return null;

  const currentStockNum = Number(item.current_stock || 0);
  const newStockNum = parseFloat(newStock) || 0;
  const variance = newStockNum - currentStockNum;
  const unitCost = Number(item.unit_cost || 0);
  const varianceCost = variance * unitCost;

  const handleSave = async () => {
    if (isNaN(newStockNum)) {
      toast.error('Please enter a valid stock count', { title: 'Invalid Count' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Adjust Stock Count if changed
      if (variance !== 0) {
        await adminApi.quickAdjustStock({
          inventoryItemId: item.id,
          newStock: newStockNum,
          reason: reason.trim() || 'Manual quick count adjustment',
        });
      }

      // 2. Adjust Par Level if changed
      const parsedPar = parseFloat(parLevel);
      if (!isNaN(parsedPar) && parsedPar !== Number(item.min_alert_level || 0)) {
        await adminApi.updateParLevel({
          inventoryItemId: item.id,
          newPar: parsedPar,
        });
      }

      toast.success(
        `Updated "${item.name}" to ${newStockNum.toFixed(2)} ${item.unit} (Variance: ${variance > 0 ? '+' : ''}${variance.toFixed(2)} ${item.unit})`,
        { title: 'Stock Adjusted' }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[QuickAdjustStockModal] Adjustment error:', err);
      toast.error(err?.message || 'Failed to adjust stock count', { title: 'Adjustment Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title="Quick Stock Adjustment"
      subtitle={`Fast shelf count & alert threshold update for ${item.name}`}
      size="md"
      footer={
        <>
          <Pressable
            onPress={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] px-4 rounded-xl border border-stone-200 bg-white items-center justify-center active:bg-stone-50"
          >
            <Text className="text-sm font-bold text-stone-700">Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={isSubmitting}
            className="min-h-[44px] px-5 rounded-xl bg-[#800020] flex-row items-center justify-center active:opacity-90 shadow-xs"
          >
            <Text className="text-sm font-bold text-white">
              {isSubmitting ? 'Saving...' : 'Save Adjustment'}
            </Text>
            <ArrowRight size={16} color="#ffffff" className="ml-1.5" />
          </Pressable>
        </>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
        {/* Item Summary Card */}
        <View className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-extrabold text-stone-900">{item.name}</Text>
              <Text className="text-xs font-medium text-stone-500 mt-0.5">
                SKU: {item.sku} • Category: {item.category}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs font-semibold text-stone-500">Recorded Stock</Text>
              <Text className="text-lg font-black text-stone-900">
                {currentStockNum.toFixed(2)} {item.unit}
              </Text>
            </View>
          </View>
        </View>

        {/* New Actual Physical Stock Count */}
        <View className="space-y-1.5">
          <AdminNumberInput
            label={`Actual Shelf Stock Count (${item.unit})`}
            value={newStock}
            onChangeText={setNewStock}
            placeholder="0.00"
            mode="decimal"
            allowNegative={true}
            leftElement={<Sliders size={18} color="#78716c" />}
          />
        </View>

        {/* Real-Time Variance Pill */}
        <View
          className={`flex-row items-center justify-between rounded-xl px-4 py-2.5 border ${
            variance === 0
              ? 'bg-stone-100 border-stone-200'
              : variance > 0
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-rose-50 border-rose-200'
          }`}
        >
          <View className="flex-row items-center gap-2">
            {variance === 0 ? (
              <CheckCircle2 size={16} color="#57534e" />
            ) : variance > 0 ? (
              <ShieldCheck size={16} color="#047857" />
            ) : (
              <AlertTriangle size={16} color="#e11d48" />
            )}
            <Text
              className={`text-sm font-bold ${
                variance === 0
                  ? 'text-stone-700'
                  : variance > 0
                    ? 'text-emerald-800'
                    : 'text-rose-800'
              }`}
            >
              {variance === 0
                ? 'Counts match perfectly (0 variance)'
                : `Variance: ${variance > 0 ? '+' : ''}${variance.toFixed(2)} ${item.unit}`}
            </Text>
          </View>

          {variance !== 0 && (
            <Text
              className={`text-xs font-extrabold ${
                variance > 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {varianceCost > 0 ? '+' : ''}
              {formatCurrency(varianceCost)} MAC
            </Text>
          )}
        </View>

        {/* Low Stock Alert Threshold (Par Level) */}
        <View className="space-y-1.5">
          <AdminNumberInput
            label={`Low Stock Alert Threshold / Par Level (${item.unit})`}
            value={parLevel}
            onChangeText={setParLevel}
            placeholder="1.00"
            mode="decimal"
            allowNegative={false}
          />
          <Text className="text-[11px] text-stone-500">
            When on-hand inventory drops to or below this amount, soft alerts fire across the POS
            and KDS without blocking orders.
          </Text>
        </View>

        {/* Reason Presets */}
        <View className="space-y-2">
          <Text className="text-xs font-bold text-stone-700">Audit / Adjustment Reason</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {PRESET_REASONS.map((p) => {
              const isSelected = reason === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setReason(p)}
                  className={`rounded-lg px-2.5 py-1.5 border ${
                    isSelected
                      ? 'bg-[#800020] border-[#800020]'
                      : 'bg-white border-stone-200 active:bg-stone-50'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-stone-700'}`}
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
            placeholder="Custom audit reason or note..."
            className="mt-1"
          />
        </View>
      </ScrollView>
    </AdminModal>
  );
};
