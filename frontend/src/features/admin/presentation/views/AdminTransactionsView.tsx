import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import {
  BarChart3,
  Receipt,
  FileText,
  TrendingUp,
  QrCode,
  Coffee,
  Sparkles,
} from 'lucide-react-native';
import { ChecksHistoryView } from '@/features/check-history/presentation/ChecksHistoryView';
import { AdminReadingsView } from './readings/AdminReadingsView';
import { AdminCashlessTransactionsView } from './transactions/AdminCashlessTransactionsView';
import { AdminTrendsReportView } from './trends/AdminTrendsReportView';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import {
  type AdminTransactionsViewProps,
  type ModeFilter,
} from './transactions-overview/transactionsOverview.types';
import { useTransactionsOverviewController } from './transactions-overview/useTransactionsOverviewController';
import { FinancialOverviewSubTab } from './transactions-overview/FinancialOverviewSubTab';
import { TrendsFilterToolbar } from './transactions-overview/TrendsFilterToolbar';
import { TransactionsTimeframeStationModals } from './transactions-overview/TransactionsTimeframeStationModals';
import { TransactionsDatePickerModal } from './transactions-overview/TransactionsDatePickerModal';

export * from './transactions-overview/transactionsOverview.types';

export const AdminTransactionsView: React.FC<AdminTransactionsViewProps> = ({
  analytics: initialAnalytics,
  onRefresh,
}) => {
  const {
    subTab,
    setSubTab,
    selectedPeriod,
    setSelectedPeriod,
    selectedStation,
    setSelectedStation,
    selectedMode,
    setSelectedMode,
    isTimeframeModalOpen,
    setIsTimeframeModalOpen,
    isStationModalOpen,
    setIsStationModalOpen,
    isDatePickerModalOpen,
    setIsDatePickerModalOpen,
    datePickerMode,
    setDatePickerMode,
    selectedMonthYear,
    specificDate,
    calendarYear,
    setCalendarYear,
    calendarMonth,
    setCalendarMonth,
    isFetchingAnalytics,
    dateBounds,
    effectiveAnalytics,
    channelEntries,
    grossSales,
    orderCount,
    averageTicket,
    totalCogs,
    cogsMargin,
    estimatedNetProfit,
    profitMargin,
    activeTimeframeOption,
    activeStationOption,
    timeframeDisplayLabel,
    handlePrintReport,
    handleExportFinancialExcel,
    calendarDays,
    monthNames,
    isCurrentOrFutureMonth,
    isDayInSelectedWeek,
    handleSelectDay,
    handleSelectMonth,
    handlePrevMonth,
    handleNextMonth,
    fetchAnalyticsData,
  } = useTransactionsOverviewController(initialAnalytics, onRefresh);

  const subTabOptions: PosDropdownOption<
    'analytics' | 'trends' | 'checks' | 'cashless' | 'readings'
  >[] = [
    {
      value: 'analytics',
      label: 'Financial Overview',
      icon: BarChart3,
    },
    {
      value: 'trends',
      label: 'Trends & Best Sellers',
      icon: TrendingUp,
    },
    {
      value: 'cashless',
      label: 'Online & Cashless',
      icon: QrCode,
    },
    {
      value: 'checks',
      label: 'Checks & Reprints',
      icon: Receipt,
    },
    {
      value: 'readings',
      label: 'X, Y & Z Readings',
      icon: FileText,
    },
  ];

  const modeFilterOptions: PosDropdownOption<ModeFilter>[] = [
    { value: 'ALL', label: 'All Modes', icon: Sparkles },
    { value: 'CAFE', label: 'Cafe Mode', icon: Coffee },
    { value: 'EVENT', label: 'Event Mode', icon: Sparkles },
  ];

  return (
    <View className="flex-1 bg-[#FAF8F5]">
      <View className="border-b border-stone-200/80 bg-white px-4 sm:px-8 py-2.5 flex-row items-center justify-between gap-3">
        <Text className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 hidden sm:flex">
          Reports &amp; Fiscal Hub
        </Text>
        <PosDropdown
          options={subTabOptions}
          value={subTab}
          onChange={setSubTab}
          prefixLabel="Report:"
          sheetTitle="Select Report"
          className="w-full sm:w-72"
        />
      </View>

      {subTab === 'readings' ? (
        <View className="flex-1">
          <AdminReadingsView />
        </View>
      ) : subTab === 'cashless' ? (
        <View className="flex-1">
          <AdminCashlessTransactionsView
            startDate={dateBounds.startDate}
            endDate={dateBounds.endDate}
            timeframeLabel={timeframeDisplayLabel}
            mode={selectedMode}
          />
        </View>
      ) : subTab === 'checks' ? (
        <View className="flex-1">
          <ChecksHistoryView
            startDate={dateBounds.startDate}
            endDate={dateBounds.endDate}
            station={selectedStation}
            timeframeLabel={timeframeDisplayLabel}
            mode={selectedMode}
          />
        </View>
      ) : subTab === 'trends' ? (
        <View className="flex-1">
          <TrendsFilterToolbar
            activeTimeframeOption={activeTimeframeOption}
            activeStationOption={activeStationOption}
            selectedPeriod={selectedPeriod}
            timeframeDisplayLabel={timeframeDisplayLabel}
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
            modeFilterOptions={modeFilterOptions}
            setIsTimeframeModalOpen={setIsTimeframeModalOpen}
            setIsStationModalOpen={setIsStationModalOpen}
            setIsDatePickerModalOpen={setIsDatePickerModalOpen}
          />
          <AdminTrendsReportView
            startDate={dateBounds.startDate}
            endDate={dateBounds.endDate}
            station={selectedStation}
            mode={selectedMode}
            timeframeLabel={timeframeDisplayLabel}
            onRefreshParent={fetchAnalyticsData}
          />
        </View>
      ) : (
        <ScrollView className="flex-1 p-4 sm:p-6 lg:p-8" showsVerticalScrollIndicator={false}>
          <FinancialOverviewSubTab
            effectiveAnalytics={effectiveAnalytics}
            grossSales={grossSales}
            orderCount={orderCount}
            averageTicket={averageTicket}
            totalCogs={totalCogs}
            cogsMargin={cogsMargin}
            estimatedNetProfit={estimatedNetProfit}
            profitMargin={profitMargin}
            channelEntries={channelEntries}
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
        </ScrollView>
      )}

      <TransactionsTimeframeStationModals
        isTimeframeModalOpen={isTimeframeModalOpen}
        setIsTimeframeModalOpen={setIsTimeframeModalOpen}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        isStationModalOpen={isStationModalOpen}
        setIsStationModalOpen={setIsStationModalOpen}
        selectedStation={selectedStation}
        setSelectedStation={setSelectedStation}
        setIsDatePickerModalOpen={setIsDatePickerModalOpen}
        setDatePickerMode={setDatePickerMode}
      />

      <TransactionsDatePickerModal
        isDatePickerModalOpen={isDatePickerModalOpen}
        setIsDatePickerModalOpen={setIsDatePickerModalOpen}
        datePickerMode={datePickerMode}
        setDatePickerMode={setDatePickerMode}
        selectedPeriod={selectedPeriod}
        calendarMonth={calendarMonth}
        calendarYear={calendarYear}
        setCalendarYear={setCalendarYear}
        setCalendarMonth={setCalendarMonth}
        monthNames={monthNames}
        calendarDays={calendarDays}
        isCurrentOrFutureMonth={isCurrentOrFutureMonth}
        isDayInSelectedWeek={isDayInSelectedWeek}
        selectedMonthYear={selectedMonthYear}
        specificDate={specificDate}
        handlePrevMonth={handlePrevMonth}
        handleNextMonth={handleNextMonth}
        handleSelectDay={handleSelectDay}
        handleSelectMonth={handleSelectMonth}
      />
    </View>
  );
};
