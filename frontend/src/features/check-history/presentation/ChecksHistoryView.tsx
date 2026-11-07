import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import {
  Receipt,
  Search,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  Coffee,
  ShoppingBag,
  Bike,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  User,
  CreditCard,
  DollarSign,
  X,
} from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { checksApi } from '../data/checks.api';
import type { SettledCheckItem, CheckOrderType } from '../domain/check.types';
import { exportChecksRegisterToExcel } from '@/features/admin/utils/readingExcelExport';
import { printHtmlElement, PosDropdown, PosDropdownOption } from '@/features/shared';

import { Sparkles } from 'lucide-react-native';

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

  const handleExportChecksExcel = () => {
    try {
      const label = timeframeLabel ? `${timeframeLabel} · ${station}` : station;
      exportChecksRegisterToExcel(checks, label);
      toast.success(`Exported ${checks.length} checks to Excel (.xls)`, {
        title: 'Export Ready',
      });
    } catch (err: any) {
      console.error('[ChecksHistoryView] Excel export error:', err);
      toast.error('Failed to export checks register', { title: 'Export Error' });
    }
  };

  const modeOptions: PosDropdownOption<'all' | 'CAFE' | 'EVENT'>[] = [
    { value: 'all', label: 'All Modes', icon: Layers },
    { value: 'CAFE', label: '☀️ Cafe Mode', icon: Coffee },
    { value: 'EVENT', label: '🎷 Event Mode', icon: Sparkles },
  ];

  const channelOptions: PosDropdownOption<'all' | CheckOrderType>[] = [
    { value: 'all', label: 'All Channels', badge: checks.length, icon: Layers },
    { value: 'dine_in', label: 'Dine-In Tables', icon: Coffee },
    { value: 'takeout', label: 'Takeout Counter', icon: ShoppingBag },
    { value: 'online_delivery', label: 'Online Delivery', icon: Bike },
  ];

  return (
    <View className="flex-1 bg-[#fcf9f9]">
      {/* Top Header & Compact Filter Bar */}
      <View className="bg-white border-b border-stone-200/80 p-3.5 sm:p-5">
        <View className="flex-col lg:flex-row lg:items-center justify-between gap-3">
          <View className="flex-row items-center gap-3">
            <View className="w-11 h-11 rounded-2xl bg-[#800020] items-center justify-center shadow-xs">
              <Receipt size={20} color="#ffffff" strokeWidth={2.4} />
            </View>
            <Text className="text-xl font-black text-stone-900 tracking-tight">
              Checks &amp; Settlement History
            </Text>
          </View>

          {/* Action Tools: Mode Dropdown, Channel Dropdown, Search, Refresh, Export */}
          <View className="flex-row flex-wrap items-center gap-2.5">
            <PosDropdown
              options={modeOptions}
              value={selectedMode}
              onChange={setSelectedMode}
              sheetTitle="Filter by Operating Mode"
              className="flex-1 sm:flex-initial min-w-[148px]"
            />

            <PosDropdown
              options={channelOptions}
              value={selectedChannel}
              onChange={setSelectedChannel}
              sheetTitle="Filter by Order Channel"
              className="flex-1 sm:flex-initial min-w-[165px]"
            />

            {/* Search Input */}
            <View className="flex-row items-center bg-stone-100 border border-stone-300 rounded-xl px-3.5 py-2 min-h-[48px] w-full sm:w-64">
              <Search size={18} color="#78716c" />
              <TextInput
                className="flex-1 ml-2 text-base text-stone-900"
                placeholder="Search check #, guest, table..."
                placeholderTextColor="#a8a29e"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} className="p-1">
                  <X size={16} color="#78716c" />
                </Pressable>
              )}
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={handleRefresh}
                className="w-12 h-12 rounded-xl bg-white border border-stone-300 items-center justify-center active:bg-stone-100 shadow-xs"
                accessibilityRole="button"
                accessibilityLabel="Refresh checks"
              >
                <RefreshCw
                  size={18}
                  color="#57534e"
                  className={isRefreshing ? 'animate-spin' : ''}
                />
              </Pressable>

              <Pressable
                onPress={handleExportChecksExcel}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 active:bg-emerald-100 flex-row items-center gap-2 shadow-xs"
              >
                <FileSpreadsheet size={18} color="#047857" />
                <Text className="text-base font-bold text-emerald-800">Export</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

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
              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Printable Customer Receipt Container */}
                <View
                  {...({ id: 'monks-check-receipt-printable' } as any)}
                  className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs max-w-2xl mx-auto w-full"
                >
                  {/* Top Bar with Reprint & PDF Actions */}
                  <View className="flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-stone-200 gap-4 print:hidden">
                    <View>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-2xl font-black text-stone-900 tracking-tight">
                          Check {selectedCheck.checkNumber}
                        </Text>
                        <View className="bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          <Text className="text-base font-bold text-emerald-800">SETTLED</Text>
                        </View>
                      </View>
                      <Text className="text-base text-stone-500 mt-1">
                        Settled on {new Date(selectedCheck.settledAt).toLocaleDateString()} at{' '}
                        {selectedCheck.timestamp}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-2.5">
                      <Pressable
                        onPress={handleBrowserPrintReceipt}
                        className="min-h-[48px] px-4 py-2.5 rounded-xl border border-stone-300 bg-white active:bg-stone-50 flex-row items-center gap-2 shadow-xs"
                      >
                        <Printer size={18} color="#44403c" />
                        <Text className="text-base font-bold text-stone-800">Print / PDF</Text>
                      </Pressable>

                      <Pressable
                        onPress={handleReprintThermal}
                        disabled={isReprinting}
                        className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#800020] active:bg-[#600018] flex-row items-center gap-2 shadow-xs"
                      >
                        <Printer size={18} color="#ffffff" />
                        <Text className="text-base font-bold text-white">
                          {isReprinting ? 'Sending...' : 'Thermal Reprint'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Print-only Official Header */}
                  <View className="hidden print:block text-center pb-4 mb-4 border-b border-dashed border-stone-400">
                    <Text className="text-xl font-bold text-center">
                      MONK'S DREAM JAZZ BAR AND CAFE
                    </Text>
                    <Text className="text-xs text-center text-stone-500">
                      Craft Cocktails &amp; Fine Jazz
                    </Text>
                    <Text className="text-xs text-center text-stone-500">
                      Tel: +63 917 555 1957 · @monksdreamjazz
                    </Text>
                    <Text className="text-xs text-center mt-1">
                      Check: {selectedCheck.checkNumber} · Date:{' '}
                      {new Date(selectedCheck.settledAt).toLocaleString()}
                    </Text>
                  </View>

                  {/* Notice banner on thermal dispatch */}
                  {reprintSuccess && (
                    <View className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex-row items-center gap-2 print:hidden">
                      <CheckCircle2 size={18} color="#059669" />
                      <Text className="text-base font-bold text-emerald-800">
                        Signal sent! Receipt enqueued to 80mm POS Thermal Printer queue.
                      </Text>
                    </View>
                  )}

                  {/* Transaction Metadata Grid */}
                  <View className="grid grid-cols-2 gap-4 my-6 p-4 rounded-2xl bg-stone-50/80 border border-stone-200/80">
                    <View>
                      <Text className="text-base font-semibold text-stone-500">
                        Guest / Customer
                      </Text>
                      <Text className="text-base font-bold text-stone-900 mt-0.5">
                        {selectedCheck.guestName}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-base font-semibold text-stone-500">Destination</Text>
                      <Text className="text-base font-bold text-stone-900 mt-0.5">
                        {selectedCheck.tableOrRef}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-base font-semibold text-stone-500">
                        Cashier in Charge
                      </Text>
                      <Text className="text-base font-bold text-stone-900 mt-0.5">
                        {selectedCheck.cashierName}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-base font-semibold text-stone-500">
                        Tender Captured
                      </Text>
                      <Text className="text-base font-bold text-[#800020] mt-0.5">
                        {(
                          selectedCheck.paymentChannel ||
                          selectedCheck.paymentMethod.replace('_', ' ')
                        ).toUpperCase()}
                        {selectedCheck.referenceNumber
                          ? ` · REF #${selectedCheck.referenceNumber}`
                          : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Itemized Line Items Table */}
                  <View className="mb-6">
                    <Text className="text-base font-extrabold text-stone-900 mb-3 uppercase tracking-wider">
                      Ordered Items &amp; Servings ({selectedCheck.itemsCount})
                    </Text>
                    {selectedCheck.items.length === 0 ? (
                      <View className="py-4 border-y border-stone-100 flex-row justify-between items-center">
                        <Text className="text-base font-medium text-stone-700">
                          Settled Customer Bill
                        </Text>
                        <Text className="text-base font-bold text-stone-900">
                          {formatCurrency(selectedCheck.subtotal)}
                        </Text>
                      </View>
                    ) : (
                      <View className="divide-y divide-stone-100 border-y border-stone-200">
                        {selectedCheck.items.map((it, idx) => (
                          <View
                            key={it.id || idx}
                            className="py-3 flex-row items-center justify-between"
                          >
                            <View className="flex-row items-center gap-3">
                              <View className="w-7 h-7 rounded-lg bg-stone-100 items-center justify-center">
                                <Text className="text-base font-bold text-stone-800">
                                  {it.quantity}x
                                </Text>
                              </View>
                              <View>
                                <Text className="text-base font-bold text-stone-900">
                                  {it.name}
                                </Text>
                                {it.notes && (
                                  <Text className="text-base text-amber-800 italic">
                                    {it.notes}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <Text className="text-base font-black text-stone-900">
                              {formatCurrency(it.subtotal)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Financial Breakdown (Official Fiscal & Tax) */}
                  <View className="space-y-2.5 pt-4 border-t-2 border-stone-900">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-base font-semibold text-stone-600">Items Subtotal</Text>
                      <Text className="text-base font-bold text-stone-900">
                        {formatCurrency(selectedCheck.subtotal)}
                      </Text>
                    </View>

                    {selectedCheck.discountAmount > 0 && (
                      <View className="flex-row justify-between items-center">
                        <Text className="text-base font-semibold text-rose-600">
                          Discounts &amp; Promos
                        </Text>
                        <Text className="text-base font-bold text-rose-600">
                          -{formatCurrency(selectedCheck.discountAmount)}
                        </Text>
                      </View>
                    )}

                    {selectedCheck.corkageFee > 0 && (
                      <View className="flex-row justify-between items-center">
                        <Text className="text-base font-semibold text-stone-600">Corkage Fee</Text>
                        <Text className="text-base font-bold text-stone-900">
                          {formatCurrency(selectedCheck.corkageFee)}
                        </Text>
                      </View>
                    )}

                    {selectedCheck.serviceCharge > 0 && (
                      <View className="flex-row justify-between items-center">
                        <Text className="text-base font-semibold text-stone-600">
                          Service Charge
                        </Text>
                        <Text className="text-base font-bold text-stone-900">
                          {formatCurrency(selectedCheck.serviceCharge)}
                        </Text>
                      </View>
                    )}

                    {Boolean(selectedCheck.vatExemptSales && selectedCheck.vatExemptSales > 0) && (
                      <View className="flex-row justify-between items-center">
                        <Text className="text-base font-semibold text-amber-700">
                          VAT-Exempt Sales (Senior/PWD)
                        </Text>
                        <Text className="text-base font-bold text-amber-800">
                          {formatCurrency(selectedCheck.vatExemptSales || 0)}
                        </Text>
                      </View>
                    )}

                    {Boolean(selectedCheck.seniorPwdId) && (
                      <View className="flex-row justify-between items-center py-1 px-2.5 bg-amber-50 rounded-lg border border-amber-200">
                        <Text className="text-sm font-semibold text-amber-900">
                          ID: {selectedCheck.seniorPwdId}
                        </Text>
                        <Text className="text-sm font-bold text-amber-900">
                          {selectedCheck.seniorPwdName || 'Cardholder'}
                        </Text>
                      </View>
                    )}

                    <View className="flex-row justify-between items-center">
                      <Text className="text-base font-semibold text-stone-500">
                        VATable Sales (Net)
                      </Text>
                      <Text className="text-base font-medium text-stone-600">
                        {formatCurrency(selectedCheck.vatableSales)}
                      </Text>
                    </View>

                    <View className="flex-row justify-between items-center">
                      <Text className="text-base font-semibold text-stone-500">
                        12% VAT Included
                      </Text>
                      <Text className="text-base font-medium text-stone-600">
                        {formatCurrency(selectedCheck.vatAmount)}
                      </Text>
                    </View>

                    <View className="flex-row justify-between items-center pt-3 border-t border-stone-200">
                      <Text className="text-xl font-black text-stone-900">Grand Total Settled</Text>
                      <Text className="text-2xl font-black text-[#800020]">
                        {formatCurrency(selectedCheck.total)}
                      </Text>
                    </View>
                  </View>

                  {/* Print Footer */}
                  <View className="hidden print:block text-center pt-6 mt-6 border-t border-dashed border-stone-400">
                    <Text className="text-xs font-bold text-stone-800 tracking-wider">
                      "WRITING ABOUT MUSIC IS LIKE DANCING ABOUT ARCHITECTURE"
                    </Text>
                    <Text className="text-xs text-stone-500 italic mt-0.5">
                      — THELONIOUS MONK —
                    </Text>
                    <Text className="text-xs font-bold text-stone-900 tracking-widest mt-3">
                      *** THIS IS NOT AN OFFICIAL RECEIPT ***
                    </Text>
                  </View>
                </View>
              </ScrollView>
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
      <Modal
        visible={mobileDetailVisible && Boolean(selectedCheck)}
        transparent
        animationType="slide"
        onRequestClose={() => setMobileDetailVisible(false)}
      >
        <View className="flex-1 bg-wine-950/75 justify-end">
          <Pressable
            className="flex-1"
            onPress={() => setMobileDetailVisible(false)}
            accessibilityLabel="Close mobile check details"
          />
          {selectedCheck && (
            <View className="bg-white rounded-t-3xl max-h-[88%] p-5 shadow-2xl flex-col">
              <View className="flex-row items-center justify-between pb-3 border-b border-stone-200">
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xl font-black text-stone-900 tracking-tight">
                      Check {selectedCheck.checkNumber}
                    </Text>
                    <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                      <Text className="text-sm font-bold text-emerald-800">SETTLED</Text>
                    </View>
                  </View>
                  <Text className="text-sm text-stone-500 mt-0.5">
                    {selectedCheck.tableOrRef} • {selectedCheck.guestName}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setMobileDetailVisible(false)}
                  className="w-10 h-10 rounded-full bg-stone-100 items-center justify-center active:bg-stone-200"
                  accessibilityLabel="Close"
                >
                  <X size={20} color="#57534e" />
                </Pressable>
              </View>

              <ScrollView className="flex-1 py-3" showsVerticalScrollIndicator={false}>
                {/* Items */}
                <View className="mb-4">
                  <Text className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Line Items ({selectedCheck.itemsCount})
                  </Text>
                  {selectedCheck.items.map((it) => (
                    <View
                      key={it.id}
                      className="flex-row items-center justify-between py-2 border-b border-stone-100"
                    >
                      <Text className="text-base font-medium text-stone-900 flex-1">
                        {it.quantity}x {it.name}
                      </Text>
                      <Text className="text-base font-bold text-stone-900">
                        {formatCurrency(it.subtotal)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Statutory Financial Breakdown */}
                <View className="space-y-1.5 pt-3 border-t border-stone-300">
                  <View className="flex-row justify-between">
                    <Text className="text-base text-stone-600">Subtotal</Text>
                    <Text className="text-base font-semibold text-stone-900">
                      {formatCurrency(selectedCheck.subtotal)}
                    </Text>
                  </View>
                  {selectedCheck.discountAmount > 0 && (
                    <View className="flex-row justify-between">
                      <Text className="text-base text-rose-600">Discounts &amp; Promos</Text>
                      <Text className="text-base font-bold text-rose-600">
                        -{formatCurrency(selectedCheck.discountAmount)}
                      </Text>
                    </View>
                  )}
                  {selectedCheck.serviceCharge > 0 && (
                    <View className="flex-row justify-between">
                      <Text className="text-base text-stone-600">Service Charge</Text>
                      <Text className="text-base font-semibold text-stone-900">
                        {formatCurrency(selectedCheck.serviceCharge)}
                      </Text>
                    </View>
                  )}
                  <View className="flex-row justify-between">
                    <Text className="text-base text-stone-500">VATable Sales</Text>
                    <Text className="text-base text-stone-700">
                      {formatCurrency(selectedCheck.vatableSales)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-base text-stone-500">12% VAT Included</Text>
                    <Text className="text-base text-stone-700">
                      {formatCurrency(selectedCheck.vatAmount)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between pt-2 border-t border-stone-200">
                    <Text className="text-lg font-black text-stone-900">Total Settled</Text>
                    <Text className="text-xl font-black text-[#800020]">
                      {formatCurrency(selectedCheck.total)}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View className="pt-3 border-t border-stone-200 flex-row gap-2">
                <Pressable
                  onPress={handleBrowserPrintReceipt}
                  className="flex-1 min-h-[48px] rounded-xl border border-stone-300 bg-white items-center justify-center active:bg-stone-50 flex-row gap-2"
                >
                  <Printer size={18} color="#44403c" />
                  <Text className="text-base font-bold text-stone-800">Print</Text>
                </Pressable>
                <Pressable
                  onPress={handleReprintThermal}
                  disabled={isReprinting}
                  className="flex-1 min-h-[48px] rounded-xl bg-[#800020] items-center justify-center active:bg-[#600018] flex-row gap-2"
                >
                  <Printer size={18} color="#ffffff" />
                  <Text className="text-base font-bold text-white">
                    {isReprinting ? 'Sending...' : 'Reprint'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};
