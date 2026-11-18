/**
 * Browser-Native Binary ESC/POS Ticket & Receipt Builder
 * Optimized for Monk's Dream Jazz Bar and Cafe 80mm Thermal Hardware.
 * Uses standard browser Uint8Array and TextEncoder - zero external Node dependencies.
 */

import { getMonksDreamLogoRasterBytes, ThermalPaperWidth } from '../assets/logoRasterBytes';
import { EscPosBuilder, ESCPOS } from './escposEngine';
import {
  cleanStaffName,
  toPesos,
  formatPhp,
  padLine,
  divider,
  formatDateTime,
  formatItemLine,
  formatModifierLine,
  sanitizeForEscPos,
} from './escposFormatters';
import { aggregateReceiptItems } from './receiptItemAggregator';

export { EscPosBuilder, ESCPOS };
export { aggregateReceiptItems };
export * from './escposSpecialSlips';

/**
 * Builds standard 80mm or 57mm ESC/POS Customer Receipt for Monk's Dream Jazz Bar and Cafe
 */
export function buildReceiptBytes(
  data: any,
  shouldKickDrawer: boolean = false,
  paperWidth: ThermalPaperWidth = '57mm'
): Uint8Array {
  const is57mm = paperWidth === '57mm' || paperWidth === '58mm';
  const cols = is57mm ? 32 : 48;
  const builder = new EscPosBuilder();

  builder.center();
  if (data.isReprint) {
    builder.bold(true).line('*** REPRINT / DUPLICATE ***').bold(false).line();
  }

  // 1. Bitonal High-Contrast Graphic Logo Lockup (Brand Typography + Jazz Emblem)
  const logoBytes = getMonksDreamLogoRasterBytes(paperWidth);
  if (logoBytes && logoBytes.length > 0) {
    builder.center().imageRaster(logoBytes).feed(1);
  } else {
    // Fallback if bitmap is unavailable
    builder.bold(true).doubleHeight(true).line("MONK'S DREAM").doubleHeight(false);
  }

  // 2. Business Header
  builder.bold(true).line('Jazz Cafe and Bar').bold(false);
  builder.line(divider('-', cols));

  // 3. Metadata Section
  builder.left();
  const receiptNo =
    data.receiptNumber ||
    data.checkNumber ||
    `MD-${(data.paymentId || data.id || '001').slice(0, 8).toUpperCase()}`;

  builder.bold(true).line(`CHECK #: ${receiptNo}`).bold(false);
  builder.line(`DATE:    ${formatDateTime(data.settledAt || data.timestamp)}`);

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

  const staff = cleanStaffName(data.cashierName || data.waiterName || data.staff_name);
  if (is57mm) {
    builder.line(`STAFF:   ${staff}`);
  } else {
    builder.line(`STAFF:   ${staff.padEnd(16)} TERMINAL: TILL-1`);
  }
  builder.line(divider('=', cols));

  // 4. Items Table Header
  builder
    .bold(true)
    .text(padLine('QTY  DESCRIPTION', 'AMOUNT (PHP)', cols))
    .bold(false);
  builder.line(divider('=', cols));

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
    builder.text(formatItemLine(qtyStr, desc, formatPhp(itemTotal), cols));

    if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        builder.text(formatModifierLine(mod, cols));
      }
    }

    if (item.notes && item.notes.trim()) {
      const cleanNote = sanitizeForEscPos(item.notes.trim());
      builder.line(`     >> Note: ${cleanNote}`);
    }

    if (item.isCorkage || item.is_corkage) {
      builder.line(`     [Corkage Applied]`);
    }
  }

  builder.line(divider('-', cols));

  // 6. Financial Summary & Totals
  const subtotal = toPesos(data.subtotal || data.amount || 0);
  const subtotalLabel = is57mm ? 'SUBTOTAL (Gross):' : 'SUBTOTAL (Gross Sales):';
  builder.text(padLine(subtotalLabel, formatPhp(subtotal), cols));

  const corkage = toPesos(data.corkageFee || data.corkageAmount || data.corkage_amount || 0);
  if (corkage > 0) {
    builder.text(padLine('CORKAGE FEE:', formatPhp(corkage), cols));
  }

  // Combine discounts (e.g. Senior/PWD + custom discount) without advertising 12% VAT exemption on provisional receipts
  const rawVatExempt = toPesos(data.vatExemptSales || data.vat_exempt_sales || 0);
  const vatRelief = rawVatExempt > 0 && subtotal > rawVatExempt ? subtotal - rawVatExempt : 0;
  const rawDiscount = toPesos(data.discountAmount || data.discount || data.discount_amount || 0);
  const totalDiscount = rawDiscount + vatRelief;

  if (totalDiscount > 0) {
    builder.text(padLine('LESS: DISCOUNT:', `-${formatPhp(totalDiscount)}`, cols));
  }

  const serviceCharge = toPesos(data.serviceCharge || data.service_charge || 0);
  if (serviceCharge > 0) {
    builder.text(padLine('SERVICE CHARGE:', formatPhp(serviceCharge), cols));
  }

  // Bold Grand Total
  builder.line(divider('=', cols));
  builder.bold(true).doubleHeight(true);
  const total = toPesos(
    data.total || data.amount || subtotal + corkage - totalDiscount + serviceCharge
  );
  const totalLabel = is57mm ? 'TOTAL DUE:' : 'TOTAL AMOUNT DUE:';
  builder.text(padLine(totalLabel, `PHP ${formatPhp(total)}`, cols));
  builder.doubleHeight(false).bold(false);
  builder.line(divider('=', cols));

  // 7. Payment Tendered & Change
  const paymentMethod = (data.paymentMethod || data.payment_method || 'CASH').toUpperCase();
  const tenders = data.tenders || data.tenderBreakdown || data.tender_breakdown;
  const isSplit = paymentMethod === 'SPLIT' || (Array.isArray(tenders) && tenders.length > 0);

  if (isSplit && Array.isArray(tenders) && tenders.length > 0) {
    const splitLabel = is57mm ? 'PAYMENT (SPLIT):' : 'PAYMENT BREAKDOWN (SPLIT):';
    builder.text(padLine(splitLabel, `PHP ${formatPhp(total)}`, cols));
    for (const t of tenders) {
      const rawMethod = String(t.method || t.payment_method || t.paymentMethod || '').toLowerCase();
      const amt = toPesos(t.amount);
      if (rawMethod === 'cash') {
        builder.text(padLine('  CASH:', `PHP ${formatPhp(amt)}`, cols));
        const tTendered = toPesos(t.tendered);
        if (tTendered > amt) {
          builder.text(padLine('    Tendered:', `PHP ${formatPhp(tTendered)}`, cols));
          const tChange = toPesos(t.change ?? tTendered - amt);
          builder.text(padLine('    Change:', `PHP ${formatPhp(tChange)}`, cols));
        }
      } else if (rawMethod === 'digital_wallet' || rawMethod === 'wallet' || rawMethod === 'qr') {
        const chan = (t.channel || t.paymentChannel || t.payment_channel || 'Wallet').toUpperCase();
        const ref = t.referenceNumber || t.reference_number;
        const refLabel = ref ? ` [Ref: ${ref}]` : '';
        builder.text(padLine(`  ${chan}${refLabel}:`, `PHP ${formatPhp(amt)}`, cols));
      } else if (rawMethod === 'card') {
        const last4 = t.last4Digits || t.last4_digits;
        const cardLabel = last4 ? `CARD [**** ${last4}]` : 'CARD';
        builder.text(padLine(`  ${cardLabel}:`, `PHP ${formatPhp(amt)}`, cols));
      } else if (rawMethod === 'comp') {
        const reason = t.reason || t.notes;
        const compLabel = reason ? `COMP [${reason}]` : 'COMPLIMENTARY';
        builder.text(padLine(`  ${compLabel}:`, `PHP ${formatPhp(amt)}`, cols));
      } else {
        builder.text(padLine(`  ${rawMethod.toUpperCase()}:`, `PHP ${formatPhp(amt)}`, cols));
      }
    }
  } else {
    const paymentChannel = data.paymentChannel || data.payment_channel;
    const paymentLabel = paymentChannel ? `${paymentChannel.toUpperCase()} QR` : paymentMethod;
    builder.text(padLine('PAYMENT METHOD:', paymentLabel, cols));

    const refNo = data.referenceNumber || data.reference_number;
    if (refNo) {
      builder.text(padLine('REFERENCE NO:', `#${refNo}`, cols));
    }

    const tendered = toPesos(data.tendered || total);
    const change = toPesos(
      data.change || (paymentMethod === 'CASH' ? Math.max(0, tendered - total) : 0)
    );

    if (paymentMethod === 'CASH') {
      builder.text(padLine('CASH TENDERED:', `PHP ${formatPhp(tendered)}`, cols));
      builder.text(padLine('CHANGE DUE:', `PHP ${formatPhp(change)}`, cols));
    } else {
      builder.text(padLine('AMOUNT PAID:', `PHP ${formatPhp(total)}`, cols));
    }
  }

  // 8. Statutory SC / PWD signature block if discount was granted (retained without tax statutory breakdown)
  const seniorId = data.seniorPwdId || data.senior_pwd_id;
  const seniorName = data.seniorPwdName || data.senior_pwd_name;
  const discountType = (data.discountType || data.discount_type || '').toUpperCase();

  if (seniorId || discountType === 'SENIOR_CITIZEN' || discountType === 'PWD') {
    builder.line(divider('-', cols));
    builder.line(is57mm ? 'SC / PWD ACKNOWLEDGMENT:' : 'SC / PWD BENEFICIARY ACKNOWLEDGMENT:');
    if (discountType === 'PWD') {
      builder.line('Type:      PERSON WITH DISABILITY (PWD)');
    } else {
      builder.line('Type:      SENIOR CITIZEN (OSCA)');
    }
    const idPad = is57mm ? '________________' : '_________________________________';
    const namePad = is57mm ? '________________' : '_________________________________';
    builder.line(`ID Number: ${seniorId || idPad}`);
    builder.line(`Name:      ${seniorName ? String(seniorName).toUpperCase() : namePad}`);
    builder.line(`Signature: ${idPad}`);
  }

  // 9. Footer
  builder.line(divider('-', cols));
  builder.center();
  builder.bold(true).line('THIS IS NOT AN OFFICIAL RECEIPT').line('YET ( •◡-)-♡').bold(false);
  builder.cut(true);

  if (shouldKickDrawer) {
    const tenders = data.tenders || data.tenderBreakdown || data.tender_breakdown;
    const hasCashTender =
      Array.isArray(tenders) &&
      tenders.some((t: any) => {
        const m = String(t.method || t.payment_method || t.paymentMethod || '').toLowerCase();
        return m === 'cash' && Number(t.amount || 0) > 0;
      });

    if (paymentMethod === 'CASH' || hasCashTender) {
      builder.kickDrawer();
    }
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
