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
          <View className="flex-row items-center rounded-full bg-emerald-100 px-3 py-1">
            <CheckCircle2 size={16} color="#059669" />
            <Text className="ml-1 text-base font-medium text-emerald-800">Printed</Text>
          </View>
        );
      case 'PRINTING':
        return (
          <View className="flex-row items-center rounded-full bg-sky-100 px-3 py-1">
            <ActivityIndicator size="small" color="#0284c7" />
            <Text className="ml-1 text-base font-medium text-sky-800">Printing...</Text>
          </View>
        );
      case 'FAILED':
        return (
          <View className="flex-row items-center rounded-full bg-rose-100 px-3 py-1">
            <AlertCircle size={16} color="#e11d48" />
            <Text className="ml-1 text-base font-medium text-rose-800">Failed</Text>
          </View>
        );
      case 'PENDING':
      default:
        return (
          <View className="flex-row items-center rounded-full bg-amber-100 px-3 py-1">
            <Clock size={16} color="#d97706" />
            <Text className="ml-1 text-base font-medium text-amber-800">Queued</Text>
          </View>
        );
    }
  };

  const renderJobCard = ({ item }: { item: PrintJobItem }) => {
    const rawData = item.receipt_data || {};
    const title =
      item.job_type === 'RUNNER_CHIT'
        ? `Runner Chit #${rawData.orderNumber || ''} (Table ${rawData.tableNumber || 'Walk-in'})`
        : item.job_type === 'CUSTOMER_RECEIPT'
          ? `Receipt #${rawData.receiptNumber || ''} (${rawData.tabName || rawData.customerName || 'Guest'})`
          : `${item.job_type} - ${rawData.customerName || 'Order'}`;

    return (
      <View className="mb-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center space-x-2">
            <FileText size={20} color="#78716c" />
            <Text className="text-lg font-bold text-stone-900">{title}</Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View className="mt-2 flex-row flex-wrap items-center text-stone-600">
          <Text className="text-base text-stone-600">
            Type: <Text className="font-semibold text-stone-800">{item.job_type}</Text>
          </Text>
          {rawData.roundNumber && (
            <Text className="ml-4 text-base text-stone-600">
              Round: <Text className="font-semibold text-stone-800">#{rawData.roundNumber}</Text>
            </Text>
          )}
          {(rawData.paymentMethod || rawData.payment_method) && (
            <Text className="ml-4 text-base text-stone-600">
              Payment:{' '}
              <Text className="font-semibold text-stone-800">
                {rawData.payment_channel ||
                  rawData.paymentChannel ||
                  rawData.payment_method ||
                  rawData.paymentMethod}
                {rawData.reference_number || rawData.referenceNumber
                  ? ` (Ref: #${rawData.reference_number || rawData.referenceNumber})`
                  : ''}
              </Text>
            </Text>
          )}
          <Text className="ml-4 text-base text-stone-500">
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </Text>
        </View>

        {rawData.items && rawData.items.length > 0 && (
          <View className="mt-3 rounded-lg bg-stone-50 p-2.5">
            {rawData.items.slice(0, 3).map((it: any, idx: number) => (
              <Text key={idx} className="text-base text-stone-700">
                • {it.quantity}x {it.name} {it.notes ? `(${it.notes})` : ''}
              </Text>
            ))}
            {rawData.items.length > 3 && (
              <Text className="text-base italic text-stone-500">
                + {rawData.items.length - 3} more items
              </Text>
            )}
          </View>
        )}

        {/* Action Button: Reprint */}
        <View className="mt-4 flex-row justify-end border-t border-stone-100 pt-3">
          <Pressable
            onPress={() => handleReprint(item)}
            disabled={reprintingId === item.id}
            className="min-h-[48px] min-w-[48px] flex-row items-center rounded-xl bg-stone-100 px-4 py-2 active:bg-stone-200"
          >
            {reprintingId === item.id ? (
              <ActivityIndicator size="small" color="#44403c" />
            ) : (
              <RotateCw size={18} color="#44403c" />
            )}
            <Text className="ml-2 text-base font-semibold text-stone-800">Reprint Ticket</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (jobFilter === 'CUSTOMER_RECEIPT') return j.job_type === 'CUSTOMER_RECEIPT';
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
      <View className="mb-4 flex-col lg:flex-row lg:items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm gap-3">
        <View className="flex-row items-center gap-3">
          <View className="rounded-2xl bg-amber-100 p-2.5">
            <Printer size={24} color="#d97706" />
          </View>
          <View>
            <Text className="text-xl font-black text-stone-900">Thermal Print Queue</Text>
            <View className="mt-0.5 flex-row items-center">
              <View className="h-2 w-2 rounded-full bg-emerald-500" />
              <Text className="ml-2 text-base font-medium text-stone-600">Realtime CDC Active</Text>
            </View>
          </View>
        </View>

        <View className="flex-row flex-wrap items-center gap-2.5">
          <PosDropdown
            options={filterOptions}
            value={jobFilter}
            onChange={setJobFilter}
            sheetTitle="Filter Print Queue"
            className="flex-1 sm:flex-initial min-w-[165px]"
          />

          {/* Launch Dedicated Hardware Tab */}
          <Pressable
            onPress={() => window.open('?mode=printer', '_blank')}
            className="min-h-[48px] min-w-[48px] flex-row items-center justify-center rounded-xl border border-stone-800 bg-stone-900 px-4 py-2 active:bg-stone-800 shadow-sm"
          >
            <Printer size={18} color="#f59e0b" />
            <Text className="ml-2 text-base font-bold text-amber-400">
              Launch Print Station Tab
            </Text>
            <ExternalLink size={14} color="#f59e0b" className="ml-1.5" />
          </Pressable>

          {/* Diagnostic Kick Cash Drawer */}
          <Pressable
            onPress={handleKickDrawer}
            disabled={isKickingDrawer}
            className="min-h-[48px] min-w-[48px] flex-row items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 active:bg-amber-100"
          >
            {isKickingDrawer ? (
              <ActivityIndicator size="small" color="#d97706" />
            ) : (
              <Coins size={18} color="#d97706" />
            )}
            <Text className="ml-2 text-base font-bold text-amber-800">Kick Drawer</Text>
          </Pressable>

          {/* Refresh List */}
          <Pressable
            onPress={() => {
              setIsRefreshing(true);
              fetchJobs();
            }}
            disabled={isRefreshing}
            className="min-h-[48px] min-w-[48px] flex-row items-center justify-center rounded-xl bg-stone-800 px-4 py-2 active:bg-stone-900"
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <RefreshCw size={18} color="#ffffff" />
            )}
            <Text className="ml-2 text-base font-semibold text-white">Refresh</Text>
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
