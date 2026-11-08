import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { RefreshCw, Calendar } from 'lucide-react-native';
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

export interface AdminDashboardViewProps {
  telemetry: DashboardTelemetry;
  onRefresh: () => void;
  onNavigateRoute: (route: AdminRoute) => void;
  isLoading?: boolean;
  timeframe?: TimeframeFilter;
  onChangeTimeframe?: (timeframe: TimeframeFilter) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  telemetry,
  onRefresh,
  onNavigateRoute,
  isLoading = false,
  timeframe = 'today',
  onChangeTimeframe,
}) => {
  const ctrl = useAdminDashboardController({
    telemetry,
    timeframe,
    onChangeTimeframe,
  });

  return (
    <ScrollView className="flex-1 min-w-0 bg-[#fcf9f9]" showsVerticalScrollIndicator={false}>
      <View className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
        {/* Header: Title, Timeframe Selector, and Refresh */}
        <View className="flex-col sm:flex-row sm:items-center justify-between pb-1 gap-3">
          <View className="flex-1 min-w-0">
            <Text className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              Performance Overview
            </Text>
            <Text className="mt-0.5 text-base font-medium text-stone-500">
              Updated {telemetry.lastUpdated}
            </Text>
          </View>

          <View className="flex-row items-center gap-2.5 flex-wrap">
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

            <Pressable
              onPress={onRefresh}
              disabled={isLoading}
              className="min-h-[48px] flex-row items-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-xs active:bg-stone-50"
            >
              <RefreshCw size={18} color="#44403c" className={isLoading ? 'animate-spin' : ''} />
              <Text className="ml-2 text-base font-bold text-stone-800">
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </Text>
            </Pressable>
          </View>
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
