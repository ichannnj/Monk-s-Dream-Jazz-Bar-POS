import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Package, ArrowRight } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { PosDropdown, type PosDropdownOption } from '@/features/shared';
import { adminApi, type InventoryItemAdmin, type SupplierAdmin } from '../../../data/admin.api';
import { AdminModal, AdminInput, AdminNumberInput } from '../../components';
import {
  calculateSuggestedBuyQty,
  calculateWeightedMac,
  validateRestockInput,
} from './utils/inventoryCalculations';

interface RestockIntakeModalProps {
  visible: boolean;
  item: InventoryItemAdmin | null;
  suppliers: SupplierAdmin[];
  onClose: () => void;
  onSuccess: () => void;
}

export const RestockIntakeModal: React.FC<RestockIntakeModalProps> = ({
  visible,
  item,
  suppliers,
  onClose,
  onSuccess,
}) => {
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [invoice, setInvoice] = useState('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && item) {
      const suggested = calculateSuggestedBuyQty(
        item.current_stock,
        item.min_alert_level,
        item.target_stock_level
      );
      setQty(suggested > 0 ? String(suggested) : '');
      setCost(Number(item.unit_cost || 0) > 0 ? String(item.unit_cost) : '');
      setInvoice('');
      setSupplierId(item.supplier_id || item.supplier?.id || '');
      setErrorMsg(null);
    }
  }, [visible, item]);

  if (!item) return null;

  const currentStock = Number(item.current_stock || 0);
  const currentCost = Number(item.unit_cost || 0);
  const parsedQty = parseFloat(qty) || 0;
  const parsedCost = parseFloat(cost) || 0;
  const hasValidPreview = parsedQty > 0 && parsedCost >= 0;

  const projectedStock = Math.max(0, currentStock) + (parsedQty > 0 ? parsedQty : 0);
  const projectedMac = calculateWeightedMac(currentStock, currentCost, parsedQty, parsedCost);
  const lineTotal = parsedQty > 0 && parsedCost >= 0 ? parsedQty * parsedCost : 0;

  const suggestedQty = calculateSuggestedBuyQty(
    item.current_stock,
    item.min_alert_level,
    item.target_stock_level
  );

  const supplierOptions: PosDropdownOption<string>[] = [
    { value: '', label: 'Keep current / Direct purchase' },
    ...suppliers.map((s) => ({
      value: s.id,
      label: s.name,
    })),
  ];

  const handleSubmit = async () => {
    const check = validateRestockInput(qty, cost);
    if (!check.valid) {
      setErrorMsg(check.error || 'Please check quantity and unit cost.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const selectedSup = suppliers.find((s) => s.id === supplierId);
      await adminApi.restockDelivery({
        inventoryItemId: item.id,
        quantity: parseFloat(qty),
        invoiceUnitCost: parseFloat(cost),
        supplierId: selectedSup?.id || null,
        supplierName: selectedSup?.name || item.supplier?.name || item.supplier_name || undefined,
        invoiceNumber: invoice.trim() || undefined,
      });

      toast.success(
        `Added ${parseFloat(qty)} ${item.unit} of ${item.name}. New MAC: ${formatCurrency(projectedMac)}/${item.unit}`,
        { title: 'Delivery Recorded' }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record restock delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <View className="flex-row items-center justify-end gap-2.5 w-full">
      <Pressable
        onPress={onClose}
        disabled={isSubmitting}
        className="min-h-[48px] px-5 rounded-xl border border-[#E7E5E4] bg-white items-center justify-center active:opacity-80"
      >
        <Text className="text-base font-bold text-[#1C1917]">Cancel</Text>
      </Pressable>

      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        className="min-h-[48px] flex-1 sm:flex-initial px-6 rounded-xl bg-[#810021] flex-row items-center justify-center active:opacity-85"
      >
        <Text className="text-base font-bold text-white">
          {isSubmitting ? 'Saving...' : 'Confirm Delivery'}
        </Text>
        <ArrowRight size={18} color="#F5F5F5" style={{ marginLeft: 8 }} />
      </Pressable>
    </View>
  );

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title="Restock Intake"
      subtitle={item.name}
      icon={<Package size={20} color="#810021" />}
      size="md"
      footer={footer}
    >
      <View className="gap-4">
        {/* Item Snapshot */}
        <View className="flex-row items-center gap-3 rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] p-3.5">
          {item.reference_image_url ? (
            <Image
              source={{ uri: item.reference_image_url }}
              style={{ width: 52, height: 52, borderRadius: 10 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View className="h-[52px] w-[52px] rounded-xl border border-[#E7E5E4] bg-white items-center justify-center">
              <Package size={22} color="#78716C" />
            </View>
          )}
          <View className="flex-1 min-w-0">
            <Text className="text-base font-bold text-[#1C1917]" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-base text-[#78716C] tabular-nums">
              On-hand: {currentStock.toFixed(2)} {item.unit} • MAC: {formatCurrency(currentCost)}
            </Text>
          </View>
        </View>

        {/* Suggested Fill Chip */}
        {suggestedQty > 0 && (
          <Pressable
            onPress={() => setQty(String(suggestedQty))}
            className="min-h-[48px] flex-row items-center justify-between rounded-xl border border-[#E7E5E4] bg-white px-4 active:opacity-80"
          >
            <Text className="text-base font-medium text-[#1C1917]">
              Suggested buy to reach target
            </Text>
            <Text className="text-base font-bold text-[#810021] tabular-nums">
              Fill +{suggestedQty} {item.unit}
            </Text>
          </Pressable>
        )}

        {/* Quantity & Unit Cost */}
        <View className="flex-col sm:flex-row gap-3">
          <View className="flex-1">
            <AdminNumberInput
              label={`Received Qty (${item.unit})`}
              required
              mode="decimal"
              value={qty}
              onChangeText={(val) => {
                setErrorMsg(null);
                setQty(val);
              }}
              placeholder="0.00"
              suffix={item.unit}
            />
          </View>
          <View className="flex-1">
            <AdminNumberInput
              label={`Invoice Cost / ${item.unit}`}
              required
              mode="currency"
              value={cost}
              onChangeText={(val) => {
                setErrorMsg(null);
                setCost(val);
              }}
              placeholder="0.00"
            />
          </View>
        </View>

        {/* Supplier & Invoice Ref */}
        <View className="flex-col sm:flex-row gap-3">
          <View className="flex-1">
            <Text className="text-base font-semibold text-[#1C1917] mb-1.5">Supplier</Text>
            <PosDropdown
              mode="select"
              options={supplierOptions}
              value={supplierId}
              onChange={setSupplierId}
            />
          </View>
          <View className="flex-1">
            <AdminInput
              label="Invoice / Receipt #"
              value={invoice}
              onChangeText={setInvoice}
              placeholder="e.g. INV-4021"
              clearable
            />
          </View>
        </View>

        {/* Live Weighted MAC Preview */}
        {hasValidPreview && (
          <View className="rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-base text-[#78716C]">New Stock Balance</Text>
              <Text className="text-base font-bold text-[#1C1917] tabular-nums">
                {projectedStock.toFixed(2)} {item.unit}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-base text-[#78716C]">Updated Moving Avg Cost</Text>
              <Text className="text-base font-bold text-[#810021] tabular-nums">
                {formatCurrency(projectedMac)}/{item.unit}
              </Text>
            </View>
            <View className="flex-row items-center justify-between pt-2 border-t border-[#E7E5E4]">
              <Text className="text-base font-semibold text-[#1C1917]">Delivery Total</Text>
              <Text className="text-lg font-extrabold text-[#1C1917] tabular-nums">
                {formatCurrency(lineTotal)}
              </Text>
            </View>
          </View>
        )}

        {errorMsg && (
          <View className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3">
            <Text className="text-base font-semibold text-[#b32638]">{errorMsg}</Text>
          </View>
        )}
      </View>
    </AdminModal>
  );
};
