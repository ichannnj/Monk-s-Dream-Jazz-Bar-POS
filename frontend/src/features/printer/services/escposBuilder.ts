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
  formatItemBreakdownLine,
  formatModifierLine,
  resolveDiscountReceiptLabel,
  sanitizeForEscPos,
} from './escposFormatters';
import { aggregateReceiptItems, VENUE_RECEIPT_CONFIG } from './receiptItemAggregator';

export { EscPosBuilder, ESCPOS };
export { aggregateReceiptItems, VENUE_RECEIPT_CONFIG };
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
  builder.line('Craft Cocktails & Fine Jazz');
  if (is57mm) {
    builder.line('Mobile: +63 917 833 3445');
    builder.line('IG/FB: @monksdreamjazz');
  } else {
    builder.line('Mobile: +63 917 833 3445 | IG/FB: @monksdreamjazz');
  }
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
      const itemSize = item.size ?? item.sizeLabel;
      if (itemSize && itemSize !== 'Standard') {
        parts.push(itemSize);
      }
      if (parts.length > 0) {
        desc = `${desc} (${parts.join(' - ')})`;
      }
    }

    const qty = item.quantity || 1;
    const itemTotal = toPesos(
      item.total ?? toPesos(item.price || item.unit_price || item.unitPrice) * qty
    );
    const modTotal = Array.isArray(item.modifiers)
      ? item.modifiers.reduce((sum, mod) => {
          const match = String(mod).match(/\(\+?(?:₱|P|PHP\s*)?([\d,]+(?:\.\d+)?)\)\s*$/i);
          return sum + (match ? (parseFloat(match[1].replace(/,/g, '')) || 0) * qty : 0);
        }, 0)
      : 0;
    const baseItemTotal = modTotal > 0 && itemTotal >= modTotal ? itemTotal - modTotal : itemTotal;
    const baseUnitPrice = qty > 0 ? baseItemTotal / qty : baseItemTotal;
    builder.line(`${qtyStr} ${sanitizeForEscPos(desc)}`);
    builder.text(formatItemBreakdownLine(qty, baseUnitPrice, baseItemTotal, cols));

    if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        builder.text(formatModifierLine(mod, cols, qty));
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
  const subtotal = toPesos(data.subtotal ?? data.amount ?? 0);
  const subtotalLabel = is57mm ? 'ITEMS SUBTOTAL:' : 'ITEMS SUBTOTAL (Gross):';
  builder.text(padLine(subtotalLabel, formatPhp(subtotal), cols));

  const corkage = toPesos(data.corkageFee ?? data.corkageAmount ?? data.corkage_amount ?? 0);
  const serviceCharge = toPesos(data.serviceCharge ?? data.service_charge ?? 0);
  const scRate = toPesos(
    data.serviceChargeRate ?? data.service_charge_rate ?? (serviceCharge > 0 ? 10 : 0)
  );
  const rawVatExempt = toPesos(data.vatExemptSales ?? data.vat_exempt_sales ?? 0);
  const rawDiscount = toPesos(data.discountAmount ?? data.discount ?? data.discount_amount ?? 0);
  const explicitTotal = data.total ?? data.amount;
  const computedVatRelief =
    rawVatExempt > 0 && explicitTotal !== undefined && toPesos(explicitTotal) >= 0
      ? Math.max(
          0,
          Math.min(
            subtotal,
            toPesos(subtotal + corkage + serviceCharge - rawDiscount - toPesos(explicitTotal))
          )
        )
      : rawVatExempt > 0
        ? Math.min(subtotal, toPesos(rawVatExempt * 0.12))
        : 0;
  const totalDiscount = toPesos(rawDiscount + computedVatRelief);
  const netAfterDiscount = Math.max(0, toPesos(subtotal - totalDiscount));

  if (totalDiscount > 0) {
    const discLabel = resolveDiscountReceiptLabel(
      data.discountType || data.discount_type,
      data.discountLabel || data.discount_label
    );
    builder.text(padLine(discLabel, `-${formatPhp(totalDiscount)}`, cols));
    builder.text(padLine('NET AFTER DISCOUNT:', formatPhp(netAfterDiscount), cols));
  }

  if (corkage > 0) {
    builder.text(padLine('CORKAGE FEE:', formatPhp(corkage), cols));
  }

  const scLabel =
    serviceCharge > 0
      ? `SERVICE CHARGE (${scRate > 0 ? `${scRate}%` : 'APPLIED'}):`
      : 'SERVICE CHARGE (NONE):';
  builder.text(padLine(scLabel, formatPhp(serviceCharge), cols));

  /* TODO(BIR): Uncomment Statutory VAT Breakdown once BIR VAT-registered
  builder.line(divider('-', cols));
  builder.line('TAX & STATUTORY BREAKDOWN:');
  builder.text(padLine('  VATable Sales:', formatPhp(toPesos(data.vatableSales || 0)), cols));
  builder.text(padLine('  12% VAT Amount:', formatPhp(toPesos(data.vatAmount || 0)), cols));
  builder.text(padLine('  VAT-Exempt Sales:', formatPhp(rawVatExempt), cols));
  */

  // Bold Grand Total
  builder.line(divider('=', cols));
  builder.bold(true).doubleHeight(true);
  const total = toPesos(explicitTotal ?? Math.max(0, netAfterDiscount + corkage + serviceCharge));
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
  builder.bold(true).line('THIS IS NOT AN OFFICIAL RECEIPT').line('YET').bold(false);

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

  builder.cut(true);

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
