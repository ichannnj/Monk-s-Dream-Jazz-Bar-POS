import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { adminApi } from '../../../data/admin.api';
import { generateSemiMonthlyCutoffPresets, generateWeeklyCutoffPresets } from './payrollEngine';
import type { PayrollCadence, PayrollDraftPreview } from './payroll.types';

interface CreatePayrollCutoffModalProps {
  visible: boolean;
  onClose: () => void;
  todayStr: string;
  defaultCadence: PayrollCadence;
  cutoffDay1: number;
  cutoffDay2: number;
  paydayLagDays: number;
  actorId?: string | null;
  onCreated: (runId: string) => void;
}

const fmtPhp = (n: number) =>
  `₱${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const CreatePayrollCutoffModal: React.FC<CreatePayrollCutoffModalProps> = ({
  visible,
  onClose,
  todayStr,
  defaultCadence,
  cutoffDay1,
  cutoffDay2,
  paydayLagDays,
  actorId,
  onCreated,
}) => {
  const presets = useMemo(
    () => [
      ...generateSemiMonthlyCutoffPresets(todayStr, cutoffDay1, cutoffDay2, paydayLagDays),
      ...generateWeeklyCutoffPresets(todayStr, paydayLagDays),
    ],
    [todayStr, cutoffDay1, cutoffDay2, paydayLagDays]
  );

  const [cadence, setCadence] = useState<PayrollCadence>(defaultCadence);
  const [periodStart, setPeriodStart] = useState(presets[0]?.periodStart || todayStr);
  const [periodEnd, setPeriodEnd] = useState(presets[0]?.periodEnd || todayStr);
  const [paydayDate, setPaydayDate] = useState(presets[0]?.paydayDate || todayStr);
  const [title, setTitle] = useState('');
  const [preview, setPreview] = useState<PayrollDraftPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && presets[0]) {
      setCadence(defaultCadence);
      setPeriodStart(presets[0].periodStart);
      setPeriodEnd(presets[0].periodEnd);
      setPaydayDate(presets[0].paydayDate);
      setTitle('');
      setPreview(null);
    }
  }, [visible, defaultCadence, presets]);

  useEffect(() => {
    if (!visible || !periodStart || !periodEnd || periodEnd < periodStart) return;
    let cancelled = false;
    setIsPreviewing(true);
    adminApi
      .previewPayrollRun({ periodStart, periodEnd, cadence })
      .then((res) => {
        if (!cancelled) setPreview(res);
      })
      .catch((err: any) => {
        if (!cancelled) {
          setPreview({
            success: false,
            error: err?.message || 'Failed to preview cutoff',
            unresolvedWarnings: [],
            items: [],
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsPreviewing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, periodStart, periodEnd, cadence]);

  const estimatedTotal = useMemo(() => {
    if (!preview?.success || !preview.items) return 0;
    return preview.items.reduce(
      (sum, item) => sum + (item.is_payroll_exempt ? 0 : Number(item.gross_pay || 0)),
      0
    );
  }, [preview]);

  const activeStaffCount = useMemo(() => {
    if (!preview?.success || !preview.items) return 0;
    return preview.items.filter((i) => !i.is_payroll_exempt && i.shifts_worked > 0).length;
  }, [preview]);

  const handleCreate = async () => {
    if (periodEnd < periodStart) {
      toast.error('End date must be on or after start date');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await adminApi.createPayrollRun({
        periodStart,
        periodEnd,
        cadence,
        title: title.trim() || undefined,
        paydayDate,
        actorId,
      });
      if (!res.success || !res.runId) {
        toast.error(res.error || 'Could not create payroll cutoff');
        return;
      }
      toast.success(`Created Draft Cutoff ${res.runCode || ''}`);
      onCreated(res.runId);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create payroll cutoff');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title="New Payroll Cutoff"
      subtitle="Select a cutoff period to preview attendance earnings and create a Draft run"
    >
      <View className="space-y-4">
        {/* Quick Presets */}
        <View>
          <Text className="text-xs font-bold text-stone-700 mb-1.5">Quick Cutoff Presets</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {presets.map((p) => {
              const active = periodStart === p.periodStart && periodEnd === p.periodEnd;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setCadence(p.cadence);
                    setPeriodStart(p.periodStart);
                    setPeriodEnd(p.periodEnd);
                    setPaydayDate(p.paydayDate);
                  }}
                  className={`px-3 py-2 rounded-xl border ${
                    active ? 'bg-[#810021] border-[#810021]' : 'bg-[#F7F5F2] border-stone-200'
                  }`}
                >
                  <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-stone-800'}`}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Date Inputs */}
        <View className="flex-col sm:flex-row gap-2.5">
          <View className="flex-1">
            <AdminInput
              label="Period Start (YYYY-MM-DD)"
              value={periodStart}
              onChangeText={(v) => {
                setCadence('CUSTOM');
                setPeriodStart(v);
              }}
              placeholder="2026-11-01"
            />
          </View>
          <View className="flex-1">
            <AdminInput
              label="Period End (YYYY-MM-DD)"
              value={periodEnd}
              onChangeText={(v) => {
                setCadence('CUSTOM');
                setPeriodEnd(v);
              }}
              placeholder="2026-11-15"
            />
          </View>
        </View>

        <View className="flex-col sm:flex-row gap-2.5">
          <View className="flex-1">
            <AdminInput
              label="Payday Date (YYYY-MM-DD)"
              value={paydayDate}
              onChangeText={setPaydayDate}
              placeholder="2026-11-15"
            />
          </View>
          <View className="flex-1">
            <AdminInput
              label="Cutoff Title (Optional)"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Nov 1st Half Payroll…"
            />
          </View>
        </View>

        {/* Live Preview Box */}
        <View className="rounded-xl border border-stone-200 bg-[#EFECE6] p-3.5">
          {isPreviewing ? (
            <View className="flex-row items-center gap-2 py-2">
              <ActivityIndicator size="small" color="#810021" />
              <Text className="text-xs font-semibold text-stone-600">
                Calculating attendance preview…
              </Text>
            </View>
          ) : preview && !preview.success ? (
            <View className="flex-row items-start gap-2">
              <AlertTriangle size={16} color="#810021" />
              <Text className="flex-1 text-xs font-bold text-[#810021]">{preview.error}</Text>
            </View>
          ) : (
            <View className="space-y-1.5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <Calendar size={14} color="#1A1617" />
                  <Text className="text-xs font-bold text-stone-800">
                    Live Attendance Estimate ({activeStaffCount} staff with shifts)
                  </Text>
                </View>
                <Text
                  className="text-base font-black text-[#810021]"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {fmtPhp(estimatedTotal)}
                </Text>
              </View>
              {preview?.unresolvedWarnings && preview.unresolvedWarnings.length > 0 && (
                <Text className="text-xs font-semibold text-amber-800">
                  ⚠ {preview.unresolvedWarnings.length} unresolved or open shift(s) in this range
                  (can be fixed inside the Draft).
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Actions */}
        <View className="flex-row items-center justify-end gap-2 pt-2">
          <Pressable
            onPress={onClose}
            className="h-12 px-4 rounded-xl border border-stone-300 bg-white items-center justify-center"
          >
            <Text className="text-sm font-bold text-stone-700">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleCreate}
            disabled={isSubmitting || isPreviewing || (preview !== null && !preview.success)}
            className={`h-12 px-5 rounded-xl flex-row items-center justify-center gap-2 ${
              isSubmitting || (preview !== null && !preview.success)
                ? 'bg-stone-300'
                : 'bg-[#810021] active:bg-[#600018]'
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <CheckCircle2 size={16} color="#FFFFFF" />
            )}
            <Text className="text-sm font-bold text-white">
              {isSubmitting ? 'Creating…' : 'Create Draft Cutoff'}
            </Text>
          </Pressable>
        </View>
      </View>
    </AdminModal>
  );
};
