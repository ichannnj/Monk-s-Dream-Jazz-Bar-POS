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
      <View className="rounded-2xl border border-stone-200/80 bg-white p-3 sm:p-5 shadow-xs">
        {filteredSingleDayList.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <Users size={36} color="#a8a29e" />
            <Text className="mt-3 text-lg font-bold text-stone-700">No records found</Text>
            <Text className="mt-1 text-base text-stone-500 text-center">
              Try adjusting your search or period filter.
            </Text>
          </View>
        ) : (
          <View className="space-y-2.5">
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
                  className={`flex-col md:flex-row md:items-center justify-between rounded-xl border p-3.5 sm:p-4 gap-3 ${
                    isClockedIn
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isCompleted
                        ? 'border-sky-200 bg-sky-50/20'
                        : 'border-stone-200 bg-white'
                  }`}
                >
                  {/* Left: Staff Identity & Role */}
                  <View className="flex-row items-center space-x-3 flex-1 min-w-[200px]">
                    <View
                      className={`min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border ${
                        isClockedIn
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                          : isCompleted
                            ? 'bg-sky-100 border-sky-300 text-sky-800'
                            : 'bg-stone-100 border-stone-200 text-stone-600'
                      }`}
                    >
                      <Text className="text-base font-black">{initials}</Text>
                    </View>

                    <View className="ml-3 flex-1 min-w-0">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-lg font-extrabold text-stone-900 truncate">
                          {item.staff.display_name}
                        </Text>
                        <View className="rounded-full bg-stone-100 px-2.5 py-0.5 border border-stone-200">
                          <Text className="text-base font-bold text-stone-700 capitalize">
                            {roleDisplay}
                          </Text>
                        </View>
                      </View>

                      {/* Punch & Shift Status Line */}
                      <View className="mt-1 flex-row items-center flex-wrap gap-2">
                        {isClockedIn && (
                          <View className="flex-row items-center">
                            <View className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />
                            <Text className="text-base font-bold text-emerald-800">
                              In since {inTimeFormatted} ({item.hoursWorked}h)
                            </Text>
                          </View>
                        )}

                        {isCompleted && (
                          <View className="flex-row items-center">
                            <View className="h-2 w-2 rounded-full bg-sky-500 mr-1.5" />
                            <Text className="text-base font-bold text-sky-800">
                              Completed: {inTimeFormatted} – {outTimeFormatted} ({item.hoursWorked}
                              h)
                            </Text>
                          </View>
                        )}

                        {!item.isPresent && (
                          <Text className="text-base text-stone-400 font-medium">
                            Not clocked in
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Right: Shift Pay & Actions */}
                  <View className="flex-row items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t border-stone-100 md:border-t-0">
                    <View className="items-start md:items-end mr-1">
                      {item.staff.role === 'admin' ? (
                        <View className="rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5">
                          <Text className="text-xs font-bold text-stone-600">Payroll Exempt</Text>
                        </View>
                      ) : (
                        <>
                          <Text className="text-lg font-black text-stone-900">
                            ₱{item.totalDayPay.toFixed(2)}
                          </Text>
                          {item.addonPay > 0 && (
                            <Text className="text-base font-bold text-emerald-700">
                              +₱{item.addonPay.toFixed(2)} OT
                            </Text>
                          )}
                        </>
                      )}
                    </View>

                    {/* Interactive Buttons - Print will hide these via .no-print */}
                    <View className="flex-row items-center gap-2 no-print">
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
                          className="min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 active:bg-emerald-100"
                        >
                          <CheckCircle2 size={16} color="#047857" />
                          <Text className="ml-1.5 text-base font-bold text-emerald-800">
                            Clock In
                          </Text>
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
                          className="min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl bg-sky-50 border border-sky-200 active:bg-sky-100"
                        >
                          <Clock size={16} color="#0369a1" />
                          <Text className="ml-1.5 text-base font-bold text-sky-800">Clock Out</Text>
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
                          className="min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 active:bg-emerald-100"
                        >
                          <CheckCircle2 size={16} color="#047857" />
                          <Text className="ml-1.5 text-base font-bold text-emerald-800">
                            Resume Shift
                          </Text>
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
                        className="min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl border border-stone-200 bg-stone-50 active:bg-stone-100"
                      >
                        <Edit3 size={16} color="#44403c" />
                        <Text className="ml-1.5 text-base font-bold text-stone-700">Adjust</Text>
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
    <View className="rounded-2xl border border-stone-200/80 bg-white p-3 sm:p-5 shadow-xs">
      {multiDayAggregates.length === 0 ? (
        <View className="py-12 items-center justify-center">
          <FileText size={36} color="#a8a29e" />
          <Text className="mt-3 text-lg font-bold text-stone-700">No shift records found</Text>
          <Text className="mt-1 text-base text-stone-500 text-center">
            No attendance punches logged within this period range.
          </Text>
        </View>
      ) : (
        <View className="space-y-2.5">
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
                className="flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 py-3 gap-3"
              >
                <View className="flex-row items-center space-x-3">
                  <View className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-stone-100 border border-stone-200">
                    <Text className="text-base font-black text-stone-700">{initials}</Text>
                  </View>
                  <View className="ml-3">
                    <Text className="text-lg font-extrabold text-stone-900">
                      {item.staff.display_name}
                    </Text>
                    <Text className="text-base text-stone-500">
                      {item.staff.job_title || item.staff.role}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between sm:justify-end gap-5 flex-wrap">
                  <View className="items-start sm:items-end">
                    <Text className="text-base font-bold text-stone-800">
                      {item.shiftsWorked} shifts ({item.hoursLogged.toFixed(1)}h)
                    </Text>
                  </View>

                  {item.staff.role === 'admin' ? (
                    <View className="items-start sm:items-end min-w-[90px]">
                      <View className="rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5">
                        <Text className="text-xs font-bold text-stone-600">Payroll Exempt</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View className="items-start sm:items-end">
                        <Text className="text-base font-semibold text-stone-700">
                          Base: ₱{item.basePaySum.toFixed(2)}
                          {item.bonusSum > 0 ? ` · +₱${item.bonusSum.toFixed(2)} OT` : ''}
                        </Text>
                      </View>

                      <View className="items-start sm:items-end min-w-[90px]">
                        <Text className="text-xl font-black text-[#800020]">
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
