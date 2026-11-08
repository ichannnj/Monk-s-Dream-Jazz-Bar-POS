import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Award } from 'lucide-react-native';
import { AdminModal, AdminNumberInput, AdminInput } from '../../components';
import { StaffMemberAdmin } from '../../../data/admin.api';
import { EditingRecordState } from './attendance.types';

interface AttendanceEditAndBonusModalsProps {
  editingRecord: EditingRecordState | null;
  setEditingRecord: React.Dispatch<React.SetStateAction<EditingRecordState | null>>;
  handleSaveRecord: () => void;
  staffRoster: StaffMemberAdmin[];
}

export const AttendanceEditAndBonusModals: React.FC<AttendanceEditAndBonusModalsProps> = ({
  editingRecord,
  setEditingRecord,
  handleSaveRecord,
  staffRoster,
}) => {
  return (
    <AdminModal
      visible={!!editingRecord}
      onClose={() => setEditingRecord(null)}
      title={`Adjust Pay: ${editingRecord?.displayName || ''}`}
      subtitle={`Role: ${editingRecord?.roleOrTitle || ''} · Date: ${editingRecord?.date || ''}`}
      icon={<Award size={22} color="#800020" />}
      size="md"
      footer={
        <>
          <Pressable
            onPress={() => setEditingRecord(null)}
            className="min-h-[48px] px-5 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
          >
            <Text className="text-base font-semibold text-stone-700">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSaveRecord}
            className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#800020] active:opacity-90"
          >
            <Text className="text-base font-bold text-white">Save</Text>
          </Pressable>
        </>
      }
    >
      {editingRecord && (
        <View className="space-y-4">
          {/* Shift Status Selector */}
          <View>
            <Text className="mb-2 text-base font-bold text-stone-700">Shift Status</Text>
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
                            }
                          : null
                      )
                    }
                    className={`flex-1 min-h-[48px] items-center justify-center rounded-lg ${
                      isSel ? 'bg-white shadow-xs' : 'active:bg-stone-200'
                    }`}
                  >
                    <Text
                      className={`text-base font-bold ${
                        isSel ? 'text-[#800020]' : 'text-stone-600'
                      }`}
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
              {staffRoster.find((s) => s.id === editingRecord.userId)?.role === 'admin' ? (
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
                    helperText="Fixed daily shift rate (₱645.00 baseline)"
                  />

                  <AdminNumberInput
                    label="OT / Shift Bonus"
                    mode="currency"
                    value={editingRecord.addonPay}
                    onChangeText={(val: string) =>
                      setEditingRecord((prev) => (prev ? { ...prev, addonPay: val } : null))
                    }
                    placeholder="0.00"
                    helperText="Optional overtime or performance bonus"
                  />
                </>
              )}

              <AdminInput
                label="Notes (Optional)"
                placeholder="e.g. 2 hrs overtime for rush"
                value={editingRecord.notes}
                onChangeText={(val: string) =>
                  setEditingRecord((prev) => (prev ? { ...prev, notes: val } : null))
                }
              />

              <View className="flex-row items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                <Text className="text-base font-bold text-stone-600">Total Shift Pay</Text>
                <Text className="text-xl font-black text-stone-900">
                  {staffRoster.find((s) => s.id === editingRecord.userId)?.role === 'admin'
                    ? 'Exempt (₱0.00)'
                    : `₱${(
                        (parseFloat(editingRecord.baseDailyPay) || 0) +
                        (parseFloat(editingRecord.addonPay) || 0)
                      ).toFixed(2)}`}
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
        </View>
      )}
    </AdminModal>
  );
};
