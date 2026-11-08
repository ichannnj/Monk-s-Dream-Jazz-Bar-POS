import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, FlatList } from 'react-native';
import { Printer, FileText, Terminal, ShieldCheck, Clock, ExternalLink } from 'lucide-react-native';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { usePrinterStationStore } from '../application/usePrinterStationStore';
import type { PrintJobItem } from '../data/printer.api';
import { HardwareStationTelemetryCards } from './components/HardwareStationTelemetryCards';
import { PrintJobRowCard } from './components/PrintJobRowCard';

type PrintJobFilter = 'ALL' | 'CUSTOMER_RECEIPT' | 'RUNNER_CHIT' | 'TAKEOUT_SLIP' | 'READINGS';

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
    initStation,
    connectDevice,
    disconnectDevice,
    toggleAutoPrint,
    toggleChime,
    setBaudRate,
    reprintJob,
    testPrintChit,
    testPrintReceipt,
    testKickDrawer,
  } = usePrinterStationStore();

  const [filter, setFilter] = useState<PrintJobFilter>('ALL');
  const [activeTab, setActiveTab] = useState<'jobs' | 'logs'>('jobs');
  const [isTestingChit, setIsTestingChit] = useState(false);
  const [isTestingReceipt, setIsTestingReceipt] = useState(false);
  const [isTestingDrawer, setIsTestingDrawer] = useState(false);
  const [reprintingId, setReprintingId] = useState<string | null>(null);

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

  const handleTestPrintReceipt = async () => {
    setIsTestingReceipt(true);
    try {
      await testPrintReceipt();
    } finally {
      setIsTestingReceipt(false);
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
                Dedicated WebUSB Thermal Printer &amp; Cash Drawer Listener
              </Text>
            </View>
          </View>

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
      <HardwareStationTelemetryCards
        connectionStatus={connectionStatus}
        drawerStatus={drawerStatus}
        isSupported={isSupported}
        portInfo={portInfo}
        baudRate={baudRate}
        autoPrintEnabled={autoPrintEnabled}
        chimeEnabled={chimeEnabled}
        isTestingChit={isTestingChit}
        isTestingReceipt={isTestingReceipt}
        isTestingDrawer={isTestingDrawer}
        onConnect={handleConnect}
        onDisconnect={disconnectDevice}
        onSetBaudRate={setBaudRate}
        onToggleAutoPrint={toggleAutoPrint}
        onToggleChime={toggleChime}
        onTestPrintChit={handleTestPrint}
        onTestPrintReceipt={handleTestPrintReceipt}
        onTestKickDrawer={handleTestKick}
      />

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
              renderItem={({ item }) => (
                <PrintJobRowCard
                  item={item}
                  isReprinting={reprintingId === item.id}
                  onReprint={handleReprint}
                />
              )}
            />
          )
        ) : (
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
