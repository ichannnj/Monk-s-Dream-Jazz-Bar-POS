import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Platform, ActivityIndicator } from 'react-native';
import {
  FileText,
  Lock,
  Download,
  RefreshCw,
  Coins,
  CreditCard,
  Smartphone,
  Receipt,
  Layers,
  ArrowUpRight,
} from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { readingsApi, type ReadingData, type ZReadingRecord } from '../../../data/readings.api';
import { ReadingReportModal } from './ReadingReportModal';
import { ZCloseShiftModal } from './ZCloseShiftModal';
import { ZReadingsHistoryTable } from './ZReadingsHistoryTable';

export const AdminReadingsView: React.FC = () => {
  const [drawerScope, setDrawerScope] = useState<'consolidated' | 'main' | 'bar'>('consolidated');
  const [activeReading, setActiveReading] = useState<ReadingData | null>(null);
  const [zHistory, setZHistory] = useState<ZReadingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReadingData | null>(null);
  const [zCloseModalVisible, setZCloseModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [reading, history] = await Promise.all([
        readingsApi.fetchCurrentXReading(drawerScope),
        readingsApi.fetchZReadingHistory(),
      ]);
      setActiveReading(reading);
      setZHistory(history);
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

  const handleOpenZClose = () => {
    if (!activeReading) return;
    setZCloseModalVisible(true);
  };

  const handleZSuccess = (zRecord: ZReadingRecord) => {
    // Reload data and display report modal for newly generated Z-reading
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

        {/* Action Buttons */}
        <View className="flex-row items-center gap-3">
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

          <Pressable
            onPress={handleOpenXReading}
            className="flex-row items-center gap-2 px-5 py-3 rounded-xl bg-[#800020] active:bg-[#600018] min-h-[48px] shadow-xs"
          >
            <FileText size={18} color="#ffffff" />
            <Text className="text-base font-extrabold text-white">Preview X-Reading</Text>
          </Pressable>

          <Pressable
            onPress={handleOpenZClose}
            className="flex-row items-center gap-2 px-5 py-3 rounded-xl bg-stone-900 active:bg-black min-h-[48px] shadow-xs"
          >
            <Lock size={18} color="#ffffff" />
            <Text className="text-base font-extrabold text-white">Close Shift & Z-Reading</Text>
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

      {/* Shift Details Quick Banner */}
      <View className="bg-white rounded-2xl border border-stone-200 p-6 mb-8 shadow-xs flex-row items-center justify-between flex-wrap gap-4">
        <View>
          <Text className="text-lg font-extrabold text-stone-900">Active Shift Information</Text>
          <Text className="text-base text-stone-500">
            Target: <Text className="font-bold text-stone-800">{drawerLabel}</Text> • Shift Started:{' '}
            <Text className="font-bold text-stone-800">
              {activeReading ? new Date(activeReading.opened_at).toLocaleString() : 'N/A'}
            </Text>
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          <View className="px-3.5 py-1.5 rounded-xl bg-stone-100 border border-stone-200">
            <Text className="text-base text-stone-600 font-bold">
              12% VAT: {formatCurrency(activeReading?.vat_amount || 0)}
            </Text>
          </View>
          <View className="px-3.5 py-1.5 rounded-xl bg-stone-100 border border-stone-200">
            <Text className="text-base text-stone-600 font-bold">
              10% SC: {formatCurrency(activeReading?.service_charge || 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Historical Z-Readings Archive */}
      <ZReadingsHistoryTable
        history={zHistory}
        onViewRecord={(record) => {
          setSelectedReport(record);
          setReportModalVisible(true);
        }}
      />

      {/* Reading Preview & Print Modal */}
      <ReadingReportModal
        visible={reportModalVisible}
        reading={selectedReport}
        onClose={() => {
          setReportModalVisible(false);
          setSelectedReport(null);
        }}
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
