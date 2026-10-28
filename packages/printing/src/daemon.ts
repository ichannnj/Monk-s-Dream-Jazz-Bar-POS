import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UsbEscPosPrinter,
  MockPrinter,
  type IPrinterService,
  type CustomerReceiptPayload,
  type RunnerChitPayload,
  type TakeoutSlipPayload,
  type DeliveryTagPayload,
} from './index.js';

export interface PrinterDaemonConfig {
  supabaseUrl: string;
  supabaseKey: string;
  devicePath?: string;
  columns?: number;
  useMock?: boolean;
}

export interface PrintJobRecord {
  id: string;
  job_type: string;
  receipt_data: any;
  status: 'PENDING' | 'PRINTING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  printed_at: string | null;
}

export class PrinterStationDaemon {
  private readonly client: SupabaseClient;
  private readonly printer: IPrinterService;
  private isRunning: boolean = false;
  private channel: any = null;

  constructor(config: PrinterDaemonConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseKey);
    this.printer = config.useMock
      ? new MockPrinter()
      : new UsbEscPosPrinter(config.devicePath || '/dev/usb/receipt-printer', config.columns || 48);
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Process any pending jobs created while the daemon was offline
    await this.processPendingQueue();

    // 2. Subscribe to Supabase Realtime CDC for new incoming jobs
    this.channel = this.client
      .channel('printer_station_cdc')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'print_jobs',
          filter: 'status=eq.PENDING',
        },
        async (payload) => {
          await this.processJob(payload.new as PrintJobRecord);
        }
      )
      .subscribe((status) => {
        console.log(`[PrinterStationDaemon] CDC subscription status: ${status}`);
      });
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.channel) {
      await this.client.removeChannel(this.channel);
      this.channel = null;
    }
  }

  public async processPendingQueue(): Promise<void> {
    const { data: jobs, error } = await this.client
      .from('print_jobs')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true });

    if (error || !jobs) {
      console.error('[PrinterStationDaemon] Failed to fetch pending jobs:', error);
      return;
    }

    for (const job of jobs) {
      await this.processJob(job as PrintJobRecord);
    }
  }

  public async processJob(job: PrintJobRecord): Promise<boolean> {
    try {
      // Mark as PRINTING
      await this.client.from('print_jobs').update({ status: 'PRINTING' }).eq('id', job.id);

      const jobType = (job.job_type || '').toUpperCase();
      const rawData = job.receipt_data || {};

      switch (jobType) {
        case 'RUNNER_CHIT': {
          const chitPayload: RunnerChitPayload = {
            orderNumber: rawData.orderNumber || rawData.orderId?.slice(0, 8) || 'N/A',
            tableNumber: rawData.tableNumber,
            tabName: rawData.tabName,
            roundNumber: rawData.roundNumber,
            waiterName: rawData.waiterName,
            timestamp: rawData.timestamp || new Date().toISOString(),
            items: rawData.items || [],
          };
          await this.printer.printRunnerChit(chitPayload);
          break;
        }

        case 'CUSTOMER_RECEIPT':
        case 'RECEIPT': {
          const receiptPayload: CustomerReceiptPayload = {
            receiptNumber: rawData.receiptNumber || rawData.paymentId?.slice(0, 8) || 'REC-001',
            tableNumber: rawData.tableNumber,
            tabName: rawData.tabName || rawData.customerName,
            waiterName: rawData.waiterName,
            items: rawData.items || [],
            subtotal: rawData.subtotal || rawData.amount || 0,
            corkageFee: rawData.corkageAmount || rawData.corkageFee || 0,
            discount: rawData.discountAmount || rawData.discount || 0,
            total: rawData.total || rawData.amount || 0,
            tendered: rawData.tendered || rawData.amount || 0,
            change: rawData.change || 0,
            paymentMethod: rawData.paymentMethod || 'CASH',
            timestamp: rawData.settledAt || rawData.timestamp || new Date().toISOString(),
          };

          await this.printer.printReceipt(receiptPayload);

          // Auto-kick cash drawer on CASH payment
          if (receiptPayload.paymentMethod.toUpperCase() === 'CASH') {
            await this.printer.kickCashDrawer();
          }
          break;
        }

        case 'TAKEOUT_SLIP': {
          const takeoutPayload: TakeoutSlipPayload = {
            orderNumber: rawData.orderNumber || 'T-001',
            customerName: rawData.customerName || 'Guest',
            items: rawData.items || [],
            timestamp: rawData.timestamp || new Date().toISOString(),
            isPrepaid: rawData.isPrepaid,
            notes: rawData.notes,
          };
          await this.printer.printTakeoutSlip(takeoutPayload);
          break;
        }

        case 'DELIVERY_TAG': {
          const deliveryPayload: DeliveryTagPayload = {
            platform: rawData.platform || 'DELIVERY',
            platformReference: rawData.platformReference || 'REF-001',
            customerName: rawData.customerName || 'Customer',
            riderName: rawData.riderName,
            itemCount: rawData.itemCount || rawData.items?.length || 1,
            items: rawData.items,
            address: rawData.address,
            timestamp: rawData.timestamp || new Date().toISOString(),
          };
          await this.printer.printDeliveryTag(deliveryPayload);
          break;
        }

        default:
          throw new Error(`Unsupported print job type: ${job.job_type}`);
      }

      // Mark COMPLETED
      await this.client
        .from('print_jobs')
        .update({
          status: 'COMPLETED',
          printed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      return true;
    } catch (err: any) {
      console.error(`[PrinterStationDaemon] Error printing job ${job.id}:`, err);
      await this.client
        .from('print_jobs')
        .update({
          status: 'FAILED',
        })
        .eq('id', job.id);
      return false;
    }
  }
}
