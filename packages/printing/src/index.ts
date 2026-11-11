import * as fs from 'node:fs/promises';
import { getMonksDreamLogoRasterBytes } from './assets/logoRasterBytes.js';

export function sanitizeForEscPos(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics / accents
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/₱/g, 'PHP ')
    .replace(/[^\x20-\x7E\n•·]/g, ''); // strip any non-printable/corrupt bytes while keeping bullets
}

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

function toPesos(amount: any): number {
  if (amount === null || amount === undefined) return 0;
  const num = Number(amount);
  return isNaN(num) ? 0 : num;
}

function formatPhp(amount: number = 0): string {
  return Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function padLine(left: string, right: string, cols: number = 48): string {
  const spaceCount = Math.max(1, cols - left.length - right.length);
  return left + ' '.repeat(spaceCount) + right + '\n';
}

function divider(char: string = '-', cols: number = 48): string {
  return char.repeat(cols) + '\n';
}

function formatItemLine(qtyStr: string, name: string, priceStr: string, cols: number = 48): string {
  const leftPrefix = `${qtyStr}  `;
  const reservedRight = priceStr.length + 2;
  const maxNameLen = cols - leftPrefix.length - reservedRight;

  if (name.length <= maxNameLen) {
    const spaceCount = Math.max(1, cols - (leftPrefix.length + name.length) - priceStr.length);
    return `${leftPrefix}${name}${' '.repeat(spaceCount)}${priceStr}\n`;
  }

  const firstLineName = name.slice(0, maxNameLen);
  const remainingName = name.slice(maxNameLen).trim();
  const spaceCount = Math.max(
    1,
    cols - (leftPrefix.length + firstLineName.length) - priceStr.length
  );
  return (
    `${leftPrefix}${firstLineName}${' '.repeat(spaceCount)}${priceStr}\n` + `    ${remainingName}\n`
  );
}

export interface CustomerReceiptPayload {
  receiptNumber: string;
  tableNumber?: number;
  tableLabel?: string;
  tabName?: string;
  waiterName?: string;
  cashierName?: string;
  operatingMode?: string;
  items: Array<{
    name: string;
    productName?: string;
    temperature?: string;
    size?: string;
    quantity: number;
    price?: number;
    unit_price?: number;
    total: number;
    modifiers?: string[];
    isCorkage?: boolean;
    notes?: string;
  }>;
  subtotal: number;
  corkageFee?: number;
  discount?: number;
  serviceCharge?: number;
  total: number;
  tendered: number;
  change: number;
  vatableSales?: number;
  vatAmount?: number;
  vatExemptSales?: number;
  paymentMethod: string;
  paymentChannel?: string;
  referenceNumber?: string;
  timestamp: string;
  settledAt?: string;
  isReprint?: boolean;
}

export type PrinterReceiptPayload = CustomerReceiptPayload;

export interface RunnerChitPayload {
  orderNumber: string;
  tableNumber?: number;
  tableLabel?: string;
  tabName?: string;
  roundNumber?: number;
  waiterName?: string;
  timestamp: string;
  items: Array<{
    name: string;
    productName?: string;
    temperature?: string;
    size?: string;
    quantity: number;
    station?: string;
    stationTarget?: string;
    modifiers?: string[];
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
    const push = (str: string) => parts.push(Buffer.from(sanitizeForEscPos(str), 'utf-8'));
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

    // 1. Bitonal High-Contrast Graphic Logo
    const logoBytes = getMonksDreamLogoRasterBytes();
    if (logoBytes && logoBytes.length > 0) {
      parts.push(Buffer.from(logoBytes));
      push('\n');
    }

    // 2. Business Header
    cmd([0x1b, 0x45, 0x01]); // Bold
    cmd([0x1d, 0x21, 0x01]); // Double height
    push("MONK'S DREAM\nJAZZ BAR AND CAFE\n");
    cmd([0x1d, 0x21, 0x00]); // Normal size
    cmd([0x1b, 0x45, 0x00]); // Normal weight
    push('Craft Cocktails & Fine Jazz\n');
    push('Tel: +63 917 555 1957  •  IG/FB: @monksdreamjazz\n');
    push(divider('-', 48));

    // 3. Metadata Section
    cmd([0x1b, 0x61, 0x00]); // Left
    const receiptNo = payload.receiptNumber || 'MD-REC-001';
    const operatingMode = (payload.operatingMode || 'CAFE').toUpperCase();
    const modeLabel = operatingMode === 'EVENT' ? 'EVENT NIGHT' : 'DAYTIME CAFE';

    cmd([0x1b, 0x45, 0x01]);
    push(padLine(`CHECK #: ${receiptNo}`, `MODE: ${modeLabel}`, 48));
    cmd([0x1b, 0x45, 0x00]);
    push(`DATE:    ${payload.settledAt || payload.timestamp}\n`);

    if (payload.tableNumber || payload.tableLabel) {
      const tableStr = payload.tableLabel || `Table ${payload.tableNumber}`;
      const tabStr = payload.tabName || 'Main Tab';
      push(`TABLE:   ${tableStr.padEnd(16)} TAB: ${tabStr}\n`);
    } else {
      push(`TAB:     ${payload.tabName || 'Takeout / Counter'}\n`);
    }

    const staff = cleanStaffName(payload.cashierName || payload.waiterName);
    push(`STAFF:   ${staff.padEnd(16)} TERMINAL: TILL-1\n`);
    push(divider('=', 48));

    // 4. Items Table Header
    cmd([0x1b, 0x45, 0x01]);
    push(padLine('QTY  DESCRIPTION', 'AMOUNT (PHP)', 48));
    cmd([0x1b, 0x45, 0x00]);
    push(divider('=', 48));

    // 5. Line Items
    for (const item of payload.items) {
      const qtyStr = `${item.quantity || 1}x`.padEnd(3, ' ');
      let desc = item.name || item.productName || 'Item';

      if (item.temperature && item.temperature !== 'NONE' && !desc.includes('(')) {
        const temp = item.temperature === 'HOT' ? 'Hot' : 'Iced';
        const size = item.size && item.size !== 'Standard' ? ` · ${item.size}` : '';
        desc = `${desc} (${temp}${size})`;
      } else if (item.size && item.size !== 'Standard' && !desc.includes('(')) {
        desc = `${desc} (${item.size})`;
      }

      const itemTotal = toPesos(
        item.total ?? toPesos(item.price || item.unit_price) * (item.quantity || 1)
      );
      push(formatItemLine(qtyStr, desc, formatPhp(itemTotal), 48));

      if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          push(`     + ${mod}\n`);
        }
      }

      if (item.notes && item.notes.trim()) {
        push(`     >> Note: ${item.notes.trim()}\n`);
      }

      if (item.isCorkage) {
        push(`     [Corkage Applied]\n`);
      }
    }

    push(divider('-', 48));

    // 6. Financial Summary & Totals
    const subtotal = toPesos(payload.subtotal || payload.total || 0);
    push(padLine('SUBTOTAL (Gross Sales):', formatPhp(subtotal), 48));

    const corkage = toPesos(payload.corkageFee || 0);
    if (corkage > 0) {
      push(padLine('CORKAGE FEE:', formatPhp(corkage), 48));
    }

    const discount = toPesos(payload.discount || 0);
    if (discount > 0) {
      push(padLine('LESS: DISCOUNT:', `-${formatPhp(discount)}`, 48));
    }

    const serviceCharge = toPesos(payload.serviceCharge || 0);
    if (serviceCharge > 0) {
      push(padLine('SERVICE CHARGE (10%):', formatPhp(serviceCharge), 48));
    }

    // Bold Grand Total
    push(divider('=', 48));
    cmd([0x1b, 0x45, 0x01]); // Bold
    cmd([0x1d, 0x21, 0x01]); // Double height
    const total = toPesos(payload.total || subtotal + corkage - discount + serviceCharge);
    push(padLine('TOTAL AMOUNT DUE:', `PHP ${formatPhp(total)}`, 48));
    cmd([0x1d, 0x21, 0x00]); // Normal size
    cmd([0x1b, 0x45, 0x00]); // Normal weight
    push(divider('=', 48));

    // 7. Payment Tendered & Change
    const paymentMethod = (payload.paymentMethod || 'CASH').toUpperCase();
    const paymentChannel = payload.paymentChannel;
    const paymentLabel = paymentChannel ? `${paymentChannel.toUpperCase()} QR` : paymentMethod;
    push(padLine('PAYMENT METHOD:', paymentLabel, 48));

    if (payload.referenceNumber) {
      push(padLine('REFERENCE NO:', `#${payload.referenceNumber}`, 48));
    }

    const tendered = toPesos(payload.tendered || total);
    const change = toPesos(
      payload.change || (paymentMethod === 'CASH' ? Math.max(0, tendered - total) : 0)
    );

    if (paymentMethod === 'CASH') {
      push(padLine('CASH TENDERED:', `PHP ${formatPhp(tendered)}`, 48));
      push(padLine('CHANGE DUE:', `PHP ${formatPhp(change)}`, 48));
    } else {
      push(padLine('AMOUNT PAID:', `PHP ${formatPhp(total)}`, 48));
    }

    // 8. Philippine VAT & Statutory Tax Breakdown
    push(divider('-', 48));
    push('TAX & STATUTORY BREAKDOWN:\n');
    const vatableSales = toPesos(
      payload.vatableSales ?? (discount > 0 ? 0 : Number((total / 1.12).toFixed(2)))
    );
    const vatAmount = toPesos(
      payload.vatAmount ?? (discount > 0 ? 0 : Number((total - vatableSales).toFixed(2)))
    );
    const vatExempt = toPesos(
      payload.vatExemptSales ?? (discount > 0 ? Number(total.toFixed(2)) : 0)
    );

    push(padLine('  VATable Sales (12%):', formatPhp(vatableSales), 48));
    push(padLine('  VAT Amount (12%):', formatPhp(vatAmount), 48));
    push(padLine('  VAT-Exempt Sales:', formatPhp(vatExempt), 48));
    push(padLine('  Zero-Rated Sales:', '0.00', 48));

    if (discount > 0) {
      push(divider('-', 48));
      push('SC / PWD BENEFICIARY ACKNOWLEDGMENT:\n');
      push('Name:      _________________________________\n');
      push('ID Number: _________________________________\n');
      push('Signature: _________________________________\n');
    }

    // 9. Footer: Quote, Appreciation & Statutory Notice
    push(divider('-', 48));
    cmd([0x1b, 0x61, 0x01]); // Center
    push('"Writing about music is like dancing\n');
    push('about architecture."\n');
    push('- Thelonious Monk\n\n');
    push('Thank you for supporting live music!\n');
    push('Please come back for the next set.\n');
    push(divider('-', 48));
    cmd([0x1b, 0x45, 0x01]);
    push('THIS IS NOT AN OFFICIAL RECEIPT\n');
    cmd([0x1b, 0x45, 0x00]);
    push('\n\n\n');

    // Cut paper: GS V 0 (full cut)
    cmd([0x1d, 0x56, 0x00]);

    return Buffer.concat(parts);
  }

  public renderRunnerChit(payload: RunnerChitPayload): Buffer {
    const parts: Buffer[] = [];
    const push = (str: string) => parts.push(Buffer.from(sanitizeForEscPos(str), 'utf-8'));
    const cmd = (bytes: number[]) => parts.push(Buffer.from(bytes));

    cmd([0x1b, 0x40]); // Reset
    cmd([0x1b, 0x61, 0x01]); // Center

    if (payload.isReprint) {
      push('*** REPRINT ***\n');
    }

    cmd([0x1b, 0x45, 0x01]); // Bold
    cmd([0x1d, 0x21, 0x01]); // Double height
    push('ORDER DISPATCH SLIP\n');
    cmd([0x1d, 0x21, 0x00]); // Normal
    cmd([0x1b, 0x45, 0x00]);

    const roundNum = payload.roundNumber || 1;
    cmd([0x1b, 0x45, 0x01]);
    push(`*** ROUND ${roundNum} • EXPEDITER ***\n`);
    cmd([0x1b, 0x45, 0x00]);

    const orderNo = payload.orderNumber || 'N/A';
    push(padLine(`ORDER #: ${orderNo}`, `TIME: ${payload.timestamp}`, 48));
    push(divider('-', 48));

    cmd([0x1b, 0x61, 0x00]); // Left
    if (payload.tableNumber || payload.tableLabel) {
      const tableStr = payload.tableLabel || `Table ${payload.tableNumber}`;
      push(`DESTINATION: ${tableStr.padEnd(16)} TAB: ${payload.tabName || 'Main'}\n`);
    } else {
      push(`DESTINATION: TAKEOUT / COUNTER  TAB: ${payload.tabName || 'Walk-in'}\n`);
    }
    push(`SERVER:      ${cleanStaffName(payload.waiterName)}\n`);
    push(divider('=', 48));

    // Checklist format for FOH Runner / Expediter
    for (const item of payload.items) {
      const qty = item.quantity || 1;
      let name = item.name || item.productName || 'Item';

      if (item.temperature && item.temperature !== 'NONE' && !name.includes('(')) {
        const temp = item.temperature === 'HOT' ? 'Hot' : 'Iced';
        const size = item.size && item.size !== 'Standard' ? ` · ${item.size}` : '';
        name = `${name} (${temp}${size})`;
      } else if (item.size && item.size !== 'Standard' && !name.includes('(')) {
        name = `${name} (${item.size})`;
      }

      const rawStation = (item.station || item.stationTarget || 'BAR').toUpperCase();
      const station = rawStation.replace(/^STATION:/i, '');
      const stationTag = `[${station}]`;
      const itemLeft = `[ ]  ${qty}x  ${name}`;

      cmd([0x1b, 0x45, 0x01]);
      push(padLine(itemLeft, stationTag, 48));
      cmd([0x1b, 0x45, 0x00]);

      if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          push(`         + ${mod}\n`);
        }
      }

      if (item.notes && item.notes.trim()) {
        push(`         >> Prep: ${item.notes.trim()}\n`);
      }
    }

    push(divider('=', 48));
    cmd([0x1b, 0x61, 0x01]); // Center
    push("Monk's Dream Jazz Bar • Expediter Checklist\n\n\n\n");
    cmd([0x1d, 0x56, 0x00]); // Cut

    return Buffer.concat(parts);
  }

  public renderTakeoutSlip(payload: TakeoutSlipPayload): Buffer {
    const parts: Buffer[] = [];
    const push = (str: string) => parts.push(Buffer.from(sanitizeForEscPos(str), 'utf-8'));
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
    const push = (str: string) => parts.push(Buffer.from(sanitizeForEscPos(str), 'utf-8'));
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
    const push = (str: string) => parts.push(Buffer.from(sanitizeForEscPos(str), 'utf-8'));
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
