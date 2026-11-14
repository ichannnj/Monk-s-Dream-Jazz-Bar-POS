import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Receipt, Coffee, ShoppingBag, Bike } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { checksApi } from '../data/checks.api';
import type { SettledCheckItem, CheckOrderType } from '../domain/check.types';
import { printHtmlElement } from '@/features/shared';
import { ChecksFilterToolbar } from './components/ChecksFilterToolbar';
import { CheckReceiptInspector } from './components/CheckReceiptInspector';
import { CheckMobileDetailSheet } from './components/CheckMobileDetailSheet';

export interface ChecksHistoryViewProps {
  startDate?: string;
  endDate?: string;
  station?: string;
  timeframeLabel?: string;
  mode?: 'all' | 'ALL' | 'CAFE' | 'EVENT';
}

export const ChecksHistoryView: React.FC<ChecksHistoryViewProps> = ({
  startDate,
  endDate,
  station = 'ALL',
  timeframeLabel,
  mode: propMode = 'all',
}) => {
  const [checks, setChecks] = useState<SettledCheckItem[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<'all' | CheckOrderType>('all');
  const normalizedPropMode = propMode === 'ALL' ? 'all' : propMode;
  const [selectedMode, setSelectedMode] = useState<'all' | 'CAFE' | 'EVENT'>(normalizedPropMode);

  useEffect(() => {
    setSelectedMode(propMode === 'ALL' ? 'all' : propMode);
  }, [propMode]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCheck, setSelectedCheck] = useState<SettledCheckItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReprinting, setIsReprinting] = useState(false);
  const [reprintSuccess, setReprintSuccess] = useState(false);
  const [mobileDetailVisible, setMobileDetailVisible] = useState(false);

  const loadChecks = useCallback(async () => {
    try {
      const data = await checksApi.fetchSettledChecks({
        startDate,
        endDate,
        station,
        channel: selectedChannel,
        searchQuery,
        mode: selectedMode,
      });
      setChecks(data);
      if (data.length > 0) {
        setSelectedCheck((prev) => {
          if (!prev) return data[0];
          const exists = data.find((c) => c.id === prev.id);
          return exists || data[0];
        });
      } else {
        setSelectedCheck(null);
      }
    } catch (err: any) {
      console.error('[ChecksHistoryView] Error fetching settled checks:', err);
      toast.error('Failed to load checks from database', { title: 'Network Notice' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [startDate, endDate, station, selectedChannel, searchQuery, selectedMode]);

  useEffect(() => {
    setIsLoading(true);
    loadChecks();
  }, [loadChecks]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadChecks();
  };

  const handleReprintThermal = async () => {
    if (!selectedCheck) return;
    setIsReprinting(true);
    try {
      await checksApi.reprintReceipt(selectedCheck);
      setReprintSuccess(true);
      toast.success(
        `Check ${selectedCheck.checkNumber} (${selectedCheck.guestName}) sent to thermal printer!`,
        { title: 'Receipt Dispatched' }
      );
      setTimeout(() => setReprintSuccess(false), 3000);
    } catch {
      toast.error('Could not dispatch print job to thermal queue', { title: 'Printer Error' });
    } finally {
      setIsReprinting(false);
    }
  };

  const handleBrowserPrintReceipt = () => {
    if (Platform.OS !== 'web' || typeof window !== 'undefined') {
      const checkTitle = selectedCheck
        ? `Check ${selectedCheck.checkNumber} (${selectedCheck.guestName})`
        : 'Official Customer Receipt';
      printHtmlElement('monks-check-receipt-printable', {
        title: `${checkTitle} - Monk's Dream POS`,
        isThermal: true,
        pageSize: '80mm',
      });
    } else {
      toast.info('Browser receipt printing is supported on web desktop view.');
    }
  };

  const handleExportChecksExcel = async () => {
    try {
      const { lazyExportChecksRegister } =
        await import('@/features/admin/utils/readingExcelExport');
      const label = timeframeLabel ? `${timeframeLabel} · ${station}` : station;
      await lazyExportChecksRegister(checks, label);
      toast.success(`Exported ${checks.length} checks to Excel (.xls)`, {
        title: 'Export Ready',
      });
    } catch (err: any) {
      console.error('[ChecksHistoryView] Excel export error:', err);
      toast.error('Failed to export checks register', { title: 'Export Error' });
    }
  };

  return (
    <View className="flex-1 bg-[#fcf9f9]">
      {/* Top Header & Compact Filter Bar */}
      <ChecksFilterToolbar
        selectedMode={selectedMode}
        selectedChannel={selectedChannel}
        searchQuery={searchQuery}
        isRefreshing={isRefreshing}
        checksCount={checks.length}
        onModeChange={setSelectedMode}
        onChannelChange={setSelectedChannel}
        onSearchChange={setSearchQuery}
        onRefresh={handleRefresh}
        onExportExcel={handleExportChecksExcel}
      />

      {/* Main Content Area */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center p-12">
          <ActivityIndicator size="large" color="#800020" />
          <Text className="text-base font-bold text-stone-600 mt-3">
            Loading Checks from PostgreSQL...
          </Text>
        </View>
      ) : (
        <View className="flex-1 flex-col md:flex-row">
          {/* Left Column: Checks List */}
          <View className="w-full md:w-5/12 lg:w-4/12 border-r border-stone-200/80 bg-white">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {checks.length === 0 ? (
                <View className="p-8 items-center justify-center">
                  <Receipt size={36} color="#a8a29e" />
                  <Text className="text-lg font-bold text-stone-700 mt-2">No Checks Found</Text>
                  <Text className="text-base text-stone-500 text-center mt-1">
                    No settled checks match the selected timeframe or search criteria.
                  </Text>
                </View>
              ) : (
                <View className="divide-y divide-stone-100">
                  {checks.map((chk) => {
                    const isSelected = selectedCheck?.id === chk.id;

                    return (
                      <Pressable
                        key={chk.id}
                        onPress={() => {
                          setSelectedCheck(chk);
                          setMobileDetailVisible(true);
                        }}
                        className={`p-4 transition-colors min-h-[64px] flex-row items-center justify-between ${
                          isSelected
                            ? 'bg-[#800020]/10 border-l-4 border-[#800020]'
                            : 'hover:bg-stone-50 active:bg-stone-100'
                        }`}
                      >
                        <View className="flex-row items-center gap-3 flex-1 pr-3">
                          <View
                            className={`w-10 h-10 rounded-xl items-center justify-center ${
                              chk.orderType === 'dine_in'
                                ? 'bg-amber-100 text-amber-800'
                                : chk.orderType === 'takeout'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {chk.orderType === 'dine_in' ? (
                              <Coffee size={18} color="#b45309" />
                            ) : chk.orderType === 'takeout' ? (
                              <ShoppingBag size={18} color="#1d4ed8" />
                            ) : (
                              <Bike size={18} color="#047857" />
                            )}
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-base font-bold text-stone-900">
                                {chk.checkNumber}
                              </Text>
                              <Text className="text-base text-stone-400 font-normal">·</Text>
                              <Text className="text-base font-semibold text-stone-600 truncate">
                                {chk.guestName}
                              </Text>
                              <View
                                className={`px-2 py-0.5 rounded-md border ${
                                  chk.operatingMode === 'EVENT'
                                    ? 'bg-amber-50 border-amber-300'
                                    : 'bg-sky-50 border-sky-300'
                                }`}
                              >
                                <Text
                                  className={`text-xs font-bold ${
                                    chk.operatingMode === 'EVENT'
                                      ? 'text-amber-800'
                                      : 'text-sky-800'
                                  }`}
                                >
                                  {chk.operatingMode === 'EVENT' ? 'EVENT' : 'CAFE'}
                                </Text>
                              </View>
                            </View>
                            <Text className="text-base text-stone-500 font-medium mt-0.5">
                              {chk.tableOrRef} · {chk.timestamp}
                            </Text>
                          </View>
                        </View>

                        <View className="items-end shrink-0">
                          <Text className="text-base font-black text-stone-900">
                            {formatCurrency(chk.total)}
                          </Text>
                          {chk.paymentMethod === 'SPLIT' ||
                          (chk.tenders && chk.tenders.length > 0) ? (
                            <View className="mt-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex-row items-center gap-1">
                              <Text className="text-xs font-bold text-[#800020] uppercase">
                                SPLIT ({chk.tenders?.length || 'MULTI'})
                              </Text>
                            </View>
                          ) : (
                            <View className="mt-1 bg-stone-100 px-2 py-0.5 rounded-md flex-row items-center gap-1">
                              <Text className="text-base font-bold text-stone-600 uppercase">
                                {chk.paymentChannel || chk.paymentMethod.replace('_', ' ')}
                              </Text>
                              {chk.referenceNumber ? (
                                <Text className="text-base font-bold text-[#800020] font-mono">
                                  #{chk.referenceNumber}
                                </Text>
                              ) : null}
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>

          {/* Right Column: Check Detail Inspector (Desktop) */}
          <View className="hidden md:flex flex-1 p-6 bg-[#fcf9f9]">
            {selectedCheck ? (
              <CheckReceiptInspector
                selectedCheck={selectedCheck}
                isReprinting={isReprinting}
                reprintSuccess={reprintSuccess}
                onBrowserPrint={handleBrowserPrintReceipt}
                onReprintThermal={handleReprintThermal}
              />
            ) : (
              <View className="flex-1 items-center justify-center p-8">
                <Receipt size={40} color="#a8a29e" />
                <Text className="text-lg font-bold text-stone-600 mt-2">
                  Select a Check to Inspect
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Mobile Check Detail Modal Sheet */}
      <CheckMobileDetailSheet
        visible={mobileDetailVisible && Boolean(selectedCheck)}
        selectedCheck={selectedCheck}
        isReprinting={isReprinting}
        onClose={() => setMobileDetailVisible(false)}
        onBrowserPrint={handleBrowserPrintReceipt}
        onReprintThermal={handleReprintThermal}
      />
    </View>
  );
};
