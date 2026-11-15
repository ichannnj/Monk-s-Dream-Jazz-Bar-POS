import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import {
  Printer,
  RefreshCw,
  Coins,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  RotateCw,
  Layers,
  ExternalLink,
} from 'lucide-react-native';
import { supabase } from '@/features/shared/infrastructure/supabase';
import { toast } from '@/features/shared/toast/useToastStore';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { printerApi, type PrintJobItem } from '../data/printer.api';

type PrintJobFilter = 'ALL' | 'CUSTOMER_RECEIPT' | 'RUNNER_CHIT' | 'ISSUES';

export const PrinterTerminalScreen: React.FC = () => {
  const [jobs, setJobs] = useState<PrintJobItem[]>([]);
  const [jobFilter, setJobFilter] = useState<PrintJobFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reprintingId, setReprintingId] = useState<string | null>(null);
  const [isKickingDrawer, setIsKickingDrawer] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await printerApi.getRecentPrintJobs(50);
      setJobs(data);
    } catch {
      toast.error('Failed to load print jobs from server', { title: 'Printer Error' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();

    // Subscribe to real-time changes on print_jobs table
    const channel = supabase
      .channel('printer_terminal_screen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'print_jobs' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setJobs((prev) => [payload.new as PrintJobItem, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setJobs((prev) =>
            prev.map((item) => (item.id === payload.new.id ? (payload.new as PrintJobItem) : item))
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJobs]);

  const handleReprint = async (job: PrintJobItem) => {
    setReprintingId(job.id);
    try {
      await printerApi.reprintJob(job);
      toast.success(`Reprint job enqueued for ${job.job_type}`, { title: 'Ticket Queued' });
    } catch {
      toast.error('Failed to trigger reprint', { title: 'Reprint Failed' });
    } finally {
      setReprintingId(null);
    }
  };

  const handleKickDrawer = async () => {
    setIsKickingDrawer(true);
    try {
      await printerApi.kickCashDrawer();
      toast.success('Cash drawer pulse signal sent', { title: 'Drawer Test' });
    } catch {
      toast.error('Failed to trigger cash drawer', { title: 'Hardware Error' });
    } finally {
      setIsKickingDrawer(false);
    }
  };

  const getStatusBadge = (status: PrintJobItem['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <View className="flex-row items-center rounded-lg bg-[#FAF8F5] border border-stone-200 px-2.5 py-1">
            <CheckCircle2 size={14} color="#1c1917" />
            <Text className="ml-1 text-xs font-bold text-stone-800 uppercase">Printed</Text>
          </View>
        );
      case 'PRINTING':
        return (
          <View className="flex-row items-center rounded-lg bg-[#FAF8F5] border border-[#810021] px-2.5 py-1">
            <ActivityIndicator size="small" color="#810021" />
            <Text className="ml-1 text-xs font-bold text-[#810021] uppercase">Printing</Text>
          </View>
        );
      case 'FAILED':
        return (
          <View className="flex-row items-center rounded-lg bg-[#FAF8F5] border border-stone-400 px-2.5 py-1">
            <AlertCircle size={14} color="#810021" />
            <Text className="ml-1 text-xs font-bold text-[#810021] uppercase">Failed</Text>
          </View>
        );
      case 'PENDING':
      default:
        return (
          <View className="flex-row items-center rounded-lg bg-[#FAF8F5] border border-stone-200 px-2.5 py-1">
            <Clock size={14} color="#78716c" />
            <Text className="ml-1 text-xs font-bold text-stone-700 uppercase">Queued</Text>
          </View>
        );
    }
  };

  const renderJobCard = ({ item }: { item: PrintJobItem }) => {
    const rawData = item.receipt_data || {};
    const title =
      item.job_type === 'RUNNER_CHIT'
        ? `Runner Chit #${rawData.orderNumber || ''} (Table ${rawData.tableNumber || 'Walk-in'})`
        : item.job_type === 'CUSTOMER_RECEIPT' || item.job_type === 'RECEIPT'
          ? `Receipt #${rawData.receiptNumber || ''} (${rawData.tabName || rawData.customerName || 'Guest'})`
          : item.job_type === 'DRAWER_KICK'
            ? `Cash Drawer Solenoid (${(rawData.drawerTarget || 'Main').toUpperCase()} Till)`
            : `${item.job_type} - ${rawData.customerName || 'Order'}`;

    const itemsCount = rawData.items?.length || 0;
    const timeFormatted = new Date(item.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View className="mb-2.5 rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 shadow-xs">
        {/* Row 1: Title + Status Badge */}
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2 flex-1 min-w-0">
            <FileText size={18} color="#1c1917" />
            <Text className="text-base font-bold text-stone-900 truncate" numberOfLines={1}>
              {title}
            </Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        {/* Row 2: Metadata & 1-Tap Reprint */}
        <View className="mt-2.5 pt-2.5 border-t border-stone-100 flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-3">
            <Text className="text-xs font-black text-stone-800 uppercase tracking-wider">
              {item.job_type}
            </Text>
            <Text className="text-sm text-stone-400 font-normal">·</Text>
            <Text className="text-sm text-stone-500">{timeFormatted}</Text>
            {itemsCount > 0 && (
              <>
                <Text className="text-sm text-stone-400 font-normal">·</Text>
                <Text className="text-sm text-stone-500">
                  {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                </Text>
              </>
            )}
          </View>

          <Pressable
            onPress={() => handleReprint(item)}
            disabled={reprintingId === item.id}
            className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] border border-stone-200 active:bg-stone-100 flex-row items-center gap-1.5"
            accessibilityRole="button"
            accessibilityLabel={`Reprint ticket for ${title}`}
          >
            {reprintingId === item.id ? (
              <ActivityIndicator size="small" color="#810021" />
            ) : (
              <RotateCw size={15} color="#1c1917" />
            )}
            <Text className="text-sm font-bold text-stone-900">Reprint</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (jobFilter === 'CUSTOMER_RECEIPT')
        return j.job_type === 'CUSTOMER_RECEIPT' || j.job_type === 'RECEIPT';
      if (jobFilter === 'RUNNER_CHIT') return j.job_type === 'RUNNER_CHIT';
      if (jobFilter === 'ISSUES') return j.status === 'FAILED' || j.status === 'PENDING';
      return true;
    });
  }, [jobs, jobFilter]);

  const filterOptions: PosDropdownOption<PrintJobFilter>[] = [
    { value: 'ALL', label: 'All Print Jobs', badge: jobs.length, icon: Layers },
    { value: 'CUSTOMER_RECEIPT', label: 'Customer Receipts', icon: FileText },
    { value: 'RUNNER_CHIT', label: 'Station & Runner Chits', icon: Printer },
    { value: 'ISSUES', label: 'Queued / Failed', icon: AlertCircle },
  ];

  return (
    <View className="flex-1 bg-stone-100 p-3 sm:p-6">
      {/* Top Bar Header */}
      <View className="mb-4 flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 shadow-xs gap-3">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-[#810021] items-center justify-center shadow-xs">
            <Printer size={18} color="#ffffff" strokeWidth={2.4} />
          </View>
          <View>
            <Text className="text-xl font-black text-stone-900 tracking-tight">Print Queue</Text>
            <View className="mt-0.5 flex-row items-center">
              <View className="h-1.5 w-1.5 rounded-full bg-[#1c1917]" />
              <Text className="ml-1.5 text-xs font-semibold text-stone-500">Live Queue</Text>
            </View>
          </View>
        </View>

        <View className="flex-row flex-wrap items-center gap-2">
          <PosDropdown
            options={filterOptions}
            value={jobFilter}
            onChange={setJobFilter}
            sheetTitle="Filter Print Queue"
            className="flex-1 sm:flex-initial min-w-[150px]"
          />

          {/* Diagnostic Kick Cash Drawer */}
          <Pressable
            onPress={handleKickDrawer}
            disabled={isKickingDrawer}
            className="min-h-[48px] px-3.5 py-2 flex-row items-center justify-center rounded-xl border border-stone-300 bg-white active:bg-stone-50"
            accessibilityRole="button"
            accessibilityLabel="Kick cash drawer"
          >
            {isKickingDrawer ? (
              <ActivityIndicator size="small" color="#810021" />
            ) : (
              <Coins size={16} color="#1c1917" />
            )}
            <Text className="ml-1.5 text-sm font-bold text-stone-900">Kick Drawer</Text>
          </Pressable>

          {/* Launch Dedicated Hardware Tab */}
          <Pressable
            onPress={() => window.open('?mode=printer', '_blank')}
            className="min-h-[48px] px-3.5 py-2 flex-row items-center justify-center rounded-xl bg-[#1c1917] active:opacity-90 shadow-xs"
            accessibilityRole="button"
            accessibilityLabel="Launch dedicated print station tab"
          >
            <Printer size={16} color="#ffffff" />
            <Text className="ml-1.5 text-sm font-bold text-white">Station Tab</Text>
            <ExternalLink size={13} color="#ffffff" className="ml-1" />
          </Pressable>
        </View>
      </View>

      {/* Main Jobs Feed */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#d97706" />
          <Text className="mt-4 text-base text-stone-600">Loading thermal print jobs...</Text>
        </View>
      ) : filteredJobs.length === 0 ? (
        <View className="flex-1 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white p-8">
          <Printer size={48} color="#a8a29e" />
          <Text className="mt-4 text-xl font-bold text-stone-700">No Print Jobs Found</Text>
          <Text className="mt-1 text-center text-base text-stone-500">
            Dispatched kitchen chits and settled receipts will appear here in real-time.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJobCard}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};
