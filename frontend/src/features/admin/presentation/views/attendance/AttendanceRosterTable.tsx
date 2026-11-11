import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Users, FileText, CheckCircle2, Clock, Edit3 } from 'lucide-react-native';
import { adminApi } from '../../../data/admin.api';
import { toast } from '@/features/shared/toast/useToastStore';
import { SingleDayStaffItem, MultiDayAggregateItem, EditingRecordState } from './attendance.types';
import { DateRangeResult } from './attendanceDateUtils';

interface AttendanceRosterTableProps {
  dateRange: DateRangeResult;
  filteredSingleDayList: SingleDayStaffItem[];
  multiDayAggregates: MultiDayAggregateItem[];
  loadData: () => void;
  setEditingRecord: (rec: EditingRecordState | null) => void;
}

export const AttendanceRosterTable: React.FC<AttendanceRosterTableProps> = ({
  dateRange,
  filteredSingleDayList,
  multiDayAggregates,
  loadData,
  setEditingRecord,
}) => {
  if (dateRange.isSingleDay) {
    return (
      <View className="rounded-2xl border border-stone-200/80 bg-white p-3 sm:p-4 shadow-xs">
        {filteredSingleDayList.length === 0 ? (
          <View className="py-10 items-center justify-center">
            <Users size={32} color="#a8a29e" />
            <Text className="mt-2 text-xs font-bold text-stone-700">No records found</Text>
          </View>
        ) : (
          <View className="space-y-2">
            {filteredSingleDayList.map((item) => {
              const isClockedIn = item.shiftStatus === 'CLOCKED_IN';
              const isCompleted = item.shiftStatus === 'COMPLETED';
              const roleDisplay = item.staff.is_workflow_staff
                ? item.staff.job_title || item.staff.role
                : item.staff.job_title || 'Support Staff';

              const initials =
                (item.staff.display_name || '')
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'ST';

              const inTimeFormatted = item.clockInAt
                ? new Date(item.clockInAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;

              const outTimeFormatted = item.clockOutAt
                ? new Date(item.clockOutAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;

              return (
                <View
                  key={item.staff.id}
                  className={`flex-col md:flex-row md:items-center justify-between rounded-xl border p-3 gap-2.5 ${
                    isClockedIn
                      ? 'border-[#800020]/30 bg-[#FAF8F5]'
                      : isCompleted
                        ? 'border-stone-200 bg-white'
                        : 'border-stone-200 bg-stone-50/50'
                  }`}
                >
                  {/* Left: Staff Identity & Role */}
                  <View className="flex-row items-center space-x-2.5 flex-1 min-w-[180px]">
                    <View
                      className={`h-9 w-9 items-center justify-center rounded-xl border ${
                        isClockedIn
                          ? 'bg-[#800020] border-[#800020] text-white'
                          : 'bg-stone-100 border-stone-200 text-stone-700'
                      }`}
                    >
                      <Text
                        className={`text-xs font-black ${isClockedIn ? 'text-white' : 'text-stone-700'}`}
                      >
                        {initials}
                      </Text>
                    </View>

                    <View className="ml-2.5 flex-1 min-w-0">
                      <View className="flex-row flex-wrap items-center gap-1.5">
                        <Text className="text-sm font-bold text-stone-900 truncate">
                          {item.staff.display_name}
                        </Text>
                        <View className="rounded-full bg-white px-2 py-0.2 border border-stone-200">
                          <Text className="text-[10px] font-bold text-stone-700 capitalize">
                            {roleDisplay}
                          </Text>
                        </View>
                      </View>

                      {/* Punch & Shift Status Line */}
                      <View className="mt-0.5 flex-row items-center flex-wrap gap-2">
                        {isClockedIn && (
                          <View className="flex-row items-center">
                            <View className="h-1.5 w-1.5 rounded-full bg-[#800020] mr-1.5" />
                            <Text className="text-xs font-bold text-[#800020]">
                              In since {inTimeFormatted} ({item.hoursWorked}h)
                            </Text>
                          </View>
                        )}

                        {isCompleted && (
                          <View className="flex-row items-center">
                            <View className="h-1.5 w-1.5 rounded-full bg-stone-400 mr-1.5" />
                            <Text className="text-xs font-medium text-stone-700">
                              {inTimeFormatted} – {outTimeFormatted} ({item.hoursWorked}h)
                            </Text>
                          </View>
                        )}

                        {!item.isPresent && (
                          <Text className="text-xs text-stone-400 font-medium">Not clocked in</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Right: Shift Pay & Actions */}
                  <View className="flex-row items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t border-stone-100 md:border-t-0">
                    <View className="items-start md:items-end mr-1">
                      {item.staff.role === 'admin' ? (
                        <View className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5">
                          <Text className="text-[10px] font-bold text-stone-600">
                            Payroll Exempt
                          </Text>
                        </View>
                      ) : (
                        <>
                          <Text className="text-sm font-black text-stone-900">
                            ₱{item.totalDayPay.toFixed(2)}
                          </Text>
                          {item.addonPay > 0 && (
                            <Text className="text-xs font-bold text-[#800020]">
                              +₱{item.addonPay.toFixed(2)} OT
                            </Text>
                          )}
                        </>
                      )}
                    </View>

                    {/* Interactive Buttons */}
                    <View className="flex-row items-center gap-1.5 no-print">
                      {!item.isPresent ? (
                        <Pressable
                          onPress={async () => {
                            try {
                              await adminApi.adminUpsertAttendance({
                                userId: item.staff.id,
                                date: dateRange.start,
                                isPresent: true,
                                shiftStatus: 'CLOCKED_IN',
                                baseDailyPay: item.baseDailyPay,
                                addonPay: item.addonPay,
                              });
                              toast.success(`Clocked in ${item.staff.display_name}`);
                              loadData();
                            } catch (err: any) {
                              toast.error(err?.message || 'Clock-in failed');
                            }
                          }}
                          className="h-8 px-2.5 flex-row items-center justify-center rounded-lg bg-stone-900 active:bg-stone-800"
                        >
                          <CheckCircle2 size={13} color="#ffffff" />
                          <Text className="ml-1 text-xs font-bold text-white">Clock In</Text>
                        </Pressable>
                      ) : isClockedIn ? (
                        <Pressable
                          onPress={async () => {
                            try {
                              await adminApi.adminUpsertAttendance({
                                userId: item.staff.id,
                                date: dateRange.start,
                                isPresent: true,
                                shiftStatus: 'COMPLETED',
                                baseDailyPay: item.baseDailyPay,
                                addonPay: item.addonPay,
                              });
                              toast.success(`Completed shift for ${item.staff.display_name}`);
                              loadData();
                            } catch (err: any) {
                              toast.error(err?.message || 'Clock-out failed');
                            }
                          }}
                          className="h-8 px-2.5 flex-row items-center justify-center rounded-lg bg-[#800020] active:bg-[#600018]"
                        >
                          <Clock size={13} color="#ffffff" />
                          <Text className="ml-1 text-xs font-bold text-white">Clock Out</Text>
                        </Pressable>
                      ) : isCompleted ? (
                        <Pressable
                          onPress={async () => {
                            try {
                              await adminApi.adminUpsertAttendance({
                                userId: item.staff.id,
                                date: dateRange.start,
                                isPresent: true,
                                shiftStatus: 'CLOCKED_IN',
                                baseDailyPay: item.baseDailyPay,
                                addonPay: item.addonPay,
                              });
                              toast.success(`Resumed shift for ${item.staff.display_name}`);
                              loadData();
                            } catch (err: any) {
                              toast.error(err?.message || 'Resume failed');
                            }
                          }}
                          className="h-8 px-2.5 flex-row items-center justify-center rounded-lg border border-stone-200 bg-white active:bg-stone-50"
                        >
                          <CheckCircle2 size={13} color="#800020" />
                          <Text className="ml-1 text-xs font-bold text-[#800020]">Resume</Text>
                        </Pressable>
                      ) : null}

                      {/* Adjust / OT Dialog */}
                      <Pressable
                        onPress={() => {
                          setEditingRecord({
                            userId: item.staff.id,
                            displayName: item.staff.display_name,
                            roleOrTitle: item.staff.job_title || item.staff.role,
                            isPosUser: item.staff.is_workflow_staff,
                            date: dateRange.start,
                            isPresent: item.isPresent,
                            shiftStatus: item.shiftStatus,
                            baseDailyPay: String(item.baseDailyPay.toFixed(2)),
                            addonPay: String(item.addonPay.toFixed(2)),
                            notes: item.notes,
                          });
                        }}
                        className="h-8 px-2.5 flex-row items-center justify-center rounded-lg border border-stone-200 bg-stone-50 active:bg-stone-100"
                      >
                        <Edit3 size={13} color="#1c1917" />
                        <Text className="ml-1 text-xs font-bold text-stone-800">Adjust</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  // Multi-day Summary Table
  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-3 sm:p-4 shadow-xs">
      {multiDayAggregates.length === 0 ? (
        <View className="py-10 items-center justify-center">
          <FileText size={32} color="#a8a29e" />
          <Text className="mt-2 text-xs font-bold text-stone-700">No shift records found</Text>
        </View>
      ) : (
        <View className="space-y-2">
          {multiDayAggregates.map((item) => {
            const initials =
              (item.staff.display_name || '')
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'ST';

            return (
              <View
                key={item.staff.id}
                className="flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 py-2.5 gap-2"
              >
                <View className="flex-row items-center space-x-2.5">
                  <View className="h-8 w-8 items-center justify-center rounded-lg bg-stone-100 border border-stone-200">
                    <Text className="text-xs font-black text-stone-700">{initials}</Text>
                  </View>
                  <View className="ml-2">
                    <Text className="text-sm font-bold text-stone-900">
                      {item.staff.display_name}
                    </Text>
                    <Text className="text-xs text-stone-500">
                      {item.staff.job_title || item.staff.role}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between sm:justify-end gap-4 flex-wrap">
                  <View className="items-start sm:items-end">
                    <Text className="text-xs font-bold text-stone-700">
                      {item.shiftsWorked} shifts ({item.hoursLogged.toFixed(1)}h)
                    </Text>
                  </View>

                  {item.staff.role === 'admin' ? (
                    <View className="items-start sm:items-end min-w-[80px]">
                      <View className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-stone-600">Payroll Exempt</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View className="items-start sm:items-end">
                        <Text className="text-xs text-stone-500">
                          Base: ₱{item.basePaySum.toFixed(2)}
                          {item.bonusSum > 0 ? ` · +₱${item.bonusSum.toFixed(2)} OT` : ''}
                        </Text>
                      </View>

                      <View className="items-start sm:items-end min-w-[80px]">
                        <Text className="text-base font-black text-[#800020]">
                          ₱{item.totalPaySum.toFixed(2)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};
