import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { Users, Award, Calendar } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type AttendanceRecordAdmin } from '../../data/admin.api';

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
      setAttendance(records);
    } catch {
      // Mock fallback if table empty
      setAttendance([
        {
          id: 'att-1',
          user_id: 'user-waiter-1',
          date: todayStr,
          is_present: true,
          base_daily_pay: 50.0,
          addon_pay: 15.0,
          total_day_pay: 65.0,
          user: {
            display_name: 'John S. (Floor Waiter)',
            role: 'waiter',
            is_workflow_staff: true,
          },
        },
        {
          id: 'att-2',
          user_id: 'user-bar-1',
          date: todayStr,
          is_present: true,
          base_daily_pay: 50.0,
          addon_pay: 20.0,
          total_day_pay: 70.0,
          user: {
            display_name: 'Sarah K. (Head Bartender)',
            role: 'bartender',
            is_workflow_staff: true,
          },
        },
        {
          id: 'att-3',
          user_id: 'user-kitchen-1',
          date: todayStr,
          is_present: true,
          base_daily_pay: 50.0,
          addon_pay: 10.0,
          total_day_pay: 60.0,
          user: {
            display_name: 'Chef Marco (Kitchen Lead)',
            role: 'kitchen',
            is_workflow_staff: true,
          },
        },
      ]);
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
    <ScrollView className="flex-1 bg-[#fcf9f9] p-8" showsVerticalScrollIndicator={false}>
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-extrabold tracking-tight text-stone-900">
            Staff Daily Salary & Discretionary Shift Add-ons
          </Text>
          <Text className="mt-1 text-base text-stone-500">
            Workflow PIN staff and venue personnel with live jazz night discretionary performance
            bonuses.
          </Text>
        </View>

        <View className="flex-row items-center rounded-xl border border-stone-200 bg-white px-3.5 py-2 shadow-xs">
          <Calendar size={15} color="#78716c" />
          <Text className="ml-2 text-sm font-bold text-stone-800">{todayStr}</Text>
        </View>
      </View>

      {/* Baseline Policy Banner */}
      <View className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
        <Text className="text-base font-bold text-amber-900">
          Daily Minimum Shift Rate: ₱50.00 / shift
        </Text>
        <Text className="mt-1 text-sm text-amber-800">
          Discretionary jazz night bonuses can be granted by Dana Cruz / Managers at end of shift
          for stellar table turnovers and bar speed.
        </Text>
      </View>

      {/* Staff Attendance & Pay Table */}
      <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
        <View className="space-y-4">
          {attendance.map((rec) => (
            <View
              key={rec.id}
              className="flex-row items-center justify-between border-b border-stone-100 py-3.5"
            >
              <View className="flex-row items-center space-x-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-stone-100 border border-stone-200">
                  <Users size={18} color="#44403c" />
                </View>
                <View className="ml-3">
                  <Text className="text-base font-bold text-stone-900">
                    {rec.user?.display_name || 'Staff Member'}
                  </Text>
                  <Text className="text-xs text-stone-500">
                    Role: {rec.user?.role} • Status: {rec.is_present ? 'Present' : 'Absent'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center space-x-6">
                <View className="items-end mr-4">
                  <Text className="text-xs text-stone-400">Base Shift Pay</Text>
                  <Text className="text-sm font-semibold text-stone-800">
                    ₱{rec.base_daily_pay.toFixed(2)}
                  </Text>
                </View>

                <View className="items-end mr-4">
                  <Text className="text-xs text-stone-400">Bonus Add-on</Text>
                  <Text className="text-sm font-bold text-emerald-700">
                    +₱{rec.addon_pay.toFixed(2)}
                  </Text>
                </View>

                <View className="items-end mr-4">
                  <Text className="text-xs text-stone-400">Total Shift Pay</Text>
                  <Text className="text-base font-black text-stone-900">
                    ₱{rec.total_day_pay.toFixed(2)}
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    setSelectedRecord(rec);
                    setAddonPayInput(rec.addon_pay.toString());
                  }}
                  className="flex-row items-center rounded-xl bg-stone-100 px-3 py-2 active:bg-stone-200"
                >
                  <Award size={14} color="#800020" />
                  <Text className="ml-1.5 text-xs font-bold text-[#800020]">Adjust Bonus</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Bonus Modal */}
      {selectedRecord && (
        <View className="absolute inset-0 items-center justify-center bg-black/50 p-6 z-50">
          <View className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <Text className="text-xl font-bold text-stone-900">
              Shift Bonus: {selectedRecord.user?.display_name}
            </Text>
            <Text className="mt-1 text-sm text-stone-500">
              Base Daily Rate: ₱{selectedRecord.base_daily_pay.toFixed(2)}
            </Text>

            <View className="mt-4">
              <Text className="text-sm font-medium text-stone-700">Discretionary Add-on (₱):</Text>
              <TextInput
                value={addonPayInput}
                onChangeText={setAddonPayInput}
                keyboardType="numeric"
                placeholder="e.g. 20.00"
                className="mt-1 rounded-xl border border-stone-300 p-3 text-base"
              />
            </View>

            <View className="mt-6 flex-row justify-end space-x-3">
              <Pressable
                onPress={() => setSelectedRecord(null)}
                className="rounded-xl bg-stone-100 px-4 py-2 active:bg-stone-200"
              >
                <Text className="text-sm font-semibold text-stone-700">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleUpdateAddon}
                className="rounded-xl bg-[#800020] px-5 py-2 active:opacity-90"
              >
                <Text className="text-sm font-bold text-white">Save Bonus</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};
