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
  activeTimeframeOption,
  onNavigateRoute,
}) => {
  return (
    <View className="w-full min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
      <View className="flex-row items-center justify-between flex-wrap gap-3 mb-5">
        <View className="flex-row items-center gap-3 flex-1 min-w-[200px]">
          <View className="w-10 h-10 shrink-0 rounded-xl bg-purple-50 border border-purple-200 items-center justify-center">
            <Users size={20} color="#7c3aed" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-xl font-bold text-stone-900">Labor, Attendance & Payroll</Text>
            <Text className="text-base text-stone-500 font-medium mt-0.5">
              Authoritative attendance payroll expenses & prime cost telemetry (
              {activeTimeframeOption.label})
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => onNavigateRoute('attendance')}
          className="min-h-[44px] px-4 flex-row items-center gap-1.5 rounded-xl bg-purple-50 border border-purple-200 active:bg-purple-100"
        >
          <Text className="text-base font-bold text-purple-800">Open Attendance Ledger</Text>
          <ArrowRight size={16} color="#7c3aed" />
        </Pressable>
      </View>

      <View className="flex-col sm:flex-row flex-wrap gap-4">
        {/* Card 1: Total Payroll Cost */}
        <View className="flex-1 min-w-[220px] rounded-xl border border-stone-200 bg-stone-50/70 p-4 justify-between">
          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-stone-500">Total Payroll Cost</Text>
              <DollarSign size={16} color="#7c3aed" />
            </View>
            <Text className="mt-2 text-2xl font-black text-stone-900">
              ₱
              {Number(telemetry.totalPayrollExpense || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View className="mt-3 pt-2.5 border-t border-stone-200 flex-row items-center justify-between text-base">
            <Text className="text-base text-stone-500">
              Base: ₱{Number(telemetry.basePayrollTotal || 0).toLocaleString()}
            </Text>
            <Text className="text-base font-semibold text-amber-700">
              OT/Bonus: ₱{Number(telemetry.bonusPayrollTotal || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Card 2: Labor Cost Percentage */}
        <View className="flex-1 min-w-[220px] rounded-xl border border-stone-200 bg-stone-50/70 p-4 justify-between">
          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-stone-500">Labor Cost %</Text>
              <TrendingUp size={16} color="#059669" />
            </View>
            <Text className="mt-2 text-2xl font-black text-stone-900">
              {telemetry.laborCostPercent || 0}%
            </Text>
          </View>
          <View className="mt-3 pt-2.5 border-t border-stone-200 flex-row items-center justify-between text-base">
            <Text className="text-base text-stone-500">Benchmark</Text>
            <Text
              className={`text-base font-bold ${(telemetry.laborCostPercent || 0) <= 25 ? 'text-emerald-700' : (telemetry.laborCostPercent || 0) <= 35 ? 'text-amber-700' : 'text-rose-700'}`}
            >
              {(telemetry.laborCostPercent || 0) <= 25
                ? 'Healthy (<25%)'
                : (telemetry.laborCostPercent || 0) <= 35
                  ? 'Moderate'
                  : 'High (>35%)'}
            </Text>
          </View>
        </View>

        {/* Card 3: Staff Present */}
        <View className="flex-1 min-w-[220px] rounded-xl border border-stone-200 bg-stone-50/70 p-4 justify-between">
          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-stone-500">Staff Present</Text>
              <Users size={16} color="#0284c7" />
            </View>
            <Text className="mt-2 text-2xl font-black text-stone-900">
              {telemetry.presentStaffCount || 0}
              <Text className="text-base font-normal text-stone-500">
                {' '}
                / {telemetry.totalActiveStaffCount || 0} staff
              </Text>
            </Text>
          </View>
          <View className="mt-3 pt-2.5 border-t border-stone-200 flex-row items-center justify-between text-base">
            <Text className="text-base text-stone-500">
              {telemetry.clockedInStaffCount || 0} Active On-Shift
            </Text>
            <Text className="text-base text-emerald-700 font-bold">
              {telemetry.completedShiftsCount || 0} Completed
            </Text>
          </View>
        </View>

        {/* Card 4: Estimated Net Profit */}
        <View className="flex-1 min-w-[220px] rounded-xl border border-stone-200 bg-stone-50/70 p-4 justify-between">
          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-stone-500">Est. Net Profit</Text>
              <TrendingUp size={16} color="#800020" />
            </View>
            <Text
              className={`mt-2 text-2xl font-black ${(telemetry.estimatedNetProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
            >
              ₱
              {Number(telemetry.estimatedNetProfit || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View className="mt-3 pt-2.5 border-t border-stone-200 flex-row items-center justify-between text-base">
            <Text className="text-base text-stone-500">Sales - (Labor + COGS)</Text>
            <Text className="text-base text-stone-500 font-medium">
              COGS: ₱{Number(telemetry.estimatedCogs || 0).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
