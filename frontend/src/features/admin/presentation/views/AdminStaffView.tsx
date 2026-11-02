import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Users, Award, Calendar } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type AttendanceRecordAdmin } from '../../data/admin.api';
import { AdminModal, AdminNumberInput } from '../components';

interface AdminStaffViewProps {
  onRefresh?: () => void;
}

export const AdminStaffView: React.FC<AdminStaffViewProps> = () => {
  const [attendance, setAttendance] = useState<AttendanceRecordAdmin[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecordAdmin | null>(null);
  const [addonPayInput, setAddonPayInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadAttendance = async () => {
    setIsLoading(true);
    try {
      const records = await adminApi.getAttendanceRecords(todayStr);
      if (records && records.length > 0) {
        setAttendance(records);
      } else {
        const staff = await adminApi.getStaffRoster();
        const liveRecords: AttendanceRecordAdmin[] = staff.map((s) => ({
          id: `att-staff-${s.id}`,
          user_id: s.id,
          date: todayStr,
          is_present: s.is_active,
          base_daily_pay: parseFloat(s.base_daily_rate) || 50.0,
          addon_pay: 0.0,
          total_day_pay: parseFloat(s.base_daily_rate) || 50.0,
          user: {
            display_name: s.display_name,
            role: s.role,
            is_workflow_staff: s.is_workflow_staff,
          },
        }));
        setAttendance(liveRecords);
      }
    } catch {
      try {
        const staff = await adminApi.getStaffRoster();
        if (staff.length > 0) {
          setAttendance(
            staff.map((s) => ({
              id: `att-${s.id}`,
              user_id: s.id,
              date: todayStr,
              is_present: s.is_active,
              base_daily_pay: parseFloat(s.base_daily_rate) || 50.0,
              addon_pay: 0.0,
              total_day_pay: parseFloat(s.base_daily_rate) || 50.0,
              user: {
                display_name: s.display_name,
                role: s.role,
                is_workflow_staff: s.is_workflow_staff,
              },
            }))
          );
        }
      } catch (e) {
        console.warn('Failed to load live staff roster:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const handleUpdateAddon = async () => {
    if (!selectedRecord || !addonPayInput) return;
    try {
      const addon = parseFloat(addonPayInput);
      await adminApi.updateDiscretionaryAddon(
        selectedRecord.id,
        addon,
        selectedRecord.base_daily_pay
      );
      toast.success(
        `Updated shift add-on to ₱${addon.toFixed(2)} for ${selectedRecord.user?.display_name}`,
        { title: 'Add-on Updated' }
      );
      setSelectedRecord(null);
      setAddonPayInput('');
      loadAttendance();
    } catch {
      toast.error('Failed to update discretionary shift add-on', { title: 'Update Error' });
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-6 flex-col sm:flex-row sm:items-center justify-between gap-4">
        <View className="flex-1 min-w-[260px]">
          <Text className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
            Staff Daily Salary & Discretionary Shift Add-ons
          </Text>
          <Text className="mt-1 text-base text-stone-500">
            Workflow PIN staff and venue personnel with live jazz night discretionary performance
            bonuses.
          </Text>
        </View>

        <View className="flex-row items-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-xs self-start sm:self-auto">
          <Calendar size={18} color="#78716c" />
          <Text className="ml-2 text-base font-bold text-stone-800">{todayStr}</Text>
        </View>
      </View>

      {/* Baseline Policy Banner */}
      <View className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
        <Text className="text-base font-bold text-amber-900">
          Daily Minimum Shift Rate: ₱50.00 / shift
        </Text>
        <Text className="mt-1 text-base text-amber-800">
          Discretionary jazz night bonuses can be granted by Dana Cruz / Managers at end of shift
          for stellar table turnovers and bar speed.
        </Text>
      </View>

      {/* Staff Attendance & Pay Table */}
      <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs">
        <View className="space-y-4">
          {attendance.map((rec) => (
            <View
              key={rec.id}
              className="flex-col md:flex-row md:items-center justify-between border-b border-stone-100 py-4 gap-4"
            >
              <View className="flex-row items-center space-x-3">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-stone-100 border border-stone-200">
                  <Users size={20} color="#44403c" />
                </View>
                <View className="ml-3">
                  <Text className="text-lg font-bold text-stone-900">
                    {rec.user?.display_name || 'Staff Member'}
                  </Text>
                  <Text className="text-base text-stone-500">
                    Role: {rec.user?.role} • Status: {rec.is_present ? 'Present' : 'Absent'}
                  </Text>
                </View>
              </View>

              <View className="flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t border-stone-100/70 md:border-t-0">
                <View className="flex-row items-center justify-between sm:justify-start gap-4 flex-wrap">
                  <View className="items-start sm:items-end">
                    <Text className="text-base text-stone-400">Base Pay</Text>
                    <Text className="text-base font-semibold text-stone-800">
                      ₱{Number(rec.base_daily_pay || 0).toFixed(2)}
                    </Text>
                  </View>

                  <View className="items-start sm:items-end">
                    <Text className="text-base text-stone-400">Bonus</Text>
                    <Text className="text-base font-bold text-emerald-700">
                      +₱{Number(rec.addon_pay || 0).toFixed(2)}
                    </Text>
                  </View>

                  <View className="items-start sm:items-end">
                    <Text className="text-base text-stone-400">Total Pay</Text>
                    <Text className="text-lg font-black text-stone-900">
                      ₱{Number(rec.total_day_pay || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    setSelectedRecord(rec);
                    setAddonPayInput(rec.addon_pay.toString());
                  }}
                  className="min-h-[48px] px-4 flex-row items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
                  accessibilityLabel="Adjust bonus"
                >
                  <Award size={18} color="#800020" />
                  <Text className="ml-2 text-base font-bold text-[#800020]">Adjust Bonus</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Bonus Modal */}
      <AdminModal
        visible={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={`Shift Bonus: ${selectedRecord?.user?.display_name || ''}`}
        subtitle={`Base Daily Rate: ₱${Number(selectedRecord?.base_daily_pay || 0).toFixed(2)}`}
        icon={<Award size={22} color="#800020" />}
        size="sm"
        footer={
          <>
            <Pressable
              onPress={() => setSelectedRecord(null)}
              className="min-h-[48px] px-5 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
            >
              <Text className="text-base font-semibold text-stone-700">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleUpdateAddon}
              className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#800020] active:opacity-90"
            >
              <Text className="text-base font-bold text-white">Save Bonus</Text>
            </Pressable>
          </>
        }
      >
        <AdminNumberInput
          label="Discretionary Add-on"
          mode="currency"
          value={addonPayInput}
          onChangeText={setAddonPayInput}
          placeholder="e.g. 20.00"
          helperText="Added on top of staff base daily pay"
        />
      </AdminModal>
    </ScrollView>
  );
};
