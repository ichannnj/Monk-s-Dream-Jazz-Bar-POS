import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Calendar } from 'lucide-react-native';
import type { DashboardTelemetry, AdminRoute, TimeframeFilter } from '../../domain/admin.types';
import { PosDropdown } from '@/features/shared';
import { TodaysEventBanner } from '@/features/events';
import {
  TIMEFRAME_OPTIONS,
  useAdminDashboardController,
} from './dashboard/useAdminDashboardController';
import { DashboardKpiAndModeSection } from './dashboard/DashboardKpiAndModeSection';
import { DashboardLaborAndPayrollSection } from './dashboard/DashboardLaborAndPayrollSection';
import { DashboardChartsAndTendersSection } from './dashboard/DashboardChartsAndTendersSection';
import { DashboardBestSellersAndStationsSection } from './dashboard/DashboardBestSellersAndStationsSection';
import { DashboardAlertsSection } from './dashboard/DashboardAlertsSection';
import { DashboardSkeleton } from './dashboard/DashboardSkeleton';

export interface AdminDashboardViewProps {
  telemetry: DashboardTelemetry | null;
  onRefresh?: () => void;
  onNavigateRoute: (route: AdminRoute) => void;
  isLoading?: boolean;
  timeframe?: TimeframeFilter;
  onChangeTimeframe?: (timeframe: TimeframeFilter) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  telemetry,
  onNavigateRoute,
  isLoading = false,
  timeframe = 'today',
  onChangeTimeframe,
}) => {
  const ctrl = useAdminDashboardController({
    telemetry: telemetry || ({} as DashboardTelemetry),
    timeframe,
    onChangeTimeframe,
  });

  if (!telemetry && isLoading) {
    return (
      <ScrollView className="flex-1 min-w-0 bg-[#FAF8F5]" showsVerticalScrollIndicator={false}>
        <DashboardSkeleton />
      </ScrollView>
    );
  }

  if (!telemetry) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAF8F5] p-6">
        <Text className="text-base font-semibold text-stone-600">No telemetry data available.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 min-w-0 bg-[#FAF8F5]" showsVerticalScrollIndicator={false}>
      <View className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
        {/* Minimal Header: Title & Timeframe Selector (Refresh button removed as this is a live dashboard) */}
        <View className="flex-row items-center justify-between pb-1 gap-3">
          <Text className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            Overview
          </Text>

          <PosDropdown
            options={TIMEFRAME_OPTIONS.map((opt) => ({
              value: opt.key,
              label: opt.label,
              description: opt.description,
              icon: Calendar,
            }))}
            value={timeframe}
            onChange={(key) => onChangeTimeframe?.(key)}
            prefixLabel="Period:"
            sheetTitle="Select Analytics Timeframe"
          />
        </View>

        {/* Tonight's Event Live Highlight */}
        <TodaysEventBanner />

        {/* Operational Floor KPI Cards & Mode Split */}
        <DashboardKpiAndModeSection
          telemetry={telemetry}
          timeframe={timeframe}
          activeTimeframeOption={ctrl.activeTimeframeOption}
          onNavigateRoute={onNavigateRoute}
          onSelectTimeframe={(key) => onChangeTimeframe?.(key)}
        />

        {/* Real Labor, Attendance & Payroll Cost Snapshot */}
        <DashboardLaborAndPayrollSection
          telemetry={telemetry}
          activeTimeframeOption={ctrl.activeTimeframeOption}
          onNavigateRoute={onNavigateRoute}
        />

        {/* Hourly Velocity Chart & Payment/Department Breakdown */}
        <DashboardChartsAndTendersSection
          telemetry={telemetry}
          departmentShares={ctrl.departmentShares}
        />

        {/* Ranked Best Sellers & Station Performance */}
        <DashboardBestSellersAndStationsSection
          telemetry={telemetry}
          activeTimeframeOption={ctrl.activeTimeframeOption}
          bestSellerFilter={ctrl.bestSellerFilter}
          setBestSellerFilter={ctrl.setBestSellerFilter}
          selectedCategory={ctrl.selectedCategory}
          setSelectedCategory={ctrl.setSelectedCategory}
          availableCategories={ctrl.availableCategories}
          visibleBestSellers={ctrl.visibleBestSellers}
          nowMs={ctrl.nowMs}
          onNavigateRoute={onNavigateRoute}
        />

        {/* Actionable Floor & Inventory Alerts */}
        <DashboardAlertsSection
          alerts={ctrl.alerts}
          onClearAlerts={ctrl.handleClearAlerts}
          onNavigateRoute={onNavigateRoute}
        />
      </View>
    </ScrollView>
  );
};

export default AdminDashboardView;
