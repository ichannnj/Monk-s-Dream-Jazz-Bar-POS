import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Clock } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { AdminModal, AdminNumberInput } from '../../components';
import { adminApi } from '../../../data/admin.api';
import type { OvertimePolicy } from './attendanceOvertimeUtils';

interface OvertimePolicyQuickModalProps {
  visible: boolean;
  onClose: () => void;
  policy: OvertimePolicy;
  onSaved: () => void;
}

export const OvertimePolicyQuickModal: React.FC<OvertimePolicyQuickModalProps> = ({
  visible,
  onClose,
  policy,
  onSaved,
}) => {
  const [stdHours, setStdHours] = useState('8.00');
  const [graceMins, setGraceMins] = useState('15');
  const [rateMode, setRateMode] = useState<'MULTIPLIER' | 'FLAT_HOURLY'>('MULTIPLIER');
  const [multiplier, setMultiplier] = useState('1.25');
  const [flatRate, setFlatRate] = useState('100.00');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setStdHours(String(policy.standardShiftHours));
      setGraceMins(String(policy.graceMinutes));
      setRateMode(policy.rateMode);
      setMultiplier(String(policy.multiplier));
      setFlatRate(String(policy.flatHourlyRate));
    }
  }, [visible, policy]);

  const handleSave = async () => {
    const parsedStdHours = parseFloat(stdHours);
    const parsedGraceMins = parseInt(graceMins, 10);
    const parsedMultiplier = parseFloat(multiplier);
    const parsedFlatRate = parseFloat(flatRate);

    if (!Number.isFinite(parsedStdHours) || parsedStdHours <= 0) {
      toast.error('Standard shift hours must be greater than 0');
      return;
    }

    setIsSaving(true);
    try {
      await adminApi.updateVenueSettings({
        standard_shift_hours: parsedStdHours,
        overtime_grace_minutes:
          Number.isFinite(parsedGraceMins) && parsedGraceMins >= 0 ? parsedGraceMins : 0,
        overtime_rate_mode: rateMode,
        overtime_multiplier:
          Number.isFinite(parsedMultiplier) && parsedMultiplier > 0 ? parsedMultiplier : 1.25,
        overtime_flat_hourly_rate:
          Number.isFinite(parsedFlatRate) && parsedFlatRate >= 0 ? parsedFlatRate : 0,
      });
      toast.success('Overtime fee policy updated', { title: 'Policy Saved' });
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update overtime policy');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      isBusy={isSaving}
      title="Overtime Fee Policy"
      subtitle="Configure standard shift hours and how overtime pay is calculated"
      icon={<Clock size={20} color="#810021" />}
      size="md"
      footer={
        <>
          <Pressable
            onPress={onClose}
            disabled={isSaving}
            className="min-h-[48px] px-5 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
          >
            <Text className="text-base font-semibold text-stone-700">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#810021] active:opacity-90"
          >
            <Text className="text-base font-bold text-white">
              {isSaving ? 'Saving…' : 'Save Policy'}
            </Text>
          </Pressable>
        </>
      }
    >
      <View className="gap-4">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <AdminNumberInput
              label="Standard Shift Hours"
              mode="decimal"
              value={stdHours}
              onChangeText={setStdHours}
              suffix="hrs"
            />
          </View>
          <View className="flex-1">
            <AdminNumberInput
              label="Grace Period"
              mode="decimal"
              value={graceMins}
              onChangeText={setGraceMins}
              suffix="min"
            />
          </View>
        </View>

        <View className="flex-row rounded-xl bg-stone-100 p-1">
          {(
            [
              { key: 'MULTIPLIER', label: 'Multiplier (e.g. 1.25x)' },
              { key: 'FLAT_HOURLY', label: 'Flat Hourly (₱/hr)' },
            ] as const
          ).map((opt) => {
            const isSel = rateMode === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setRateMode(opt.key)}
                className={`flex-1 min-h-[48px] items-center justify-center rounded-lg ${
                  isSel ? 'bg-white shadow-sm' : 'active:bg-stone-200'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${isSel ? 'text-[#810021]' : 'text-stone-600'}`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {rateMode === 'MULTIPLIER' ? (
          <AdminNumberInput
            label="Overtime Multiplier"
            mode="decimal"
            value={multiplier}
            onChangeText={setMultiplier}
            suffix="x"
            helperText="Multiplies (Base Daily Rate / Standard Hours)"
          />
        ) : (
          <AdminNumberInput
            label="Flat Hourly Overtime Fee"
            mode="currency"
            value={flatRate}
            onChangeText={setFlatRate}
            helperText="Fixed ₱/hr paid for all overtime hours"
          />
        )}
      </View>
    </AdminModal>
  );
};
