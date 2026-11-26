import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Users, ArrowRight, DollarSign, TrendingUp } from 'lucide-react-native';
import type { DashboardTelemetry, AdminRoute } from '../../../domain/admin.types';
import { TimeframeOption } from './useAdminDashboardController';

interface DashboardLaborAndPayrollSectionProps {
  telemetry: DashboardTelemetry;
  activeTimeframeOption: TimeframeOption;
  onNavigateRoute: (route: AdminRoute) => void;
}

export const DashboardLaborAndPayrollSection: React.FC<DashboardLaborAndPayrollSectionProps> = ({
  telemetry,
  onNavigateRoute,
}) => {
  return (
    <View className="w-full min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
      {/* Header (Clean, Minimal, No Explanatory Subtitles) */}
      <View className="flex-row items-center justify-between flex-wrap gap-3 mb-4">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-lg bg-[#EFECE6] border border-stone-200 items-center justify-center">
            <Users size={16} color="#810021" />
          </View>
          <Text className="text-lg font-bold text-stone-900">Labor & Payroll</Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => onNavigateRoute('attendance')}
            className="px-3 py-1.5 flex-row items-center gap-1 rounded-xl bg-stone-50 border border-stone-200 active:bg-stone-100"
          >
            <Text className="text-xs font-bold text-stone-800">Attendance</Text>
            <ArrowRight size={13} color="#1A1617" />
          </Pressable>
          <Pressable
            onPress={() => onNavigateRoute('payroll')}
            className="px-3 py-1.5 flex-row items-center gap-1 rounded-xl bg-[#810021]/10 border border-[#810021]/30 active:bg-[#810021]/20"
          >
            <Text className="text-xs font-bold text-[#810021]">Payroll Runs</Text>
            <ArrowRight size={13} color="#810021" />
          </Pressable>
        </View>
      </View>

      <View className="flex-col sm:flex-row flex-wrap gap-4">
        {/* Card 1: Total Payroll Cost */}
        <View className="flex-1 min-w-[200px] rounded-xl border border-stone-200/80 bg-[#EFECE6] p-4 justify-between">
          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-stone-500">Total Payroll</Text>
              <DollarSign size={14} color="#810021" />
            </View>
            <Text className="mt-2 text-xl font-black text-stone-900">
              ₱
              {Number(telemetry.totalPayrollExpense || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View className="mt-3 pt-2 border-t border-stone-200/80 flex-row items-center justify-between text-xs">
            <Text className="text-xs text-stone-500">
              Base ₱{Number(telemetry.basePayrollTotal || 0).toLocaleString()}
            </Text>
            <Text className="text-xs font-bold text-[#810021]">
              OT ₱{Number(telemetry.overtimePayrollTotal || 0).toLocaleString()} (
              {Number(telemetry.overtimeHoursTotal || 0).toFixed(1)}h)
            </Text>
          </View>
        </View>

        {/* Card 2: Labor Cost Percentage */}
        <View className="flex-1 min-w-[200px] rounded-xl border border-stone-200/80 bg-[#EFECE6] p-4 justify-between">
          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-stone-500">Labor Cost</Text>
              <TrendingUp size={14} color="#810021" />
            </View>
            <Text className="mt-2 text-xl font-black text-stone-900">
              {telemetry.laborCostPercent || 0}%
            </Text>
          </View>
          <View className="mt-3 pt-2 border-t border-stone-200/80 flex-row items-center justify-between text-xs">
            <Text className="text-xs text-stone-500">Benchmark</Text>
            <Text className="text-xs font-bold text-stone-800">
              {(telemetry.laborCostPercent || 0) <= 25
                ? '< 25%'
                : (telemetry.laborCostPercent || 0) <= 35
                  ? 'Moderate'
                  : '> 35%'}
            </Text>
          </View>
        </View>

        {/* Card 3: Staff Present */}
        <View className="flex-1 min-w-[200px] rounded-xl border border-stone-200/80 bg-[#EFECE6] p-4 justify-between">
          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-stone-500">Staff Present</Text>
              <Users size={14} color="#78716c" />
            </View>
            <Text className="mt-2 text-xl font-black text-stone-900">
              {telemetry.presentStaffCount || 0}
              <Text className="text-xs font-normal text-stone-500">
                {' '}
                / {telemetry.totalActiveStaffCount || 0}
              </Text>
            </Text>
          </View>
          <View className="mt-3 pt-2 border-t border-stone-200/80 flex-row items-center justify-between text-xs">
            <Text className="text-xs text-stone-500">
              {telemetry.clockedInStaffCount || 0} on-shift
            </Text>
            <Text className="text-xs text-stone-700 font-semibold">
              {telemetry.completedShiftsCount || 0} completed
            </Text>
          </View>
        </View>

        {/* Card 4: Estimated Net Profit */}
        <View className="flex-1 min-w-[200px] rounded-xl border border-stone-200/80 bg-[#EFECE6] p-4 justify-between">
          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-stone-500">Net Profit (Est.)</Text>
              <TrendingUp size={14} color="#810021" />
            </View>
            <Text
              className={`mt-2 text-xl font-black ${(telemetry.estimatedNetProfit ?? 0) >= 0 ? 'text-stone-900' : 'text-[#810021]'}`}
            >
              ₱
              {Number(telemetry.estimatedNetProfit || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View className="mt-3 pt-2 border-t border-stone-200/80 flex-row items-center justify-between text-xs">
            <Text className="text-xs text-stone-500">COGS</Text>
            <Text className="text-xs text-stone-700 font-medium">
              ₱{Number(telemetry.estimatedCogs || 0).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Live On-Shift Roster & Missed Clock-Out Review Strip */}
      {((telemetry.activeOnShiftStaff && telemetry.activeOnShiftStaff.length > 0) ||
        (telemetry.needsReviewCount || 0) > 0) && (
        <View className="mt-4 pt-3.5 border-t border-stone-200/80 flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <View className="flex-row flex-wrap items-center gap-2 flex-1">
            <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1">
              On-Shift Now:
            </Text>
            {telemetry.activeOnShiftStaff && telemetry.activeOnShiftStaff.length > 0 ? (
              telemetry.activeOnShiftStaff.slice(0, 6).map((s) => (
                <View
                  key={s.userId}
                  className="flex-row items-center gap-1.5 rounded-full bg-[#EFECE6] border border-stone-200 px-2.5 py-1"
                >
                  <View className="h-1.5 w-1.5 rounded-full bg-[#810021]" />
                  <Text className="text-xs font-bold text-stone-900">{s.displayName}</Text>
                  <Text className="text-[11px] text-stone-500 capitalize">
                    {s.roleOrTitle} · {s.elapsedHours}h
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-xs text-stone-400">No staff currently clocked in</Text>
            )}
          </View>

          {(telemetry.needsReviewCount || 0) > 0 && (
            <Pressable
              onPress={() => onNavigateRoute('attendance')}
              className="rounded-full bg-amber-100 border border-amber-300 px-3 py-1.5 active:bg-amber-200 self-start sm:self-auto"
            >
              <Text className="text-xs font-bold text-amber-900">
                {telemetry.needsReviewCount} Missed Clock-Out
                {(telemetry.needsReviewCount || 0) > 1 ? 's' : ''} Need Review →
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};
