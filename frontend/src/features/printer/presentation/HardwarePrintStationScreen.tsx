import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import {
  Printer,
  RefreshCw,
  Coins,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  RotateCw,
  Volume2,
  VolumeX,
  Play,
  Square,
  Zap,
  Terminal,
  ShieldCheck,
  Radio,
  Sliders,
  ExternalLink,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import {
  usePrinterStationStore,
  type StationConnectionStatus,
  type DrawerStatus,
} from '../application/usePrinterStationStore';
import type { PrintJobItem } from '../data/printer.api';

type PrintJobFilter = 'ALL' | 'CUSTOMER_RECEIPT' | 'RUNNER_CHIT' | 'TAKEOUT_SLIP' | 'READINGS';

const BAUD_RATE_OPTIONS: PosDropdownOption<string>[] = [
  { value: '9600', label: '9600 baud', description: 'Standard ESC/POS thermal printers (Default)' },
  { value: '19200', label: '19200 baud', description: 'Medium speed thermal printers' },
  { value: '38400', label: '38400 baud', description: 'High speed serial printers' },
  { value: '115200', label: '115200 baud', description: 'Ultra high speed USB-VCP printers' },
];

export const HardwarePrintStationScreen: React.FC = () => {
  const {
    isSupported,
    connectionStatus,
    drawerStatus,
    isLeader,
    baudRate,
    autoPrintEnabled,
    chimeEnabled,
    portInfo,
    recentJobs,
    stationLogs,
    isProcessing,
    initStation,
    connectDevice,
    disconnectDevice,
    toggleAutoPrint,
    toggleChime,
    setBaudRate,
    reprintJob,
    testPrintChit,
    testKickDrawer,
    playOrderChime,
  } = usePrinterStationStore();

  const [filter, setFilter] = useState<PrintJobFilter>('ALL');
  const [activeTab, setActiveTab] = useState<'jobs' | 'logs'>('jobs');
  const [isTestingChit, setIsTestingChit] = useState(false);
  const [isTestingDrawer, setIsTestingDrawer] = useState(false);
  const [reprintingId, setReprintingId] = useState<string | null>(null);

  // Initialize station lifecycle, Web Locks leader election, and Supabase CDC on mount
  useEffect(() => {
    const cleanup = initStation();
    return () => {
      cleanup();
    };
  }, [initStation]);

  const handleConnect = async () => {
    await connectDevice();
  };

  const handleTestPrint = async () => {
    setIsTestingChit(true);
    try {
      await testPrintChit();
    } finally {
      setIsTestingChit(false);
    }
  };

  const handleTestKick = async () => {
    setIsTestingDrawer(true);
    try {
      await testKickDrawer();
    } finally {
      setIsTestingDrawer(false);
    }
  };

  const handleReprint = async (job: PrintJobItem) => {
    setReprintingId(job.id);
    try {
      await reprintJob(job);
    } finally {
      setReprintingId(null);
    }
  };

  const filteredJobs = useMemo(() => {
    return recentJobs.filter((job) => {
      if (filter === 'ALL') return true;
      if (filter === 'CUSTOMER_RECEIPT') {
        return job.job_type === 'CUSTOMER_RECEIPT' || job.job_type === 'RECEIPT';
      }
      if (filter === 'RUNNER_CHIT') {
        return job.job_type === 'RUNNER_CHIT';
      }
      if (filter === 'TAKEOUT_SLIP') {
        return job.job_type === 'TAKEOUT_SLIP' || job.job_type === 'DELIVERY_TAG';
      }
      if (filter === 'READINGS') {
        return (
          job.job_type === 'X_READING' ||
          job.job_type === 'Y_READING' ||
          job.job_type === 'Z_READING'
        );
      }
      return true;
    });
  }, [recentJobs, filter]);

  const filterOptions: PosDropdownOption<PrintJobFilter>[] = [
    { value: 'ALL', label: 'All Print Jobs', description: 'Show all receipts, chits, and slips' },
    {
      value: 'CUSTOMER_RECEIPT',
      label: 'Receipts Only',
      description: 'Cashier & customer receipts',
    },
    { value: 'RUNNER_CHIT', label: 'Runner Chits', description: 'Food & cocktail kitchen chits' },
    { value: 'TAKEOUT_SLIP', label: 'Takeout / Delivery', description: 'Pickup & delivery tags' },
    { value: 'READINGS', label: 'Fiscal Readings', description: 'X, Y, and Z shift closing slips' },
  ];

  return (
    <View className="flex-1 bg-stone-900">
      {/* 1. Header Bar */}
      <View className="border-b border-stone-800 bg-stone-950 px-4 py-3.5 sm:px-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center space-x-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30">
              <Printer size={22} color="#f59e0b" />
            </View>
            <View>
              <Text className="text-lg font-black tracking-wide text-white">
                MONK'S DREAM <Text className="text-amber-500">HARDWARE STATION</Text>
              </Text>
              <Text className="text-xs font-semibold text-stone-400">
                Dedicated Web Serial Thermal Printer &amp; Cash Drawer Listener
              </Text>
            </View>
          </View>

          {/* Leader Lock Status */}
          <View className="flex-row items-center space-x-2">
            {isLeader ? (
              <View className="flex-row items-center rounded-full bg-emerald-950 border border-emerald-600/50 px-3 py-1">
                <ShieldCheck size={14} color="#10b981" />
                <Text className="ml-1.5 text-xs font-bold text-emerald-400">ACTIVE LEADER TAB</Text>
              </View>
            ) : (
              <View className="flex-row items-center rounded-full bg-amber-950 border border-amber-600/50 px-3 py-1">
                <Clock size={14} color="#f59e0b" />
                <Text className="ml-1.5 text-xs font-bold text-amber-400">STANDBY TAB</Text>
              </View>
            )}

            <Pressable
              onPress={() => window.open('/', '_blank')}
              className="hidden sm:flex flex-row items-center rounded-xl bg-stone-800 px-3 py-1.5 active:bg-stone-700"
            >
              <ExternalLink size={14} color="#d6d3d1" />
              <Text className="ml-1.5 text-xs font-semibold text-stone-300">Open Floor POS</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 2. Top Hardware Telemetry Cards */}
      <View className="p-4 sm:p-6 pb-2">
        <View className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Printer Status */}
          <View className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
            <View className="flex-row items-center justify-between pb-3 border-b border-stone-800/80">
              <View className="flex-row items-center space-x-2">
                <Printer size={18} color="#94a3b8" />
                <Text className="text-sm font-bold text-stone-300 uppercase tracking-wider">
                  80mm Thermal Printer
                </Text>
              </View>
              {connectionStatus === 'CONNECTED' ? (
                <View className="flex-row items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5">
                  <View className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <Text className="ml-1.5 text-xs font-bold text-emerald-400">ONLINE</Text>
                </View>
              ) : connectionStatus === 'CONNECTING' ? (
                <View className="flex-row items-center rounded-full bg-sky-500/10 border border-sky-500/30 px-2.5 py-0.5">
                  <ActivityIndicator size="small" color="#38bdf8" />
                  <Text className="ml-1.5 text-xs font-bold text-sky-400">CONNECTING</Text>
                </View>
              ) : (
                <View className="flex-row items-center rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5">
                  <View className="h-2 w-2 rounded-full bg-rose-500" />
                  <Text className="ml-1.5 text-xs font-bold text-rose-400">OFFLINE</Text>
                </View>
              )}
            </View>

            <View className="mt-3">
              <Text className="text-xs text-stone-400">
                {connectionStatus === 'CONNECTED'
                  ? `Connected via Web Serial (${portInfo?.usbVendorId ? `USB VID: 0x${portInfo.usbVendorId.toString(16).toUpperCase()}` : 'Virtual COM'})`
                  : !isSupported
                    ? 'Web Serial is not supported in this browser. Please use Chrome or Edge.'
                    : 'Printer disconnected. Click pair to connect USB cable.'}
              </Text>

              <View className="mt-3 flex-row items-center space-x-2">
                {connectionStatus === 'CONNECTED' ? (
                  <Pressable
                    onPress={disconnectDevice}
                    className="flex-1 py-2 rounded-xl bg-stone-800 items-center justify-center active:bg-stone-700"
                  >
                    <Text className="text-xs font-bold text-stone-300">Disconnect</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleConnect}
                    disabled={!isSupported || connectionStatus === 'CONNECTING'}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 items-center justify-center active:bg-amber-600 disabled:opacity-50"
                  >
                    <Text className="text-xs font-extrabold text-stone-950">
                      Pair / Connect USB Printer
                    </Text>
                  </Pressable>
                )}

                <View className="w-32">
                  <PosDropdown
                    options={BAUD_RATE_OPTIONS}
                    value={String(baudRate)}
                    onChange={(rate) => setBaudRate(Number(rate))}
                    sheetTitle="Baud Rate"
                    className="h-[36px]"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Card 2: Cash Drawer Status */}
          <View className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
            <View className="flex-row items-center justify-between pb-3 border-b border-stone-800/80">
              <View className="flex-row items-center space-x-2">
                <Coins size={18} color="#f59e0b" />
                <Text className="text-sm font-bold text-stone-300 uppercase tracking-wider">
                  Cash Drawer (RJ11/12)
                </Text>
              </View>
              {drawerStatus === 'KICKING' ? (
                <View className="flex-row items-center rounded-full bg-amber-500/20 border border-amber-500 px-2.5 py-0.5 animate-pulse">
                  <Zap size={12} color="#f59e0b" />
                  <Text className="ml-1 text-xs font-bold text-amber-400">PULSING</Text>
                </View>
              ) : (
                <View className="flex-row items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5">
                  <CheckCircle2 size={12} color="#10b981" />
                  <Text className="ml-1 text-xs font-bold text-emerald-400">READY</Text>
                </View>
              )}
            </View>

            <View className="mt-3">
              <Text className="text-xs text-stone-400">
                Connected to Printer DK Port (ESC p 0 25 250). Auto-kicks on Cash settlement &amp;
                manual till operations.
              </Text>

              <View className="mt-3">
                <Pressable
                  onPress={handleTestKick}
                  disabled={isTestingDrawer || connectionStatus !== 'CONNECTED'}
                  className="py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 items-center justify-center active:bg-amber-500/20 disabled:opacity-40"
                >
                  <Text className="text-xs font-bold text-amber-400">
                    {isTestingDrawer ? 'Firing Solenoid...' : '⚡ Test Kick Cash Drawer'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Card 3: Automation & Audio Engine */}
          <View className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
            <View className="flex-row items-center justify-between pb-3 border-b border-stone-800/80">
              <View className="flex-row items-center space-x-2">
                <Radio size={18} color="#38bdf8" />
                <Text className="text-sm font-bold text-stone-300 uppercase tracking-wider">
                  Automation &amp; Sound
                </Text>
              </View>
              <View className="flex-row items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5">
                <View className="h-2 w-2 rounded-full bg-emerald-500" />
                <Text className="ml-1.5 text-xs font-bold text-emerald-400">CDC SYNCED</Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between gap-2">
              <Pressable
                onPress={toggleAutoPrint}
                className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl border ${
                  autoPrintEnabled
                    ? 'border-emerald-600/40 bg-emerald-950/40 text-emerald-400'
                    : 'border-stone-800 bg-stone-900 text-stone-400'
                }`}
              >
                {autoPrintEnabled ? (
                  <CheckCircle2 size={14} color="#10b981" />
                ) : (
                  <Clock size={14} color="#78716c" />
                )}
                <Text
                  className={`ml-1.5 text-xs font-bold ${
                    autoPrintEnabled ? 'text-emerald-400' : 'text-stone-400'
                  }`}
                >
                  Auto-Print: {autoPrintEnabled ? 'ON' : 'OFF'}
                </Text>
              </Pressable>

              <Pressable
                onPress={toggleChime}
                className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl border ${
                  chimeEnabled
                    ? 'border-sky-600/40 bg-sky-950/40 text-sky-400'
                    : 'border-stone-800 bg-stone-900 text-stone-400'
                }`}
              >
                {chimeEnabled ? (
                  <Volume2 size={14} color="#38bdf8" />
                ) : (
                  <VolumeX size={14} color="#78716c" />
                )}
                <Text
                  className={`ml-1.5 text-xs font-bold ${
                    chimeEnabled ? 'text-sky-400' : 'text-stone-400'
                  }`}
                >
                  Chime: {chimeEnabled ? 'ON' : 'MUTED'}
                </Text>
              </Pressable>
            </View>

            <View className="mt-2.5">
              <Pressable
                onPress={handleTestPrint}
                disabled={isTestingChit || connectionStatus !== 'CONNECTED'}
                className="py-2 rounded-xl bg-stone-800 items-center justify-center active:bg-stone-700 disabled:opacity-40"
              >
                <Text className="text-xs font-bold text-stone-300">
                  {isTestingChit ? 'Printing...' : 'Print Sample Runner Chit'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* 3. Section Bar & Filter Tabs */}
      <View className="px-4 sm:px-6 py-3 flex-row flex-wrap items-center justify-between border-b border-stone-800 gap-3">
        <View className="flex-row items-center space-x-2">
          <Pressable
            onPress={() => setActiveTab('jobs')}
            className={`flex-row items-center px-4 py-2 rounded-xl ${
              activeTab === 'jobs'
                ? 'bg-amber-500 text-stone-950'
                : 'bg-stone-800/80 text-stone-400'
            }`}
          >
            <FileText size={16} color={activeTab === 'jobs' ? '#0c0a09' : '#a8a29e'} />
            <Text
              className={`ml-2 text-sm font-bold ${
                activeTab === 'jobs' ? 'text-stone-950' : 'text-stone-300'
              }`}
            >
              Print Queue ({recentJobs.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('logs')}
            className={`flex-row items-center px-4 py-2 rounded-xl ${
              activeTab === 'logs'
                ? 'bg-amber-500 text-stone-950'
                : 'bg-stone-800/80 text-stone-400'
            }`}
          >
            <Terminal size={16} color={activeTab === 'logs' ? '#0c0a09' : '#a8a29e'} />
            <Text
              className={`ml-2 text-sm font-bold ${
                activeTab === 'logs' ? 'text-stone-950' : 'text-stone-300'
              }`}
            >
              Hardware Logs ({stationLogs.length})
            </Text>
          </Pressable>
        </View>

        {activeTab === 'jobs' && (
          <View className="w-full sm:w-64">
            <PosDropdown
              options={filterOptions}
              value={filter}
              onChange={(val) => setFilter(val)}
              sheetTitle="Filter Jobs"
              className="h-[40px]"
            />
          </View>
        )}
      </View>

      {/* 4. Tab Body Content */}
      <View className="flex-1 p-4 sm:p-6">
        {activeTab === 'jobs' ? (
          filteredJobs.length === 0 ? (
            <View className="flex-1 items-center justify-center rounded-2xl border border-dashed border-stone-800 bg-stone-950/40 p-8">
              <Printer size={48} color="#57534e" />
              <Text className="mt-4 text-lg font-bold text-stone-400">No print jobs in queue</Text>
              <Text className="mt-1 text-center text-sm text-stone-500">
                Dispatched orders from floor tablets and settled cash receipts will appear here in
                real-time.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredJobs}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => {
                const data = item.receipt_data || {};
                const isReceipt =
                  item.job_type === 'CUSTOMER_RECEIPT' || item.job_type === 'RECEIPT';
                const isRunner = item.job_type === 'RUNNER_CHIT';
                const paymentMethod = (
                  data.paymentMethod ||
                  data.payment_method ||
                  'CASH'
                ).toUpperCase();
                const isCash = paymentMethod === 'CASH';

                const title = isRunner
                  ? `Runner Chit #${data.orderNumber || ''} (Table ${data.tableNumber || 'Walk-in'})`
                  : isReceipt
                    ? `Receipt #${data.receiptNumber || ''} (${data.tabName || data.customerName || 'Guest'})`
                    : `${item.job_type} - ${data.customerName || 'Ticket'}`;

                return (
                  <View className="mb-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center space-x-2.5">
                        <View className="p-2 rounded-xl bg-stone-900 border border-stone-800">
                          {isReceipt ? (
                            <Coins size={18} color="#f59e0b" />
                          ) : isRunner ? (
                            <FileText size={18} color="#38bdf8" />
                          ) : (
                            <Sliders size={18} color="#a8a29e" />
                          )}
                        </View>
                        <View>
                          <Text className="text-base font-bold text-white">{title}</Text>
                          <Text className="text-xs text-stone-400">
                            {new Date(item.created_at).toLocaleTimeString()} • Type:{' '}
                            <Text className="font-semibold text-stone-300">{item.job_type}</Text>
                          </Text>
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View>
                        {item.status === 'COMPLETED' ? (
                          <View className="flex-row items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1">
                            <CheckCircle2 size={14} color="#10b981" />
                            <Text className="ml-1 text-xs font-bold text-emerald-400">PRINTED</Text>
                          </View>
                        ) : item.status === 'PRINTING' ? (
                          <View className="flex-row items-center rounded-full bg-sky-500/10 border border-sky-500/30 px-2.5 py-1">
                            <ActivityIndicator size="small" color="#38bdf8" />
                            <Text className="ml-1 text-xs font-bold text-sky-400">PRINTING</Text>
                          </View>
                        ) : item.status === 'FAILED' ? (
                          <View className="flex-row items-center rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-1">
                            <AlertCircle size={14} color="#f43f5e" />
                            <Text className="ml-1 text-xs font-bold text-rose-400">FAILED</Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1">
                            <Clock size={14} color="#f59e0b" />
                            <Text className="ml-1 text-xs font-bold text-amber-400">QUEUED</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Metadata & Items Preview */}
                    <View className="mt-3 flex-row flex-wrap items-center gap-3 border-t border-stone-800/80 pt-3 text-xs text-stone-400">
                      {isReceipt && (
                        <View className="flex-row items-center">
                          <Text className="text-stone-500 mr-1.5">Payment:</Text>
                          <View
                            className={`rounded-md px-2 py-0.5 border ${
                              isCash
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-stone-800 border-stone-700 text-stone-300'
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                isCash ? 'text-amber-400' : 'text-stone-300'
                              }`}
                            >
                              {data.paymentChannel
                                ? `${data.paymentChannel} QR`
                                : data.paymentMethod || 'CASH'}
                              {isCash ? ' (DRAWER KICK)' : ''}
                            </Text>
                          </View>
                        </View>
                      )}

                      {data.total && (
                        <Text className="text-xs text-stone-300">
                          Total:{' '}
                          <Text className="font-bold text-white">
                            ₱{(data.total / 100).toFixed(2)}
                          </Text>
                        </Text>
                      )}

                      {data.items && data.items.length > 0 && (
                        <Text className="text-xs text-stone-400">
                          {data.items.length} items (
                          {data.items
                            .slice(0, 2)
                            .map((i: any) => `${i.quantity}x ${i.name}`)
                            .join(', ')}
                          {data.items.length > 2 ? '...' : ''})
                        </Text>
                      )}

                      <View className="ml-auto">
                        <Pressable
                          onPress={() => handleReprint(item)}
                          disabled={reprintingId === item.id}
                          className="flex-row items-center rounded-xl bg-stone-800 px-3 py-1.5 active:bg-stone-700"
                        >
                          <RotateCw size={13} color="#d6d3d1" />
                          <Text className="ml-1.5 text-xs font-semibold text-stone-300">
                            {reprintingId === item.id ? 'Queuing...' : 'Reprint'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          )
        ) : (
          /* Logs Terminal Console */
          <View className="flex-1 rounded-2xl border border-stone-800 bg-stone-950 p-4 font-mono">
            <View className="flex-row items-center justify-between pb-3 border-b border-stone-800">
              <View className="flex-row items-center space-x-2">
                <Terminal size={16} color="#10b981" />
                <Text className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Live Hardware Execution Stream
                </Text>
              </View>
              <Text className="text-xs text-stone-500">Auto-scrolling</Text>
            </View>

            <ScrollView className="flex-1 mt-3">
              {stationLogs.length === 0 ? (
                <Text className="text-xs text-stone-600 italic">No logs recorded yet...</Text>
              ) : (
                stationLogs.map((log) => (
                  <View key={log.id} className="py-1 flex-row items-start space-x-2">
                    <Text className="text-xs text-stone-500">[{log.timestamp}]</Text>
                    <Text
                      className={`text-xs font-mono flex-1 ${
                        log.level === 'error'
                          ? 'text-rose-400 font-bold'
                          : log.level === 'warn'
                            ? 'text-amber-400'
                            : log.level === 'success'
                              ? 'text-emerald-400'
                              : 'text-stone-300'
                      }`}
                    >
                      {log.message}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
};
