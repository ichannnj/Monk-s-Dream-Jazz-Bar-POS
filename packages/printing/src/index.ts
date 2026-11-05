import * as fs from 'node:fs/promises';

function cleanStaffName(name?: string): string {
  if (!name || !name.trim()) return 'Staff';
  const clean = name.trim();
  const parenthesisIndex = clean.indexOf('(');
  if (parenthesisIndex > 0) {
    const namePart = clean.substring(0, parenthesisIndex).trim();
    return namePart.split(' ')[0] || namePart;
  }
  return clean.split(' ')[0] || clean;
}

export interface CustomerReceiptPayload {
  receiptNumber: string;
  tableNumber?: number;
  tabName?: string;
  waiterName?: string;
  items: Array<{
    name: string;
    quantity: number;
    price?: number;
    total: number;
    isCorkage?: boolean;
    notes?: string;
  }>;
  subtotal: number;
  corkageFee?: number;
  discount?: number;
  total: number;
  tendered: number;
  change: number;
  paymentMethod: string;
  paymentChannel?: string;
  referenceNumber?: string;
  timestamp: string;
  isReprint?: boolean;
}

export type PrinterReceiptPayload = CustomerReceiptPayload;

export interface RunnerChitPayload {
  orderNumber: string;
  tableNumber?: number;
  tabName?: string;
  roundNumber?: number;
  waiterName?: string;
  timestamp: string;
  items: Array<{
    name: string;
    quantity: number;
    station?: string;
    notes?: string;
  }>;
  isReprint?: boolean;
}

export interface TakeoutSlipPayload {
  orderNumber: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    notes?: string;
  }>;
  timestamp: string;
  isPrepaid?: boolean;
  notes?: string;
  isReprint?: boolean;
}

export interface DeliveryTagPayload {
  platform: 'GRABFOOD' | 'FOODPANDA' | string;
  platformReference: string;
  customerName: string;
  riderName?: string;
  itemCount: number;
  items?: Array<{
    name: string;
    quantity: number;
    notes?: string;
  }>;
  address?: string;
  timestamp: string;
  isReprint?: boolean;
}

export type ThermalPrintJobPayload =
  | { type: 'RUNNER_CHIT'; data: RunnerChitPayload }
  | { type: 'CUSTOMER_RECEIPT' | 'RECEIPT'; data: CustomerReceiptPayload }
  | { type: 'TAKEOUT_SLIP'; data: TakeoutSlipPayload }
  | { type: 'DELIVERY_TAG'; data: DeliveryTagPayload };

export interface IPrinterService {
  printReceipt(payload: CustomerReceiptPayload): Promise<boolean>;
  printRunnerChit(payload: RunnerChitPayload): Promise<boolean>;
  printTakeoutSlip(payload: TakeoutSlipPayload): Promise<boolean>;
  printDeliveryTag(payload: DeliveryTagPayload): Promise<boolean>;
  printReadingSlip(reading: any): Promise<boolean>;
  kickCashDrawer(): Promise<boolean>;
}

/**
 * ESC/POS Thermal Receipt Printer Driver for Linux USB character devices (/dev/usb/receipt-printer)
 */
export class UsbEscPosPrinter implements IPrinterService {
  private readonly devicePath: string;
  private readonly columns: number;

  constructor(devicePath: string = '/dev/usb/receipt-printer', columns: number = 48) {
    this.devicePath = devicePath;
    this.columns = columns;
  }

  public async printReceipt(payload: CustomerReceiptPayload): Promise<boolean> {
    const escpos = this.renderReceiptBytes(payload);
    return this.writeBytes(escpos);
  }

  public async printRunnerChit(payload: RunnerChitPayload): Promise<boolean> {
    const escpos = this.renderRunnerChit(payload);
    return this.writeBytes(escpos);
  }

  public async printTakeoutSlip(payload: TakeoutSlipPayload): Promise<boolean> {
    const escpos = this.renderTakeoutSlip(payload);
    return this.writeBytes(escpos);
  }

  public async printDeliveryTag(payload: DeliveryTagPayload): Promise<boolean> {
    const escpos = this.renderDeliveryTag(payload);
    return this.writeBytes(escpos);
  }

  public async printReadingSlip(reading: any): Promise<boolean> {
    const escpos = this.renderReadingSlipBytes(reading);
    return this.writeBytes(escpos);
  }

  public async kickCashDrawer(): Promise<boolean> {
    // ESC p 0 25 250 (pulse pin 2 for 50ms)
    const kickCommand = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    try {
      await fs.writeFile(this.devicePath, kickCommand);
      return true;
    } catch (err) {
      console.error(`[UsbEscPosPrinter] Failed to kick cash drawer:`, err);
      return false;
    }
  }

  private async writeBytes(buffer: Buffer): Promise<boolean> {
    try {
      await fs.writeFile(this.devicePath, buffer);
      return true;
    } catch (err) {
      console.error(`[UsbEscPosPrinter] Failed to write to ${this.devicePath}:`, err);
      throw err;
    }
  }

  public renderReceiptBytes(payload: CustomerReceiptPayload): Buffer {
    const parts: Buffer[] = [];
    const push = (str: string) => parts.push(Buffer.from(str, 'utf-8'));
    const cmd = (bytes: number[]) => parts.push(Buffer.from(bytes));

    // Initialize printer: ESC @
    cmd([0x1b, 0x40]);

    // Center alignment: ESC a 1
    cmd([0x1b, 0x61, 0x01]);

    if (payload.isReprint) {
      cmd([0x1b, 0x45, 0x01]);
      push('*** REPRINT / DUPLICATE ***\n\n');
      cmd([0x1b, 0x45, 0x00]);
    }

    // Double height & double width header: GS ! 0x11
    cmd([0x1d, 0x21, 0x11]);
    push("MONK'S DREAM\nJAZZ BAR\n");
    cmd([0x1d, 0x21, 0x00]); // Normal text
    push('Digital Operations Platform\n');
    push('------------------------------------------------\n');

    // Left alignment: ESC a 0
    cmd([0x1b, 0x61, 0x00]);
    push(`Receipt #: ${payload.receiptNumber}\n`);
    push(`Date:      ${payload.timestamp}\n`);
    if (payload.tableNumber) {
      push(`Table:     ${payload.tableNumber} (${payload.tabName || 'Main'})\n`);
    } else if (payload.tabName) {
      push(`Tab:       ${payload.tabName}\n`);
    }
    if (payload.waiterName) {
      push(`Staff:     ${cleanStaffName(payload.waiterName)}\n`);
    }
    push('------------------------------------------------\n');

    // Items list
    for (const item of payload.items) {
      const nameCol = `${item.quantity}x ${item.name}`.slice(0, 32).padEnd(34, ' ');
      const priceCol = (item.total / 100).toFixed(2).padStart(12, ' ');
      push(`${nameCol}${priceCol}\n`);
      if (item.isCorkage) {
        push(`   [Corkage 20% Applied]\n`);
      }
      if (item.notes) {
        push(`   Note: ${item.notes}\n`);
      }
    }

    push('------------------------------------------------\n');
    push(`Subtotal:    ${(payload.subtotal / 100).toFixed(2).padStart(34, ' ')}\n`);
    if (payload.corkageFee && payload.corkageFee > 0) {
      push(`Corkage Fee: ${(payload.corkageFee / 100).toFixed(2).padStart(34, ' ')}\n`);
    }
    if (payload.discount && payload.discount > 0) {
      push(`Discount:   -${(payload.discount / 100).toFixed(2).padStart(34, ' ')}\n`);
    }

    // Bold Total: ESC E 1
    cmd([0x1b, 0x45, 0x01]);
    push(`TOTAL: PHP ${(payload.total / 100).toFixed(2).padStart(36, ' ')}\n`);
    cmd([0x1b, 0x45, 0x00]); // Normal

    push(`Tendered: PHP ${(payload.tendered / 100).toFixed(2).padStart(32, ' ')}\n`);
    push(`Change:   PHP ${(payload.change / 100).toFixed(2).padStart(32, ' ')}\n`);
    const paymentLabel = payload.paymentChannel
      ? `${payload.paymentChannel} QR`
      : payload.paymentMethod;
    push(`Payment:     ${paymentLabel.padStart(34, ' ')}\n`);
    if (payload.referenceNumber) {
      push(`Ref #:       #${payload.referenceNumber.padStart(33, ' ')}\n`);
    }
    push('------------------------------------------------\n');

    // Center alignment: ESC a 1
    cmd([0x1b, 0x61, 0x01]);
    push('Thank you for listening!\nSee you at the next set.\n\n\n\n');

    // Cut paper: GS V 0 (full cut)
    cmd([0x1d, 0x56, 0x00]);

    return Buffer.concat(parts);
  }

  public renderRunnerChit(payload: RunnerChitPayload): Buffer {
    const parts: Buffer[] = [];
    const push = (str: string) => parts.push(Buffer.from(str, 'utf-8'));
    const cmd = (bytes: number[]) => parts.push(Buffer.from(bytes));

    cmd([0x1b, 0x40]); // Reset
    cmd([0x1b, 0x61, 0x01]); // Center

    if (payload.isReprint) {
      push('*** REPRINT ***\n');
    }

    cmd([0x1d, 0x21, 0x11]); // Double size
    push('ORDER DISPATCH SLIP\n');
    cmd([0x1d, 0x21, 0x00]); // Normal

    push(`Order #${payload.orderNumber}`);
    if (payload.roundNumber) {
      push(`  [Round ${payload.roundNumber}]`);
    }
    push('\n');
    push('------------------------------------------------\n');

    cmd([0x1b, 0x61, 0x00]); // Left
    if (payload.tableNumber) {
      push(`Destination: Table ${payload.tableNumber} (${payload.tabName || 'Main'})\n`);
    } else {
      push(`Tab:         ${payload.tabName || 'Walk-in'}\n`);
    }
    push(`Server:      ${cleanStaffName(payload.waiterName)}\n`);
    push(`Sent At:     ${payload.timestamp}\n`);
    push('------------------------------------------------\n');

    // Checklist format for FOH Runner
    for (const item of payload.items) {
      cmd([0x1b, 0x45, 0x01]); // Bold item
      push(`[ ] ${item.quantity}x ${item.name}\n`);
      cmd([0x1b, 0x45, 0x00]);
      if (item.station) {
        push(`    Station: ${item.station}\n`);
      }
      if (item.notes) {
        push(`    Note: ${item.notes}\n`);
      }
    }

    push('------------------------------------------------\n');
    cmd([0x1b, 0x61, 0x01]); // Center
    push("Monk's Dream Jazz Bar • Expediter Checklist\n\n\n\n");
    cmd([0x1d, 0x56, 0x00]); // Cut

    return Buffer.concat(parts);
  }

  public renderTakeoutSlip(payload: TakeoutSlipPayload): Buffer {
    const parts: Buffer[] = [];
    const push = (str: string) => parts.push(Buffer.from(str, 'utf-8'));
    const cmd = (bytes: number[]) => parts.push(Buffer.from(bytes));

    cmd([0x1b, 0x40]);
    cmd([0x1b, 0x61, 0x01]);

    cmd([0x1d, 0x21, 0x11]);
    push('*** TAKEOUT / TO-GO ***\n');
    push(`Order #${payload.orderNumber}\n`);
    cmd([0x1d, 0x21, 0x00]);

    push('------------------------------------------------\n');
    cmd([0x1b, 0x61, 0x00]);
    push(`Customer:    ${payload.customerName}\n`);
    push(`Status:      ${payload.isPrepaid ? '[PREPAID]' : '[PAY ON PICKUP]'}\n`);
    push(`Time:        ${payload.timestamp}\n`);
    if (payload.notes) {
      push(`Packaging:   ${payload.notes}\n`);
    }
    push('------------------------------------------------\n');

    for (const item of payload.items) {
      push(`[ ] ${item.quantity}x ${item.name}\n`);
      if (item.notes) {
        push(`    Note: ${item.notes}\n`);
      }
    }

    push('------------------------------------------------\n');
    cmd([0x1b, 0x61, 0x01]);
    push('Keep with bagged order at Takeout counter.\n\n\n\n');
    cmd([0x1d, 0x56, 0x00]);

    return Buffer.concat(parts);
  }

  public renderDeliveryTag(payload: DeliveryTagPayload): Buffer {
    const parts: Buffer[] = [];
    const push = (str: string) => parts.push(Buffer.from(str, 'utf-8'));
    const cmd = (bytes: number[]) => parts.push(Buffer.from(bytes));

    cmd([0x1b, 0x40]);
    cmd([0x1b, 0x61, 0x01]);

    cmd([0x1d, 0x21, 0x11]);
    push('*** ONLINE DELIVERY BAG ***\n');
    push(`${payload.platform} #${payload.platformReference}\n`);
    cmd([0x1d, 0x21, 0x00]);

    push('------------------------------------------------\n');
    cmd([0x1b, 0x61, 0x00]);
    push(`Customer:    ${payload.customerName}\n`);
    if (payload.riderName) {
      push(`Courier:     ${payload.riderName}\n`);
    }
    push(`Items:       ${payload.itemCount} items total\n`);
    if (payload.address) {
      push(`Address:     ${payload.address}\n`);
    }
    push(`Time:        ${payload.timestamp}\n`);
    push('------------------------------------------------\n');

    if (payload.items && payload.items.length > 0) {
      for (const item of payload.items) {
        push(`[ ] ${item.quantity}x ${item.name}\n`);
        if (item.notes) {
          push(`    Note: ${item.notes}\n`);
        }
      }
      push('------------------------------------------------\n');
    }

    cmd([0x1b, 0x61, 0x01]);
    push('Staple or attach to delivery bag exterior.\n\n\n\n');
    cmd([0x1d, 0x56, 0x00]);

    return Buffer.concat(parts);
  }

  public renderReadingSlipBytes(reading: any): Buffer {
    const parts: Buffer[] = [];
    const push = (str: string) => parts.push(Buffer.from(str, 'utf-8'));
    const cmd = (bytes: number[]) => parts.push(Buffer.from(bytes));

    const fmt = (num: number = 0) =>
      Number(num || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const padLine = (label: string, value: string, cols: number = 48) => {
      const spaceCount = Math.max(1, cols - label.length - value.length);
      return label + ' '.repeat(spaceCount) + value + '\n';
    };

    const type = (reading.reading_type || 'X_READING').toUpperCase();
    const title =
      type === 'Z_READING'
        ? `Z-READING #${reading.z_number || 1}`
        : type === 'Y_READING'
          ? `Y-HANDOVER #${reading.y_number || 1}`
          : 'MID-SHIFT X-READING';

    const drawer =
      reading.drawer_target === 'bar'
        ? 'Bar Till'
        : reading.drawer_target === 'main'
          ? 'Floor Till'
          : 'Consolidated';

    // Initialize: ESC @
    cmd([0x1b, 0x40]);

    // Center header: ESC a 1
    cmd([0x1b, 0x61, 0x01]);
    cmd([0x1d, 0x21, 0x11]); // Double height/width
    push("MONK'S DREAM JAZZ BAR\n");
    cmd([0x1d, 0x21, 0x00]); // Normal text
    push('OFFICIAL FISCAL AUDIT REPORT\n');
    cmd([0x1b, 0x45, 0x01]); // Bold
    push(`*** ${title} ***\n`);
    cmd([0x1b, 0x45, 0x00]);
    push(`Scope: ${drawer.toUpperCase()}\n`);
    push(
      `Generated: ${new Date(reading.generated_at || reading.closed_at || Date.now()).toLocaleString()}\n`
    );
    push('================================================\n');

    // Left alignment: ESC a 0
    cmd([0x1b, 0x61, 0x00]);
    push(padLine('Opened At:', new Date(reading.opened_at).toLocaleTimeString()));
    push(
      padLine(
        'Closed/Gen At:',
        new Date(reading.closed_at || reading.generated_at || Date.now()).toLocaleTimeString()
      )
    );
    push(
      padLine(
        'Staff / Manager:',
        reading.outgoing_staff_name || reading.performed_by_name || 'Admin'
      )
    );
    if (reading.first_receipt_no || reading.last_receipt_no) {
      push(
        padLine(
          'Receipt Range:',
          `${reading.first_receipt_no || 'N/A'} - ${reading.last_receipt_no || 'N/A'}`
        )
      );
    }
    push(padLine('Settled Tabs:', `${reading.transaction_count || 0}`));
    push('------------------------------------------------\n');

    // 1. Sales Breakdown
    cmd([0x1b, 0x45, 0x01]);
    push('1. SALES & REVENUE\n');
    cmd([0x1b, 0x45, 0x00]);
    push(padLine('Gross Sales:', `P ${fmt(reading.gross_sales)}`));
    push(padLine('Discounts & Comps:', `-P ${fmt(reading.discount_total)}`));
    cmd([0x1b, 0x45, 0x01]);
    push(padLine('NET SALES:', `P ${fmt(reading.net_sales)}`));
    cmd([0x1b, 0x45, 0x00]);
    push('------------------------------------------------\n');

    // 2. Tax & Charges
    cmd([0x1b, 0x45, 0x01]);
    push('2. TAX & SERVICE CHARGE (BIR)\n');
    cmd([0x1b, 0x45, 0x00]);
    push(padLine('VATable Sales:', `P ${fmt(reading.vatable_sales)}`));
    push(padLine('12% VAT:', `P ${fmt(reading.vat_amount)}`));
    push(padLine('10% Service Charge:', `P ${fmt(reading.service_charge)}`));
    push('------------------------------------------------\n');

    // 3. Tenders
    cmd([0x1b, 0x45, 0x01]);
    push('3. TENDER SUMMARY\n');
    cmd([0x1b, 0x45, 0x00]);
    push(padLine('Cash Tender:', `P ${fmt(reading.tender_cash)}`));
    push(padLine('Card Tender:', `P ${fmt(reading.tender_card)}`));
    push(padLine('Digital Wallet:', `P ${fmt(reading.tender_digital)}`));
    if (reading.tender_delivery) {
      push(padLine('Delivery In-App:', `P ${fmt(reading.tender_delivery)}`));
    }
    cmd([0x1b, 0x45, 0x01]);
    push(padLine('TOTAL TENDER:', `P ${fmt(reading.total_tender)}`));
    cmd([0x1b, 0x45, 0x00]);
    push('------------------------------------------------\n');

    // 4. Drawer Reconciliation
    cmd([0x1b, 0x45, 0x01]);
    push('4. CASH DRAWER RECONCILIATION\n');
    cmd([0x1b, 0x45, 0x00]);
    push(padLine('Opening Float:', `P ${fmt(reading.opening_float)}`));
    push(padLine('Cash Sales Intake (+):', `P ${fmt(reading.tender_cash)}`));
    if (reading.cash_in) push(padLine('Cash In (+):', `P ${fmt(reading.cash_in)}`));
    if (reading.cash_out) push(padLine('Cash Out (-):', `P ${fmt(reading.cash_out)}`));
    if (reading.safe_drops) push(padLine('Safe Drops (-):', `P ${fmt(reading.safe_drops)}`));
    cmd([0x1b, 0x45, 0x01]);
    push(padLine('EXPECTED SYSTEM CASH:', `P ${fmt(reading.expected_cash)}`));
    if (reading.counted_cash !== undefined && reading.counted_cash !== null) {
      push(padLine('ACTUAL COUNTED CASH:', `P ${fmt(reading.counted_cash)}`));
      const varSign = (reading.variance || 0) > 0 ? '+' : '';
      push(padLine('VARIANCE (OVER/SHORT):', `${varSign}P ${fmt(reading.variance || 0)}`));
    }
    cmd([0x1b, 0x45, 0x00]);

    // Signatures for Y-Reading
    if (type === 'Y_READING') {
      push('------------------------------------------------\n');
      cmd([0x1b, 0x45, 0x01]);
      push('STAFF SHIFT HANDOVER\n');
      cmd([0x1b, 0x45, 0x00]);
      push(`Outgoing: ${reading.outgoing_staff_name || 'Staff'}\n`);
      push('Signature: ___________________________\n\n');
      push(`Incoming: ${reading.incoming_staff_name || 'Staff'}\n`);
      push('Signature: ___________________________\n');
    }

    // Cut paper: GS V 0
    push('================================================\n');
    cmd([0x1b, 0x61, 0x01]);
    push('*** END OF SHIFT REPORT ***\n\n\n\n');
    cmd([0x1d, 0x56, 0x00]);

    return Buffer.concat(parts);
  }
}

/**
 * Mock printer for local development and testing without physical hardware
 */
export class MockPrinter implements IPrinterService {
  public async printReceipt(payload: CustomerReceiptPayload): Promise<boolean> {
    console.log('[MockPrinter] PRINT RECEIPT SIMULATED:');
    console.log(JSON.stringify(payload, null, 2));
    return true;
  }

  public async printRunnerChit(payload: RunnerChitPayload): Promise<boolean> {
    console.log('[MockPrinter] PRINT RUNNER CHIT SIMULATED:');
    console.log(JSON.stringify(payload, null, 2));
    return true;
  }

  public async printTakeoutSlip(payload: TakeoutSlipPayload): Promise<boolean> {
    console.log('[MockPrinter] PRINT TAKEOUT SLIP SIMULATED:');
    console.log(JSON.stringify(payload, null, 2));
    return true;
  }

  public async printDeliveryTag(payload: DeliveryTagPayload): Promise<boolean> {
    console.log('[MockPrinter] PRINT DELIVERY TAG SIMULATED:');
    console.log(JSON.stringify(payload, null, 2));
    return true;
  }

  public async printReadingSlip(reading: any): Promise<boolean> {
    console.log('[MockPrinter] PRINT READING SLIP SIMULATED:');
    console.log(JSON.stringify(reading, null, 2));
    return true;
  }

  public async kickCashDrawer(): Promise<boolean> {
    console.log('[MockPrinter] CASH DRAWER KICK SIMULATED');
    return true;
  }
}
