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
import { PosDropdown, PosDropdownOption, FloorSectionHeader } from '@/features/shared';
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
          <View className="flex-row items-center rounded-full bg-[#FAF8F5] border border-[#E7E5E4] px-3 py-1">
            <CheckCircle2 size={16} color="#1C1917" />
            <Text className="ml-1.5 text-base font-semibold text-[#1C1917]">Printed</Text>
          </View>
        );
      case 'PRINTING':
        return (
          <View className="flex-row items-center rounded-full bg-[#810021]/10 border border-[#810021]/25 px-3 py-1">
            <ActivityIndicator size="small" color="#810021" />
            <Text className="ml-1.5 text-base font-semibold text-[#810021]">Printing</Text>
          </View>
        );
      case 'FAILED':
        return (
          <View className="flex-row items-center rounded-full bg-rose-50 border border-rose-200 px-3 py-1">
            <AlertCircle size={16} color="#810021" />
            <Text className="ml-1.5 text-base font-semibold text-[#810021]">Failed</Text>
          </View>
        );
      case 'PENDING':
      default:
        return (
          <View className="flex-row items-center rounded-full bg-[#FAF8F5] border border-[#E7E5E4] px-3 py-1">
            <Clock size={16} color="#78716C" />
            <Text className="ml-1.5 text-base font-semibold text-[#57534E]">Queued</Text>
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
      <View className="mb-2.5 rounded-2xl border border-[#E7E5E4] bg-white p-4">
        {/* Row 1: Title + Status Badge */}
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2 flex-1 min-w-0">
            <FileText size={18} color="#1C1917" />
            <Text className="text-base font-bold text-[#1C1917] truncate" numberOfLines={1}>
              {title}
            </Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        {/* Row 2: Metadata & 1-Tap Reprint */}
        <View className="mt-3 pt-2.5 border-t border-[#E7E5E4]/80 flex-row flex-wrap items-center justify-between gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-base font-semibold text-[#1C1917] uppercase">
              {item.job_type}
            </Text>
            <Text className="text-base text-[#78716C]">·</Text>
            <Text className="text-base text-[#57534E] tabular-nums">{timeFormatted}</Text>
            {itemsCount > 0 && (
              <>
                <Text className="text-base text-[#78716C]">·</Text>
                <Text className="text-base text-[#57534E] tabular-nums">
                  {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                </Text>
              </>
            )}
          </View>

          <Pressable
            onPress={() => handleReprint(item)}
            disabled={reprintingId === item.id}
            className="min-h-[48px] px-4 rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] active:opacity-80 flex-row items-center gap-2"
            accessibilityRole="button"
            accessibilityLabel={`Reprint ticket for ${title}`}
          >
            {reprintingId === item.id ? (
              <ActivityIndicator size="small" color="#810021" />
            ) : (
              <RotateCw size={16} color="#1C1917" />
            )}
            <Text className="text-base font-semibold text-[#1C1917]">Reprint</Text>
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
    <View className="flex-1 bg-[#FAF8F5]">
      <FloorSectionHeader
        title="Print Queue"
        badge={{ label: 'Live Queue', tone: 'neutral' }}
        rightSlot={
          <>
            <PosDropdown
              options={filterOptions}
              value={jobFilter}
              onChange={setJobFilter}
              sheetTitle="Filter Print Queue"
              className="flex-1 sm:flex-initial min-w-[150px]"
            />

            <Pressable
              onPress={handleKickDrawer}
              disabled={isKickingDrawer}
              className="min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Kick cash drawer"
            >
              {isKickingDrawer ? (
                <ActivityIndicator size="small" color="#810021" />
              ) : (
                <Coins size={18} color="#1C1917" />
              )}
              <Text className="ml-2 text-base font-semibold text-[#1C1917]">Kick Drawer</Text>
            </Pressable>

            <Pressable
              onPress={() => window.open('?mode=printer', '_blank')}
              className="min-h-[48px] px-4 flex-row items-center justify-center rounded-xl bg-[#810021] active:opacity-85"
              accessibilityRole="button"
              accessibilityLabel="Launch dedicated print station tab"
            >
              <Printer size={18} color="#FFFFFF" />
              <Text className="ml-2 text-base font-semibold text-white">Station Tab</Text>
              <ExternalLink size={15} color="#FFFFFF" className="ml-1.5" />
            </Pressable>
          </>
        }
      />

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
