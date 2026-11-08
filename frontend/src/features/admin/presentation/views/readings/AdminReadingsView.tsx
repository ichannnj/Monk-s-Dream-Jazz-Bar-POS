import React from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import {
  FileText,
  Lock,
  RefreshCw,
  Coins,
  Receipt,
  Layers,
  ArrowRightLeft,
  FileSpreadsheet,
} from 'lucide-react-native';
import { ReadingReportModal } from './ReadingReportModal';
import { ZCloseShiftModal } from './ZCloseShiftModal';
import { YCloseShiftModal } from './YCloseShiftModal';
import { ZReadingsHistoryTable } from './ZReadingsHistoryTable';
import { YReadingsHistoryTable } from './components/YReadingsHistoryTable';
import { ReadingKpiCardsRow } from './components/ReadingKpiCardsRow';
import { ReadingsArchiveFilterToolbar } from './components/ReadingsArchiveFilterToolbar';
import { CashDrawerWaterfallCard } from '../analytics/CashDrawerWaterfallCard';
import { ShiftVarianceTrendChart } from '../analytics/ShiftVarianceTrendChart';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { useAdminReadingsController } from './useAdminReadingsController';

export const AdminReadingsView: React.FC = () => {
  const {
    drawerScope,
    setDrawerScope,
    activeReading,
    varianceTrend,
    historyTab,
    setHistoryTab,
    isLoading,
    isRefreshing,
    archiveSearch,
    setArchiveSearch,
    archiveDrawer,
    setArchiveDrawer,
    reportModalVisible,
    setReportModalVisible,
    selectedReport,
    setSelectedReport,
    zCloseModalVisible,
    setZCloseModalVisible,
    yCloseModalVisible,
    setYCloseModalVisible,
    handleRefresh,
    handleOpenXReading,
    handleOpenYClose,
    handleOpenZClose,
    handleZSuccess,
    handleYSuccess,
    handleExportExcel,
    filteredZHistory,
    filteredYHistory,
    handleExportArchive,
  } = useAdminReadingsController();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#fcf9f9] p-8">
        <ActivityIndicator size="large" color="#800020" />
        <Text className="text-base font-bold text-stone-600 mt-3">Loading POS Shift Data...</Text>
      </View>
    );
  }

  const drawerLabel =
    drawerScope === 'bar'
      ? 'Bar Station Till'
      : drawerScope === 'main'
        ? 'Main Floor Till'
        : 'Consolidated Venue (All Tills)';

  const scopeOptions: PosDropdownOption<'consolidated' | 'main' | 'bar'>[] = [
    {
      value: 'consolidated',
      label: 'Consolidated (All Tills)',
      icon: Layers,
      description: 'Combined venue sales and cash drawers',
    },
    {
      value: 'main',
      label: 'Main Floor Till',
      icon: Coins,
      description: 'Waiter & Cashier counter register till',
    },
    {
      value: 'bar',
      label: 'Bar Station Till',
      icon: Receipt,
      description: 'Barista & Bartender station till',
    },
  ];

  const readingActions: PosDropdownOption<
    'x_reading' | 'y_reading' | 'z_reading' | 'export_xls'
  >[] = [
    {
      value: 'x_reading',
      label: 'Preview Interim X-Reading',
      description: 'Non-destructive live snapshot of current shift accumulators',
      icon: FileText,
    },
    {
      value: 'y_reading',
      label: 'Close Shift & Handover (Y-Reading)',
      description: 'Reconcile cashier drawer for shift handover without resetting daily totals',
      icon: ArrowRightLeft,
      variant: 'warning',
    },
    {
      value: 'z_reading',
      label: 'End-of-Day Fiscal Close (Z-Reading)',
      description: 'Lock business day, advance Z-counter, and reset daily accumulators',
      icon: Lock,
      variant: 'danger',
    },
    {
      value: 'export_xls',
      label: 'Export Current Reading to Excel (.xls)',
      description: 'Download formatted spreadsheet of active shift reading',
      icon: FileSpreadsheet,
      variant: 'success',
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      {/* Top Controls: Till Scope Dropdown & Reading Actions Dropdown */}
      <View className="flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <PosDropdown
          options={scopeOptions}
          value={drawerScope}
          onChange={setDrawerScope}
          prefixLabel="Scope:"
          sheetTitle="Select Till Scope"
          className="w-full sm:w-72"
        />

        <View className="flex-row items-center gap-2.5 flex-wrap">
          <Pressable
            onPress={handleRefresh}
            className="w-12 h-12 rounded-xl bg-white border border-stone-200 items-center justify-center active:bg-stone-100 shadow-xs"
            accessibilityRole="button"
            accessibilityLabel="Refresh readings"
          >
            <RefreshCw size={18} color="#57534e" className={isRefreshing ? 'animate-spin' : ''} />
          </Pressable>

          <PosDropdown
            mode="action"
            options={readingActions}
            onChange={(act) => {
              if (act === 'x_reading') handleOpenXReading();
              else if (act === 'y_reading') handleOpenYClose();
              else if (act === 'z_reading') handleOpenZClose();
              else if (act === 'export_xls') handleExportExcel();
            }}
            triggerLabel="X / Y / Z Reading Actions"
            triggerIcon={FileText}
            variant="wine"
            sheetTitle="Fiscal Shift Reading Actions"
            className="flex-1 sm:flex-initial min-w-[220px]"
          />
        </View>
      </View>

      {/* Active Shift Financial Snapshot Cards */}
      <ReadingKpiCardsRow activeReading={activeReading} />

      {/* Visual Analytics Suite: Cash Drawer Flow Waterfall */}
      <View className="mb-8">
        <CashDrawerWaterfallCard
          openingFloat={activeReading?.opening_float || 0}
          cashSales={activeReading?.tender_cash || 0}
          cashIn={activeReading?.cash_in || 0}
          cashOut={activeReading?.cash_out || 0}
          safeDrops={activeReading?.safe_drops || 0}
          expectedCash={activeReading?.expected_cash || 0}
          drawerLabel={drawerLabel}
        />
      </View>

      {/* Shift Variance Trend Graph */}
      <View className="mb-8">
        <ShiftVarianceTrendChart data={varianceTrend} />
      </View>

      {/* Historical Readings Archive Switcher & Filter Toolbar */}
      <ReadingsArchiveFilterToolbar
        historyTab={historyTab}
        onHistoryTabChange={setHistoryTab}
        zCount={filteredZHistory.length}
        yCount={filteredYHistory.length}
        archiveDrawer={archiveDrawer}
        onArchiveDrawerChange={setArchiveDrawer}
        archiveSearch={archiveSearch}
        onArchiveSearchChange={setArchiveSearch}
        onExportArchive={handleExportArchive}
      />

      {/* History Table */}
      {historyTab === 'z_readings' ? (
        <ZReadingsHistoryTable
          history={filteredZHistory}
          onViewRecord={(record) => {
            setSelectedReport(record);
            setReportModalVisible(true);
          }}
        />
      ) : (
        <YReadingsHistoryTable
          history={filteredYHistory}
          onViewRecord={(record) => {
            setSelectedReport(record);
            setReportModalVisible(true);
          }}
        />
      )}

      {/* Reading Preview & Print Modal */}
      <ReadingReportModal
        visible={reportModalVisible}
        reading={selectedReport}
        onClose={() => {
          setReportModalVisible(false);
          setSelectedReport(null);
        }}
      />

      {/* Y-Close Handover Modal */}
      <YCloseShiftModal
        visible={yCloseModalVisible}
        activeReading={activeReading}
        drawerScope={drawerScope}
        onClose={() => setYCloseModalVisible(false)}
        onYReadingSuccess={handleYSuccess}
      />

      {/* Z-Close Shift Modal */}
      <ZCloseShiftModal
        visible={zCloseModalVisible}
        activeReading={activeReading}
        drawerScope={drawerScope}
        onClose={() => setZCloseModalVisible(false)}
        onZReadingSuccess={handleZSuccess}
      />
    </ScrollView>
  );
};
