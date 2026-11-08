import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { AdminModal } from '../../components';
import { PeriodFilter, MONTH_NAMES } from './attendance.types';

interface AttendanceDatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  datePickerMode: 'day' | 'week' | 'month';
  setDatePickerMode: (mode: 'day' | 'week' | 'month') => void;
  calendarYear: number;
  setCalendarYear: React.Dispatch<React.SetStateAction<number>>;
  calendarMonth: number;
  setCalendarMonth: React.Dispatch<React.SetStateAction<number>>;
  calendarDays: (number | null)[];
  todayStr: string;
  selectedDate: string;
  period: PeriodFilter;
  setSelectedDate: (d: string) => void;
  setPeriod: (p: PeriodFilter) => void;
  handleSelectDay: (day: number) => void;
  handleSelectMonth: (mIdx: number, yNum: number) => void;
}

export const AttendanceDatePickerModal: React.FC<AttendanceDatePickerModalProps> = ({
  visible,
  onClose,
  datePickerMode,
  setDatePickerMode,
  calendarYear,
  setCalendarYear,
  calendarMonth,
  setCalendarMonth,
  calendarDays,
  todayStr,
  selectedDate,
  period,
  setSelectedDate,
  setPeriod,
  handleSelectDay,
  handleSelectMonth,
}) => {
  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title="Select Attendance Date"
      subtitle="Choose any business date to inspect shifts and payroll"
      icon={<Calendar size={22} color="#800020" />}
      size="md"
    >
      <View className="p-1">
        {/* Picker Mode Switcher */}
        <View className="flex-row rounded-xl bg-stone-100 p-1 mb-4">
          {(['day', 'week', 'month'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setDatePickerMode(m)}
              className={`flex-1 min-h-[48px] items-center justify-center rounded-lg ${
                datePickerMode === m ? 'bg-white shadow-xs' : 'active:bg-stone-200'
              }`}
            >
              <Text
                className={`text-base font-bold capitalize ${
                  datePickerMode === m ? 'text-[#800020]' : 'text-stone-600'
                }`}
              >
                {m}
              </Text>
            </Pressable>
          ))}
        </View>

        {datePickerMode === 'month' ? (
          <View>
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-stone-200">
              <Pressable
                onPress={() => setCalendarYear((y) => y - 1)}
                className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
              >
                <ChevronLeft size={20} color="#44403c" />
              </Pressable>
              <Text className="text-xl font-black text-stone-900">{calendarYear}</Text>
              <Pressable
                onPress={() => {
                  if (calendarYear < new Date().getFullYear()) setCalendarYear((y) => y + 1);
                }}
                disabled={calendarYear >= new Date().getFullYear()}
                className={`min-h-[48px] min-w-[48px] items-center justify-center rounded-xl ${
                  calendarYear >= new Date().getFullYear()
                    ? 'bg-stone-50 opacity-40 cursor-not-allowed'
                    : 'bg-stone-100 active:bg-stone-200'
                }`}
              >
                <ChevronRight size={20} color="#44403c" />
              </Pressable>
            </View>

            <View className="flex-row flex-wrap justify-between gap-y-2.5">
              {MONTH_NAMES.map((mName, mIdx) => {
                const now = new Date();
                const isFuture =
                  calendarYear > now.getFullYear() ||
                  (calendarYear === now.getFullYear() && mIdx > now.getMonth());
                return (
                  <Pressable
                    key={mName}
                    disabled={isFuture}
                    onPress={() => !isFuture && handleSelectMonth(mIdx, calendarYear)}
                    className={`w-[31%] min-h-[48px] items-center justify-center rounded-xl ${
                      isFuture
                        ? 'opacity-25 bg-stone-50 cursor-not-allowed'
                        : 'bg-stone-100 active:bg-stone-200'
                    }`}
                  >
                    <Text
                      className={`text-base font-bold ${isFuture ? 'text-stone-400' : 'text-stone-800'}`}
                    >
                      {mName.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View>
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-stone-200">
              <Pressable
                onPress={() => {
                  if (calendarMonth === 0) {
                    setCalendarMonth(11);
                    setCalendarYear((y) => y - 1);
                  } else {
                    setCalendarMonth((m) => m - 1);
                  }
                }}
                className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
              >
                <ChevronLeft size={20} color="#44403c" />
              </Pressable>

              <Text className="text-xl font-black text-stone-900">
                {MONTH_NAMES[calendarMonth]} {calendarYear}
              </Text>

              <Pressable
                onPress={() => {
                  const now = new Date();
                  if (calendarYear === now.getFullYear() && calendarMonth >= now.getMonth()) {
                    return;
                  }
                  if (calendarMonth === 11) {
                    setCalendarMonth(0);
                    setCalendarYear((y) => y + 1);
                  } else {
                    setCalendarMonth((m) => m + 1);
                  }
                }}
                disabled={
                  calendarYear === new Date().getFullYear() &&
                  calendarMonth >= new Date().getMonth()
                }
                className={`min-h-[48px] min-w-[48px] items-center justify-center rounded-xl ${
                  calendarYear === new Date().getFullYear() &&
                  calendarMonth >= new Date().getMonth()
                    ? 'bg-stone-50 opacity-40 cursor-not-allowed'
                    : 'bg-stone-100 active:bg-stone-200'
                }`}
              >
                <ChevronRight size={20} color="#44403c" />
              </Pressable>
            </View>

            <View className="flex-row justify-between mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <View key={d} className="w-[14%] items-center">
                  <Text className="text-base font-bold text-stone-400">{d}</Text>
                </View>
              ))}
            </View>

            <View className="flex-row flex-wrap">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} className="w-[14%] min-h-[48px]" />;
                }

                const formattedDay = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = formattedDay === todayStr;
                const isFuture = formattedDay > todayStr;
                const isSelected = selectedDate === formattedDay && period === 'specific_day';

                return (
                  <Pressable
                    key={`day-${day}`}
                    disabled={isFuture}
                    onPress={() => !isFuture && handleSelectDay(day)}
                    className={`w-[14%] min-h-[48px] items-center justify-center rounded-xl ${
                      isFuture
                        ? 'opacity-25 bg-stone-50 cursor-not-allowed'
                        : isSelected
                          ? 'bg-[#800020]'
                          : isToday
                            ? 'border border-[#800020] bg-rose-50/40'
                            : 'active:bg-stone-100'
                    }`}
                  >
                    <Text
                      className={`text-base font-bold ${
                        isFuture
                          ? 'text-stone-400'
                          : isSelected
                            ? 'text-white'
                            : isToday
                              ? 'text-[#800020]'
                              : 'text-stone-800'
                      }`}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View className="mt-5 pt-3 border-t border-stone-100 flex-row items-center justify-between">
          <Pressable
            onPress={() => {
              setSelectedDate(todayStr);
              setPeriod('today');
              onClose();
            }}
            className="min-h-[48px] px-5 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
          >
            <Text className="text-base font-bold text-stone-700">Today</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#800020] active:bg-[#6b001a]"
          >
            <Text className="text-base font-bold text-white">Done</Text>
          </Pressable>
        </View>
      </View>
    </AdminModal>
  );
};
