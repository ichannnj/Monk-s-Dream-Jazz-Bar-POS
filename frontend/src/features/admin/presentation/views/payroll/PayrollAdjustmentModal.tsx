import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';
import { adminApi } from '../../../data/admin.api';
import { computePayrollItemTotals } from './payrollEngine';
import type { PayrollRunItem } from './payroll.types';

interface PayrollAdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  item: PayrollRunItem | null;
  actorId?: string | null;
  onSaved: () => void;
}

const fmtPhp = (n: number) =>
  `₱${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PayrollAdjustmentModal: React.FC<PayrollAdjustmentModalProps> = ({
  visible,
  onClose,
  item,
  actorId,
  onSaved,
}) => {
  const [cutoffBonus, setCutoffBonus] = useState('0');
  const [serviceChargeShare, setServiceChargeShare] = useState('0');
  const [otherAdditions, setOtherAdditions] = useState('0');
  const [additionsNotes, setAdditionsNotes] = useState('');

  const [cashAdvance, setCashAdvance] = useState('0');
  const [sss, setSss] = useState('0');
  const [philhealth, setPhilhealth] = useState('0');
  const [pagibig, setPagibig] = useState('0');
  const [tax, setTax] = useState('0');
  const [otherDeductions, setOtherDeductions] = useState('0');
  const [deductionsNotes, setDeductionsNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item && visible) {
      setCutoffBonus(String(item.cutoff_bonus || 0));
      setServiceChargeShare(String(item.service_charge_share || 0));
      setOtherAdditions(String(item.other_additions || 0));
      setAdditionsNotes(item.additions_notes || '');
      setCashAdvance(String(item.cash_advance_deduction || 0));
      setSss(String(item.sss_deduction || 0));
      setPhilhealth(String(item.philhealth_deduction || 0));
      setPagibig(String(item.pagibig_deduction || 0));
      setTax(String(item.tax_deduction || 0));
      setOtherDeductions(String(item.other_deductions || 0));
      setDeductionsNotes(item.deductions_notes || '');
    }
  }, [item, visible]);

  const preview = useMemo(() => {
    if (!item) return null;
    return computePayrollItemTotals({
      ...item,
      cutoff_bonus: parseFloat(cutoffBonus) || 0,
      service_charge_share: parseFloat(serviceChargeShare) || 0,
      other_additions: parseFloat(otherAdditions) || 0,
      cash_advance_deduction: parseFloat(cashAdvance) || 0,
      sss_deduction: parseFloat(sss) || 0,
      philhealth_deduction: parseFloat(philhealth) || 0,
      pagibig_deduction: parseFloat(pagibig) || 0,
      tax_deduction: parseFloat(tax) || 0,
      other_deductions: parseFloat(otherDeductions) || 0,
    });
  }, [
    item,
    cutoffBonus,
    serviceChargeShare,
    otherAdditions,
    cashAdvance,
    sss,
    philhealth,
    pagibig,
    tax,
    otherDeductions,
  ]);

  if (!item) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await adminApi.updateItemAdjustments({
        itemId: item.id,
        cutoffBonus: Math.max(0, parseFloat(cutoffBonus) || 0),
        serviceChargeShare: Math.max(0, parseFloat(serviceChargeShare) || 0),
        otherAdditions: Math.max(0, parseFloat(otherAdditions) || 0),
        additionsNotes: additionsNotes.trim() || null,
        cashAdvanceDeduction: Math.max(0, parseFloat(cashAdvance) || 0),
        sssDeduction: Math.max(0, parseFloat(sss) || 0),
        philhealthDeduction: Math.max(0, parseFloat(philhealth) || 0),
        pagibigDeduction: Math.max(0, parseFloat(pagibig) || 0),
        taxDeduction: Math.max(0, parseFloat(tax) || 0),
        otherDeductions: Math.max(0, parseFloat(otherDeductions) || 0),
        deductionsNotes: deductionsNotes.trim() || null,
        actorId,
      });
      if (!res.success) {
        toast.error(res.error || 'Failed to save adjustments');
        return;
      }
      toast.success(`Updated adjustments for ${item.employee_name}`);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save adjustments');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title={`Adjustments · ${item.employee_name}`}
      subtitle={`Attendance Gross: ${fmtPhp(item.gross_pay)}`}
    >
      <View className="space-y-4">
        {/* Additions */}
        <View className="rounded-xl border border-stone-200 bg-[#F7F5F2] p-3 space-y-2.5">
          <Text className="text-xs font-black text-stone-800 uppercase tracking-wider">
            Additions
          </Text>
          <View className="flex-col sm:flex-row gap-2">
            <View className="flex-1">
              <AdminNumberInput
                label="Cutoff Bonus (₱)"
                value={cutoffBonus}
                onChangeText={setCutoffBonus}
              />
            </View>
            <View className="flex-1">
              <AdminNumberInput
                label="Service Charge Share (₱)"
                value={serviceChargeShare}
                onChangeText={setServiceChargeShare}
              />
            </View>
            <View className="flex-1">
              <AdminNumberInput
                label="Other Additions (₱)"
                value={otherAdditions}
                onChangeText={setOtherAdditions}
              />
            </View>
          </View>
          <AdminInput
            label="Additions Note (Optional)"
            value={additionsNotes}
            onChangeText={setAdditionsNotes}
            placeholder="e.g. Live jazz night bonus…"
          />
        </View>

        {/* Deductions */}
        <View className="rounded-xl border border-stone-200 bg-[#F7F5F2] p-3 space-y-2.5">
          <Text className="text-xs font-black text-[#810021] uppercase tracking-wider">
            Deductions
          </Text>
          <View className="flex-col sm:flex-row gap-2">
            <View className="flex-1">
              <AdminNumberInput
                label="Cash Advance / Vale (₱)"
                value={cashAdvance}
                onChangeText={setCashAdvance}
              />
            </View>
            <View className="flex-1">
              <AdminNumberInput
                label="Other Deductions (₱)"
                value={otherDeductions}
                onChangeText={setOtherDeductions}
              />
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <View className="flex-1 min-w-[110px]">
              <AdminNumberInput label="SSS (₱)" value={sss} onChangeText={setSss} />
            </View>
            <View className="flex-1 min-w-[110px]">
              <AdminNumberInput
                label="PhilHealth (₱)"
                value={philhealth}
                onChangeText={setPhilhealth}
              />
            </View>
            <View className="flex-1 min-w-[110px]">
              <AdminNumberInput label="Pag-IBIG (₱)" value={pagibig} onChangeText={setPagibig} />
            </View>
            <View className="flex-1 min-w-[110px]">
              <AdminNumberInput label="Tax (₱)" value={tax} onChangeText={setTax} />
            </View>
          </View>
          <AdminInput
            label="Deductions Note (Optional)"
            value={deductionsNotes}
            onChangeText={setDeductionsNotes}
            placeholder="e.g. Vale taken Nov 10…"
          />
        </View>

        {/* Live Net Preview */}
        {preview && (
          <View className="rounded-xl border border-stone-300 bg-[#EFECE6] p-3 flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-bold text-stone-600">Net Take-Home Pay</Text>
              {preview.deductionsExceedGross && (
                <Text className="text-[11px] font-bold text-[#810021]">
                  Deductions exceed gross; clamped to ₱0.00
                </Text>
              )}
            </View>
            <Text
              className="text-xl font-black text-[#810021]"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {fmtPhp(preview.netPay)}
            </Text>
          </View>
        )}

        <View className="flex-row justify-end gap-2 pt-1">
          <Pressable
            onPress={onClose}
            className="h-12 px-4 rounded-xl border border-stone-300 bg-white items-center justify-center"
          >
            <Text className="text-sm font-bold text-stone-700">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            className="h-12 px-5 rounded-xl bg-[#810021] flex-row items-center justify-center gap-2"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <CheckCircle2 size={16} color="#FFFFFF" />
            )}
            <Text className="text-sm font-bold text-white">
              {isSaving ? 'Saving…' : 'Save Adjustments'}
            </Text>
          </Pressable>
        </View>
      </View>
    </AdminModal>
  );
};
