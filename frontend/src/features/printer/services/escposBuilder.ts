/**
 * Browser-Native Binary ESC/POS Ticket & Receipt Builder
 * Optimized for Monk's Dream Jazz Bar and Cafe 80mm Thermal Hardware.
 * Uses standard browser Uint8Array and TextEncoder - zero external Node dependencies.
 */

import { getMonksDreamLogoRasterBytes } from '../assets/logoRasterBytes';
import { EscPosBuilder, ESCPOS } from './escposEngine';
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

export { EscPosBuilder, ESCPOS };
export { aggregateReceiptItems };
export * from './escposSpecialSlips';

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

  // 5. Line Items (Aggregated across rounds)
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
      item.total ?? toPesos(item.price || item.unit_price) * (item.quantity || 1)
    );
    builder.text(formatItemLine(qtyStr, desc, formatPhp(itemTotal), 48));

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

  builder.line(divider('-', 48));

  // 6. Financial Summary & Totals
  const subtotal = toPesos(data.subtotal || data.amount || 0);
  builder.text(padLine('SUBTOTAL (Gross Sales):', formatPhp(subtotal), 48));

  const corkage = toPesos(data.corkageFee || data.corkageAmount || data.corkage_amount || 0);
  if (corkage > 0) {
    builder.text(padLine('CORKAGE FEE:', formatPhp(corkage), 48));
  }

  const rawVatExempt = toPesos(data.vatExemptSales || data.vat_exempt_sales || 0);
  if (rawVatExempt > 0 && subtotal > rawVatExempt) {
    const vatRelief = subtotal - rawVatExempt;
    builder.text(padLine('LESS: VAT EXEMPTION (12%):', `-${formatPhp(vatRelief)}`, 48));
  }

  const discount = toPesos(data.discountAmount || data.discount || data.discount_amount || 0);
  if (discount > 0) {
    builder.text(padLine('LESS: DISCOUNT:', `-${formatPhp(discount)}`, 48));
  }

  const serviceCharge = toPesos(data.serviceCharge || data.service_charge || 0);
  if (serviceCharge > 0) {
    builder.text(padLine('SERVICE CHARGE:', formatPhp(serviceCharge), 48));
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
  const seniorId = data.seniorPwdId || data.senior_pwd_id;
  const seniorName = data.seniorPwdName || data.senior_pwd_name;
  const discountType = (data.discountType || data.discount_type || '').toUpperCase();

  if (seniorId || discountType === 'SENIOR_CITIZEN' || discountType === 'PWD') {
    builder.line(divider('-', 48));
    builder.line('SC / PWD BENEFICIARY ACKNOWLEDGMENT:');
    if (discountType === 'PWD') {
      builder.line('Type:      PERSON WITH DISABILITY (PWD)');
    } else {
      builder.line('Type:      SENIOR CITIZEN (OSCA)');
    }
    builder.line(`ID Number: ${seniorId || '_________________________________'}`);
    builder.line(
      `Name:      ${seniorName ? String(seniorName).toUpperCase() : '_________________________________'}`
    );
    builder.line('Signature: _________________________________');
  }

  // 9. Footer
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

  if (shouldKickDrawer && paymentMethod === 'CASH') {
    builder.kickDrawer();
  }

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
