import { create } from 'zustand';
import { supabase } from '@/features/shared/infrastructure/supabase';
import { toast } from '@/features/shared/toast/useToastStore';
import { printerApi, type PrintJobItem } from '../data/printer.api';
import { webSerialPrinter, type SerialPortInfo } from '../services/webSerialPrinter';
import {
  buildReceiptBytes,
  buildRunnerChitBytes,
  buildTakeoutSlipBytes,
  buildDeliveryTagBytes,
  buildReadingSlipBytes,
  buildCashDrawerKickBytes,
} from '../services/escposBuilder';

export type StationConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
export type DrawerStatus = 'IDLE' | 'KICKING';

export interface StationLogItem {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

interface PrinterStationState {
  isSupported: boolean;
  connectionStatus: StationConnectionStatus;
  drawerStatus: DrawerStatus;
  isLeader: boolean;
  baudRate: number;
  autoPrintEnabled: boolean;
  chimeEnabled: boolean;
  portInfo: SerialPortInfo | null;
  recentJobs: PrintJobItem[];
  stationLogs: StationLogItem[];
  isProcessing: boolean;

  // Actions
  initStation: () => () => void;
  connectDevice: () => Promise<boolean>;
  disconnectDevice: () => Promise<void>;
  toggleAutoPrint: () => void;
  toggleChime: () => void;
  setBaudRate: (rate: number) => void;
  processJob: (job: PrintJobItem) => Promise<boolean>;
  reprintJob: (job: PrintJobItem) => Promise<void>;
  testPrintChit: () => Promise<void>;
  testKickDrawer: () => Promise<void>;
  addLog: (level: StationLogItem['level'], message: string) => void;
  playOrderChime: () => void;
}

// Simple Web Audio API Synthesizer for POS notification chimes
function playChimeSound() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Dual-tone chime: High bell (1318.5 Hz - E6) + Mid bell (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.12);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.6);
  } catch (err) {
    console.warn('[PrinterStationStore] Web Audio chime error:', err);
  }
}

export const usePrinterStationStore = create<PrinterStationState>((set, get) => ({
  isSupported: typeof navigator !== 'undefined' && 'serial' in navigator,
  connectionStatus: 'DISCONNECTED',
  drawerStatus: 'IDLE',
  isLeader: false,
  baudRate: 9600,
  autoPrintEnabled: true,
  chimeEnabled: true,
  portInfo: null,
  recentJobs: [],
  stationLogs: [],
  isProcessing: false,

  addLog: (level, message) => {
    const newLog: StationLogItem = {
      id: Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };
    set((state) => ({
      stationLogs: [newLog, ...state.stationLogs.slice(0, 49)],
    }));
  },

  playOrderChime: () => {
    if (get().chimeEnabled) {
      playChimeSound();
    }
  },

  toggleAutoPrint: () => {
    set((state) => ({ autoPrintEnabled: !state.autoPrintEnabled }));
  },

  toggleChime: () => {
    set((state) => ({ chimeEnabled: !state.chimeEnabled }));
  },

  setBaudRate: (rate: number) => {
    set({ baudRate: rate });
  },

  connectDevice: async () => {
    set({ connectionStatus: 'CONNECTING' });
    try {
      await webSerialPrinter.requestAndConnect(get().baudRate);
      const portInfo = webSerialPrinter.getPortInfo();
      set({ connectionStatus: 'CONNECTED', portInfo });
      get().addLog('success', 'USB Thermal Printer connected successfully');
      toast.success('Thermal printer paired and online', { title: 'Hardware Connected' });
      return true;
    } catch (err: any) {
      set({ connectionStatus: 'ERROR' });
      get().addLog('error', `Connection failed: ${err.message || 'Access denied'}`);
      toast.error(err.message || 'Failed to connect to printer', { title: 'Connection Error' });
      return false;
    }
  },

  disconnectDevice: async () => {
    await webSerialPrinter.disconnect();
    set({ connectionStatus: 'DISCONNECTED', portInfo: null });
    get().addLog('info', 'Printer disconnected');
    toast.info('Printer disconnected', { title: 'Hardware Disconnected' });
  },

  processJob: async (job: PrintJobItem) => {
    const { isLeader, autoPrintEnabled, connectionStatus, addLog, playOrderChime } = get();

    // If auto-print is disabled or this tab is not the leader lock holder, do not write
    if (!autoPrintEnabled || !isLeader) {
      return false;
    }

    // Try to atomically claim the job in the database
    const claimed = await printerApi.claimJob(job.id);
    if (!claimed) {
      // Another station or daemon already claimed it
      return false;
    }

    set({ isProcessing: true });
    addLog('info', `Claimed print job ${job.id.slice(0, 8)} (${job.job_type})`);

    try {
      const jobType = (job.job_type || '').toUpperCase();
      const rawData = job.receipt_data || {};
      let bytes: Uint8Array | null = null;
      let isCashSettlement = false;

      switch (jobType) {
        case 'CUSTOMER_RECEIPT':
        case 'RECEIPT': {
          const method = (rawData.paymentMethod || rawData.payment_method || 'CASH').toUpperCase();
          // Cash drawer kicks on Cash payment or diagnostic test
          isCashSettlement = method === 'CASH' || Boolean(rawData.isDiagnosticKick);
          bytes = buildReceiptBytes(rawData, isCashSettlement);
          break;
        }

        case 'RUNNER_CHIT':
          bytes = buildRunnerChitBytes(rawData);
          break;

        case 'TAKEOUT_SLIP':
          bytes = buildTakeoutSlipBytes(rawData);
          break;

        case 'DELIVERY_TAG':
          bytes = buildDeliveryTagBytes(rawData);
          break;

        case 'X_READING':
        case 'Y_READING':
        case 'Z_READING':
          bytes = buildReadingSlipBytes(rawData);
          break;

        default:
          addLog('warn', `Unknown print job type: ${job.job_type}`);
          await printerApi.markJobFailed(job.id);
          set({ isProcessing: false });
          return false;
      }

      // If physical printer is connected, write binary stream
      if (connectionStatus === 'CONNECTED' && bytes) {
        await webSerialPrinter.writeBytes(bytes);

        if (isCashSettlement) {
          set({ drawerStatus: 'KICKING' });
          setTimeout(() => set({ drawerStatus: 'IDLE' }), 1200);
          addLog('success', '⚡ Cash drawer solenoid pulsed (Pin 2 kick)');
        }

        playOrderChime();
        await printerApi.markJobCompleted(job.id);
        addLog('success', `Printed ticket for ${jobType}`);
      } else {
        // Printer not paired yet: log warning and leave in queue or alert
        addLog(
          'warn',
          `Printer offline: Queued ticket ${job.id.slice(0, 8)} waiting for connection`
        );
      }

      set({ isProcessing: false });
      return true;
    } catch (err: any) {
      console.error('[PrinterStationStore] Error printing job:', err);
      addLog('error', `Print failure: ${err.message || 'Hardware error'}`);
      await printerApi.markJobFailed(job.id);
      set({ isProcessing: false });
      return false;
    }
  },

  reprintJob: async (job: PrintJobItem) => {
    try {
      await printerApi.reprintJob(job);
      toast.success(`Reprint job enqueued for ${job.job_type}`, { title: 'Reprint Queued' });
      get().addLog('info', `Reprint requested for job ${job.id.slice(0, 8)}`);
    } catch (err: any) {
      toast.error('Failed to trigger reprint', { title: 'Reprint Error' });
    }
  },

  testPrintChit: async () => {
    const { connectionStatus, addLog } = get();
    if (connectionStatus !== 'CONNECTED') {
      toast.error('Connect your USB thermal printer first', { title: 'Printer Disconnected' });
      return;
    }

    try {
      const sampleChit = {
        orderNumber: 'TEST-01',
        roundNumber: 1,
        tableNumber: 4,
        tabName: 'Miles Davis',
        waiterName: 'Sarah K.',
        timestamp: new Date().toLocaleTimeString(),
        items: [
          {
            name: 'Monks Old Fashioned',
            quantity: 2,
            station: 'BAR',
            notes: 'Extra orange bitters',
          },
          { name: 'Truffle Mushroom Pasta', quantity: 1, station: 'KITCHEN' },
        ],
      };
      const bytes = buildRunnerChitBytes(sampleChit);
      await webSerialPrinter.writeBytes(bytes);
      get().playOrderChime();
      addLog('success', 'Printed sample test runner chit');
      toast.success('Sample runner chit printed', { title: 'Hardware Test' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to print test ticket', { title: 'Print Error' });
      addLog('error', `Test print failed: ${err.message}`);
    }
  },

  testKickDrawer: async () => {
    const { connectionStatus, addLog } = get();
    if (connectionStatus !== 'CONNECTED') {
      toast.error('Connect your USB thermal printer first', { title: 'Printer Disconnected' });
      return;
    }

    try {
      set({ drawerStatus: 'KICKING' });
      const kickBytes = buildCashDrawerKickBytes();
      await webSerialPrinter.writeBytes(kickBytes);
      setTimeout(() => set({ drawerStatus: 'IDLE' }), 1200);
      addLog('success', '⚡ Test cash drawer kick signal sent (ESC p 0 25 250)');
      toast.success('Cash drawer kick pulse sent', { title: 'Drawer Test' });
    } catch (err: any) {
      set({ drawerStatus: 'IDLE' });
      toast.error(err.message || 'Failed to kick drawer', { title: 'Hardware Error' });
      addLog('error', `Drawer kick failed: ${err.message}`);
    }
  },

  initStation: () => {
    const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator;
    set({ isSupported });

    let activeLockRelease: (() => void) | null = null;
    const abortController = new AbortController();

    // 1. Web Locks API Leader Election: ensure only ONE active tab drives the printer
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      navigator.locks
        .request('monks_pos_printer_station', { signal: abortController.signal }, async () => {
          set({ isLeader: true });
          get().addLog('info', '👑 Station acquired Leader Lock: Primary Print Station active');

          // Attempt silent auto-reconnect to remembered serial port
          const connected = await webSerialPrinter.autoConnect(get().baudRate);
          if (connected) {
            set({ connectionStatus: 'CONNECTED', portInfo: webSerialPrinter.getPortInfo() });
            get().addLog('success', 'Automatically reconnected to authorized thermal printer');
          }

          // Return a hanging Promise that keeps the lock active until unmounted
          await new Promise<void>((resolve) => {
            activeLockRelease = resolve;
          });
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn('[PrinterStationStore] Leader lock error:', err);
          }
        });
    } else {
      // Fallback for browsers without Web Locks API
      set({ isLeader: true });
      webSerialPrinter.autoConnect(get().baudRate).then((connected) => {
        if (connected) {
          set({ connectionStatus: 'CONNECTED', portInfo: webSerialPrinter.getPortInfo() });
        }
      });
    }

    // 2. Fetch initial recent jobs
    printerApi
      .getRecentPrintJobs(50)
      .then((jobs) => {
        set({ recentJobs: jobs });
        // Process any pending jobs if leader
        printerApi.getPendingPrintJobs().then((pending) => {
          for (const job of pending) {
            get().processJob(job);
          }
        });
      })
      .catch((err) => {
        console.warn('[PrinterStationStore] Initial jobs fetch error:', err);
      });

    // 3. Supabase Realtime CDC subscription on print_jobs
    const channel = supabase
      .channel('monks_hardware_print_station')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'print_jobs' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newJob = payload.new as PrintJobItem;
          set((state) => ({ recentJobs: [newJob, ...state.recentJobs] }));
          if (newJob.status === 'PENDING') {
            get().processJob(newJob);
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedJob = payload.new as PrintJobItem;
          set((state) => ({
            recentJobs: state.recentJobs.map((item) =>
              item.id === updatedJob.id ? updatedJob : item
            ),
          }));
          if (updatedJob.status === 'PENDING') {
            get().processJob(updatedJob);
          }
        }
      })
      .subscribe();

    get().addLog('info', 'Listening to live store orders and payment settlements');

    // Return cleanup function
    return () => {
      abortController.abort();
      if (activeLockRelease) {
        activeLockRelease();
      }
      supabase.removeChannel(channel);
    };
  },
}));
