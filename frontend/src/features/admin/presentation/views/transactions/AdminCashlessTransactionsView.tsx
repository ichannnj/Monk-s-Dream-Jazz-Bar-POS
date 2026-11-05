import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native';
import {
  Search,
  X,
  QrCode,
  Copy,
  Check,
  RotateCw,
  FileSpreadsheet,
  Sparkles,
  Coffee,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
} from 'lucide-react-native';
import { checksApi } from '@/features/check-history/data/checks.api';
import type { SettledCheckItem } from '@/features/check-history/domain/check.types';
import { printerApi } from '@/features/printer';
import { toast } from '@/features/shared/toast/useToastStore';
import { formatCurrency } from '@monks/shared';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { supabase } from '@/features/shared/infrastructure/supabase';
import { exportCashlessRegisterToExcel } from '../../../utils/readingExcelExport';

interface AdminCashlessTransactionsViewProps {
  startDate?: string;
  endDate?: string;
  timeframeLabel?: string;
  mode?: 'ALL' | 'CAFE' | 'EVENT';
}

type ChannelFilter = 'ALL' | 'GCash' | 'Maya' | 'Bank Transfer' | 'QRPH' | 'CARD' | 'COMP';

export const AdminCashlessTransactionsView: React.FC<AdminCashlessTransactionsViewProps> = ({
  startDate,
  endDate,
  timeframeLabel = 'Selected Period',
  mode = 'ALL',
}) => {
  const [transactions, setTransactions] = useState<SettledCheckItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<ChannelFilter>('ALL');
  const [selectedMode, setSelectedMode] = useState<'ALL' | 'CAFE' | 'EVENT'>(mode);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);
  const [reprintingId, setReprintingId] = useState<string | null>(null);

  // Sync mode prop if changed externally
  useEffect(() => {
    setSelectedMode(mode);
  }, [mode]);

  const fetchTransactions = useCallback(async () => {
    try {
      const modeParam = selectedMode === 'ALL' ? undefined : selectedMode;
      const data = await checksApi.fetchSettledChecks({
        startDate,
        endDate,
        mode: modeParam,
      });

      // Filter exclusively to non-cash transactions (QR, GCash, Maya, Card, Bank Transfer, Comp, or anything with a ref number)
      const cashlessOnly = data.filter((chk) => {
        const method = (chk.paymentMethod || '').toUpperCase();
        const hasChannel = Boolean(chk.paymentChannel);
        const hasRef = Boolean(chk.referenceNumber);
        return method !== 'CASH' || hasChannel || hasRef;
      });

      setTransactions(cashlessOnly);
    } catch (err) {
      console.error('[AdminCashlessTransactionsView] Error fetching transactions:', err);
      toast.error('Failed to load cashless transactions', { title: 'Fetch Error' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [startDate, endDate, selectedMode]);

  useEffect(() => {
    fetchTransactions();

    // Subscribe to live payments in Supabase Realtime
    const channel = supabase
      .channel('cashless_transactions_live_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTransactions]);

  // Copy reference number to clipboard
  const handleCopyRef = (ref: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ref);
      setCopiedRef(ref);
      toast.success(`Reference #${ref} copied to clipboard`, { title: 'Copied' });
      setTimeout(() => setCopiedRef(null), 2000);
    }
  };

  // Re-enqueue receipt into thermal print queue
  const handleReprint = async (chk: SettledCheckItem) => {
    setReprintingId(chk.id);
    try {
      const receiptPayload = {
        receiptNumber: chk.checkNumber.replace('#', ''),
        paymentId: chk.paymentId,
        tableNumber: chk.tableOrRef.includes('Table')
          ? parseInt(chk.tableOrRef.replace(/\D/g, ''), 10)
          : undefined,
        tabName: chk.guestName,
        waiterName: chk.cashierName,
        items: chk.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.unitPrice,
          total: i.subtotal,
        })),
        subtotal: chk.subtotal * 100,
        corkageFee: chk.corkageFee * 100,
        discount: chk.discountAmount * 100,
        total: chk.total * 100,
        tendered: chk.total * 100,
        change: 0,
        paymentMethod: chk.paymentMethod,
        paymentChannel: chk.paymentChannel,
        referenceNumber: chk.referenceNumber,
        timestamp: chk.settledAt || new Date().toISOString(),
        isReprint: true,
      };

      await (printerApi as any).reprintJob({
        id: chk.paymentId,
        job_type: 'CUSTOMER_RECEIPT',
        receipt_data: receiptPayload,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        printed_at: null,
      });

      toast.success(`Receipt enqueued for print: Check ${chk.checkNumber}`, {
        title: 'Reprint Queued',
      });
    } catch {
      toast.error('Failed to trigger reprint', { title: 'Reprint Failed' });
    } finally {
      setReprintingId(null);
    }
  };

  // Filtered transactions based on search query, channel, and mode
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return transactions.filter((tx) => {
      // Channel match
      if (selectedChannel !== 'ALL') {
        const chName = (tx.paymentChannel || tx.paymentMethod || '').toLowerCase();
        if (selectedChannel === 'GCash' && !chName.includes('gcash')) return false;
        if (selectedChannel === 'Maya' && !chName.includes('maya')) return false;
        if (
          selectedChannel === 'Bank Transfer' &&
          !chName.includes('bank') &&
          !chName.includes('transfer')
        )
          return false;
        if (selectedChannel === 'QRPH' && !chName.includes('qrph') && !chName.includes('qr'))
          return false;
        if (selectedChannel === 'CARD' && !chName.includes('card')) return false;
        if (selectedChannel === 'COMP' && !chName.includes('comp')) return false;
      }

      // Search match (Reference Number, Check Number, Customer Name, Table, Cashier)
      if (q) {
        const refMatch = tx.referenceNumber?.toLowerCase().includes(q);
        const checkMatch = tx.checkNumber.toLowerCase().includes(q);
        const guestMatch = tx.guestName.toLowerCase().includes(q);
        const tableMatch = tx.tableOrRef.toLowerCase().includes(q);
        const cashierMatch = tx.cashierName.toLowerCase().includes(q);
        const channelMatch = (tx.paymentChannel || tx.paymentMethod || '')
          .toLowerCase()
          .includes(q);
        return (
          Boolean(refMatch) ||
          checkMatch ||
          guestMatch ||
          tableMatch ||
          cashierMatch ||
          channelMatch
        );
      }

      return true;
    });
  }, [transactions, selectedChannel, searchQuery]);

  // Aggregate KPI metrics
  const metrics = useMemo(() => {
    let totalCashless = 0;
    let gcashTotal = 0;
    let gcashCount = 0;
    let mayaTotal = 0;
    let mayaCount = 0;
    let qrphTotal = 0;
    let qrphCount = 0;
    let cardTotal = 0;
    let cardCount = 0;

    for (const tx of transactions) {
      const amt = tx.total || 0;
      totalCashless += amt;
      const ch = (tx.paymentChannel || tx.paymentMethod || '').toUpperCase();

      if (ch.includes('GCASH')) {
        gcashTotal += amt;
        gcashCount++;
      } else if (ch.includes('MAYA')) {
        mayaTotal += amt;
        mayaCount++;
      } else if (ch.includes('QRPH') || ch.includes('QR') || ch.includes('BANK')) {
        qrphTotal += amt;
        qrphCount++;
      } else {
        cardTotal += amt;
        cardCount++;
      }
    }

    return {
      totalCashless,
      count: transactions.length,
      gcashTotal,
      gcashCount,
      mayaTotal,
      mayaCount,
      qrphTotal,
      qrphCount,
      cardTotal,
      cardCount,
    };
  }, [transactions]);

  const channelOptions: PosDropdownOption<ChannelFilter>[] = [
    { value: 'ALL', label: 'All Cashless Channels', description: 'Show all non-cash tenders' },
    { value: 'GCash', label: 'GCash QR', description: 'GCash digital wallet payments' },
    { value: 'Maya', label: 'Maya QR', description: 'Maya digital wallet payments' },
    { value: 'QRPH', label: 'BPI / QRPH', description: 'InstaPay & universal QRPH' },
    { value: 'Bank Transfer', label: 'Bank Transfer', description: 'Direct account bank wire' },
    { value: 'CARD', label: 'Credit / Debit Card', description: 'POS terminal card swipes' },
    { value: 'COMP', label: 'House / VIP Comp', description: 'Musician & staff comps' },
  ];

  const getChannelBadge = (channel?: string, method?: string) => {
    const label = channel || method || 'ONLINE';
    const upper = label.toUpperCase();

    if (upper.includes('GCASH')) {
      return (
        <View className="flex-row items-center rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-1.5" />
          <Text className="text-xs font-black text-blue-700">GCash</Text>
        </View>
      );
    }
    if (upper.includes('MAYA')) {
      return (
        <View className="flex-row items-center rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-emerald-600 mr-1.5" />
          <Text className="text-xs font-black text-emerald-700">Maya</Text>
        </View>
      );
    }
    if (upper.includes('QRPH') || upper.includes('BPI')) {
      return (
        <View className="flex-row items-center rounded-lg bg-purple-50 border border-purple-200 px-2.5 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-purple-600 mr-1.5" />
          <Text className="text-xs font-black text-purple-700">QRPH</Text>
        </View>
      );
    }
    if (upper.includes('BANK')) {
      return (
        <View className="flex-row items-center rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-amber-600 mr-1.5" />
          <Text className="text-xs font-black text-amber-800">Bank Transfer</Text>
        </View>
      );
    }
    if (upper.includes('CARD')) {
      return (
        <View className="flex-row items-center rounded-lg bg-slate-100 border border-slate-300 px-2.5 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-slate-600 mr-1.5" />
          <Text className="text-xs font-black text-slate-800">Credit / Debit Card</Text>
        </View>
      );
    }
    return (
      <View className="flex-row items-center rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1">
        <Text className="text-xs font-bold text-stone-700">{label}</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8">
      {/* 1. Top Section Header & KPI Summary */}
      <View className="mb-6 flex-col lg:flex-row lg:items-center justify-between gap-4">
        <View>
          <View className="flex-row items-center space-x-2">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-wine-800 text-white shadow-sm">
              <QrCode size={20} color="#ffffff" />
            </View>
            <View className="ml-2">
              <Text className="text-2xl font-black text-stone-900">
                Online &amp; Cashless Transactions
              </Text>
              <Text className="text-xs font-semibold text-stone-500">
                Live audit trail of GCash, Maya, QRPH &amp; Card settlements with 4-digit reference
                tracking
              </Text>
            </View>
          </View>
        </View>

        {/* 1-Click Excel Export & Refresh */}
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => exportCashlessRegisterToExcel(filteredTransactions, timeframeLabel)}
            className="flex-row items-center rounded-xl border border-emerald-600/40 bg-emerald-50 px-4 py-2.5 active:bg-emerald-100 shadow-xs"
          >
            <FileSpreadsheet size={16} color="#059669" />
            <Text className="ml-2 text-xs font-bold text-emerald-800">Export Excel Ledger</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setIsRefreshing(true);
              fetchTransactions();
            }}
            disabled={isRefreshing}
            className="flex-row items-center rounded-xl bg-stone-800 px-4 py-2.5 active:bg-stone-900 shadow-xs"
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <RotateCw size={15} color="#ffffff" />
            )}
            <Text className="ml-2 text-xs font-semibold text-white">Refresh</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. KPI Cards Row */}
      <View className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <View className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
          <Text className="text-xs font-extrabold uppercase tracking-wider text-stone-500">
            Total Cashless Revenue
          </Text>
          <Text className="mt-1 text-2xl font-black text-wine-800">
            {formatCurrency(metrics.totalCashless)}
          </Text>
          <Text className="mt-1 text-xs font-semibold text-stone-400">
            {metrics.count} total non-cash payments
          </Text>
        </View>

        <View className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 shadow-xs">
          <Text className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
            GCash QR Volume
          </Text>
          <Text className="mt-1 text-2xl font-black text-blue-900">
            {formatCurrency(metrics.gcashTotal)}
          </Text>
          <Text className="mt-1 text-xs font-semibold text-blue-600">
            {metrics.gcashCount} settled transactions
          </Text>
        </View>

        <View className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs">
          <Text className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
            Maya QR Volume
          </Text>
          <Text className="mt-1 text-2xl font-black text-emerald-900">
            {formatCurrency(metrics.mayaTotal)}
          </Text>
          <Text className="mt-1 text-xs font-semibold text-emerald-600">
            {metrics.mayaCount} settled transactions
          </Text>
        </View>

        <View className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-4 shadow-xs">
          <Text className="text-xs font-extrabold uppercase tracking-wider text-purple-700">
            QRPH &amp; Card Volume
          </Text>
          <Text className="mt-1 text-2xl font-black text-purple-900">
            {formatCurrency(metrics.qrphTotal + metrics.cardTotal)}
          </Text>
          <Text className="mt-1 text-xs font-semibold text-purple-600">
            {metrics.qrphCount + metrics.cardCount} settled transactions
          </Text>
        </View>
      </View>

      {/* 3. Filter & Reference Search Toolbar */}
      <View className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs mb-6">
        <View className="flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input with 4-Digit Ref Highlighting */}
          <View className="flex-1 relative">
            <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5">
              <Search size={18} color="#78716c" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search reference # (e.g. 1234), check #, customer, or table..."
                placeholderTextColor="#a8a29e"
                className="ml-2.5 flex-1 text-sm font-semibold text-stone-900 outline-none"
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')} className="p-1">
                  <X size={16} color="#78716c" />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Channel Dropdown Filter */}
          <View className="w-full md:w-64">
            <PosDropdown
              options={channelOptions}
              value={selectedChannel}
              onChange={setSelectedChannel}
              sheetTitle="Filter by Channel"
              className="h-[44px]"
            />
          </View>
        </View>
      </View>

      {/* 4. Transactions List / Ledger */}
      <View className="flex-1">
        {isLoading ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#800020" />
            <Text className="mt-3 text-sm font-bold text-stone-600">
              Loading cashless transactions...
            </Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View className="flex-1 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white p-12">
            <QrCode size={48} color="#a8a29e" />
            <Text className="mt-4 text-lg font-bold text-stone-700">
              No Cashless Transactions Found
            </Text>
            <Text className="mt-1 text-center text-sm text-stone-500 max-w-md">
              {searchQuery
                ? `No results matched "${searchQuery}". Try searching a different 4-digit reference number or clearing your filter.`
                : 'Settled GCash, Maya, and QRPH payments will appear here with their 4-digit tracking numbers.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }) => {
              const hasRef = Boolean(item.referenceNumber);
              const isExpanded = expandedCheckId === item.id;
              const isEvent = item.operatingMode === 'EVENT';

              return (
                <View className="mb-3 rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs">
                  {/* Top Row: Ref #, Channel, Amount, Mode */}
                  <View className="flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <View className="flex-row flex-wrap items-center gap-2.5">
                      {/* Prominent Reference Number Pill */}
                      {hasRef ? (
                        <Pressable
                          onPress={() => handleCopyRef(item.referenceNumber!)}
                          className="flex-row items-center rounded-xl bg-amber-500/10 border border-amber-500/40 px-3 py-1.5 active:bg-amber-500/20"
                          accessibilityLabel={`Reference Number ${item.referenceNumber}. Tap to copy.`}
                        >
                          <Text className="text-xs font-black text-amber-900 tracking-wider font-mono">
                            REF #{item.referenceNumber}
                          </Text>
                          {copiedRef === item.referenceNumber ? (
                            <Check size={13} color="#15803d" className="ml-1.5" />
                          ) : (
                            <Copy size={13} color="#b45309" className="ml-1.5" />
                          )}
                        </Pressable>
                      ) : (
                        <View className="rounded-xl bg-stone-100 border border-stone-200 px-3 py-1.5">
                          <Text className="text-xs font-bold text-stone-500">NO REF #</Text>
                        </View>
                      )}

                      {/* Branded Channel Pill */}
                      {getChannelBadge(item.paymentChannel, item.paymentMethod)}

                      {/* Operating Mode Pill */}
                      <View
                        className={`rounded-lg px-2.5 py-1 flex-row items-center border ${
                          isEvent
                            ? 'bg-amber-50 border-amber-200/80 text-amber-800'
                            : 'bg-sky-50 border-sky-200/80 text-sky-800'
                        }`}
                      >
                        {isEvent ? (
                          <Sparkles size={11} color="#d97706" />
                        ) : (
                          <Coffee size={11} color="#0284c7" />
                        )}
                        <Text
                          className={`ml-1 text-xs font-bold ${
                            isEvent ? 'text-amber-800' : 'text-sky-800'
                          }`}
                        >
                          {isEvent ? 'Event' : 'Cafe'}
                        </Text>
                      </View>
                    </View>

                    {/* Grand Total Amount */}
                    <Text className="text-xl font-black text-stone-900">
                      {formatCurrency(item.total)}
                    </Text>
                  </View>

                  {/* Middle Row: Check #, Guest, Location, Cashier, Timestamp */}
                  <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-600 border-t border-stone-100 pt-3">
                    <Text className="text-xs font-bold text-stone-800">{item.checkNumber}</Text>
                    <Text className="text-xs text-stone-500">•</Text>
                    <Text className="text-xs font-semibold text-stone-700">{item.guestName}</Text>
                    <Text className="text-xs text-stone-500">•</Text>
                    <Text className="text-xs text-stone-600">{item.tableOrRef}</Text>
                    <Text className="text-xs text-stone-500">•</Text>
                    <View className="flex-row items-center">
                      <User size={12} color="#78716c" />
                      <Text className="ml-1 text-xs text-stone-600">{item.cashierName}</Text>
                    </View>
                    <Text className="text-xs text-stone-500">•</Text>
                    <View className="flex-row items-center">
                      <Clock size={12} color="#78716c" />
                      <Text className="ml-1 text-xs text-stone-500">
                        {new Date(item.settledAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {item.timestamp}
                      </Text>
                    </View>
                  </View>

                  {/* Expandable Line Items Preview */}
                  {isExpanded && item.items && item.items.length > 0 && (
                    <View className="mt-3 rounded-xl bg-stone-50 p-3 border border-stone-200/80">
                      <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                        Ordered Line Items ({item.items.length}):
                      </Text>
                      {item.items.map((it, idx) => (
                        <View key={idx} className="flex-row items-center justify-between py-1">
                          <Text className="text-xs font-medium text-stone-800">
                            {it.quantity}x {it.name} {it.notes ? `(${it.notes})` : ''}
                          </Text>
                          <Text className="text-xs font-bold text-stone-900">
                            {formatCurrency(it.subtotal)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Bottom Action Bar */}
                  <View className="mt-3 flex-row items-center justify-between border-t border-stone-100/80 pt-2.5">
                    <Pressable
                      onPress={() => setExpandedCheckId(isExpanded ? null : item.id)}
                      className="flex-row items-center py-1 text-stone-500 active:opacity-70"
                    >
                      <Text className="text-xs font-bold text-stone-600">
                        {isExpanded
                          ? 'Hide items'
                          : `View items (${item.items?.length || item.itemsCount || 0})`}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={14} color="#78716c" className="ml-1" />
                      ) : (
                        <ChevronDown size={14} color="#78716c" className="ml-1" />
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => handleReprint(item)}
                      disabled={reprintingId === item.id}
                      className="flex-row items-center rounded-xl bg-stone-100 px-3 py-1.5 active:bg-stone-200"
                    >
                      {reprintingId === item.id ? (
                        <ActivityIndicator size="small" color="#44403c" />
                      ) : (
                        <RotateCw size={12} color="#44403c" />
                      )}
                      <Text className="ml-1.5 text-xs font-bold text-stone-800">
                        Reprint Thermal Receipt
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};
