import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Award, Clock, History } from 'lucide-react-native';
import { AdminModal, AdminNumberInput, AdminInput } from '../../components';
import { adminApi, type StaffMemberAdmin, type AttendancePunchLog } from '../../../data/admin.api';
import { EditingRecordState } from './attendance.types';
import {
  computeHoursBetweenIso,
  computeShiftOvertime,
  manilaDateTimeLocalToIso,
  toManilaDateTimeLocal,
  type OvertimePolicy,
} from './attendanceOvertimeUtils';

interface AttendanceEditAndBonusModalsProps {
  editingRecord: EditingRecordState | null;
  setEditingRecord: React.Dispatch<React.SetStateAction<EditingRecordState | null>>;
  handleSaveRecord: () => void | Promise<void>;
  staffRoster: StaffMemberAdmin[];
  overtimePolicy: OvertimePolicy;
  isSaving?: boolean;
}

export const AttendanceEditAndBonusModals: React.FC<AttendanceEditAndBonusModalsProps> = ({
  editingRecord,
  setEditingRecord,
  handleSaveRecord,
  staffRoster,
  overtimePolicy,
  isSaving = false,
}) => {
  const [punches, setPunches] = useState<AttendancePunchLog[]>([]);
  const [showPunches, setShowPunches] = useState(false);

  const isTargetAdmin = useMemo(() => {
    if (!editingRecord) return false;
    return staffRoster.find((s) => s.id === editingRecord.userId)?.role === 'admin';
  }, [editingRecord, staffRoster]);

  useEffect(() => {
    if (!editingRecord) {
      setPunches([]);
      setShowPunches(false);
      return;
    }
    adminApi
      .getAttendancePunches(editingRecord.userId, editingRecord.date)
      .then(setPunches)
      .catch(() => setPunches([]));
  }, [editingRecord?.userId, editingRecord?.date]);

  const liveComputation = useMemo(() => {
    if (!editingRecord || !editingRecord.isPresent) {
      return {
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        overtimeRateApplied: 0,
        overtimePay: 0,
      };
    }
    const inIso = manilaDateTimeLocalToIso(editingRecord.clockInLocal);
    const outIso =
      editingRecord.shiftStatus === 'COMPLETED'
        ? manilaDateTimeLocalToIso(editingRecord.clockOutLocal)
        : new Date().toISOString();
    const hours = computeHoursBetweenIso(inIso, outIso);
    const basePay = parseFloat(editingRecord.baseDailyPay) || 0;
    return computeShiftOvertime({
      hoursWorked: hours,
      baseDailyPay: basePay,
      isAdmin: isTargetAdmin,
      userOtOverride: editingRecord.userOtOverride,
      policy: overtimePolicy,
    });
  }, [editingRecord, isTargetAdmin, overtimePolicy]);

  const effectiveOtPay = editingRecord?.overtimeOverride
    ? parseFloat(editingRecord.overtimePay || '0') || 0
    : liveComputation.overtimePay;

  const totalShiftPay = isTargetAdmin
    ? 0
    : (parseFloat(editingRecord?.baseDailyPay || '0') || 0) +
      effectiveOtPay +
      (parseFloat(editingRecord?.addonPay || '0') || 0);

  return (
    <AdminModal
      visible={!!editingRecord}
      onClose={() => setEditingRecord(null)}
      isBusy={isSaving}
      title={`Edit Attendance: ${editingRecord?.displayName || ''}`}
      subtitle={`Role: ${editingRecord?.roleOrTitle || ''} · Date: ${editingRecord?.date || ''}`}
      icon={<Award size={22} color="#810021" />}
      size="md"
      footer={
        <>
          <Pressable
            onPress={() => setEditingRecord(null)}
            disabled={isSaving}
            className={`min-h-[48px] px-5 items-center justify-center rounded-xl bg-stone-100 ${
              isSaving ? 'opacity-40' : 'active:bg-stone-200'
            }`}
          >
            <Text className="text-base font-semibold text-stone-700">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSaveRecord}
            disabled={isSaving}
            className={`min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#810021] flex-row gap-2 ${
              isSaving ? 'opacity-70' : 'active:opacity-90'
            }`}
          >
            <Text className="text-base font-bold text-white">{isSaving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </>
      }
    >
      {editingRecord && (
        <View className="space-y-4">
          {editingRecord.needsReview && (
            <View className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <Text className="text-xs font-bold text-amber-900">
                Missed Clock-Out Flagged · Enter the actual Clock-Out time below to resolve.
              </Text>
            </View>
          )}

          {/* Shift Status Selector */}
          <View>
            <Text className="mb-2 text-sm font-bold text-stone-700">Shift Status</Text>
            <View className="flex-row rounded-xl bg-stone-100 p-1">
              {(
                [
                  { key: 'CLOCKED_IN', label: 'Clocked In', present: true },
                  { key: 'COMPLETED', label: 'Completed', present: true },
                  { key: 'ABSENT', label: 'Absent', present: false },
                ] as const
              ).map((opt) => {
                const isSel = editingRecord.shiftStatus === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() =>
                      setEditingRecord((prev) =>
                        prev
                          ? {
                              ...prev,
                              shiftStatus: opt.key,
                              isPresent: opt.present,
                              clockInLocal:
                                opt.present && !prev.clockInLocal
                                  ? `${prev.date}T09:00`
                                  : prev.clockInLocal,
                              clockOutLocal:
                                opt.key === 'COMPLETED' && !prev.clockOutLocal
                                  ? `${prev.date}T17:00`
                                  : prev.clockOutLocal,
                            }
                          : null
                      )
                    }
                    className={`flex-1 min-h-[44px] items-center justify-center rounded-lg ${
                      isSel ? 'bg-white shadow-xs' : 'active:bg-stone-200'
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
          </View>

          {editingRecord.isPresent && (
            <>
              {/* Exact Clock-In / Clock-Out Time Editor */}
              <View className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <Clock size={14} color="#810021" />
                    <Text className="text-sm font-bold text-stone-800">
                      Shift Timestamps (Manila PHT)
                    </Text>
                  </View>
                  <View className="flex-row gap-1.5">
                    <Pressable
                      onPress={() =>
                        setEditingRecord((prev) =>
                          prev
                            ? {
                                ...prev,
                                shiftStatus: 'COMPLETED',
                                clockInLocal: prev.clockInLocal || `${prev.date}T09:00`,
                                clockOutLocal: `${prev.date}T17:00`,
                              }
                            : null
                        )
                      }
                      className="rounded-lg border border-stone-200 bg-white px-2 py-1 active:bg-stone-100"
                    >
                      <Text className="text-[11px] font-bold text-stone-700">8h Preset</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setEditingRecord((prev) =>
                          prev
                            ? {
                                ...prev,
                                shiftStatus: 'COMPLETED',
                                clockOutLocal: toManilaDateTimeLocal(new Date().toISOString()),
                              }
                            : null
                        )
                      }
                      className="rounded-lg border border-stone-200 bg-white px-2 py-1 active:bg-stone-100"
                    >
                      <Text className="text-[11px] font-bold text-[#810021]">Out = Now</Text>
                    </Pressable>
                  </View>
                </View>

                <View className="flex-col sm:flex-row gap-3">
                  <View className="flex-1">
                    <AdminInput
                      label="Clock-In (YYYY-MM-DDTHH:mm)"
                      value={editingRecord.clockInLocal}
                      onChangeText={(val) =>
                        setEditingRecord((prev) => (prev ? { ...prev, clockInLocal: val } : null))
                      }
                      placeholder={`${editingRecord.date}T09:00`}
                    />
                  </View>
                  {editingRecord.shiftStatus === 'COMPLETED' && (
                    <View className="flex-1">
                      <AdminInput
                        label="Clock-Out (YYYY-MM-DDTHH:mm)"
                        value={editingRecord.clockOutLocal}
                        onChangeText={(val) =>
                          setEditingRecord((prev) =>
                            prev ? { ...prev, clockOutLocal: val } : null
                          )
                        }
                        placeholder={`${editingRecord.date}T17:00`}
                      />
                    </View>
                  )}
                </View>

                <View className="flex-row items-center justify-between pt-1 border-t border-stone-200/70">
                  <Text className="text-xs font-semibold text-stone-600">
                    Computed: {liveComputation.totalHours.toFixed(2)}h total (
                    {liveComputation.regularHours.toFixed(2)}h reg ·{' '}
                    {liveComputation.overtimeHours.toFixed(2)}h OT)
                  </Text>
                  {!isTargetAdmin && liveComputation.overtimeHours > 0 && (
                    <Text className="text-xs font-bold text-[#810021]">
                      @ ₱{liveComputation.overtimeRateApplied.toFixed(2)}/hr
                    </Text>
                  )}
                </View>
              </View>

              {isTargetAdmin ? (
                <View className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <Text className="text-base font-bold text-stone-800">
                    Management Role · Payroll Exempt
                  </Text>
                  <Text className="text-sm text-stone-500 mt-1">
                    Administrator shifts are tracked for operational attendance without incurring
                    daily shift payroll costs (₱0.00).
                  </Text>
                </View>
              ) : (
                <>
                  <AdminNumberInput
                    label="Base Daily Shift Pay"
                    mode="currency"
                    value={editingRecord.baseDailyPay}
                    onChangeText={(val: string) =>
                      setEditingRecord((prev) => (prev ? { ...prev, baseDailyPay: val } : null))
                    }
                    placeholder="645.00"
                  />

                  {/* Overtime Pay with Override Toggle */}
                  <View className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-bold text-stone-700">
                        Overtime Fee ({liveComputation.overtimeHours.toFixed(2)}h OT)
                      </Text>
                      <Pressable
                        onPress={() =>
                          setEditingRecord((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  overtimeOverride: !prev.overtimeOverride,
                                  overtimePay: !prev.overtimeOverride
                                    ? liveComputation.overtimePay.toFixed(2)
                                    : prev.overtimePay,
                                }
                              : null
                          )
                        }
                        className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 active:bg-stone-100"
                      >
                        <Text className="text-xs font-bold text-[#810021]">
                          {editingRecord.overtimeOverride ? 'Use Auto OT' : 'Override / Waive'}
                        </Text>
                      </Pressable>
                    </View>

                    {editingRecord.overtimeOverride ? (
                      <AdminNumberInput
                        label="Manual Overtime Fee"
                        mode="currency"
                        value={editingRecord.overtimePay}
                        onChangeText={(val: string) =>
                          setEditingRecord((prev) => (prev ? { ...prev, overtimePay: val } : null))
                        }
                        placeholder="0.00"
                        helperText="Enter 0.00 to waive overtime pay"
                      />
                    ) : (
                      <Text className="text-base font-black text-[#810021]">
                        Auto-Calculated: ₱{liveComputation.overtimePay.toFixed(2)}
                      </Text>
                    )}
                  </View>

                  <AdminNumberInput
                    label="Shift Bonus / Add-on (Optional)"
                    mode="currency"
                    value={editingRecord.addonPay}
                    onChangeText={(val: string) =>
                      setEditingRecord((prev) => (prev ? { ...prev, addonPay: val } : null))
                    }
                    placeholder="0.00"
                    helperText="Discretionary bonus separate from overtime"
                  />
                </>
              )}

              <AdminInput
                label="Audit Reason / Notes"
                placeholder="e.g. Forgot to clock out at close, verified by manager"
                value={editingRecord.editReason}
                onChangeText={(val: string) =>
                  setEditingRecord((prev) => (prev ? { ...prev, editReason: val } : null))
                }
              />

              <View className="flex-row items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                <Text className="text-base font-bold text-stone-600">Total Shift Pay</Text>
                <Text className="text-xl font-black text-stone-900">
                  {isTargetAdmin ? 'Exempt (₱0.00)' : `₱${totalShiftPay.toFixed(2)}`}
                </Text>
              </View>
            </>
          )}

          {!editingRecord.isPresent && (
            <View className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <Text className="text-base font-bold text-stone-700">Staff Marked Absent</Text>
              <Text className="text-base text-stone-500 mt-1">
                ₱0.00 wage expense incurred for this shift.
              </Text>
            </View>
          )}

          {punches.length > 0 && (
            <View className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <Pressable
                onPress={() => setShowPunches(!showPunches)}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-1.5">
                  <History size={14} color="#57534e" />
                  <Text className="text-xs font-bold text-stone-700">
                    Punch Audit Trail ({punches.length})
                  </Text>
                </View>
                <Text className="text-xs font-bold text-[#810021]">
                  {showPunches ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
              {showPunches && (
                <View className="mt-2 space-y-1.5 border-t border-stone-200 pt-2">
                  {punches.map((p) => (
                    <Text key={p.id} className="text-xs text-stone-600">
                      • {p.punch_type} at {new Date(p.punched_at).toLocaleString()} ({p.source})
                      {p.notes ? ` — ${p.notes}` : ''}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </AdminModal>
  );
};
