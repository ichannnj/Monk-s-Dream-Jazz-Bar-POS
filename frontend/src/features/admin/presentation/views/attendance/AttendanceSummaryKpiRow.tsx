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
      {/* Printable Formal Header (Visible only on print or document view) */}
      <View className="hidden print:block mb-4 p-4 border-b-2 border-stone-800">
        <Text className="text-xl font-black text-[#800020] uppercase tracking-wide">
          MONK'S DREAM JAZZ BAR &amp; BISTRO
        </Text>
        <Text className="text-lg font-bold text-stone-900 mt-0.5">
          ATTENDANCE &amp; SHIFT PAYROLL LEDGER
        </Text>
        <Text className="text-base text-stone-600 mt-1">
          Reporting Period: {dateRange.label} · Printed on {new Date().toLocaleString()}
        </Text>
      </View>

      {/* Clean 4-Metric Payroll Summary Strip */}
      <View className="flex-col sm:flex-row flex-wrap gap-2.5">
        <View className="flex-1 min-w-[170px] rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs justify-between">
          <Text className="text-base font-semibold text-stone-500">Staff Present</Text>
          <Text className="mt-1 text-2xl font-black text-stone-900">
            {periodTotals.presentCount}
            <Text className="text-base font-normal text-stone-500">
              {' '}
              ({periodTotals.clockedInCount} in · {periodTotals.completedCount} done)
            </Text>
          </Text>
        </View>

        <View className="flex-1 min-w-[170px] rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs justify-between">
          <Text className="text-base font-semibold text-stone-500">Base Wages</Text>
          <Text className="mt-1 text-2xl font-black text-stone-800">
            ₱{periodTotals.baseTotal.toFixed(2)}
          </Text>
        </View>

        <View className="flex-1 min-w-[170px] rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs justify-between">
          <Text className="text-base font-semibold text-emerald-800">OT / Bonuses</Text>
          <Text className="mt-1 text-2xl font-black text-emerald-700">
            +₱{periodTotals.bonusTotal.toFixed(2)}
          </Text>
        </View>

        <View className="flex-1 min-w-[170px] rounded-xl border border-[#800020]/20 bg-[#800020]/5 p-3.5 shadow-xs justify-between">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-[#800020]">Total Staff Payroll</Text>
            <Text className="text-xs text-[#800020]/70 font-semibold">Excludes Admin</Text>
          </View>
          <Text className="mt-1 text-2xl font-black text-[#800020]">
            ₱{periodTotals.grandTotal.toFixed(2)}
          </Text>
        </View>
      </View>
    </>
  );
};
