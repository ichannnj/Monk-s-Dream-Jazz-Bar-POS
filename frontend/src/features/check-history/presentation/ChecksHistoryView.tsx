import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Receipt, Coffee, ShoppingBag, Bike, ArrowLeft } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { checksApi } from '../data/checks.api';
import type { SettledCheckItem, CheckOrderType } from '../domain/check.types';
import { printHtmlElement } from '@/features/shared';
import { dedupeInFlight } from '@/features/shared/utils/inFlightDedupe';
import { ChecksFilterToolbar } from './components/ChecksFilterToolbar';
import { CheckReceiptInspector } from './components/CheckReceiptInspector';

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
  const { width: windowWidth } = useWindowDimensions();
  const isWideScreen = windowWidth >= 900;

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
  const [isExporting, setIsExporting] = useState(false);
  const [isReprinting, setIsReprinting] = useState(false);
  const [reprintSuccess, setReprintSuccess] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
    if (!selectedCheck || isReprinting) return;
    setIsReprinting(true);
    try {
      await dedupeInFlight(`checks:reprint:${selectedCheck.id}`, async () => {
        await checksApi.reprintReceipt(selectedCheck);
      });
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
        pageSize: '57mm',
      });
    } else {
      toast.info('Browser receipt printing is supported on web desktop view.');
    }
  };

  const handleExportChecksExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await dedupeInFlight('checks:export-excel', async () => {
        const { lazyExportChecksRegister } =
          await import('@/features/admin/utils/readingExcelExport');
        const label = timeframeLabel ? `${timeframeLabel} · ${station}` : station;
        await lazyExportChecksRegister(checks, label);
      });
      toast.success(`Exported ${checks.length} checks to Excel (.xls)`, {
        title: 'Export Ready',
      });
    } catch (err: any) {
      console.error('[ChecksHistoryView] Excel export error:', err);
      toast.error('Failed to export checks register', { title: 'Export Error' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#EFECE6]">
      {/* Top Header & Compact Filter Bar */}
      <ChecksFilterToolbar
        selectedMode={selectedMode}
        selectedChannel={selectedChannel}
        searchQuery={searchQuery}
        isRefreshing={isRefreshing}
        isExporting={isExporting}
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
          <ActivityIndicator size="large" color="#810021" />
          <Text className="text-base font-bold text-stone-600 mt-3">
            Loading Checks from PostgreSQL...
          </Text>
        </View>
      ) : (
        <View className="flex-1 flex-col md:flex-row">
          {/* If on narrow screen (<900px) and detail is open, show inline receipt inspector without popup modals */}
          {!isWideScreen && isDetailOpen && selectedCheck ? (
            <View className="flex-1 bg-[#EFECE6]">
              <View className="bg-white border-b border-[#E2DED6] px-3 py-2.5 flex-row items-center justify-between gap-2">
                <Pressable
                  onPress={() => setIsDetailOpen(false)}
                  className="flex-row items-center gap-1.5 min-h-[48px] px-3.5 py-1.5 rounded-xl bg-[#EFECE6] border border-[#E2DED6] active:opacity-80 shrink-0"
                  accessibilityRole="button"
                  accessibilityLabel="Back to checks list"
                >
                  <ArrowLeft size={18} color="#1A1617" />
                  <Text className="text-base font-semibold text-[#1A1617]">Back to Checks</Text>
                </Pressable>
                <Text
                  className="text-base font-semibold text-[#57534E] min-w-0 flex-1 text-right"
                  numberOfLines={1}
                >
                  {selectedCheck.checkNumber} · {selectedCheck.guestName}
                </Text>
              </View>
              <View className="flex-1 p-3 sm:p-5">
                <CheckReceiptInspector
                  selectedCheck={selectedCheck}
                  isReprinting={isReprinting}
                  reprintSuccess={reprintSuccess}
                  onBrowserPrint={handleBrowserPrintReceipt}
                  onReprintThermal={handleReprintThermal}
                />
              </View>
            </View>
          ) : (
            <>
              {/* Left Column: Checks List */}
              <View className="w-full md:w-5/12 lg:w-4/12 border-r border-stone-200/80 bg-white">
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                  {checks.length === 0 ? (
                    <View className="p-8 items-center justify-center">
                      <Receipt size={36} color="#78716c" />
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
                              if (!isWideScreen) {
                                setIsDetailOpen(true);
                              }
                            }}
                            className={`p-4 transition-colors min-h-[64px] flex-row items-center justify-between ${
                              isSelected && isWideScreen
                                ? 'bg-[#810021]/5 border-l-4 border-[#810021]'
                                : 'hover:bg-stone-50 active:bg-stone-100'
                            }`}
                          >
                            <View className="flex-row items-center gap-3 flex-1 pr-3">
                              <View className="w-10 h-10 rounded-xl items-center justify-center bg-[#EFECE6] border border-stone-200">
                                {chk.orderType === 'dine_in' ? (
                                  <Coffee size={18} color="#1A1617" />
                                ) : chk.orderType === 'takeout' ? (
                                  <ShoppingBag size={18} color="#1A1617" />
                                ) : (
                                  <Bike size={18} color="#1A1617" />
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
                                  <View className="px-2 py-0.5 rounded-md border bg-[#EFECE6] border-[#E2DED6]">
                                    <Text
                                      className={`text-base font-semibold ${
                                        chk.operatingMode === 'EVENT'
                                          ? 'text-[#810021]'
                                          : 'text-[#57534E]'
                                      }`}
                                    >
                                      {chk.operatingMode === 'EVENT' ? 'EVENT' : 'CAFE'}
                                    </Text>
                                  </View>
                                  {chk.orderType === 'dine_in' &&
                                  chk.total >
                                    chk.subtotal +
                                      (chk.serviceCharge || 0) +
                                      (chk.corkageFee || 0) +
                                      1 ? (
                                    <View className="px-2 py-0.5 rounded-md border bg-[#810021]/10 border-[#810021]/25">
                                      <Text className="text-base font-bold text-[#810021]">
                                        TABLE PAY
                                      </Text>
                                    </View>
                                  ) : chk.orderType === 'dine_in' &&
                                    chk.total === 0 &&
                                    chk.subtotal > 0 &&
                                    chk.paymentMethod !== 'COMP' ? (
                                    <View className="px-2 py-0.5 rounded-md border bg-[#EFECE6] border-[#E2DED6]">
                                      <Text className="text-base font-semibold text-[#57534E]">
                                        W/ TABLE
                                      </Text>
                                    </View>
                                  ) : null}
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
                                <View className="mt-1 bg-[#EFECE6] border border-[#E2DED6] px-2 py-0.5 rounded-md flex-row items-center gap-1">
                                  <Text className="text-base font-semibold text-[#810021] uppercase">
                                    SPLIT ({chk.tenders?.length || 'MULTI'})
                                  </Text>
                                </View>
                              ) : (
                                <View className="mt-1 bg-[#EFECE6] px-2 py-0.5 rounded-md flex-row items-center gap-1">
                                  <Text className="text-base font-semibold text-[#57534E] uppercase">
                                    {chk.paymentChannel || chk.paymentMethod.replace('_', ' ')}
                                  </Text>
                                  {chk.referenceNumber ? (
                                    <Text className="text-base font-semibold text-[#810021] font-mono">
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

              {/* Right Column: Check Detail Inspector (Desktop >= 900px) */}
              <View className="hidden md:flex flex-1 p-6 bg-[#EFECE6]">
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
                    <Receipt size={40} color="#78716c" />
                    <Text className="text-lg font-bold text-stone-600 mt-2">
                      Select a Check to Inspect
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
};
