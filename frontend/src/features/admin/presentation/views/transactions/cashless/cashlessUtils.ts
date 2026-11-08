import type { SettledCheckItem } from '@/features/check-history/domain/check.types';
import { printerApi } from '@/features/printer';

export interface CashlessMetrics {
  totalCashless: number;
  count: number;
  gcashTotal: number;
  gcashCount: number;
  mayaTotal: number;
  mayaCount: number;
  qrphTotal: number;
  qrphCount: number;
  cardTotal: number;
  cardCount: number;
}

export const computeCashlessMetrics = (transactions: SettledCheckItem[]): CashlessMetrics => {
  let totalCashless = 0;
  let gcashTotal = 0;
  let gcashCount = 0;
  let mayaTotal = 0;
  let mayaCount = 0;
  let qrphTotal = 0;
  let qrphCount = 0;
  let cardTotal = 0;
  let cardCount = 0;

  for (const tx of transactions) {
    const amt = tx.total || 0;
    totalCashless += amt;
    const ch = (tx.paymentChannel || tx.paymentMethod || '').toUpperCase();

    if (ch.includes('GCASH')) {
      gcashTotal += amt;
      gcashCount++;
    } else if (ch.includes('MAYA')) {
      mayaTotal += amt;
      mayaCount++;
    } else if (ch.includes('QRPH') || ch.includes('QR') || ch.includes('BANK')) {
      qrphTotal += amt;
      qrphCount++;
    } else {
      cardTotal += amt;
      cardCount++;
    }
  }

  return {
    totalCashless,
    count: transactions.length,
    gcashTotal,
    gcashCount,
    mayaTotal,
    mayaCount,
    qrphTotal,
    qrphCount,
    cardTotal,
    cardCount,
  };
};

export const filterCashlessTransactions = (
  transactions: SettledCheckItem[],
  selectedChannel: string,
  searchQuery: string
): SettledCheckItem[] => {
  const q = searchQuery.trim().toLowerCase();

  return transactions.filter((tx) => {
    if (selectedChannel !== 'ALL') {
      const chName = (tx.paymentChannel || tx.paymentMethod || '').toLowerCase();
      if (selectedChannel === 'GCash' && !chName.includes('gcash')) return false;
      if (selectedChannel === 'Maya' && !chName.includes('maya')) return false;
      if (
        selectedChannel === 'Bank Transfer' &&
        !chName.includes('bank') &&
        !chName.includes('transfer')
      )
        return false;
      if (selectedChannel === 'QRPH' && !chName.includes('qrph') && !chName.includes('qr'))
        return false;
      if (selectedChannel === 'CARD' && !chName.includes('card')) return false;
      if (selectedChannel === 'COMP' && !chName.includes('comp')) return false;
    }

    if (q) {
      const refMatch = tx.referenceNumber?.toLowerCase().includes(q);
      const checkMatch = tx.checkNumber.toLowerCase().includes(q);
      const guestMatch = tx.guestName.toLowerCase().includes(q);
      const tableMatch = tx.tableOrRef.toLowerCase().includes(q);
      const cashierMatch = tx.cashierName.toLowerCase().includes(q);
      const channelMatch = (tx.paymentChannel || tx.paymentMethod || '').toLowerCase().includes(q);
      return (
        Boolean(refMatch) || checkMatch || guestMatch || tableMatch || cashierMatch || channelMatch
      );
    }

    return true;
  });
};

export const reprintCustomerCheck = async (chk: SettledCheckItem): Promise<void> => {
  const receiptPayload = {
    receiptNumber: chk.checkNumber.replace('#', ''),
    paymentId: chk.paymentId,
    tableNumber: chk.tableOrRef.includes('Table')
      ? parseInt(chk.tableOrRef.replace(/\D/g, ''), 10)
      : undefined,
    tabName: chk.guestName,
    waiterName: chk.cashierName,
    items: chk.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.unitPrice,
      total: i.subtotal,
    })),
    subtotal: chk.subtotal * 100,
    corkageFee: chk.corkageFee * 100,
    discount: chk.discountAmount * 100,
    total: chk.total * 100,
    tendered: chk.total * 100,
    change: 0,
    paymentMethod: chk.paymentMethod,
    paymentChannel: chk.paymentChannel,
    referenceNumber: chk.referenceNumber,
    timestamp: chk.settledAt || new Date().toISOString(),
    isReprint: true,
  };

  await (printerApi as any).reprintJob({
    id: chk.paymentId,
    job_type: 'CUSTOMER_RECEIPT',
    receipt_data: receiptPayload,
    status: 'PENDING',
    created_at: new Date().toISOString(),
    printed_at: null,
  });
};
