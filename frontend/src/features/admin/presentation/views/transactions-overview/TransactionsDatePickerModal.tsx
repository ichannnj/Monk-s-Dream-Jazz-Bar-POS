import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import { AdminModal } from '../../components/AdminModal';
import { type TimeframePeriod } from './transactionsOverview.types';

interface TransactionsDatePickerModalProps {
  isDatePickerModalOpen: boolean;
  setIsDatePickerModalOpen: (open: boolean) => void;
  datePickerMode: 'day' | 'week' | 'month';
  setDatePickerMode: (mode: 'day' | 'week' | 'month') => void;
  selectedPeriod: TimeframePeriod;
  calendarMonth: number;
  calendarYear: number;
  setCalendarYear: React.Dispatch<React.SetStateAction<number>>;
  setCalendarMonth: React.Dispatch<React.SetStateAction<number>>;
  monthNames: string[];
  calendarDays: (number | null)[];
  isCurrentOrFutureMonth: boolean;
  isDayInSelectedWeek: (day: number) => boolean;
  selectedMonthYear: { year: number; month: number };
  specificDate: string;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handleSelectDay: (day: number) => void;
  handleSelectMonth: (monthIndex: number, yearNum: number) => void;
}

export const TransactionsDatePickerModal: React.FC<TransactionsDatePickerModalProps> = ({
  isDatePickerModalOpen,
  setIsDatePickerModalOpen,
  datePickerMode,
  setDatePickerMode,
  selectedPeriod,
  calendarMonth,
  calendarYear,
  setCalendarYear,
  setCalendarMonth,
  monthNames,
  calendarDays,
  isCurrentOrFutureMonth,
  isDayInSelectedWeek,
  selectedMonthYear,
  specificDate,
  handlePrevMonth,
  handleNextMonth,
  handleSelectDay,
  handleSelectMonth,
}) => {
  return (
    <AdminModal
      visible={isDatePickerModalOpen}
      onClose={() => setIsDatePickerModalOpen(false)}
      title={
        datePickerMode === 'day'
          ? 'Select Specific Day'
          : datePickerMode === 'week'
            ? 'Select Specific Week'
            : 'Select Specific Month'
      }
      subtitle={
        datePickerMode === 'day'
          ? 'Pick an exact operational day for transactional audit'
          : datePickerMode === 'week'
            ? 'Select any day within a week to load its full Monday–Sunday bounds'
            : 'Choose any historical month and year across venue operations'
      }
      icon={<Calendar size={22} color="#800020" />}
      size="md"
    >
      <View className="p-1">
        {/* Picker Mode Switcher: Day vs Week vs Month */}
        <View className="flex-row rounded-xl bg-stone-100 p-1 mb-4">
          <Pressable
            onPress={() => setDatePickerMode('day')}
            className={`flex-1 min-h-[40px] items-center justify-center rounded-lg ${
              datePickerMode === 'day' ? 'bg-white shadow-xs' : 'active:bg-stone-200'
            }`}
          >
            <Text
              className={`text-base font-bold ${
                datePickerMode === 'day' ? 'text-[#800020]' : 'text-stone-600'
              }`}
            >
              Day
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setDatePickerMode('week')}
            className={`flex-1 min-h-[40px] items-center justify-center rounded-lg ${
              datePickerMode === 'week' ? 'bg-white shadow-xs' : 'active:bg-stone-200'
            }`}
          >
            <Text
              className={`text-base font-bold ${
                datePickerMode === 'week' ? 'text-[#800020]' : 'text-stone-600'
              }`}
            >
              Week
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setDatePickerMode('month')}
            className={`flex-1 min-h-[40px] items-center justify-center rounded-lg ${
              datePickerMode === 'month' ? 'bg-white shadow-xs' : 'active:bg-stone-200'
            }`}
          >
            <Text
              className={`text-base font-bold ${
                datePickerMode === 'month' ? 'text-[#800020]' : 'text-stone-600'
              }`}
            >
              Month
            </Text>
          </Pressable>
        </View>

        {datePickerMode === 'month' ? (
          /* MONTH & YEAR PICKER VIEW */
          <View>
            {/* Year Navigation Bar */}
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-stone-200">
              <Pressable
                onPress={() => setCalendarYear((y) => y - 1)}
                className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
              >
                <ChevronLeft size={20} color="#44403c" />
              </Pressable>

              <Text className="text-lg font-black text-stone-900">{calendarYear}</Text>

              <Pressable
                onPress={() => {
                  const currentYear = new Date().getFullYear();
                  if (calendarYear < currentYear) {
                    setCalendarYear((y) => y + 1);
                  }
                }}
                disabled={calendarYear >= new Date().getFullYear()}
                className={`min-h-[44px] min-w-[44px] items-center justify-center rounded-xl ${
                  calendarYear >= new Date().getFullYear()
                    ? 'bg-stone-50 opacity-40 cursor-not-allowed'
                    : 'bg-stone-100 active:bg-stone-200'
                }`}
              >
                <ChevronRight
                  size={20}
                  color={calendarYear >= new Date().getFullYear() ? '#a8a29e' : '#44403c'}
                />
              </Pressable>
            </View>

            {/* 12 Months Grid */}
            <View className="flex-row flex-wrap justify-between gap-y-2.5">
              {monthNames.map((mName, mIdx) => {
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth();
                const isFutureMonth =
                  calendarYear > currentYear ||
                  (calendarYear === currentYear && mIdx > currentMonth);
                const isSelectedMonth =
                  selectedPeriod === 'select_month' &&
                  selectedMonthYear.year === calendarYear &&
                  selectedMonthYear.month === mIdx;
                const isCurrentMonth = calendarYear === currentYear && mIdx === currentMonth;

                return (
                  <Pressable
                    key={mName}
                    disabled={isFutureMonth}
                    onPress={() => !isFutureMonth && handleSelectMonth(mIdx, calendarYear)}
                    className={`w-[31%] min-h-[48px] items-center justify-center rounded-xl transition-all ${
                      isFutureMonth
                        ? 'opacity-25 bg-stone-50 cursor-not-allowed'
                        : isSelectedMonth
                          ? 'bg-[#800020]'
                          : isCurrentMonth
                            ? 'border border-[#800020] bg-rose-50/40'
                            : 'bg-stone-100 active:bg-stone-200'
                    }`}
                  >
                    <Text
                      className={`text-base font-bold ${
                        isFutureMonth
                          ? 'text-stone-400'
                          : isSelectedMonth
                            ? 'text-white'
                            : isCurrentMonth
                              ? 'text-[#800020]'
                              : 'text-stone-800'
                      }`}
                    >
                      {mName.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          /* DAY / WEEK CALENDAR VIEW */
          <View>
            {/* Calendar Header with Month/Year Navigation */}
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-stone-200">
              <Pressable
                onPress={handlePrevMonth}
                className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
              >
                <ChevronLeft size={20} color="#44403c" />
              </Pressable>

              <Text className="text-lg font-black text-stone-900">
                {monthNames[calendarMonth]} {calendarYear}
              </Text>

              <Pressable
                onPress={handleNextMonth}
                disabled={isCurrentOrFutureMonth}
                className={`min-h-[44px] min-w-[44px] items-center justify-center rounded-xl ${
                  isCurrentOrFutureMonth
                    ? 'bg-stone-50 opacity-40 cursor-not-allowed'
                    : 'bg-stone-100 active:bg-stone-200'
                }`}
              >
                <ChevronRight size={20} color={isCurrentOrFutureMonth ? '#a8a29e' : '#44403c'} />
              </Pressable>
            </View>

            {/* Weekday Labels */}
            <View className="flex-row justify-between mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <View key={d} className="w-[14%] items-center">
                  <Text className="text-base font-bold text-stone-400">{d}</Text>
                </View>
              ))}
            </View>

            {/* Day Grid */}
            <View className="flex-row flex-wrap">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} className="w-[14%] h-12" />;
                }

                const formattedDayStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const isToday = formattedDayStr === todayStr;
                const isFuture = formattedDayStr > todayStr;

                const isSelected =
                  datePickerMode === 'week'
                    ? isDayInSelectedWeek(day)
                    : selectedPeriod === 'custom' && specificDate === formattedDayStr;

                return (
                  <Pressable
                    key={`day-${day}`}
                    disabled={isFuture}
                    onPress={() => !isFuture && handleSelectDay(day)}
                    className={`w-[14%] h-12 items-center justify-center rounded-xl transition-all ${
                      isFuture
                        ? 'opacity-25 bg-stone-50 cursor-not-allowed'
                        : isSelected
                          ? 'bg-[#800020]'
                          : isToday
                            ? 'border border-[#800020] bg-rose-50/40'
                            : 'active:bg-stone-100 hover:bg-stone-100'
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

        {/* Footer Quick Today & Done Button */}
        <View className="mt-5 pt-3 border-t border-stone-100 flex-row items-center justify-between">
          <Pressable
            onPress={() => {
              const now = new Date();
              setCalendarYear(now.getFullYear());
              setCalendarMonth(now.getMonth());
              if (datePickerMode === 'month') {
                handleSelectMonth(now.getMonth(), now.getFullYear());
              } else {
                handleSelectDay(now.getDate());
              }
            }}
            className="min-h-[44px] px-4 rounded-xl bg-stone-100 active:bg-stone-200 flex-row items-center"
          >
            <Text className="text-base font-bold text-stone-700">
              {datePickerMode === 'month'
                ? 'This Month'
                : datePickerMode === 'week'
                  ? 'This Week'
                  : 'Today'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setIsDatePickerModalOpen(false)}
            className="min-h-[44px] px-4 rounded-xl bg-[#800020] active:bg-[#6b001a] flex-row items-center"
          >
            <Text className="text-base font-bold text-white">Done</Text>
          </Pressable>
        </View>
      </View>
    </AdminModal>
  );
};
