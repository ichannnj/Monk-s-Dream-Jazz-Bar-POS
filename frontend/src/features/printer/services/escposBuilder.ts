/**
 * Browser-Native Binary ESC/POS Ticket & Receipt Builder
 * Optimized for Monk's Dream Jazz Bar and Cafe 80mm Thermal Hardware.
 * Uses standard browser Uint8Array and TextEncoder - zero external Node dependencies.
 */

import { getMonksDreamLogoRasterBytes } from '../assets/logoRasterBytes';

const encoder = new TextEncoder();

export const ESCPOS = {
  // Initialization & Hardware Control
  INIT: new Uint8Array([0x1b, 0x40]), // ESC @
  CUT_FULL: new Uint8Array([0x1d, 0x56, 0x00]), // GS V 0 (full cut)
  CUT_PARTIAL: new Uint8Array([0x1d, 0x56, 0x01]), // GS V 1 (partial cut)
  DRAWER_KICK_PIN2: new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]), // ESC p 0 25 250 (Pin 2 pulse 50ms)
  DRAWER_KICK_PIN5: new Uint8Array([0x1b, 0x70, 0x01, 0x19, 0xfa]), // ESC p 1 25 250 (Pin 5 pulse 50ms)

  // Text Alignment
  ALIGN_LEFT: new Uint8Array([0x1b, 0x61, 0x00]), // ESC a 0
  ALIGN_CENTER: new Uint8Array([0x1b, 0x61, 0x01]), // ESC a 1
  ALIGN_RIGHT: new Uint8Array([0x1b, 0x61, 0x02]), // ESC a 2

  // Typography & Sizing
  BOLD_ON: new Uint8Array([0x1b, 0x45, 0x01]), // ESC E 1
  BOLD_OFF: new Uint8Array([0x1b, 0x45, 0x00]), // ESC E 0
  DOUBLE_SIZE: new Uint8Array([0x1d, 0x21, 0x11]), // GS ! 0x11 (2x width & 2x height)
  DOUBLE_HEIGHT: new Uint8Array([0x1d, 0x21, 0x01]), // GS ! 0x01
  DOUBLE_WIDTH: new Uint8Array([0x1d, 0x21, 0x10]), // GS ! 0x10
  NORMAL_SIZE: new Uint8Array([0x1d, 0x21, 0x00]), // GS ! 0x00
  UNDERLINE_ON: new Uint8Array([0x1b, 0x2d, 0x01]), // ESC - 1
  UNDERLINE_OFF: new Uint8Array([0x1b, 0x2d, 0x00]), // ESC - 0
};

export class EscPosBuilder {
  private chunks: Uint8Array[] = [];

  constructor() {
    this.add(ESCPOS.INIT);
  }

  public add(bytes: Uint8Array): this {
    this.chunks.push(bytes);
    return this;
  }

  public text(str: string): this {
    this.chunks.push(encoder.encode(str));
    return this;
  }

  public line(str: string = ''): this {
    this.chunks.push(encoder.encode(str + '\n'));
    return this;
  }

  public feed(lines: number = 1): this {
    this.chunks.push(encoder.encode('\n'.repeat(Math.max(1, lines))));
    return this;
  }

  public left(): this {
    return this.add(ESCPOS.ALIGN_LEFT);
  }

  public center(): this {
    return this.add(ESCPOS.ALIGN_CENTER);
  }

  public right(): this {
    return this.add(ESCPOS.ALIGN_RIGHT);
  }

  public bold(enable: boolean = true): this {
    return this.add(enable ? ESCPOS.BOLD_ON : ESCPOS.BOLD_OFF);
  }

  public doubleSize(enable: boolean = true): this {
    return this.add(enable ? ESCPOS.DOUBLE_SIZE : ESCPOS.NORMAL_SIZE);
  }

  public doubleHeight(enable: boolean = true): this {
    return this.add(enable ? ESCPOS.DOUBLE_HEIGHT : ESCPOS.NORMAL_SIZE);
  }

  public imageRaster(rasterBytes: Uint8Array): this {
    return this.add(rasterBytes);
  }

  public qrCode(content: string): this {
    if (!content) return this;
    const dataBytes = encoder.encode(content);
    const storeLen = dataBytes.length + 3;
    const pL = storeLen % 256;
    const pH = Math.floor(storeLen / 256);

    // 1. Model 2 QR code: GS ( k 4 0 49 65 50 0
    this.add(new Uint8Array([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]));
    // 2. Module size (4 dots): GS ( k 3 0 49 67 4
    this.add(new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x04]));
    // 3. Error correction level M (49): GS ( k 3 0 49 69 49
    this.add(new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]));
    // 4. Store data: GS ( k pL pH 49 80 48 ...data
    const storeHeader = new Uint8Array([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]);
    this.add(storeHeader);
    this.add(dataBytes);
    // 5. Print symbol: GS ( k 3 0 49 81 48
    this.add(new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]));
    this.feed(1);
    return this;
  }

  public cut(full: boolean = true): this {
    this.feed(3);
    return this.add(full ? ESCPOS.CUT_FULL : ESCPOS.CUT_PARTIAL);
  }

  public kickDrawer(): this {
    return this.add(ESCPOS.DRAWER_KICK_PIN2);
  }

  public toBytes(): Uint8Array {
    let totalLength = 0;
    for (const chunk of this.chunks) {
      totalLength += chunk.length;
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
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
  return char.repeat(cols);
}

function formatDateTime(val?: string | Date): string {
  if (!val) return new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const d = new Date(val);
  return isNaN(d.getTime())
    ? String(val)
    : d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatItemLine(qtyStr: string, name: string, priceStr: string, cols: number = 48): string {
  // [QTY 4][NAME 32][PRICE 12] = 48 cols
  const leftPrefix = `${qtyStr}  `;
  const reservedRight = priceStr.length + 2; // price + 2 padding spaces
  const maxNameLen = cols - leftPrefix.length - reservedRight;

  if (name.length <= maxNameLen) {
    const spaceCount = Math.max(1, cols - (leftPrefix.length + name.length) - priceStr.length);
    return `${leftPrefix}${name}${' '.repeat(spaceCount)}${priceStr}\n`;
  }

  // Wrap long name to second line
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

/**
 * Builds standard 80mm ESC/POS Customer Receipt for Monk's Dream Jazz Bar and Cafe
 */
export function buildReceiptBytes(data: any, shouldKickDrawer: boolean = false): Uint8Array {
  const builder = new EscPosBuilder();

  builder.center();
  if (data.isReprint) {
    builder.bold(true).line('*** REPRINT / DUPLICATE ***').bold(false).line();
  }

  // 1. Bitonal High-Contrast Graphic Logo
  const logoBytes = getMonksDreamLogoRasterBytes();
  if (logoBytes && logoBytes.length > 0) {
    builder.center().imageRaster(logoBytes).feed(1);
  }

  // 2. Business Header
  builder
    .bold(true)
    .doubleHeight(true)
    .line("MONK'S DREAM")
    .line('JAZZ BAR AND CAFE')
    .doubleHeight(false)
    .bold(false)
    .line('Craft Cocktails & Fine Jazz')
    .line('Tel: +63 917 555 1957  •  IG/FB: @monksdreamjazz')
    .line(divider('-', 48));

  // 3. Metadata Section
  builder.left();
  const receiptNo =
    data.receiptNumber ||
    data.checkNumber ||
    `MD-${(data.paymentId || data.id || '001').slice(0, 8).toUpperCase()}`;
  const operatingMode = (data.operatingMode || data.operating_mode || 'CAFE').toUpperCase();
  const modeLabel = operatingMode === 'EVENT' ? 'EVENT NIGHT' : 'DAYTIME CAFE';

  builder
    .bold(true)
    .text(padLine(`CHECK #: ${receiptNo}`, `MODE: ${modeLabel}`, 48))
    .bold(false);
  builder.line(`DATE:    ${formatDateTime(data.settledAt || data.timestamp)}`);

  if (data.tableNumber || data.tableLabel) {
    const tableStr = data.tableLabel || `Table ${data.tableNumber}`;
    const tabStr = data.tabName || data.customerName || data.guestName || 'Main Tab';
    builder.line(`TABLE:   ${tableStr.padEnd(16)} TAB: ${tabStr}`);
  } else {
    const tabStr = data.tabName || data.customerName || data.guestName || 'Takeout / Counter';
    builder.line(`TAB:     ${tabStr}`);
  }

  const staff = cleanStaffName(data.cashierName || data.waiterName || data.staff_name);
  builder.line(`STAFF:   ${staff.padEnd(16)} TERMINAL: TILL-1`);
  builder.line(divider('=', 48));

  // 4. Items Table Header
  builder
    .bold(true)
    .text(padLine('QTY  DESCRIPTION', 'AMOUNT (PHP)', 48))
    .bold(false);
  builder.line(divider('=', 48));

  // 5. Line Items
  const items = data.items || [];
  for (const item of items) {
    const qtyStr = `${item.quantity || 1}x`.padEnd(3, ' ');
    let desc = item.name || item.productName || 'Item';

    // Format temperature and cup size if not yet formatted
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
    builder.text(formatItemLine(qtyStr, desc, formatPhp(itemTotal), 48));

    // Modifiers
    if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        builder.line(`     + ${mod}`);
      }
    }

    // Customer / Prep Notes
    if (item.notes && item.notes.trim()) {
      builder.line(`     >> Note: ${item.notes.trim()}`);
    }

    // Corkage tag
    if (item.isCorkage || item.is_corkage) {
      builder.line(`     [Corkage Applied]`);
    }
  }

  builder.line(divider('-', 48));

  // 6. Financial Summary & Totals
  const subtotal = toPesos(data.subtotal || data.amount || 0);
  builder.text(padLine('SUBTOTAL (Gross Sales):', formatPhp(subtotal), 48));

  const corkage = toPesos(data.corkageFee || data.corkageAmount || data.corkage_amount || 0);
  if (corkage > 0) {
    builder.text(padLine('CORKAGE FEE:', formatPhp(corkage), 48));
  }

  const discount = toPesos(data.discountAmount || data.discount || data.discount_amount || 0);
  if (discount > 0) {
    builder.text(padLine('LESS: DISCOUNT:', `-${formatPhp(discount)}`, 48));
  }

  const serviceCharge = toPesos(data.serviceCharge || data.service_charge || 0);
  if (serviceCharge > 0) {
    builder.text(padLine('SERVICE CHARGE (10%):', formatPhp(serviceCharge), 48));
  }

  // Bold Grand Total
  builder.line(divider('=', 48));
  builder.bold(true).doubleHeight(true);
  const total = toPesos(data.total || data.amount || subtotal + corkage - discount + serviceCharge);
  builder.text(padLine('TOTAL AMOUNT DUE:', `PHP ${formatPhp(total)}`, 48));
  builder.doubleHeight(false).bold(false);
  builder.line(divider('=', 48));

  // 7. Payment Tendered & Change
  const paymentMethod = (data.paymentMethod || data.payment_method || 'CASH').toUpperCase();
  const paymentChannel = data.paymentChannel || data.payment_channel;
  const paymentLabel = paymentChannel ? `${paymentChannel.toUpperCase()} QR` : paymentMethod;
  builder.text(padLine('PAYMENT METHOD:', paymentLabel, 48));

  const refNo = data.referenceNumber || data.reference_number;
  if (refNo) {
    builder.text(padLine('REFERENCE NO:', `#${refNo}`, 48));
  }

  const tendered = toPesos(data.tendered || total);
  const change = toPesos(
    data.change || (paymentMethod === 'CASH' ? Math.max(0, tendered - total) : 0)
  );

  if (paymentMethod === 'CASH') {
    builder.text(padLine('CASH TENDERED:', `PHP ${formatPhp(tendered)}`, 48));
    builder.text(padLine('CHANGE DUE:', `PHP ${formatPhp(change)}`, 48));
  } else {
    builder.text(padLine('AMOUNT PAID:', `PHP ${formatPhp(total)}`, 48));
  }

  // 8. Philippine VAT & Statutory Tax Breakdown
  builder.line(divider('-', 48));
  builder.line('TAX & STATUTORY BREAKDOWN:');
  const vatableSales = toPesos(
    data.vatableSales ?? (discount > 0 ? 0 : Number((total / 1.12).toFixed(2)))
  );
  const vatAmount = toPesos(
    data.vatAmount ?? (discount > 0 ? 0 : Number((total - vatableSales).toFixed(2)))
  );
  const vatExempt = toPesos(data.vatExemptSales ?? (discount > 0 ? Number(total.toFixed(2)) : 0));

  builder.text(padLine('  VATable Sales (12%):', formatPhp(vatableSales), 48));
  builder.text(padLine('  VAT Amount (12%):', formatPhp(vatAmount), 48));
  builder.text(padLine('  VAT-Exempt Sales:', formatPhp(vatExempt), 48));
  builder.text(padLine('  Zero-Rated Sales:', '0.00', 48));

  // Statutory SC / PWD signature block if discount was granted
  if (discount > 0) {
    builder.line(divider('-', 48));
    builder.line('SC / PWD BENEFICIARY ACKNOWLEDGMENT:');
    builder.line('Name:      _________________________________');
    builder.line('ID Number: _________________________________');
    builder.line('Signature: _________________________________');
  }

  // 9. Footer: Quote, Live Music Appreciation & Statutory Notice
  builder.line(divider('-', 48));
  builder.center();
  builder.line('"Writing about music is like dancing');
  builder.line('about architecture."');
  builder.line('- Thelonious Monk');
  builder.line();
  builder.line('Thank you for supporting live music!');
  builder.line('Please come back for the next set.');
  builder.line(divider('-', 48));
  builder.bold(true).line('THIS IS NOT AN OFFICIAL RECEIPT').bold(false);
  builder.cut(true);

  // Pulse cash drawer solenoid if requested
  if (shouldKickDrawer && paymentMethod === 'CASH') {
    builder.kickDrawer();
  }

  return builder.toBytes();
}

/**
 * Builds standard 80mm ESC/POS Order Runner / Expediter Chit
 */
export function buildRunnerChitBytes(data: any): Uint8Array {
  const builder = new EscPosBuilder();

  builder.center();
  if (data.isReprint) {
    builder.bold(true).line('*** REPRINT ***').bold(false);
  }

  builder.doubleHeight(true).bold(true).line('ORDER DISPATCH SLIP').doubleHeight(false).bold(false);

  const roundNum = data.roundNumber || 1;
  builder.bold(true).line(`*** ROUND ${roundNum} • EXPEDITER ***`).bold(false);

  const orderNo = data.orderNumber || data.orderId?.slice(0, 8) || 'N/A';
  builder.line(
    padLine(`ORDER #: ${orderNo}`, `TIME: ${data.timestamp || new Date().toLocaleTimeString()}`, 48)
  );
  builder.line(divider('-', 48));

  builder.left();
  if (data.tableNumber || data.tableLabel) {
    const tableStr = data.tableLabel || `Table ${data.tableNumber}`;
    builder.line(`DESTINATION: ${tableStr.padEnd(16)} TAB: ${data.tabName || 'Main'}`);
  } else {
    builder.line(`DESTINATION: TAKEOUT / COUNTER  TAB: ${data.tabName || 'Walk-in'}`);
  }
  builder.line(`SERVER:      ${cleanStaffName(data.waiterName)}`);
  builder.line(divider('=', 48));

  // Checklist format for expediter with station tags & clear notes
  const items = data.items || [];
  for (const item of items) {
    const qty = item.quantity || 1;
    let name = item.name || item.productName || 'Item';

    // Add variant specs if available
    if (item.temperature && item.temperature !== 'NONE' && !name.includes('(')) {
      const temp = item.temperature === 'HOT' ? 'Hot' : 'Iced';
      const size = item.size && item.size !== 'Standard' ? ` · ${item.size}` : '';
      name = `${name} (${temp}${size})`;
    } else if (item.size && item.size !== 'Standard' && !name.includes('(')) {
      name = `${name} (${item.size})`;
    }

    const station = (item.station || item.stationTarget || 'BAR').toUpperCase();
    const stationTag = `[${station}]`;
    const itemLeft = `[ ]  ${qty}x  ${name}`;

    builder
      .bold(true)
      .text(padLine(itemLeft, stationTag, 48))
      .bold(false);

    if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        builder.line(`         + ${mod}`);
      }
    }

    if (item.notes && item.notes.trim()) {
      builder.line(`         >> Prep: ${item.notes.trim()}`);
    }
  }

  builder
    .line(divider('=', 48))
    .center()
    .line("Monk's Dream Jazz Bar • Expediter Checklist")
    .cut(true);

  return builder.toBytes();
}

/**
 * Builds standard 80mm ESC/POS Takeout Slip
 */
export function buildTakeoutSlipBytes(data: any): Uint8Array {
  const builder = new EscPosBuilder();

  builder
    .center()
    .doubleHeight(true)
    .bold(true)
    .line('*** TAKEOUT / TO-GO ***')
    .line(`Order #${data.orderNumber || 'T-001'}`)
    .doubleHeight(false)
    .bold(false)
    .line(divider('-', 48));

  builder.left();
  builder.line(`Customer:    ${data.customerName || 'Guest'}`);
  builder.line(`Status:      ${data.isPrepaid ? '[PREPAID]' : '[PAY ON PICKUP]'}`);
  builder.line(`Time:        ${data.timestamp || new Date().toLocaleTimeString()}`);
  if (data.notes) {
    builder.line(`Packaging:   ${data.notes}`);
  }
  builder.line(divider('-', 48));

  const items = data.items || [];
  for (const item of items) {
    const qty = item.quantity || 1;
    const name = item.name || item.productName || 'Item';
    builder.bold(true).line(`[ ] ${qty}x ${name}`).bold(false);
    if (item.notes) {
      builder.line(`    Note: ${item.notes}`);
    }
  }

  builder
    .line(divider('-', 48))
    .center()
    .line('Keep with bagged order at Takeout counter.')
    .cut(true);

  return builder.toBytes();
}

/**
 * Builds standard 80mm ESC/POS Delivery Bag Tag
 */
export function buildDeliveryTagBytes(data: any): Uint8Array {
  const builder = new EscPosBuilder();

  builder
    .center()
    .doubleHeight(true)
    .bold(true)
    .line('*** ONLINE DELIVERY BAG ***')
    .line(`${data.platform || 'DELIVERY'} #${data.platformReference || 'REF-001'}`)
    .doubleHeight(false)
    .bold(false)
    .line(divider('-', 48));

  builder.left();
  builder.line(`Customer:    ${data.customerName || 'Customer'}`);
  if (data.riderName) {
    builder.line(`Courier:     ${data.riderName}`);
  }
  builder.line(`Items:       ${data.itemCount || data.items?.length || 1} items total`);
  if (data.address) {
    builder.line(`Address:     ${data.address}`);
  }
  builder.line(`Time:        ${data.timestamp || new Date().toLocaleTimeString()}`);
  builder.line(divider('-', 48));

  const items = data.items || [];
  if (items.length > 0) {
    for (const item of items) {
      const qty = item.quantity || 1;
      const name = item.name || item.productName || 'Item';
      builder.bold(true).line(`[ ] ${qty}x ${name}`).bold(false);
      if (item.notes) {
        builder.line(`    Note: ${item.notes}`);
      }
    }
    builder.line(divider('-', 48));
  }

  builder.center().line('Staple or attach to delivery bag exterior.').cut(true);

  return builder.toBytes();
}

/**
 * Builds standard 80mm ESC/POS Shift Reading Slip (X, Y, or Z Reading)
 */
export function buildReadingSlipBytes(reading: any): Uint8Array {
  const builder = new EscPosBuilder();
  const type = (reading.reading_type || 'X_READING').toUpperCase();
  const title =
    type === 'Z_READING'
      ? 'Z-READING (FINAL CLOSE)'
      : type === 'Y_READING'
        ? 'Y-READING (SHIFT CLOSE)'
        : 'X-READING (SNAPSHOT)';

  builder
    .center()
    .doubleHeight(true)
    .bold(true)
    .line("MONK'S DREAM")
    .line('JAZZ BAR AND CAFE')
    .doubleHeight(false)
    .bold(false)
    .line(title);

  if (reading.reading_number) {
    builder.bold(true).line(`#${reading.reading_number}`).bold(false);
  }
  builder.line(divider('-', 48));

  builder.left();
  builder.line(`Scope:       ${reading.drawer_target || 'Consolidated'}`);
  builder.line(`Staff:       ${reading.performed_by_name || 'Manager'}`);
  builder.line(
    `Closed At:   ${new Date(reading.closed_at || reading.created_at || Date.now()).toLocaleString()}`
  );
  builder.line(divider('-', 48));

  const sales = toPesos(reading.gross_sales || reading.net_sales || 0);
  builder.bold(true);
  builder.text(padLine('NET SALES:', `PHP ${formatPhp(sales)}`, 48));
  builder.bold(false);

  const cashExpected = toPesos(reading.expected_cash || 0);
  const cashCounted = toPesos(reading.counted_cash || 0);
  const variance = toPesos(reading.variance || 0);

  builder.text(padLine('Expected Cash:', `PHP ${formatPhp(cashExpected)}`, 48));
  builder.text(padLine('Counted Cash:', `PHP ${formatPhp(cashCounted)}`, 48));
  builder.bold(true);
  builder.text(padLine('VARIANCE:', `PHP ${formatPhp(variance)}`, 48));
  builder.bold(false);

  builder.line(divider('-', 48));
  builder
    .feed(2)
    .line('Staff Signature:   ____________________________')
    .feed(1)
    .line('Manager Signature: ____________________________')
    .cut(true);

  return builder.toBytes();
}

/**
 * Builds standalone Cash Drawer Kick ESC/POS byte sequence
 */
export function buildCashDrawerKickBytes(): Uint8Array {
  const builder = new EscPosBuilder();
  builder.kickDrawer();
  return builder.toBytes();
}
