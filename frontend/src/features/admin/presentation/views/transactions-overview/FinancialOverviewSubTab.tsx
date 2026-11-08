import React from 'react';
import { View } from 'react-native';
import { PosDropdownOption } from '@/features/shared';
import type { SalesAnalyticsOverview } from '../../../data/admin.api';
import {
  type ModeFilter,
  type TimeframeChipOption,
  type StationOption,
  type TimeframePeriod,
} from './transactionsOverview.types';
import { FinancialOverviewToolbar } from './FinancialOverviewToolbar';
import { FinancialOverviewModeAndKpi } from './FinancialOverviewModeAndKpi';
import { FinancialOverviewChartsAndBreakdown } from './FinancialOverviewChartsAndBreakdown';

interface FinancialOverviewSubTabProps {
  effectiveAnalytics: SalesAnalyticsOverview | null;
  grossSales: number;
  orderCount: number;
  averageTicket: number;
  totalCogs: number;
  cogsMargin: number;
  estimatedNetProfit: number;
  profitMargin: number;
  channelEntries: [string, any][];
  isFetchingAnalytics: boolean;
  timeframeDisplayLabel: string;
  activeTimeframeOption: TimeframeChipOption;
  activeStationOption: StationOption;
  selectedPeriod: TimeframePeriod;
  selectedMode: ModeFilter;
  setSelectedMode: (mode: ModeFilter) => void;
  modeFilterOptions: PosDropdownOption<ModeFilter>[];
  setIsTimeframeModalOpen: (open: boolean) => void;
  setIsDatePickerModalOpen: (open: boolean) => void;
  setDatePickerMode: (mode: 'day' | 'week' | 'month') => void;
  setIsStationModalOpen: (open: boolean) => void;
  handleExportFinancialExcel: () => void;
  handlePrintReport: () => void;
  fetchAnalyticsData: () => void;
}

export const FinancialOverviewSubTab: React.FC<FinancialOverviewSubTabProps> = ({
  effectiveAnalytics,
  grossSales,
  orderCount,
  averageTicket,
  totalCogs,
  cogsMargin,
  estimatedNetProfit,
  profitMargin,
  channelEntries,
  isFetchingAnalytics,
  timeframeDisplayLabel,
  activeTimeframeOption,
  activeStationOption,
  selectedPeriod,
  selectedMode,
  setSelectedMode,
  modeFilterOptions,
  setIsTimeframeModalOpen,
  setIsDatePickerModalOpen,
  setDatePickerMode,
  setIsStationModalOpen,
  handleExportFinancialExcel,
  handlePrintReport,
  fetchAnalyticsData,
}) => {
  return (
    <View {...({ id: 'monks-sales-report-printable' } as any)} className="flex-1">
      <FinancialOverviewToolbar
        isFetchingAnalytics={isFetchingAnalytics}
        timeframeDisplayLabel={timeframeDisplayLabel}
        activeTimeframeOption={activeTimeframeOption}
        activeStationOption={activeStationOption}
        selectedPeriod={selectedPeriod}
        selectedMode={selectedMode}
        setSelectedMode={setSelectedMode}
        modeFilterOptions={modeFilterOptions}
        setIsTimeframeModalOpen={setIsTimeframeModalOpen}
        setIsDatePickerModalOpen={setIsDatePickerModalOpen}
        setDatePickerMode={setDatePickerMode}
        setIsStationModalOpen={setIsStationModalOpen}
        handleExportFinancialExcel={handleExportFinancialExcel}
        handlePrintReport={handlePrintReport}
        fetchAnalyticsData={fetchAnalyticsData}
      />
      <FinancialOverviewModeAndKpi
        effectiveAnalytics={effectiveAnalytics}
        grossSales={grossSales}
        orderCount={orderCount}
        averageTicket={averageTicket}
        estimatedNetProfit={estimatedNetProfit}
        profitMargin={profitMargin}
        timeframeDisplayLabel={timeframeDisplayLabel}
        activeStationOption={activeStationOption}
        selectedMode={selectedMode}
      />
      <FinancialOverviewChartsAndBreakdown
        effectiveAnalytics={effectiveAnalytics}
        channelEntries={channelEntries}
        grossSales={grossSales}
        orderCount={orderCount}
        totalCogs={totalCogs}
        cogsMargin={cogsMargin}
        estimatedNetProfit={estimatedNetProfit}
        profitMargin={profitMargin}
      />
    </View>
  );
};
