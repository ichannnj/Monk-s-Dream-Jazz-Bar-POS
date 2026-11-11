import { EscPosBuilder } from './escposEngine';
import { cleanStaffName, toPesos, formatPhp, padLine, divider } from './escposFormatters';

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

  const readingNum = reading.z_number || reading.y_number || reading.reading_number;
  if (readingNum) {
    builder.bold(true).line(`#${readingNum}`).bold(false);
  }
  builder.line(divider('-', 48));

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
  builder.line(divider('=', 48));

  const gross = toPesos(reading.gross_sales || 0);
  const discounts = toPesos(reading.discounts || reading.discount_total || 0);
  const sc = toPesos(reading.service_charge || 0);
  const netSales = toPesos(reading.net_sales || gross - discounts);

  builder.text(padLine('GROSS SALES:', formatPhp(gross), 48));
  if (discounts > 0) {
    builder.text(padLine('LESS: DISCOUNTS:', `-${formatPhp(discounts)}`, 48));
  }
  if (sc > 0) {
    builder.text(padLine('SERVICE CHARGE:', formatPhp(sc), 48));
  }
  builder.line(divider('-', 48));
  builder.bold(true);
  builder.text(padLine('NET SALES (TOTAL):', `PHP ${formatPhp(netSales)}`, 48));
  builder.bold(false);

  const cafeNet = toPesos(reading.cafe_net_sales || 0);
  const eventNet = toPesos(reading.event_net_sales || 0);
  if (cafeNet > 0 || eventNet > 0) {
    builder.text(padLine('  Daytime Cafe Sales:', formatPhp(cafeNet), 48));
    builder.text(padLine('  Evening Jazz Sales:', formatPhp(eventNet), 48));
  }

  builder.line(divider('-', 48));
  builder.line('TAX & STATUTORY BREAKDOWN:');
  builder.text(
    padLine('  VATable Sales (12%):', formatPhp(toPesos(reading.vatable_sales || 0)), 48)
  );
  builder.text(padLine('  VAT Amount (12%):', formatPhp(toPesos(reading.vat_amount || 0)), 48));
  builder.text(
    padLine('  VAT-Exempt Sales:', formatPhp(toPesos(reading.vat_exempt_sales || 0)), 48)
  );

  builder.line(divider('-', 48));
  builder.line('PAYMENT TENDER BREAKDOWN:');
  builder.text(padLine('  Cash Tendered:', formatPhp(toPesos(reading.tender_cash || 0)), 48));
  builder.text(padLine('  Card Terminal:', formatPhp(toPesos(reading.tender_card || 0)), 48));
  builder.text(
    padLine('  Digital QR (GCash/Maya):', formatPhp(toPesos(reading.tender_digital || 0)), 48)
  );
  builder.text(
    padLine('  Online Delivery Apps:', formatPhp(toPesos(reading.tender_delivery || 0)), 48)
  );
  builder.line(divider('-', 48));
  builder.bold(true);
  builder.text(
    padLine('TOTAL TENDER RECONCILED:', formatPhp(toPesos(reading.total_tender || 0)), 48)
  );
  builder.bold(false);

  builder.line(divider('=', 48));
  builder.line('CASH DRAWER RECONCILIATION:');
  builder.text(padLine('  Opening Float:', formatPhp(toPesos(reading.opening_float || 0)), 48));
  builder.text(padLine('  (+) Cash Sales:', formatPhp(toPesos(reading.tender_cash || 0)), 48));
  builder.text(padLine('  (+) Cash In / Floats:', formatPhp(toPesos(reading.cash_in || 0)), 48));
  builder.text(
    padLine('  (-) Petty Cash Out:', `-${formatPhp(toPesos(reading.cash_out || 0))}`, 48)
  );
  builder.text(
    padLine('  (-) Safe Cash Drops:', `-${formatPhp(toPesos(reading.safe_drops || 0))}`, 48)
  );
  builder.line(divider('-', 48));

  const cashExpected = toPesos(reading.expected_cash || 0);
  const cashCounted = toPesos(reading.counted_cash || 0);
  const variance = toPesos(reading.variance || 0);

  builder.bold(true);
  builder.text(padLine('EXPECTED DRAWER CASH:', `PHP ${formatPhp(cashExpected)}`, 48));
  if (type !== 'X_READING') {
    builder.text(padLine('PHYSICAL CASH COUNTED:', `PHP ${formatPhp(cashCounted)}`, 48));
    builder.text(padLine('CASH VARIANCE (OVER/SHORT):', `PHP ${formatPhp(variance)}`, 48));
  }
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
