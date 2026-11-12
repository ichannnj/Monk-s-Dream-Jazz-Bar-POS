import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UsbEscPosPrinter,
  MockPrinter,
  type IPrinterService,
  type CustomerReceiptPayload,
  type BillStatementPayload,
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
      // Optimistically claim job
      const { data: claimData, error: claimErr } = await this.client
        .from('print_jobs')
        .update({ status: 'PRINTING' })
        .eq('id', job.id)
        .eq('status', 'PENDING')
        .select('id');

      if (claimErr || !claimData || claimData.length === 0) {
        return false;
      }

      const jobType = (job.job_type || '').toUpperCase();
      const rawData = job.receipt_data || {};

      switch (jobType) {
        case 'DRAWER_KICK': {
          await this.printer.kickCashDrawer();
          break;
        }

        case 'RUNNER_CHIT': {
          const chitPayload: RunnerChitPayload = {
            orderNumber: rawData.orderNumber || rawData.orderId?.slice(0, 8) || 'N/A',
            tableNumber: rawData.tableNumber,
            tableLabel: rawData.tableLabel,
            tabName: rawData.tabName,
            roundNumber: rawData.roundNumber,
            waiterName: rawData.waiterName || rawData.staffName || rawData.staff_name,
            timestamp: rawData.timestamp || new Date().toISOString(),
            items: rawData.items || [],
            isReprint: Boolean(rawData.isReprint),
          };
          await this.printer.printRunnerChit(chitPayload);
          break;
        }

        case 'CUSTOMER_RECEIPT':
        case 'RECEIPT': {
          if (rawData.isDiagnosticKick) {
            await this.printer.kickCashDrawer();
            break;
          }

          const receiptPayload: CustomerReceiptPayload = {
            receiptNumber: rawData.receiptNumber || rawData.paymentId?.slice(0, 8) || 'REC-001',
            tableNumber: rawData.tableNumber,
            tableLabel: rawData.tableLabel,
            tabName: rawData.tabName || rawData.customerName || rawData.guestName,
            waiterName:
              rawData.waiterName || rawData.cashierName || rawData.staffName || rawData.staff_name,
            cashierName:
              rawData.cashierName || rawData.waiterName || rawData.staffName || rawData.staff_name,
            operatingMode: rawData.operatingMode || rawData.operating_mode || 'CAFE',
            items: rawData.items || [],
            subtotal: rawData.subtotal || rawData.amount || 0,
            corkageFee: rawData.corkageAmount || rawData.corkageFee || 0,
            discount: rawData.discountAmount || rawData.discount || 0,
            serviceCharge: rawData.serviceCharge || rawData.service_charge || 0,
            total: rawData.total || rawData.amount || 0,
            tendered: rawData.tendered || rawData.amount || 0,
            change: rawData.change || 0,
            vatableSales: rawData.vatableSales,
            vatAmount: rawData.vatAmount,
            vatExemptSales: rawData.vatExemptSales,
            paymentMethod: rawData.payment_method || rawData.paymentMethod || 'CASH',
            paymentChannel: rawData.payment_channel || rawData.paymentChannel,
            referenceNumber: rawData.reference_number || rawData.referenceNumber,
            timestamp: rawData.settledAt || rawData.timestamp || new Date().toISOString(),
            settledAt: rawData.settledAt,
            isReprint: Boolean(rawData.isReprint),
          };

          await this.printer.printReceipt(receiptPayload);

          // Auto-kick cash drawer on real CASH payment settlement (never on reprint)
          if (receiptPayload.paymentMethod.toUpperCase() === 'CASH' && !receiptPayload.isReprint) {
            await this.printer.kickCashDrawer();
          }
          break;
        }

        case 'BILL_STATEMENT':
        case 'BILL': {
          const billPayload: BillStatementPayload = {
            receiptNumber:
              rawData.receiptNumber || `BILL-${(rawData.tabId || '001').slice(0, 8).toUpperCase()}`,
            tableNumber: rawData.tableNumber,
            tableLabel: rawData.tableLabel,
            tabName: rawData.tabName || rawData.customerName || rawData.guestName,
            waiterName: rawData.waiterName || rawData.serverName || rawData.cashierName,
            serverName: rawData.serverName || rawData.waiterName || rawData.cashierName,
            cashierName: rawData.cashierName || rawData.waiterName,
            operatingMode: rawData.operatingMode || rawData.operating_mode || 'CAFE',
            items: rawData.items || [],
            subtotal: rawData.subtotal || rawData.amount || 0,
            corkageFee: rawData.corkageAmount || rawData.corkageFee || 0,
            discount: rawData.discountAmount || rawData.discount || 0,
            serviceCharge: rawData.serviceCharge || rawData.service_charge || 0,
            total: rawData.total || rawData.amount || 0,
            vatableSales: rawData.vatableSales,
            vatAmount: rawData.vatAmount,
            vatExemptSales: rawData.vatExemptSales,
            timestamp: rawData.timestamp || new Date().toISOString(),
            isReprint: Boolean(rawData.isReprint),
          };

          // Bill Statement prints slip only, NEVER kicks the cash drawer
          await this.printer.printBillStatement(billPayload);
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

        case 'X_READING':
        case 'Y_READING':
        case 'Z_READING': {
          console.log(`[PrinterStationDaemon] PRINT ${jobType} RECEIVED:`, rawData);
          if (
            'printReadingSlip' in this.printer &&
            typeof (this.printer as any).printReadingSlip === 'function'
          ) {
            await (this.printer as any).printReadingSlip(rawData);
          }
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
