import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { Search, X, QrCode, RotateCw, FileSpreadsheet } from 'lucide-react-native';
import { checksApi } from '@/features/check-history/data/checks.api';
import type { SettledCheckItem } from '@/features/check-history/domain/check.types';
import { toast } from '@/features/shared/toast/useToastStore';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { supabase } from '@/features/shared/infrastructure/supabase';
import { exportCashlessRegisterToExcel } from '../../../utils/readingExcelExport';
import { CashlessKpiCardsRow } from './cashless/CashlessKpiCardsRow';
import { CashlessTransactionCard } from './cashless/CashlessTransactionCard';
import {
  computeCashlessMetrics,
  filterCashlessTransactions,
  reprintCustomerCheck,
} from './cashless/cashlessUtils';

interface AdminCashlessTransactionsViewProps {
  startDate?: string;
  endDate?: string;
  timeframeLabel?: string;
  mode?: 'ALL' | 'CAFE' | 'EVENT';
}

type ChannelFilter = 'ALL' | 'GCash' | 'Maya' | 'Bank Transfer' | 'QRPH' | 'CARD' | 'COMP';

const channelOptions: PosDropdownOption<ChannelFilter>[] = [
  { value: 'ALL', label: 'All Cashless Channels', description: 'Show all non-cash tenders' },
  { value: 'GCash', label: 'GCash QR', description: 'GCash digital wallet payments' },
  { value: 'Maya', label: 'Maya QR', description: 'Maya digital wallet payments' },
  { value: 'QRPH', label: 'BPI / QRPH', description: 'InstaPay & universal QRPH' },
  { value: 'Bank Transfer', label: 'Bank Transfer', description: 'Direct account bank wire' },
  { value: 'CARD', label: 'Credit / Debit Card', description: 'POS terminal card swipes' },
  { value: 'COMP', label: 'House / VIP Comp', description: 'Musician & staff comps' },
];

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

  const handleCopyRef = (ref: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ref);
      setCopiedRef(ref);
      toast.success(`Reference #${ref} copied to clipboard`, { title: 'Copied' });
      setTimeout(() => setCopiedRef(null), 2000);
    }
  };

  const handleReprint = async (chk: SettledCheckItem) => {
    setReprintingId(chk.id);
    try {
      await reprintCustomerCheck(chk);
      toast.success(`Receipt enqueued for print: Check ${chk.checkNumber}`, {
        title: 'Reprint Queued',
      });
    } catch {
      toast.error('Failed to trigger reprint', { title: 'Reprint Failed' });
    } finally {
      setReprintingId(null);
    }
  };

  const filteredTransactions = useMemo(
    () => filterCashlessTransactions(transactions, selectedChannel, searchQuery),
    [transactions, selectedChannel, searchQuery]
  );

  const metrics = useMemo(() => computeCashlessMetrics(transactions), [transactions]);

  return (
    <View className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8">
      {/* 1. Header & Actions */}
      <View className="mb-6 flex-col lg:flex-row lg:items-center justify-between gap-4">
        <View className="flex-row items-center space-x-2">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-wine-800 shadow-sm">
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
      <CashlessKpiCardsRow metrics={metrics} />

      {/* 3. Filter & Search Toolbar */}
      <View className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs mb-6">
        <View className="flex-col md:flex-row md:items-center justify-between gap-3">
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

      {/* 4. Transactions List */}
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
            renderItem={({ item }) => (
              <CashlessTransactionCard
                item={item}
                isExpanded={expandedCheckId === item.id}
                copiedRef={copiedRef}
                reprintingId={reprintingId}
                onToggleExpand={() =>
                  setExpandedCheckId(expandedCheckId === item.id ? null : item.id)
                }
                onCopyRef={handleCopyRef}
                onReprint={handleReprint}
              />
            )}
          />
        )}
      </View>
    </View>
  );
};
