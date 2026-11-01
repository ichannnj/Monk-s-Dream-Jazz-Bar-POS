import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Platform, ActivityIndicator } from 'react-native';
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
import { ReadingReportModal } from './ReadingReportModal';
import { ZCloseShiftModal } from './ZCloseShiftModal';
import { YCloseShiftModal } from './YCloseShiftModal';
import { ZReadingsHistoryTable } from './ZReadingsHistoryTable';
import { CashDrawerWaterfallCard } from '../analytics/CashDrawerWaterfallCard';
import { ShiftVarianceTrendChart } from '../analytics/ShiftVarianceTrendChart';

export const AdminReadingsView: React.FC = () => {
  const [drawerScope, setDrawerScope] = useState<'consolidated' | 'main' | 'bar'>('consolidated');
  const [activeReading, setActiveReading] = useState<ReadingData | null>(null);
  const [zHistory, setZHistory] = useState<ZReadingRecord[]>([]);
  const [yHistory, setYHistory] = useState<YReadingRecord[]>([]);
  const [varianceTrend, setVarianceTrend] = useState<ShiftVariancePoint[]>([]);
  const [historyTab, setHistoryTab] = useState<'z_readings' | 'y_handovers'>('z_readings');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleOpenYClose = () => {
    if (!activeReading) return;
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

  const handleExportCSV = () => {
    if (!activeReading || Platform.OS !== 'web' || typeof window === 'undefined') return;

    const headers = [
      'Reading Type',
      'Drawer Scope',
      'Start Time',
      'End Time',
      'Gross Sales',
      'Discounts',
      'Net Sales',
      '12% VAT',
      '10% Service Charge',
      'Cash Tender',
      'Card Tender',
      'Digital Wallet',
      'Opening Float',
      'Expected Cash',
      'Transaction Count',
    ];

    const values = [
      activeReading.reading_type,
      activeReading.drawer_target,
      `"${new Date(activeReading.opened_at).toLocaleString()}"`,
      `"${new Date(activeReading.generated_at || Date.now()).toLocaleString()}"`,
      activeReading.gross_sales.toFixed(2),
      activeReading.discount_total.toFixed(2),
      activeReading.net_sales.toFixed(2),
      activeReading.vat_amount.toFixed(2),
      activeReading.service_charge.toFixed(2),
      activeReading.tender_cash.toFixed(2),
      activeReading.tender_card.toFixed(2),
      activeReading.tender_digital.toFixed(2),
      activeReading.opening_float.toFixed(2),
      activeReading.expected_cash.toFixed(2),
      activeReading.transaction_count,
    ];

    const csvContent = `${headers.join(',')}\n${values.join(',')}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `readings_${activeReading.drawer_target}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Reading data exported to CSV', { title: 'Export Complete' });
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

  return (
    <ScrollView className="flex-1 bg-[#fcf9f9] p-8" showsVerticalScrollIndicator={false}>
      {/* Top Controls & Scope Selection */}
      <View className="flex-row items-center justify-between flex-wrap gap-4 mb-6">
        {/* Scope Pill Tabs */}
        <View className="flex-row items-center bg-stone-200/70 p-1.5 rounded-2xl">
          <Pressable
            onPress={() => setDrawerScope('consolidated')}
            className={`px-4 py-2 rounded-xl min-h-[44px] flex-row items-center ${
              drawerScope === 'consolidated' ? 'bg-white shadow-xs' : 'hover:bg-stone-300/50'
            }`}
          >
            <Layers size={18} color={drawerScope === 'consolidated' ? '#800020' : '#57534e'} />
            <Text
              className={`ml-2 text-base font-bold ${
                drawerScope === 'consolidated' ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              Consolidated (All Tills)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setDrawerScope('main')}
            className={`px-4 py-2 rounded-xl min-h-[44px] flex-row items-center ${
              drawerScope === 'main' ? 'bg-white shadow-xs' : 'hover:bg-stone-300/50'
            }`}
          >
            <Coins size={18} color={drawerScope === 'main' ? '#800020' : '#57534e'} />
            <Text
              className={`ml-2 text-base font-bold ${
                drawerScope === 'main' ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              Main Floor Till
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setDrawerScope('bar')}
            className={`px-4 py-2 rounded-xl min-h-[44px] flex-row items-center ${
              drawerScope === 'bar' ? 'bg-white shadow-xs' : 'hover:bg-stone-300/50'
            }`}
          >
            <Receipt size={18} color={drawerScope === 'bar' ? '#800020' : '#57534e'} />
            <Text
              className={`ml-2 text-base font-bold ${
                drawerScope === 'bar' ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              Bar Station Till
            </Text>
          </Pressable>
        </View>

        {/* 3-Way Action Toolbar: X-Reading, Y-Reading, Z-Reading */}
        <View className="flex-row items-center gap-3 flex-wrap">
          <Pressable
            onPress={handleRefresh}
            className="w-12 h-12 rounded-xl bg-white border border-stone-200 items-center justify-center active:bg-stone-100 shadow-xs"
          >
            <RefreshCw size={18} color="#57534e" className={isRefreshing ? 'animate-spin' : ''} />
          </Pressable>

          <Pressable
            onPress={handleExportCSV}
            className="flex-row items-center gap-2 px-4 py-3 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 active:bg-stone-100 min-h-[48px] shadow-xs"
          >
            <Download size={18} color="#44403c" />
            <Text className="text-base font-bold text-stone-800">Export CSV</Text>
          </Pressable>

          {/* X-Reading Trigger */}
          <Pressable
            onPress={handleOpenXReading}
            className="flex-row items-center gap-2 px-4 py-3 rounded-xl bg-[#800020] active:bg-[#600018] min-h-[48px] shadow-xs"
          >
            <FileText size={18} color="#ffffff" />
            <Text className="text-base font-extrabold text-white">Preview X-Reading</Text>
          </Pressable>

          {/* Y-Reading Handover Trigger */}
          <Pressable
            onPress={handleOpenYClose}
            className="flex-row items-center gap-2 px-4 py-3 rounded-xl bg-amber-600 active:bg-amber-700 min-h-[48px] shadow-xs"
          >
            <ArrowRightLeft size={18} color="#ffffff" />
            <Text className="text-base font-extrabold text-white">Handover Y-Reading</Text>
          </Pressable>

          {/* Z-Reading End-of-Day Close Trigger */}
          <Pressable
            onPress={handleOpenZClose}
            className="flex-row items-center gap-2 px-4 py-3 rounded-xl bg-stone-900 active:bg-black min-h-[48px] shadow-xs"
          >
            <Lock size={18} color="#ffffff" />
            <Text className="text-base font-extrabold text-white">Close Day Z-Reading</Text>
          </Pressable>
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

      {/* Historical Readings Archive Switcher */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row bg-stone-200/80 p-1 rounded-2xl">
          <Pressable
            onPress={() => setHistoryTab('z_readings')}
            className={`px-4 py-2 rounded-xl min-h-[44px] flex-row items-center ${
              historyTab === 'z_readings' ? 'bg-white shadow-xs' : 'hover:bg-stone-300/50'
            }`}
          >
            <Lock size={16} color={historyTab === 'z_readings' ? '#1c1917' : '#57534e'} />
            <Text
              className={`ml-2 text-base font-bold ${
                historyTab === 'z_readings' ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              Daily Z-Readings Archive ({zHistory.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setHistoryTab('y_handovers')}
            className={`px-4 py-2 rounded-xl min-h-[44px] flex-row items-center ${
              historyTab === 'y_handovers' ? 'bg-white shadow-xs' : 'hover:bg-stone-300/50'
            }`}
          >
            <ArrowRightLeft
              size={16}
              color={historyTab === 'y_handovers' ? '#d97706' : '#57534e'}
            />
            <Text
              className={`ml-2 text-base font-bold ${
                historyTab === 'y_handovers' ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              Shift Handover Y-Reports ({yHistory.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* History Table */}
      {historyTab === 'z_readings' ? (
        <ZReadingsHistoryTable
          history={zHistory}
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
            <Text className="text-base font-bold text-stone-600">{yHistory.length} Handovers</Text>
          </View>

          {yHistory.length === 0 ? (
            <View className="p-8 items-center justify-center">
              <ArrowRightLeft size={36} color="#a8a29e" />
              <Text className="text-lg font-bold text-stone-700 mt-2">
                No Shift Handovers Recorded
              </Text>
              <Text className="text-base text-stone-500 mt-1 text-center">
                When staff hand over the till, Y-Reports will appear here for audit and reprint.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="min-w-[800px] divide-y divide-stone-100">
                <View className="flex-row items-center px-6 py-3 bg-stone-100/70">
                  <Text className="w-24 text-base font-bold text-stone-700">Y-Number</Text>
                  <Text className="w-40 text-base font-bold text-stone-700">Date & Time</Text>
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

                {yHistory.map((rec) => (
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
