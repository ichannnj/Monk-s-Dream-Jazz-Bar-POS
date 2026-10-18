import * as fs from 'node:fs/promises';

export interface PrinterReceiptPayload {
  receiptNumber: string;
  tableNumber: number;
  tabName?: string;
  waiterName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    isCorkage?: boolean;
  }>;
  subtotal: number;
  corkageFee: number;
  total: number;
  tendered: number;
  change: number;
  paymentMethod: string;
  timestamp: string;
  isReprint?: boolean;
}

export interface IPrinterService {
  printReceipt(payload: PrinterReceiptPayload): Promise<boolean>;
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

  public async printReceipt(payload: PrinterReceiptPayload): Promise<boolean> {
    const escpos = this.renderReceiptBytes(payload);
    try {
      await fs.writeFile(this.devicePath, escpos);
      return true;
    } catch (err) {
      console.error(`[UsbEscPosPrinter] Failed to write to ${this.devicePath}:`, err);
      throw err;
    }
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

  private renderReceiptBytes(payload: PrinterReceiptPayload): Buffer {
    const parts: Buffer[] = [];
    const push = (str: string) => parts.push(Buffer.from(str, 'utf-8'));
    const cmd = (bytes: number[]) => parts.push(Buffer.from(bytes));

    // Initialize printer: ESC @
    cmd([0x1b, 0x40]);

    // Center alignment: ESC a 1
    cmd([0x1b, 0x61, 0x01]);

    if (payload.isReprint) {
      push('*** REPRINT / DUPLICATE ***\n\n');
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
    push(`Table:     ${payload.tableNumber} (${payload.tabName || 'Main'})\n`);
    push(`Staff:     ${payload.waiterName}\n`);
    push('------------------------------------------------\n');

    // Items list
    for (const item of payload.items) {
      const nameCol = `${item.quantity}x ${item.name}`.slice(0, 32).padEnd(34, ' ');
      const priceCol = (item.total / 100).toFixed(2).padStart(12, ' ');
      push(`${nameCol}${priceCol}\n`);
      if (item.isCorkage) {
        push(`   [Corkage 20% Applied]\n`);
      }
    }

    push('------------------------------------------------\n');
    push(`Subtotal:    ${(payload.subtotal / 100).toFixed(2).padStart(34, ' ')}\n`);
    if (payload.corkageFee > 0) {
      push(`Corkage Fee: ${(payload.corkageFee / 100).toFixed(2).padStart(34, ' ')}\n`);
    }

    // Bold Total: ESC E 1
    cmd([0x1b, 0x45, 0x01]);
    push(`TOTAL:       PHP ${(payload.total / 100).toFixed(2).padStart(30, ' ')}\n`);
    cmd([0x1b, 0x45, 0x00]); // Normal

    push(`Tendered:    PHP ${(payload.tendered / 100).toFixed(2).padStart(30, ' ')}\n`);
    push(`Change:      PHP ${(payload.change / 100).toFixed(2).padStart(30, ' ')}\n`);
    push(`Payment:     ${payload.paymentMethod.padStart(34, ' ')}\n`);
    push('------------------------------------------------\n');

    // Center alignment: ESC a 1
    cmd([0x1b, 0x61, 0x01]);
    push('Thank you for listening!\nSee you at the next set.\n\n\n\n');

    // Cut paper: GS V 0 (full cut)
    cmd([0x1d, 0x56, 0x00]);

    return Buffer.concat(parts);
  }
}

/**
 * Mock printer for local development and testing without physical hardware
 */
export class MockPrinter implements IPrinterService {
  public async printReceipt(payload: PrinterReceiptPayload): Promise<boolean> {
    console.log('[MockPrinter] PRINT RECEIPT SIMULATED:');
    console.log(JSON.stringify(payload, null, 2));
    return true;
  }

  public async kickCashDrawer(): Promise<boolean> {
    console.log('[MockPrinter] CASH DRAWER KICK SIMULATED');
    return true;
  }
}
