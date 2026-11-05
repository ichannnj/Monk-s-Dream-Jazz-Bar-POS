/**
 * Browser-Native Binary ESC/POS Ticket & Receipt Builder
 * Uses standard browser Uint8Array and TextEncoder - zero external Node dependencies.
 */

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
    this.chunks.push(encoder.encode('\n'.repeat(lines)));
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

/**
 * Builds standard 80mm ESC/POS Customer Receipt
 */
export function buildReceiptBytes(data: any, shouldKickDrawer: boolean = false): Uint8Array {
  const builder = new EscPosBuilder();

  builder.center();
  if (data.isReprint) {
    builder.bold(true).line('*** REPRINT / DUPLICATE ***').bold(false).line();
  }

  // Header
  builder
    .doubleSize(true)
    .bold(true)
    .line("MONK'S DREAM")
    .line('JAZZ BAR')
    .doubleSize(false)
    .bold(false)
    .line('Digital Operations Platform')
    .line('------------------------------------------------');

  // Metadata
  builder.left();
  const receiptNo = data.receiptNumber || data.paymentId?.slice(0, 8) || 'REC-001';
  builder.line(`Receipt #: ${receiptNo}`);
  builder.line(`Date:      ${data.timestamp || data.settledAt || new Date().toLocaleString()}`);
  if (data.tableNumber) {
    builder.line(`Table:     ${data.tableNumber} (${data.tabName || 'Main'})`);
  } else if (data.tabName) {
    builder.line(`Tab:       ${data.tabName}`);
  }
  if (data.waiterName) {
    builder.line(`Staff:     ${cleanStaffName(data.waiterName)}`);
  }
  builder.line('------------------------------------------------');

  // Items
  const items = data.items || [];
  for (const item of items) {
    const qtyName = `${item.quantity}x ${item.name}`.slice(0, 32);
    const itemTotal = (item.total || (item.price || 0) * (item.quantity || 1)) / 100;
    const priceStr = formatPhp(itemTotal);
    builder.text(padLine(qtyName, priceStr, 48));
    if (item.isCorkage) {
      builder.line('   [Corkage Applied]');
    }
    if (item.notes) {
      builder.line(`   Note: ${item.notes}`);
    }
  }
  builder.line('------------------------------------------------');

  // Totals
  const subtotal = (data.subtotal || data.amount || 0) / 100;
  builder.text(padLine('Subtotal:', formatPhp(subtotal), 48));

  if (data.corkageFee && data.corkageFee > 0) {
    builder.text(padLine('Corkage Fee:', formatPhp(data.corkageFee / 100), 48));
  }
  if (data.discount && data.discount > 0) {
    builder.text(padLine('Discount:', `-${formatPhp(data.discount / 100)}`, 48));
  }

  // Bold Grand Total
  builder.bold(true);
  const total = (data.total || data.amount || 0) / 100;
  builder.text(padLine('TOTAL:', `PHP ${formatPhp(total)}`, 48));
  builder.bold(false);

  const tendered = (data.tendered || data.amount || 0) / 100;
  const change = (data.change || 0) / 100;
  builder.text(padLine('Tendered:', `PHP ${formatPhp(tendered)}`, 48));
  builder.text(padLine('Change:', `PHP ${formatPhp(change)}`, 48));

  const paymentMethod = (data.paymentMethod || data.payment_method || 'CASH').toUpperCase();
  const paymentChannel = data.paymentChannel || data.payment_channel;
  const paymentLabel = paymentChannel ? `${paymentChannel} QR` : paymentMethod;
  builder.text(padLine('Payment:', paymentLabel, 48));

  const refNo = data.referenceNumber || data.reference_number;
  if (refNo) {
    builder.text(padLine('Ref #:', `#${refNo}`, 48));
  }
  builder.line('------------------------------------------------');

  // Footer
  builder.center().line('Thank you for listening!').line('See you at the next set.').cut(true);

  // Pulse cash drawer solenoid if requested (e.g. Cash settlement)
  if (shouldKickDrawer) {
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

  builder.doubleSize(true).bold(true).line('ORDER DISPATCH SLIP').doubleSize(false).bold(false);

  const orderNo = data.orderNumber || data.orderId?.slice(0, 8) || 'N/A';
  let orderTitle = `Order #${orderNo}`;
  if (data.roundNumber) {
    orderTitle += ` [Round ${data.roundNumber}]`;
  }
  builder.line(orderTitle).line('------------------------------------------------');

  builder.left();
  if (data.tableNumber) {
    builder.line(`Destination: Table ${data.tableNumber} (${data.tabName || 'Main'})`);
  } else {
    builder.line(`Tab:         ${data.tabName || 'Walk-in'}`);
  }
  builder.line(`Server:      ${cleanStaffName(data.waiterName)}`);
  builder.line(`Sent At:     ${data.timestamp || new Date().toLocaleTimeString()}`);
  builder.line('------------------------------------------------');

  // Checklist format for expediter
  const items = data.items || [];
  for (const item of items) {
    builder.bold(true).line(`[ ] ${item.quantity}x ${item.name}`).bold(false);
    if (item.station) {
      builder.line(`    Station: ${item.station}`);
    }
    if (item.notes) {
      builder.line(`    Note: ${item.notes}`);
    }
  }

  builder
    .line('------------------------------------------------')
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
    .doubleSize(true)
    .bold(true)
    .line('*** TAKEOUT / TO-GO ***')
    .line(`Order #${data.orderNumber || 'T-001'}`)
    .doubleSize(false)
    .bold(false)
    .line('------------------------------------------------');

  builder.left();
  builder.line(`Customer:    ${data.customerName || 'Guest'}`);
  builder.line(`Status:      ${data.isPrepaid ? '[PREPAID]' : '[PAY ON PICKUP]'}`);
  builder.line(`Time:        ${data.timestamp || new Date().toLocaleTimeString()}`);
  if (data.notes) {
    builder.line(`Packaging:   ${data.notes}`);
  }
  builder.line('------------------------------------------------');

  const items = data.items || [];
  for (const item of items) {
    builder.bold(true).line(`[ ] ${item.quantity}x ${item.name}`).bold(false);
    if (item.notes) {
      builder.line(`    Note: ${item.notes}`);
    }
  }

  builder
    .line('------------------------------------------------')
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
    .doubleSize(true)
    .bold(true)
    .line('*** ONLINE DELIVERY BAG ***')
    .line(`${data.platform || 'DELIVERY'} #${data.platformReference || 'REF-001'}`)
    .doubleSize(false)
    .bold(false)
    .line('------------------------------------------------');

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
  builder.line('------------------------------------------------');

  const items = data.items || [];
  if (items.length > 0) {
    for (const item of items) {
      builder.bold(true).line(`[ ] ${item.quantity}x ${item.name}`).bold(false);
      if (item.notes) {
        builder.line(`    Note: ${item.notes}`);
      }
    }
    builder.line('------------------------------------------------');
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
    .doubleSize(true)
    .bold(true)
    .line("MONK'S DREAM")
    .line('JAZZ BAR')
    .doubleSize(false)
    .bold(false)
    .line(title);

  if (reading.reading_number) {
    builder.bold(true).line(`#${reading.reading_number}`).bold(false);
  }
  builder.line('------------------------------------------------');

  builder.left();
  builder.line(`Scope:       ${reading.drawer_target || 'Consolidated'}`);
  builder.line(`Staff:       ${reading.performed_by_name || 'Manager'}`);
  builder.line(
    `Closed At:   ${new Date(reading.closed_at || reading.created_at || Date.now()).toLocaleString()}`
  );
  builder.line('------------------------------------------------');

  const sales = (reading.gross_sales || reading.net_sales || 0) / 100;
  builder.bold(true);
  builder.text(padLine('NET SALES:', `PHP ${formatPhp(sales)}`, 48));
  builder.bold(false);

  const cashExpected = (reading.expected_cash || 0) / 100;
  const cashCounted = (reading.counted_cash || 0) / 100;
  const variance = (reading.variance || 0) / 100;

  builder.text(padLine('Expected Cash:', `PHP ${formatPhp(cashExpected)}`, 48));
  builder.text(padLine('Counted Cash:', `PHP ${formatPhp(cashCounted)}`, 48));
  builder.bold(true);
  builder.text(padLine('VARIANCE:', `PHP ${formatPhp(variance)}`, 48));
  builder.bold(false);

  builder.line('------------------------------------------------');
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
