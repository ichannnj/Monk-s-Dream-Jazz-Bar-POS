import React from 'react';
import { View, Text } from 'react-native';
import { AttendancePeriodTotals } from './attendance.types';
import { DateRangeResult } from './attendanceDateUtils';

interface AttendanceSummaryKpiRowProps {
  periodTotals: AttendancePeriodTotals;
  dateRange: DateRangeResult;
}

export const AttendanceSummaryKpiRow: React.FC<AttendanceSummaryKpiRowProps> = ({
  periodTotals,
  dateRange,
}) => {
  return (
    <>
      {/* Printable Formal Header */}
      <View className="hidden print:block mb-4 p-4 border-b-2 border-stone-800">
        <Text className="text-lg font-black text-[#800020] uppercase tracking-wide">
          MONK'S DREAM JAZZ BAR
        </Text>
        <Text className="text-base font-bold text-stone-900 mt-0.5">
          ATTENDANCE &amp; PAYROLL LEDGER
        </Text>
        <Text className="text-xs text-stone-600 mt-0.5">
          {dateRange.label} · Generated {new Date().toLocaleDateString()}
        </Text>
      </View>

      {/* 4-Metric Payroll Summary Strip (Strict 3-Color Hierarchy: Sand, Charcoal, Burgundy #800020) */}
      <View className="flex-col sm:flex-row flex-wrap gap-2.5">
        <View className="flex-1 min-w-[150px] rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-xs justify-between">
          <Text className="text-xs font-semibold text-stone-500">Staff Present</Text>
          <Text className="mt-1 text-xl font-black text-stone-900">
            {periodTotals.presentCount}
            <Text className="text-xs font-normal text-stone-500">
              {' '}
              ({periodTotals.clockedInCount} in · {periodTotals.completedCount} done)
            </Text>
          </Text>
        </View>

        <View className="flex-1 min-w-[150px] rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-xs justify-between">
          <Text className="text-xs font-semibold text-stone-500">Base Wages</Text>
          <Text className="mt-1 text-xl font-black text-stone-900">
            ₱{periodTotals.baseTotal.toFixed(2)}
          </Text>
        </View>

        <View className="flex-1 min-w-[150px] rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-xs justify-between">
          <Text className="text-xs font-semibold text-[#800020]">OT / Bonuses</Text>
          <Text className="mt-1 text-xl font-black text-[#800020]">
            +₱{periodTotals.bonusTotal.toFixed(2)}
          </Text>
        </View>

        <View className="flex-1 min-w-[150px] rounded-xl border border-stone-200/80 bg-[#FAF8F5] p-3.5 shadow-xs justify-between">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold text-stone-800">Total Payroll</Text>
            <Text className="text-[10px] text-stone-500 font-medium">Excl. Admin</Text>
          </View>
          <Text className="mt-1 text-xl font-black text-stone-900">
            ₱{periodTotals.grandTotal.toFixed(2)}
          </Text>
        </View>
      </View>
    </>
  );
};
