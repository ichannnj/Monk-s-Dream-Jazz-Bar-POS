import { getMonksDreamLogoRasterBytes, ThermalPaperWidth } from '../assets/logoRasterBytes';
import { EscPosBuilder } from './escposEngine';
import {
  cleanStaffName,
  toPesos,
  formatPhp,
  padLine,
  divider,
  formatDateTime,
  formatItemLine,
} from './escposFormatters';
import { aggregateReceiptItems } from './receiptItemAggregator';

/**
 * Builds standard 80mm or 57mm ESC/POS Order Runner / Expediter Chit
 */
export function buildRunnerChitBytes(
  data: any,
  paperWidth: ThermalPaperWidth = '80mm'
): Uint8Array {
  const is57mm = paperWidth === '57mm' || paperWidth === '58mm';
  const cols = is57mm ? 32 : 48;
  const builder = new EscPosBuilder();

  builder.center();
  if (data.isReprint) {
    builder.bold(true).line('*** REPRINT ***').bold(false);
  }

  builder.doubleHeight(true).bold(true).line('ORDER DISPATCH SLIP').doubleHeight(false).bold(false);

  const roundNum = data.roundNumber || 1;
  builder.bold(true).line(`*** ROUND ${roundNum} • EXPEDITER ***`).bold(false);

  const orderNo = data.orderNumber || data.orderId?.slice(0, 8) || 'N/A';
  const timeStr = data.timestamp || new Date().toLocaleTimeString();
  if (is57mm) {
    builder.line(`ORDER #: ${orderNo}`).line(`TIME:    ${timeStr}`);
  } else {
    builder.line(padLine(`ORDER #: ${orderNo}`, `TIME: ${timeStr}`, cols));
  }
  builder.line(divider('-', cols));

  builder.left();
  if (data.tableNumber || data.tableLabel) {
    const tableStr = data.tableLabel || `Table ${data.tableNumber}`;
    if (is57mm) {
      builder.line(`DEST: ${tableStr}`).line(`TAB:  ${data.tabName || 'Main'}`);
    } else {
      builder.line(`DESTINATION: ${tableStr.padEnd(16)} TAB: ${data.tabName || 'Main'}`);
    }
  } else {
    if (is57mm) {
      builder.line(`DEST: TAKEOUT/COUNTER`).line(`TAB:  ${data.tabName || 'Walk-in'}`);
    } else {
      builder.line(`DESTINATION: TAKEOUT / COUNTER  TAB: ${data.tabName || 'Walk-in'}`);
    }
  }
  builder.line(`SERVER:      ${cleanStaffName(data.waiterName)}`);
  builder.line(divider('=', cols));

  const items = data.items || [];
  for (const item of items) {
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

    if (itemLeft.length + stationTag.length < cols) {
      builder
        .bold(true)
        .text(padLine(itemLeft, stationTag, cols))
        .bold(false);
    } else {
      builder.bold(true).line(itemLeft).line(`     ${stationTag}`).bold(false);
    }

    if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        builder.line(`         + ${mod}`);
      }
    }

    if (item.notes && item.notes.trim()) {
      builder.line(`         >> Prep: ${item.notes.trim()}`);
    }
  }

  builder.line(divider('=', cols)).center().line("Monk's Dream Jazz Bar • Expediter").cut(true);

  return builder.toBytes();
}

/**
 * Builds standard 80mm or 57mm ESC/POS Takeout Slip
 */
export function buildTakeoutSlipBytes(
  data: any,
  paperWidth: ThermalPaperWidth = '80mm'
): Uint8Array {
  const is57mm = paperWidth === '57mm' || paperWidth === '58mm';
  const cols = is57mm ? 32 : 48;
  const builder = new EscPosBuilder();

  builder
    .center()
    .doubleHeight(true)
    .bold(true)
    .line('*** TAKEOUT / TO-GO ***')
    .line(`Order #${data.orderNumber || 'T-001'}`)
    .doubleHeight(false)
    .bold(false)
    .line(divider('-', cols));

  builder.left();
  builder.line(`Customer:    ${data.customerName || 'Guest'}`);
  builder.line(`Status:      ${data.isPrepaid ? '[PREPAID]' : '[PAY ON PICKUP]'}`);
  builder.line(`Time:        ${data.timestamp || new Date().toLocaleTimeString()}`);
  if (data.notes) {
    builder.line(`Packaging:   ${data.notes}`);
  }
  builder.line(divider('-', cols));

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
    .line(divider('-', cols))
    .center()
    .line('Keep with bagged order at Takeout counter.')
    .cut(true);

  return builder.toBytes();
}

/**
 * Builds standard 80mm or 57mm ESC/POS Delivery Bag Tag
 */
export function buildDeliveryTagBytes(
  data: any,
  paperWidth: ThermalPaperWidth = '80mm'
): Uint8Array {
  const is57mm = paperWidth === '57mm' || paperWidth === '58mm';
  const cols = is57mm ? 32 : 48;
  const builder = new EscPosBuilder();

  builder
    .center()
    .doubleHeight(true)
    .bold(true)
    .line('*** ONLINE DELIVERY BAG ***')
    .line(`${data.platform || 'DELIVERY'} #${data.platformReference || 'REF-001'}`)
    .doubleHeight(false)
    .bold(false)
    .line(divider('-', cols));

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
  builder.line(divider('-', cols));

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
    builder.line(divider('-', cols));
  }

  builder.center().line('Attach to delivery bag exterior.').cut(true);

  return builder.toBytes();
}

/**
 * Builds standard 80mm or 57mm ESC/POS Shift Reading Slip (X, Y, or Z Reading)
 */
export function buildReadingSlipBytes(
  reading: any,
  paperWidth: ThermalPaperWidth = '80mm'
): Uint8Array {
  const is57mm = paperWidth === '57mm' || paperWidth === '58mm';
  const cols = is57mm ? 32 : 48;
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

  const readingNum = reading.z_number || reading.y_number || reading.reading_number;
  if (readingNum) {
    builder.bold(true).line(`#${readingNum}`).bold(false);
  }
  builder.line(divider('-', cols));

  builder.left();
  const scopeLabel = (reading.drawer_target || reading.scope || 'Consolidated').toUpperCase();
  builder.line(`Scope:       ${scopeLabel} TILL`);
  builder.line(`Staff:       ${reading.performed_by_name || reading.staff_name || 'Manager'}`);
  builder.line(
    `Date/Time:   ${new Date(reading.closed_at || reading.created_at || Date.now()).toLocaleString()}`
  );
  if (reading.first_receipt_no && reading.last_receipt_no) {
    builder.line(`Checks:      ${reading.first_receipt_no} - ${reading.last_receipt_no}`);
  }
  builder.line(divider('=', cols));

  const gross = toPesos(reading.gross_sales || 0);
  const discounts = toPesos(reading.discounts || reading.discount_total || 0);
  const sc = toPesos(reading.service_charge || 0);
  const netSales = toPesos(reading.net_sales || gross - discounts);

  builder.text(padLine('GROSS SALES:', formatPhp(gross), cols));
  if (discounts > 0) {
    builder.text(padLine('LESS: DISCOUNTS:', `-${formatPhp(discounts)}`, cols));
  }
  if (sc > 0) {
    builder.text(padLine('SERVICE CHARGE:', formatPhp(sc), cols));
  }
  builder.line(divider('-', cols));
  builder.bold(true);
  builder.text(padLine('NET SALES (TOTAL):', `PHP ${formatPhp(netSales)}`, cols));
  builder.bold(false);

  const cafeNet = toPesos(reading.cafe_net_sales || 0);
  const eventNet = toPesos(reading.event_net_sales || 0);
  if (cafeNet > 0 || eventNet > 0) {
    builder.text(padLine('  Cafe Net Sales:', formatPhp(cafeNet), cols));
    builder.text(padLine('  Event Net Sales:', formatPhp(eventNet), cols));
  }

  builder.line(divider('-', cols));
  builder.line('TAX & STATUTORY BREAKDOWN:');
  builder.text(
    padLine('  VATable Sales (12%):', formatPhp(toPesos(reading.vatable_sales || 0)), cols)
  );
  builder.text(padLine('  VAT Amount (12%):', formatPhp(toPesos(reading.vat_amount || 0)), cols));
  builder.text(
    padLine('  VAT-Exempt Sales:', formatPhp(toPesos(reading.vat_exempt_sales || 0)), cols)
  );

  builder.line(divider('-', cols));
  builder.line('PAYMENT TENDER BREAKDOWN:');
  builder.text(padLine('  Cash Tendered:', formatPhp(toPesos(reading.tender_cash || 0)), cols));
  builder.text(padLine('  Card Terminal:', formatPhp(toPesos(reading.tender_card || 0)), cols));
  builder.text(padLine('  Digital QR:', formatPhp(toPesos(reading.tender_digital || 0)), cols));
  builder.text(
    padLine('  Online Delivery:', formatPhp(toPesos(reading.tender_delivery || 0)), cols)
  );
  builder.line(divider('-', cols));
  builder.bold(true);
  builder.text(padLine('TOTAL TENDER:', formatPhp(toPesos(reading.total_tender || 0)), cols));
  builder.bold(false);

  builder.line(divider('=', cols));
  builder.line('CASH DRAWER RECONCILIATION:');
  builder.text(padLine('  Opening Float:', formatPhp(toPesos(reading.opening_float || 0)), cols));
  builder.text(padLine('  (+) Cash Sales:', formatPhp(toPesos(reading.tender_cash || 0)), cols));
  builder.text(padLine('  (+) Cash In:', formatPhp(toPesos(reading.cash_in || 0)), cols));
  builder.text(padLine('  (-) Petty Out:', `-${formatPhp(toPesos(reading.cash_out || 0))}`, cols));
  builder.text(
    padLine('  (-) Safe Drops:', `-${formatPhp(toPesos(reading.safe_drops || 0))}`, cols)
  );
  builder.line(divider('-', cols));

  const cashExpected = toPesos(reading.expected_cash || 0);
  const cashCounted = toPesos(reading.counted_cash || 0);
  const variance = toPesos(reading.variance || 0);

  builder.bold(true);
  builder.text(padLine('EXPECTED CASH:', `PHP ${formatPhp(cashExpected)}`, cols));
  if (type !== 'X_READING') {
    builder.text(padLine('COUNTED CASH:', `PHP ${formatPhp(cashCounted)}`, cols));
    builder.text(padLine('VARIANCE:', `PHP ${formatPhp(variance)}`, cols));
  }
  builder.bold(false);

  builder.line(divider('-', cols));
  builder
    .feed(2)
    .line('Staff Signature:   __________________')
    .feed(1)
    .line('Manager Signature: __________________')
    .cut(true);

  return builder.toBytes();
}

/**
 * Builds standard 80mm or 57mm ESC/POS Bill Statement / Guest Check (Pre-Payment Slip).
 * Crucial: Does NOT kick the cash drawer.
 */
export function buildBillStatementBytes(
  data: any,
  paperWidth: ThermalPaperWidth = '80mm'
): Uint8Array {
  const is57mm = paperWidth === '57mm' || paperWidth === '58mm';
  const cols = is57mm ? 32 : 48;
  const builder = new EscPosBuilder();

  builder.center();
  if (data.isReprint) {
    builder.bold(true).line('*** REPRINT ***').bold(false).line();
  }

  // 1. Bitonal High-Contrast Graphic Logo Lockup
  const logoBytes = getMonksDreamLogoRasterBytes(paperWidth);
  if (logoBytes && logoBytes.length > 0) {
    builder.center().imageRaster(logoBytes).feed(1);
  } else {
    builder.bold(true).doubleHeight(true).line("MONK'S DREAM").doubleHeight(false);
  }

  // 2. Business Header
  builder.bold(true).line('JAZZ BAR AND CAFE').bold(false).line('Craft Cocktails & Fine Jazz');

  if (is57mm) {
    builder.line('Tel: +63 917 555 1957').line('IG/FB: @monksdreamjazz');
  } else {
    builder.line('Tel: +63 917 555 1957  •  IG/FB: @monksdreamjazz');
  }
  builder.line(divider('-', cols));

  // 3. Bill Statement Banner
  builder
    .bold(true)
    .line('*** BILL STATEMENT / GUEST CHECK ***')
    .line('*** UNPAID — PLEASE PAY AT CASHIER ***')
    .bold(false)
    .line(divider('=', cols));

  // 4. Metadata Section
  builder.left();
  const billNo =
    data.receiptNumber ||
    data.checkNumber ||
    `MD-BILL-${(data.tabId || data.id || '001').slice(0, 8).toUpperCase()}`;
  const operatingMode = (data.operatingMode || data.operating_mode || 'CAFE').toUpperCase();
  const modeLabel = operatingMode === 'EVENT' ? 'EVENT NIGHT' : 'DAYTIME CAFE';

  if (is57mm) {
    builder.bold(true).line(`BILL #:  ${billNo}`).bold(false);
    builder.line(`MODE:    ${modeLabel}`);
  } else {
    builder
      .bold(true)
      .text(padLine(`BILL #:  ${billNo}`, `MODE: ${modeLabel}`, cols))
      .bold(false);
  }
  builder.line(
    `DATE:    ${formatDateTime(data.timestamp || data.createdAt || new Date().toISOString())}`
  );

  if (data.tableNumber || data.tableLabel) {
    const tableStr = data.tableLabel || `Table ${data.tableNumber}`;
    const tabStr = data.tabName || data.customerName || data.guestName || 'Main Tab';
    if (is57mm) {
      builder.line(`TABLE:   ${tableStr}`);
      builder.line(`TAB:     ${tabStr}`);
    } else {
      builder.line(`TABLE:   ${tableStr.padEnd(16)} TAB: ${tabStr}`);
    }
  } else {
    const tabStr = data.tabName || data.customerName || data.guestName || 'Takeout / Counter';
    builder.line(`TAB:     ${tabStr}`);
  }

  const staff = cleanStaffName(
    data.waiterName || data.serverName || data.cashierName || data.staff_name
  );
  if (is57mm) {
    builder.line(`SERVER:  ${staff}`);
  } else {
    builder.line(`SERVER:  ${staff.padEnd(16)} TERMINAL: TILL-1`);
  }
  builder.line(divider('=', cols));

  // 5. Items Table Header
  builder
    .bold(true)
    .text(padLine('QTY  DESCRIPTION', 'AMOUNT (PHP)', cols))
    .bold(false);
  builder.line(divider('=', cols));

  // 6. Aggregated Line Items
  const items = aggregateReceiptItems(data.items || []);
  for (const item of items) {
    const qtyStr = `${item.quantity || 1}x`.padEnd(3, ' ');
    let desc = item.name || item.productName || 'Item';

    if (!desc.includes('(')) {
      const parts: string[] = [];
      if (item.flavor) parts.push(item.flavor);
      if (item.temperature && item.temperature !== 'NONE') {
        parts.push(item.temperature === 'HOT' ? 'Hot' : 'Iced');
      }
      if (item.size && item.size !== 'Standard') {
        parts.push(item.size);
      }
      if (parts.length > 0) {
        desc = `${desc} (${parts.join(' · ')})`;
      }
    }

    const itemTotal = toPesos(
      item.total ?? toPesos(item.price || item.unit_price || item.unitPrice) * (item.quantity || 1)
    );
    builder.text(formatItemLine(qtyStr, desc, formatPhp(itemTotal), cols));

    if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        builder.line(`     + ${mod}`);
      }
    }

    if (item.notes && item.notes.trim()) {
      builder.line(`     >> Note: ${item.notes.trim()}`);
    }

    if (item.isCorkage || item.is_corkage) {
      builder.line(`     [Corkage Applied]`);
    }
  }

  builder.line(divider('-', cols));

  // 7. Financial Summary & Totals
  const subtotal = toPesos(data.subtotal || data.amount || 0);
  const subtotalLabel = is57mm ? 'SUBTOTAL (Gross):' : 'SUBTOTAL (Gross Sales):';
  builder.text(padLine(subtotalLabel, formatPhp(subtotal), cols));

  const corkage = toPesos(data.corkageFee || data.corkageAmount || data.corkage_amount || 0);
  if (corkage > 0) {
    builder.text(padLine('CORKAGE FEE:', formatPhp(corkage), cols));
  }

  const rawVatExempt = toPesos(data.vatExemptSales || data.vat_exempt_sales || 0);
  if (rawVatExempt > 0 && subtotal > rawVatExempt) {
    const vatRelief = subtotal - rawVatExempt;
    const vatExemptLabel = is57mm ? 'LESS: VAT EXEMPT (12%):' : 'LESS: VAT EXEMPTION (12%):';
    builder.text(padLine(vatExemptLabel, `-${formatPhp(vatRelief)}`, cols));
  }

  const discount = toPesos(data.discountAmount || data.discount || data.discount_amount || 0);
  if (discount > 0) {
    builder.text(padLine('LESS: DISCOUNT:', `-${formatPhp(discount)}`, cols));
  }

  const serviceCharge = toPesos(data.serviceCharge || data.service_charge || 0);
  if (serviceCharge > 0) {
    builder.text(padLine('SERVICE CHARGE:', formatPhp(serviceCharge), cols));
  }

  // Bold Total Amount Due
  builder.line(divider('=', cols));
  builder.bold(true).doubleHeight(true);
  const total = toPesos(data.total || data.amount || subtotal + corkage - discount + serviceCharge);
  const totalLabel = is57mm ? 'TOTAL DUE:' : 'TOTAL AMOUNT DUE:';
  builder.text(padLine(totalLabel, `PHP ${formatPhp(total)}`, cols));
  builder.doubleHeight(false).bold(false);
  builder.line(divider('=', cols));

  // 8. Philippine VAT & Statutory Breakdown
  builder.line(divider('-', cols));
  builder.line(is57mm ? 'TAX & STATUTORY (EST.):' : 'TAX & STATUTORY BREAKDOWN (ESTIMATE):');
  const vatableSales = toPesos(
    data.vatableSales ?? (discount > 0 ? 0 : Number((total / 1.12).toFixed(2)))
  );
  const vatAmount = toPesos(
    data.vatAmount ?? (discount > 0 ? 0 : Number((total - vatableSales).toFixed(2)))
  );
  const vatExempt = toPesos(data.vatExemptSales ?? (discount > 0 ? Number(total.toFixed(2)) : 0));

  builder.text(padLine('  VATable Sales (12%):', formatPhp(vatableSales), cols));
  builder.text(padLine('  VAT Amount (12%):', formatPhp(vatAmount), cols));
  builder.text(padLine('  VAT-Exempt Sales:', formatPhp(vatExempt), cols));
  builder.text(padLine('  Zero-Rated Sales:', '0.00', cols));

  // 9. Instructions & Closing
  builder.line(divider('-', cols));
  builder.center();
  builder.bold(true).line('*** UNPAID — PLEASE PAY AT CASHIER ***').bold(false);
  builder.line('This slip is for order review and billing verification.');
  builder.line('Please present this bill when paying at the till.');
  builder.line(divider('-', cols));
  builder.bold(true).line('THIS IS NOT AN OFFICIAL RECEIPT').bold(false);
  builder.cut(true);

  return builder.toBytes();
}
