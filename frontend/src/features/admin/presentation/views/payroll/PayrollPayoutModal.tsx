import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Switch, ActivityIndicator } from 'react-native';
import { CheckCircle2, Wallet } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { adminApi } from '../../../data/admin.api';
import type { PayrollPaymentMethod, PayrollRunItem, PayrollRunSummary } from './payroll.types';

interface PayrollPayoutModalProps {
  visible: boolean;
  onClose: () => void;
  run: PayrollRunSummary | null;
  targetItems: PayrollRunItem[];
  actorId?: string | null;
  onPaid: () => void;
}

const METHODS: { key: PayrollPaymentMethod; label: string }[] = [
  { key: 'CASH', label: 'Cash' },
  { key: 'GCASH', label: 'GCash' },
  { key: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { key: 'OTHER', label: 'Other' },
];

const fmtPhp = (n: number) =>
  `₱${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PayrollPayoutModal: React.FC<PayrollPayoutModalProps> = ({
  visible,
  onClose,
  run,
  targetItems,
  actorId,
  onPaid,
}) => {
  const [method, setMethod] = useState<PayrollPaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [deductCashDrawer, setDeductCashDrawer] = useState(false);
  const [drawerTarget, setDrawerTarget] = useState<'main' | 'bar'>('main');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setMethod('CASH');
      setReference('');
      setNotes('');
      setDeductCashDrawer(false);
      setDrawerTarget('main');
    }
  }, [visible]);

  if (!run || targetItems.length === 0) return null;

  const totalAmount = targetItems.reduce((sum, i) => sum + Number(i.net_pay || 0), 0);
  const isBatch = targetItems.length > 1;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await adminApi.recordPayrollPayout({
        runId: run.id,
        itemIds: targetItems.map((i) => i.id),
        paymentMethod: method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        deductCashDrawer: method === 'CASH' && deductCashDrawer,
        drawerTarget,
        actorId,
      });
      if (!res.success) {
        toast.error(res.error || 'Failed to record payout');
        return;
      }
      toast.success(
        `Marked ${res.paidCount} employee${res.paidCount === 1 ? '' : 's'} Paid (${fmtPhp(res.totalDisbursed || totalAmount)})`
      );
      onPaid();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Payout failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title={
        isBatch
          ? `Pay All Pending (${targetItems.length} Staff)`
          : `Pay ${targetItems[0].employee_name}`
      }
      subtitle={`${run.title} · ${run.run_code}`}
    >
      <View className="space-y-4">
        {/* Total Banner */}
        <View className="rounded-xl border border-[#810021]/30 bg-[#EFECE6] p-3.5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Wallet size={18} color="#810021" />
            <Text className="text-xs font-bold text-stone-700">Total Disbursement</Text>
          </View>
          <Text
            className="text-xl font-black text-[#810021]"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {fmtPhp(totalAmount)}
          </Text>
        </View>

        {/* Payment Method */}
        <View>
          <Text className="text-xs font-bold text-stone-700 mb-1.5">Payout Method</Text>
          <View className="flex-row flex-wrap gap-2">
            {METHODS.map((m) => {
              const active = method === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setMethod(m.key)}
                  className={`px-3.5 py-2.5 rounded-xl border ${
                    active ? 'bg-[#810021] border-[#810021]' : 'bg-[#F7F5F2] border-stone-200'
                  }`}
                >
                  <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-stone-800'}`}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Cash Drawer Opt-In Toggle */}
        {method === 'CASH' && (
          <View className="rounded-xl border border-stone-200 bg-[#F7F5F2] p-3 space-y-2.5">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 min-w-0">
                <Text className="text-xs font-bold text-stone-900">
                  Deduct from POS Cash Drawer
                </Text>
                <Text className="text-[11px] text-stone-500">
                  Posts a CASH_OUT entry to the selected register till
                </Text>
              </View>
              <Switch
                value={deductCashDrawer}
                onValueChange={setDeductCashDrawer}
                trackColor={{ false: '#d6d3d1', true: '#810021' }}
                accessibilityLabel="Deduct from POS Cash Drawer"
              />
            </View>

            {deductCashDrawer && (
              <View className="flex-row gap-2 pt-1">
                {(['main', 'bar'] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setDrawerTarget(t)}
                    className={`flex-1 py-2 rounded-lg border items-center ${
                      drawerTarget === t
                        ? 'bg-stone-900 border-stone-900'
                        : 'bg-white border-stone-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        drawerTarget === t ? 'text-white' : 'text-stone-700'
                      }`}
                    >
                      {t === 'main' ? 'Main Register' : 'Bar Till'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        <AdminInput
          label="Reference # (Optional)"
          value={reference}
          onChangeText={setReference}
          placeholder="e.g. GCash Ref #8921 or Voucher #…"
        />

        <AdminInput
          label="Payout Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Released by Manager…"
        />

        <View className="flex-row justify-end gap-2 pt-1">
          <Pressable
            onPress={onClose}
            className="h-12 px-4 rounded-xl border border-stone-300 bg-white items-center justify-center"
          >
            <Text className="text-sm font-bold text-stone-700">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            disabled={isSubmitting}
            className="h-12 px-5 rounded-xl bg-[#810021] flex-row items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <CheckCircle2 size={16} color="#FFFFFF" />
            )}
            <Text className="text-sm font-bold text-white">
              {isSubmitting ? 'Recording…' : 'Confirm Paid'}
            </Text>
          </Pressable>
        </View>
      </View>
    </AdminModal>
  );
};
