/**
 * Split-Tender Balance Calculator & Validation Engine
 * Monk's Dream Jazz Bar POS
 *
 * Pure, deterministic functions for:
 * 1. calculateTenderBalance: calculates allocated total, remaining balance, and change.
 * 2. validateSplitTenders: enforces exact allocation, positive non-zero amounts, and strict 4-digit references.
 */

import type {
  PaymentTender,
  SplitTenderBalance,
  SplitTenderValidationResult,
} from './splitTender.types';

/**
 * Rounds numeric currency to 2 decimal places to avoid IEEE 754 float drift.
 */
function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates the balance distribution of split tenders against the grand total.
 */
export function calculateTenderBalance(
  tenders: PaymentTender[],
  grandTotal: number
): SplitTenderBalance {
  const normalizedGrandTotal = Math.max(0, roundCurrency(grandTotal));

  let allocatedAmount = 0;
  let totalCashTendered = 0;
  let totalCashChange = 0;

  for (const tender of tenders) {
    const tenderAmount = Math.max(0, roundCurrency(tender.amount || 0));
    allocatedAmount += tenderAmount;

    if (tender.method === 'cash') {
      const tendered = Math.max(tenderAmount, roundCurrency(tender.tendered ?? tenderAmount));
      totalCashTendered += tendered;
      if (tendered > tenderAmount) {
        totalCashChange += roundCurrency(tendered - tenderAmount);
      }
    }
  }

  allocatedAmount = roundCurrency(allocatedAmount);
  totalCashTendered = roundCurrency(totalCashTendered);
  totalCashChange = roundCurrency(totalCashChange);

  const remainingDiff = roundCurrency(normalizedGrandTotal - allocatedAmount);
  const remainingBalance = Math.max(0, remainingDiff);

  const isFullyAllocated = remainingDiff === 0;
  const isOverAllocated = remainingDiff < 0;
  const isUnderAllocated = remainingDiff > 0;

  return {
    allocatedAmount,
    remainingBalance,
    totalCashTendered,
    totalCashChange,
    isFullyAllocated,
    isOverAllocated,
    isUnderAllocated,
  };
}

/**
 * Validates a list of split payment tenders against business invariants:
 * - Must contain at least one tender.
 * - Sum of allocated amounts must exactly match the grand total.
 * - Each tender amount must be greater than zero.
 * - Digital wallet tenders must specify a channel and strictly 4 numeric digits for referenceNumber.
 * - Comp tenders must specify a non-empty reason.
 */
export function validateSplitTenders(
  tenders: PaymentTender[],
  grandTotal: number
): SplitTenderValidationResult {
  const errors: string[] = [];

  if (!tenders || tenders.length === 0) {
    errors.push('At least one payment tender is required.');
    return { isValid: false, errors };
  }

  const balance = calculateTenderBalance(tenders, grandTotal);

  if (balance.isUnderAllocated) {
    errors.push(
      `Under-allocated: ₱${balance.remainingBalance.toFixed(2)} remaining to be allocated.`
    );
  } else if (balance.isOverAllocated) {
    const overAmount = roundCurrency(balance.allocatedAmount - grandTotal);
    errors.push(
      `Over-allocated: Total allocations exceed grand total by ₱${overAmount.toFixed(2)}.`
    );
  }

  tenders.forEach((tender, idx) => {
    const rowNum = idx + 1;
    if (!tender.amount || tender.amount <= 0) {
      errors.push(`Tender #${rowNum} (${tender.method}): Amount must be greater than ₱0.00.`);
    }

    if (tender.method === 'cash') {
      if (tender.tendered !== undefined && tender.tendered < tender.amount) {
        errors.push(
          `Tender #${rowNum} (Cash): Tendered amount (₱${tender.tendered.toFixed(2)}) cannot be less than allocated amount (₱${tender.amount.toFixed(2)}).`
        );
      }
    } else if (tender.method === 'digital_wallet') {
      if (!tender.channel || tender.channel.trim() === '') {
        errors.push(`Tender #${rowNum} (Digital Wallet): Channel is required (e.g. GCash, Maya).`);
      }
      const ref = tender.referenceNumber ? tender.referenceNumber.trim() : '';
      if (!/^\d{4}$/.test(ref)) {
        errors.push(
          `Tender #${rowNum} (Digital Wallet): Reference number must be exactly 4 numeric digits (received: "${ref}").`
        );
      }
    } else if (tender.method === 'comp') {
      if (!tender.reason || tender.reason.trim() === '') {
        errors.push(`Tender #${rowNum} (Comp): Reason or authorization is required.`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Transforms frontend PaymentTender objects into backend API / RPC format.
 */
export function mapTendersToDbPayload(tenders: PaymentTender[]): Array<{
  payment_method: string;
  amount: number;
  tendered_amount?: number;
  payment_channel?: string;
  reference_number?: string;
  notes?: string;
}> {
  return tenders.map((t) => {
    if (t.method === 'cash') {
      return {
        payment_method: 'CASH',
        amount: roundCurrency(t.amount),
        tendered_amount: t.tendered ? roundCurrency(t.tendered) : roundCurrency(t.amount),
        notes: t.notes,
      };
    }
    if (t.method === 'digital_wallet') {
      return {
        payment_method: 'DIGITAL_WALLET',
        amount: roundCurrency(t.amount),
        payment_channel: t.channel,
        reference_number: t.referenceNumber,
        notes: t.notes,
      };
    }
    if (t.method === 'card') {
      return {
        payment_method: 'CARD',
        amount: roundCurrency(t.amount),
        notes: t.last4Digits ? `Card ending in ${t.last4Digits}` : t.notes,
      };
    }
    return {
      payment_method: 'COMP',
      amount: roundCurrency(t.amount),
      notes: t.reason || t.notes || 'Comp allocation',
    };
  });
}
