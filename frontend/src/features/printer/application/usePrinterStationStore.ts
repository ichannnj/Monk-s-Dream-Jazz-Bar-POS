import { create } from 'zustand';
import { supabase } from '@/features/shared/infrastructure/supabase';
import { toast } from '@/features/shared/toast/useToastStore';
import { printerApi, type PrintJobItem } from '../data/printer.api';
import {
  webSerialPrinter,
  type SerialPortInfo,
  type BoundPrinterDevice,
} from '../services/webSerialPrinter';
import {
  buildReceiptBytes,
  buildBillStatementBytes,
  buildRunnerChitBytes,
  buildTakeoutSlipBytes,
  buildDeliveryTagBytes,
  buildReadingSlipBytes,
  buildCashDrawerKickBytes,
} from '../services/escposBuilder';

export type StationConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
export type DrawerStatus = 'IDLE' | 'KICKING';
export type ThermalPaperWidth = '80mm' | '57mm';
export type PrinterTransportMode = 'auto' | 'usb' | 'serial';

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
  paperWidth: ThermalPaperWidth;
  preferredTransport: PrinterTransportMode;
  autoPrintEnabled: boolean;
  chimeEnabled: boolean;
  portInfo: SerialPortInfo | null;
  boundDevice: BoundPrinterDevice | null;
  recentJobs: PrintJobItem[];
  stationLogs: StationLogItem[];
  isProcessing: boolean;

  // Actions
  initStation: () => () => void;
  connectDevice: (transportOverride?: PrinterTransportMode) => Promise<boolean>;
  disconnectDevice: () => Promise<void>;
  forgetDevice: () => Promise<void>;
  setPreferredTransport: (transport: PrinterTransportMode) => void;
  toggleAutoPrint: () => void;
  toggleChime: () => void;
  setBaudRate: (rate: number) => void;
  setPaperWidth: (width: ThermalPaperWidth) => void;
  processJob: (job: PrintJobItem) => Promise<boolean>;
  reprintJob: (job: PrintJobItem) => Promise<void>;
  testPrintChit: () => Promise<void>;
  testPrintReceipt: () => Promise<void>;
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
  isSupported: typeof navigator !== 'undefined' && ('usb' in navigator || 'serial' in navigator),
  connectionStatus: 'DISCONNECTED',
  drawerStatus: 'IDLE',
  isLeader: false,
  baudRate: 9600,
  paperWidth:
    typeof localStorage !== 'undefined' && localStorage.getItem('monks_pos_paper_width') === '80mm'
      ? '80mm'
      : '57mm',
  preferredTransport:
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('monks_pos_preferred_transport') === 'serial'
      ? 'serial'
      : typeof localStorage !== 'undefined' &&
          localStorage.getItem('monks_pos_preferred_transport') === 'usb'
        ? 'usb'
        : 'auto',
  autoPrintEnabled: true,
  chimeEnabled: true,
  portInfo: null,
  boundDevice: webSerialPrinter.getBoundPrinter(),
  recentJobs: [],
  stationLogs: [],
  isProcessing: false,

  setPreferredTransport: (transport: PrinterTransportMode) => {
    set({ preferredTransport: transport });
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('monks_pos_preferred_transport', transport);
      }
    } catch {
      // Storage unavailable
    }
    get().addLog('info', `Preferred transport set to ${transport.toUpperCase()}`);
  },

  setPaperWidth: (width: ThermalPaperWidth) => {
    set({ paperWidth: width });
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('monks_pos_paper_width', width);
      }
    } catch {
      // LocalStorage quota or access denied in private/iframe browsing
    }
    get().addLog('info', `Paper width set to ${width}`);
  },

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

  connectDevice: async (transportOverride?: PrinterTransportMode) => {
    set({ connectionStatus: 'CONNECTING' });
    const transport = transportOverride || get().preferredTransport;
    try {
      await webSerialPrinter.requestAndConnect(get().baudRate, transport);
      const portInfo = webSerialPrinter.getPortInfo();
      const boundDevice = webSerialPrinter.getBoundPrinter();
      set({ connectionStatus: 'CONNECTED', portInfo, boundDevice });
      const deviceTitle = portInfo?.deviceName
        ? `${portInfo.deviceName}${portInfo.manufacturerName ? ` (${portInfo.manufacturerName})` : ''}`
        : 'USB Thermal Printer';
      get().addLog(
        'success',
        `${deviceTitle} connected successfully [${portInfo?.type?.toUpperCase()}]`
      );
      toast.success(`${deviceTitle} paired and online`, { title: 'Hardware Connected' });

      // Drain any pending jobs queued while disconnected
      printerApi.getPendingPrintJobs().then((pending) => {
        for (const job of pending) {
          get().processJob(job);
        }
      });

      return true;
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.message?.includes('No device selected')) {
        // User deliberately closed or cancelled the device chooser dialog
        set({ connectionStatus: 'DISCONNECTED' });
        get().addLog('info', 'Printer pairing cancelled by user');
        return false;
      }

      set({ connectionStatus: 'ERROR' });
      const errorMsg = err.message || 'Access denied or printer unavailable';
      get().addLog('error', `Connection failed: ${errorMsg}`);
      toast.error(errorMsg, { title: 'Printer Connection Error' });
      return false;
    }
  },

  disconnectDevice: async () => {
    await webSerialPrinter.disconnect();
    set({ connectionStatus: 'DISCONNECTED', portInfo: null });
    get().addLog('info', 'Printer disconnected');
    toast.info('Printer disconnected', { title: 'Hardware Disconnected' });
  },

  forgetDevice: async () => {
    await webSerialPrinter.forgetDevice();
    set({ connectionStatus: 'DISCONNECTED', portInfo: null, boundDevice: null });
    get().addLog('info', 'Printer device binding cleared');
    toast.info('Printer unlinked from station', { title: 'Device Forgotten' });
  },

  processJob: async (job: PrintJobItem) => {
    const { isLeader, autoPrintEnabled, connectionStatus, addLog, playOrderChime } = get();

    // If auto-print is disabled, not leader, or physical printer not connected, leave in queue
    if (!autoPrintEnabled || !isLeader || connectionStatus !== 'CONNECTED') {
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
      const paperWidth = get().paperWidth;
      let bytes: Uint8Array | null = null;
      let isCashSettlement = false;

      switch (jobType) {
        case 'DRAWER_KICK': {
          isCashSettlement = true;
          bytes = buildCashDrawerKickBytes();
          break;
        }

        case 'CUSTOMER_RECEIPT':
        case 'RECEIPT': {
          if (rawData.isDiagnosticKick) {
            // Pure diagnostic kick without printing customer receipt
            isCashSettlement = true;
            bytes = buildCashDrawerKickBytes();
          } else {
            const method = (
              rawData.paymentMethod ||
              rawData.payment_method ||
              'CASH'
            ).toUpperCase();
            const tenders = rawData.tenders || rawData.tenderBreakdown || rawData.tender_breakdown;
            const hasCashTender =
              Array.isArray(tenders) &&
              tenders.some((t: any) => {
                const m = String(
                  t.method || t.payment_method || t.paymentMethod || ''
                ).toLowerCase();
                return m === 'cash' && Number(t.amount || 0) > 0;
              });
            // Cash drawer kicks ONLY on real Cash payment settlement (never on reprint or pure cashless)
            isCashSettlement = (method === 'CASH' || hasCashTender) && !rawData.isReprint;
            bytes = buildReceiptBytes(rawData, isCashSettlement, paperWidth);
          }
          break;
        }

        case 'BILL_STATEMENT':
        case 'BILL': {
          // Pre-payment bill statement: paper slip only, NEVER kicks cash drawer
          isCashSettlement = false;
          bytes = buildBillStatementBytes(rawData, paperWidth);
          break;
        }

        case 'RUNNER_CHIT':
          bytes = buildRunnerChitBytes(rawData, paperWidth);
          break;

        case 'TAKEOUT_SLIP':
          bytes = buildTakeoutSlipBytes(rawData, paperWidth);
          break;

        case 'DELIVERY_TAG':
          bytes = buildDeliveryTagBytes(rawData, paperWidth);
          break;

        case 'X_READING':
        case 'Y_READING':
        case 'Z_READING':
          bytes = buildReadingSlipBytes(rawData, paperWidth);
          break;

        default:
          addLog('warn', `Unknown print job type: ${job.job_type}`);
          await printerApi.markJobFailed(job.id);
          set({ isProcessing: false });
          return false;
      }

      // Physical printer is connected, write binary stream
      if (bytes) {
        await webSerialPrinter.writeBytes(bytes);

        if (isCashSettlement) {
          set({ drawerStatus: 'KICKING' });
          setTimeout(() => set({ drawerStatus: 'IDLE' }), 1200);
          addLog('success', '⚡ Cash drawer solenoid pulsed (Pin 2 kick)');
        }

        playOrderChime();
        await printerApi.markJobCompleted(job.id);
        addLog('success', `Printed ticket for ${jobType}`);
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
      const bytes = buildRunnerChitBytes(sampleChit, get().paperWidth);
      await webSerialPrinter.writeBytes(bytes);
      get().playOrderChime();
      addLog('success', 'Printed sample test runner chit');
      toast.success('Sample runner chit printed', { title: 'Hardware Test' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to print test ticket', { title: 'Print Error' });
      addLog('error', `Test print failed: ${err.message}`);
    }
  },

  testPrintReceipt: async () => {
    const { connectionStatus, addLog } = get();
    if (connectionStatus !== 'CONNECTED') {
      toast.error('Connect your USB thermal printer first', { title: 'Printer Disconnected' });
      return;
    }

    try {
      const sampleReceipt = {
        receiptNumber: 'MD-20261107-TEST',
        operatingMode: 'EVENT',
        settledAt: new Date().toISOString(),
        tableNumber: 4,
        tableLabel: 'Table 4 (Main Lounge)',
        tabName: 'Marcus Miller',
        waiterName: 'Sarah K.',
        items: [
          {
            name: 'Americano (Hot · 12oz)',
            quantity: 2,
            price: 160.0,
            total: 320.0,
            modifiers: ['Extra Espresso Shot (+₱50.00)'],
            notes: 'Oat milk on the side',
          },
          {
            name: "Monk's Old Fashioned",
            quantity: 1,
            price: 480.0,
            total: 480.0,
            notes: '1 large clear rock, luxardo cherry',
          },
          {
            name: 'Truffle Mushroom Fettuccine',
            quantity: 1,
            price: 550.0,
            total: 550.0,
            notes: 'Extra parmesan',
          },
          {
            name: 'Highland Park 12yr (Double)',
            quantity: 1,
            price: 850.0,
            total: 850.0,
            isCorkage: true,
          },
        ],
        subtotal: 2200.0,
        corkageFee: 500.0,
        discount: 250.0,
        serviceCharge: 220.0,
        total: 2670.0,
        paymentMethod: 'GCASH',
        paymentChannel: 'GCash',
        referenceNumber: '8492',
        tendered: 2670.0,
        change: 0,
        vatableSales: 1964.29,
        vatAmount: 235.71,
        vatExemptSales: 0,
      };

      const bytes = buildReceiptBytes(sampleReceipt, false, get().paperWidth);
      await webSerialPrinter.writeBytes(bytes);
      get().playOrderChime();
      addLog('success', 'Printed sample business customer receipt');
      toast.success('Sample customer receipt printed', { title: 'Hardware Test' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to print test receipt', { title: 'Print Error' });
      addLog('error', `Test receipt print failed: ${err.message}`);
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
    const isSupported =
      typeof navigator !== 'undefined' && ('usb' in navigator || 'serial' in navigator);
    set({ isSupported });

    let activeLockRelease: (() => void) | null = null;
    const abortController = new AbortController();

    // Register hotplug watchdog callbacks
    webSerialPrinter.setHotplugCallbacks({
      onDisconnect: () => {
        set({ connectionStatus: 'DISCONNECTED', portInfo: null });
        get().addLog('warn', 'Thermal printer was disconnected or powered off');
      },
      onConnect: () => {
        const portInfo = webSerialPrinter.getPortInfo();
        const boundDevice = webSerialPrinter.getBoundPrinter();
        set({ connectionStatus: 'CONNECTED', portInfo, boundDevice });
        get().addLog('success', 'Thermal printer reconnected via hotplug watchdog');
        if (get().isLeader) {
          printerApi.getPendingPrintJobs().then((pending) => {
            for (const job of pending) {
              get().processJob(job);
            }
          });
        }
      },
    });

    // 1. Web Locks API Leader Election: ensure only ONE active tab drives the printer
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      navigator.locks
        .request('monks_pos_printer_station', { signal: abortController.signal }, async () => {
          set({ isLeader: true });
          get().addLog('info', '👑 Station acquired Leader Lock: Primary Print Station active');

          // Attempt silent auto-reconnect to remembered serial port
          const connected = await webSerialPrinter.autoConnect(get().baudRate);
          if (connected) {
            set({
              connectionStatus: 'CONNECTED',
              portInfo: webSerialPrinter.getPortInfo(),
              boundDevice: webSerialPrinter.getBoundPrinter(),
            });
            get().addLog('success', 'Automatically reconnected to authorized thermal printer');
            printerApi.getPendingPrintJobs().then((pending) => {
              for (const job of pending) {
                get().processJob(job);
              }
            });
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
          set({
            connectionStatus: 'CONNECTED',
            portInfo: webSerialPrinter.getPortInfo(),
            boundDevice: webSerialPrinter.getBoundPrinter(),
          });
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
    const channelName = `monks_hardware_print_station_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
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
