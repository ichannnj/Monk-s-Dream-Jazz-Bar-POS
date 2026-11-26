import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ban, RotateCcw } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { adminApi } from '../../../data/admin.api';
import type { PayrollRunSummary } from './payroll.types';

interface PayrollReopenVoidModalProps {
  visible: boolean;
  mode: 'reopen' | 'void';
  onClose: () => void;
  run: PayrollRunSummary | null;
  actorId?: string | null;
  onSuccess: () => void;
}

export const PayrollReopenVoidModal: React.FC<PayrollReopenVoidModalProps> = ({
  visible,
  mode,
  onClose,
  run,
  actorId,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason('');
      setManagerPin('');
    }
  }, [visible]);

  if (!run) return null;

  const requiresPin =
    mode === 'void' &&
    (run.status === 'PARTIALLY_PAID' ||
      run.status === 'PAID' ||
      Number(run.paid_amount_total || 0) > 0);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.error('Please enter an audit reason');
      return;
    }
    if (requiresPin && !/^\d{4}$/.test(managerPin.trim())) {
      toast.error('Enter your 4-digit Manager Override PIN');
      return;
    }

    setIsSubmitting(true);
    try {
      const res =
        mode === 'reopen'
          ? await adminApi.reopenPayrollRun(run.id, reason.trim(), actorId)
          : await adminApi.voidPayrollRun({
              runId: run.id,
              reason: reason.trim(),
              managerPin: requiresPin ? managerPin.trim() : null,
              actorId,
            });

      if (!res.success) {
        toast.error(res.error || 'Action failed');
        return;
      }

      toast.success(mode === 'reopen' ? 'Cutoff reopened to Draft' : 'Cutoff voided and archived');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title={mode === 'reopen' ? 'Reopen Cutoff to Draft' : 'Void Payroll Cutoff'}
      subtitle={`${run.title} · ${run.run_code}`}
    >
      <View className="space-y-4">
        <AdminInput
          label="Audit Reason (Required)"
          value={reason}
          onChangeText={setReason}
          placeholder={
            mode === 'reopen'
              ? 'e.g. Need to add missed OT shift…'
              : 'e.g. Duplicate or incorrect cutoff dates…'
          }
        />

        {requiresPin && (
          <AdminInput
            label="Manager Override PIN (4 digits)"
            value={managerPin}
            onChangeText={setManagerPin}
            placeholder="••••"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={4}
          />
        )}

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
            ) : mode === 'reopen' ? (
              <RotateCcw size={16} color="#FFFFFF" />
            ) : (
              <Ban size={16} color="#FFFFFF" />
            )}
            <Text className="text-sm font-bold text-white">
              {isSubmitting
                ? 'Processing…'
                : mode === 'reopen'
                  ? 'Reopen to Draft'
                  : 'Confirm Void'}
            </Text>
          </Pressable>
        </View>
      </View>
    </AdminModal>
  );
};
