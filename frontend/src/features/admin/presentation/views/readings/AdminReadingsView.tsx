import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  FileText,
  Lock,
  Download,
  RefreshCw,
  Coins,
  Receipt,
  Layers,
  ArrowUpRight,
  ArrowRightLeft,
  Calendar,
  History,
  Search,
  X,
} from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import {
  readingsApi,
  type ReadingData,
  type ZReadingRecord,
  type YReadingRecord,
  type ShiftVariancePoint,
} from '../../../data/readings.api';
import {
  exportSingleReadingToExcel,
  exportReadingsArchiveToExcel,
} from '../../../utils/readingExcelExport';
import { FileSpreadsheet } from 'lucide-react-native';
import { ReadingReportModal } from './ReadingReportModal';
import { ZCloseShiftModal } from './ZCloseShiftModal';
import { YCloseShiftModal } from './YCloseShiftModal';
import { ZReadingsHistoryTable } from './ZReadingsHistoryTable';
import { CashDrawerWaterfallCard } from '../analytics/CashDrawerWaterfallCard';
import { ShiftVarianceTrendChart } from '../analytics/ShiftVarianceTrendChart';
import { PosDropdown, PosDropdownOption } from '@/features/shared';

export const AdminReadingsView: React.FC = () => {
  const [drawerScope, setDrawerScope] = useState<'consolidated' | 'main' | 'bar'>('consolidated');
  const [activeReading, setActiveReading] = useState<ReadingData | null>(null);
  const [zHistory, setZHistory] = useState<ZReadingRecord[]>([]);
  const [yHistory, setYHistory] = useState<YReadingRecord[]>([]);
  const [varianceTrend, setVarianceTrend] = useState<ShiftVariancePoint[]>([]);
  const [historyTab, setHistoryTab] = useState<'z_readings' | 'y_handovers'>('z_readings');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Archive search and till filter
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveDrawer, setArchiveDrawer] = useState<'all' | 'consolidated' | 'main' | 'bar'>(
    'all'
  );

  // Modals state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReadingData | null>(null);
  const [zCloseModalVisible, setZCloseModalVisible] = useState(false);
  const [yCloseModalVisible, setYCloseModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [reading, zList, yList, variancePoints] = await Promise.all([
        readingsApi.fetchCurrentXReading(drawerScope),
        readingsApi.fetchZReadingHistory(),
        readingsApi.fetchYReadingHistory(),
        readingsApi.fetchShiftVarianceHistory(),
      ]);
      setActiveReading(reading);
      setZHistory(zList);
      setYHistory(yList);
      setVarianceTrend(variancePoints);
    } catch (err: any) {
      console.error('[AdminReadingsView] Error loading readings data:', err);
      toast.error('Failed to load readings data from database', { title: 'Fetch Error' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [drawerScope]);

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleOpenXReading = () => {
    if (!activeReading) return;
    setSelectedReport(activeReading);
    setReportModalVisible(true);
  };

  const handleOpenYClose = async () => {
    try {
      const shiftReading = await readingsApi.fetchCurrentXReading(drawerScope, 'shift');
      setActiveReading(shiftReading);
    } catch (err) {
      console.warn('[AdminReadingsView] Could not pre-fetch shift reading:', err);
    }
    setYCloseModalVisible(true);
  };

  const handleOpenZClose = () => {
    if (!activeReading) return;
    setZCloseModalVisible(true);
  };

  const handleZSuccess = (zRecord: ZReadingRecord) => {
    loadData();
    const readingData: ReadingData = {
      reading_type: 'Z_READING',
      z_number: zRecord.z_number,
      drawer_target: zRecord.drawer_target,
      opened_at: zRecord.opened_at,
      closed_at: zRecord.closed_at,
      performed_by_name: zRecord.performed_by_name,
      gross_sales: zRecord.gross_sales,
      discount_total: zRecord.discount_total,
      net_sales: zRecord.net_sales,
      vatable_sales: zRecord.vatable_sales,
      vat_amount: zRecord.vat_amount,
      vat_exempt_sales: zRecord.vat_exempt_sales,
      service_charge: zRecord.service_charge,
      tender_cash: zRecord.tender_cash,
      tender_card: zRecord.tender_card,
      tender_digital: zRecord.tender_digital,
      tender_delivery: zRecord.tender_delivery,
      total_tender: zRecord.total_tender,
      opening_float: zRecord.opening_float,
      cash_in: zRecord.cash_in,
      cash_out: zRecord.cash_out,
      safe_drops: zRecord.safe_drops,
      expected_cash: zRecord.expected_cash,
      counted_cash: zRecord.counted_cash,
      variance: zRecord.variance,
      transaction_count: zRecord.transaction_count,
      first_receipt_no: zRecord.first_receipt_no || 'N/A',
      last_receipt_no: zRecord.last_receipt_no || 'N/A',
      notes: zRecord.notes || undefined,
    };
    setSelectedReport(readingData);
    setReportModalVisible(true);
  };

  const handleYSuccess = (yRecord: YReadingRecord) => {
    loadData();
    const readingData: ReadingData = {
      reading_type: 'Y_READING',
      y_number: yRecord.y_number,
      drawer_target: yRecord.drawer_target,
      opened_at: yRecord.opened_at,
      closed_at: yRecord.closed_at,
      outgoing_staff_name: yRecord.outgoing_staff_name,
      incoming_staff_name: yRecord.incoming_staff_name,
      performed_by_name: yRecord.outgoing_staff_name,
      gross_sales: yRecord.gross_sales,
      discount_total: yRecord.discount_total,
      net_sales: yRecord.net_sales,
      vatable_sales: yRecord.vatable_sales,
      vat_amount: yRecord.vat_amount,
      vat_exempt_sales: 0,
      service_charge: yRecord.service_charge,
      tender_cash: yRecord.tender_cash,
      tender_card: yRecord.tender_card,
      tender_digital: yRecord.tender_digital,
      tender_delivery: yRecord.tender_delivery,
      total_tender: yRecord.total_tender,
      opening_float: yRecord.opening_float,
      cash_in: yRecord.cash_in,
      cash_out: yRecord.cash_out,
      safe_drops: yRecord.safe_drops,
      expected_cash: yRecord.expected_cash,
      counted_cash: yRecord.counted_cash,
      variance: yRecord.variance,
      transaction_count: yRecord.transaction_count,
      first_receipt_no: yRecord.first_receipt_no || 'N/A',
      last_receipt_no: yRecord.last_receipt_no || 'N/A',
      notes: yRecord.notes || undefined,
    };
    setSelectedReport(readingData);
    setReportModalVisible(true);
  };

  const handleExportExcel = () => {
    if (!activeReading) return;
    try {
      exportSingleReadingToExcel(activeReading);
      toast.success('Reading exported to Excel (.xls)', { title: 'Export Ready' });
    } catch (err: any) {
      console.error('[AdminReadingsView] Excel export error:', err);
      toast.error('Failed to export reading to Excel', { title: 'Export Error' });
    }
  };

  const filteredZHistory = useMemo(() => {
    return zHistory.filter((rec) => {
      if (archiveDrawer !== 'all' && rec.drawer_target !== archiveDrawer) return false;
      if (archiveSearch.trim()) {
        const q = archiveSearch.toLowerCase().trim();
        const matchNum =
          `z-${rec.z_number}`.toLowerCase().includes(q) || String(rec.z_number).includes(q);
        const matchStaff = (rec.performed_by_name || '').toLowerCase().includes(q);
        const matchNotes = (rec.notes || '').toLowerCase().includes(q);
        const matchDate = new Date(rec.closed_at).toLocaleDateString().includes(q);
        return matchNum || matchStaff || matchNotes || matchDate;
      }
      return true;
    });
  }, [zHistory, archiveDrawer, archiveSearch]);

  const filteredYHistory = useMemo(() => {
    return yHistory.filter((rec) => {
      if (archiveDrawer !== 'all' && rec.drawer_target !== archiveDrawer) return false;
      if (archiveSearch.trim()) {
        const q = archiveSearch.toLowerCase().trim();
        const matchNum =
          `y-${rec.y_number}`.toLowerCase().includes(q) || String(rec.y_number).includes(q);
        const matchOut = (rec.outgoing_staff_name || '').toLowerCase().includes(q);
        const matchIn = (rec.incoming_staff_name || '').toLowerCase().includes(q);
        const matchNotes = (rec.notes || '').toLowerCase().includes(q);
        const matchDate = new Date(rec.closed_at).toLocaleDateString().includes(q);
        return matchNum || matchOut || matchIn || matchNotes || matchDate;
      }
      return true;
    });
  }, [yHistory, archiveDrawer, archiveSearch]);

  const handleExportArchive = () => {
    try {
      if (historyTab === 'z_readings') {
        exportReadingsArchiveToExcel('Z_READING', filteredZHistory);
        toast.success(`Exported ${filteredZHistory.length} Z-Readings to Excel`, {
          title: 'Archive Exported',
        });
      } else {
        exportReadingsArchiveToExcel('Y_READING', filteredYHistory);
        toast.success(`Exported ${filteredYHistory.length} Y-Handovers to Excel`, {
          title: 'Archive Exported',
        });
      }
    } catch (err: any) {
      console.error('[AdminReadingsView] Archive export error:', err);
      toast.error('Failed to export archive to Excel', { title: 'Export Error' });
    }
  };

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

  const historyTabOptions: PosDropdownOption<'z_readings' | 'y_handovers'>[] = [
    {
      value: 'z_readings',
      label: 'Daily Z-Readings Archive',
      badge: filteredZHistory.length,
      icon: Lock,
    },
    {
      value: 'y_handovers',
      label: 'Shift Handover Y-Reports',
      badge: filteredYHistory.length,
      icon: ArrowRightLeft,
    },
  ];

  const archiveTillOptions: PosDropdownOption<'all' | 'consolidated' | 'main' | 'bar'>[] = [
    { value: 'all', label: 'All Tills', icon: Layers },
    { value: 'consolidated', label: 'Consolidated', icon: Layers },
    { value: 'main', label: 'Main Floor Till', icon: Coins },
    { value: 'bar', label: 'Bar Station Till', icon: Receipt },
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
      <View className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        {/* Gross Sales */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-base font-bold text-stone-500">Gross Sales</Text>
            <ArrowUpRight size={18} color="#059669" />
          </View>
          <Text className="text-3xl font-black text-stone-900">
            {formatCurrency(activeReading?.gross_sales || 0)}
          </Text>
          <Text className="text-base text-stone-500 mt-1">
            {activeReading?.transaction_count || 0} Settled Tabs
          </Text>
        </View>

        {/* Net Sales */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
          <Text className="text-base font-bold text-stone-500 mb-1">Net Sales</Text>
          <Text className="text-3xl font-black text-[#800020]">
            {formatCurrency(activeReading?.net_sales || 0)}
          </Text>
          <Text className="text-base text-stone-500 mt-1">
            After {formatCurrency(activeReading?.discount_total || 0)} discounts
          </Text>
        </View>

        {/* Expected Cash in Drawer */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-base font-bold text-stone-500">Expected Cash in Till</Text>
            <Coins size={18} color="#d97706" />
          </View>
          <Text className="text-3xl font-black text-stone-900">
            {formatCurrency(activeReading?.expected_cash || 0)}
          </Text>
          <Text className="text-base text-stone-500 mt-1">
            Float: {formatCurrency(activeReading?.opening_float || 0)} • Cash:{' '}
            {formatCurrency(activeReading?.tender_cash || 0)}
          </Text>
        </View>

        {/* Non-Cash Tenders */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
          <Text className="text-base font-bold text-stone-500 mb-1">Card & Digital Tenders</Text>
          <Text className="text-3xl font-black text-stone-900">
            {formatCurrency(
              (activeReading?.tender_card || 0) + (activeReading?.tender_digital || 0)
            )}
          </Text>
          <Text className="text-base text-stone-500 mt-1">
            Card: {formatCurrency(activeReading?.tender_card || 0)} • Digital:{' '}
            {formatCurrency(activeReading?.tender_digital || 0)}
          </Text>
        </View>
      </View>

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
      <View className="flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-4 bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs">
        <View className="flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <PosDropdown
            options={historyTabOptions}
            value={historyTab}
            onChange={setHistoryTab}
            prefixLabel="Archive:"
            sheetTitle="Select Historical Readings Archive"
            className="w-full sm:w-64"
          />

          <PosDropdown
            options={archiveTillOptions}
            value={archiveDrawer}
            onChange={setArchiveDrawer}
            prefixLabel="Till:"
            sheetTitle="Filter Archive by Till"
            className="w-full sm:w-48"
          />

          <View className="flex-row items-center bg-stone-100 border border-stone-300 rounded-xl px-3 py-2 flex-1 min-h-[48px]">
            <Search size={16} color="#78716c" />
            <TextInput
              className="flex-1 ml-2 text-base text-stone-900"
              placeholder="Search reading #, staff, notes..."
              placeholderTextColor="#a8a29e"
              value={archiveSearch}
              onChangeText={setArchiveSearch}
            />
            {archiveSearch.length > 0 && (
              <Pressable onPress={() => setArchiveSearch('')} className="p-1">
                <X size={16} color="#78716c" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Export Full Archive Button */}
        <Pressable
          onPress={handleExportArchive}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 active:bg-emerald-100 shadow-xs min-h-[48px] justify-center"
        >
          <FileSpreadsheet size={16} color="#047857" />
          <Text className="text-base font-bold text-emerald-800">Export Archive (.xls)</Text>
        </Pressable>
      </View>

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
        /* Y-Reading Handover Records Table */
        <View className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-xs">
          <View className="px-6 py-4 border-b border-stone-200 flex-row items-center justify-between bg-stone-50/50">
            <View>
              <Text className="text-lg font-extrabold text-stone-900">
                Shift Handover Y-Reports
              </Text>
              <Text className="text-base text-stone-500 font-medium">
                Audited cashier shift handovers and rotation drawer reconciliations
              </Text>
            </View>
            <Text className="text-base font-bold text-stone-600">
              {filteredYHistory.length} Handovers
            </Text>
          </View>

          {filteredYHistory.length === 0 ? (
            <View className="p-8 items-center justify-center">
              <ArrowRightLeft size={36} color="#a8a29e" />
              <Text className="text-lg font-bold text-stone-700 mt-2">
                No Shift Handovers Found
              </Text>
              <Text className="text-base text-stone-500 mt-1 text-center">
                No shift handover records match the search or till filter.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="min-w-[800px] divide-y divide-stone-100">
                <View className="flex-row items-center px-6 py-3 bg-stone-100/70">
                  <Text className="w-24 text-base font-bold text-stone-700">Y-Number</Text>
                  <Text className="w-40 text-base font-bold text-stone-700">Date &amp; Time</Text>
                  <Text className="w-32 text-base font-bold text-stone-700">Till</Text>
                  <Text className="w-44 text-base font-bold text-stone-700">Outgoing Cashier</Text>
                  <Text className="w-44 text-base font-bold text-stone-700">Incoming Cashier</Text>
                  <Text className="w-32 text-base font-bold text-stone-700 text-right">
                    Net Sales
                  </Text>
                  <Text className="w-32 text-base font-bold text-stone-700 text-center">
                    Variance
                  </Text>
                  <Text className="w-28 text-base font-bold text-stone-700 text-right">
                    Actions
                  </Text>
                </View>

                {filteredYHistory.map((rec) => (
                  <View
                    key={rec.id}
                    className="flex-row items-center px-6 py-3.5 hover:bg-stone-50/70"
                  >
                    <View className="w-24 flex-row items-center gap-1.5">
                      <View className="w-2 h-2 rounded-full bg-amber-500" />
                      <Text className="text-base font-black text-stone-900">
                        Y-{String(rec.y_number).padStart(4, '0')}
                      </Text>
                    </View>
                    <View className="w-40">
                      <Text className="text-base font-bold text-stone-900">
                        {new Date(rec.closed_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      <Text className="text-xs text-stone-500">
                        {new Date(rec.closed_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View className="w-32">
                      <Text className="text-base font-semibold text-stone-700">
                        {rec.drawer_target === 'bar'
                          ? 'Bar Till'
                          : rec.drawer_target === 'main'
                            ? 'Main Till'
                            : 'Consolidated'}
                      </Text>
                    </View>
                    <View className="w-44">
                      <Text className="text-base font-medium text-stone-800">
                        {rec.outgoing_staff_name}
                      </Text>
                    </View>
                    <View className="w-44">
                      <Text className="text-base font-medium text-stone-800">
                        {rec.incoming_staff_name}
                      </Text>
                    </View>
                    <View className="w-32 items-end">
                      <Text className="text-base font-black text-stone-900">
                        {formatCurrency(rec.net_sales)}
                      </Text>
                    </View>
                    <View className="w-32 items-center">
                      <View
                        className={`px-3 py-1 rounded-lg ${
                          rec.variance === 0
                            ? 'bg-emerald-50 border border-emerald-200'
                            : rec.variance > 0
                              ? 'bg-amber-50 border border-amber-200'
                              : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <Text
                          className={`text-base font-extrabold ${
                            rec.variance === 0
                              ? 'text-emerald-700'
                              : rec.variance > 0
                                ? 'text-amber-700'
                                : 'text-red-700'
                          }`}
                        >
                          {rec.variance === 0
                            ? 'Balanced'
                            : `${rec.variance > 0 ? '+' : ''}${formatCurrency(rec.variance)}`}
                        </Text>
                      </View>
                    </View>
                    <View className="w-28 items-end">
                      <Pressable
                        onPress={() => {
                          const readingData: ReadingData = {
                            reading_type: 'Y_READING',
                            y_number: rec.y_number,
                            drawer_target: rec.drawer_target,
                            opened_at: rec.opened_at,
                            closed_at: rec.closed_at,
                            outgoing_staff_name: rec.outgoing_staff_name,
                            incoming_staff_name: rec.incoming_staff_name,
                            performed_by_name: rec.outgoing_staff_name,
                            gross_sales: rec.gross_sales,
                            discount_total: rec.discount_total,
                            net_sales: rec.net_sales,
                            vatable_sales: rec.vatable_sales,
                            vat_amount: rec.vat_amount,
                            vat_exempt_sales: 0,
                            service_charge: rec.service_charge,
                            tender_cash: rec.tender_cash,
                            tender_card: rec.tender_card,
                            tender_digital: rec.tender_digital,
                            tender_delivery: rec.tender_delivery,
                            total_tender: rec.total_tender,
                            opening_float: rec.opening_float,
                            cash_in: rec.cash_in,
                            cash_out: rec.cash_out,
                            safe_drops: rec.safe_drops,
                            expected_cash: rec.expected_cash,
                            counted_cash: rec.counted_cash,
                            variance: rec.variance,
                            transaction_count: rec.transaction_count,
                            first_receipt_no: rec.first_receipt_no || 'N/A',
                            last_receipt_no: rec.last_receipt_no || 'N/A',
                            notes: rec.notes || undefined,
                          };
                          setSelectedReport(readingData);
                          setReportModalVisible(true);
                        }}
                        className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 min-h-[40px]"
                      >
                        <Receipt size={16} color="#44403c" />
                        <Text className="text-base font-bold text-stone-800">Reprint</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
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
