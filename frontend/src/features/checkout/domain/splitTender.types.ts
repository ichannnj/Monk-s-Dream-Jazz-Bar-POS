/**
 * Split-Tender Payment Domain Types
 * Monk's Dream Jazz Bar POS
 *
 * Models individual payment tenders for multi-tender checkout:
 * - Cash: amount, tendered amount, change
 * - Digital Wallet (GCash/Maya/QRPH): channel, reference number, amount
 * - Card (Credit/Debit): last 4 digits (optional), amount
 * - Comp (VIP/Management): reason, amount
 */

export interface CashTender {
  id: string;
  method: 'cash';
  amount: number;
  tendered?: number;
  change?: number;
  notes?: string;
}

export interface DigitalWalletTender {
  id: string;
  method: 'digital_wallet';
  channel: string; // 'GCash' | 'Maya' | 'Bank Transfer' | 'QRPH' | string
  referenceNumber: string; // Exactly 4 numeric digits
  amount: number;
  notes?: string;
}

export interface CardTender {
  id: string;
  method: 'card';
  last4Digits?: string;
  amount: number;
  notes?: string;
}

export interface CompTender {
  id: string;
  method: 'comp';
  reason: string;
  amount: number;
  notes?: string;
}

export type PaymentTender = CashTender | DigitalWalletTender | CardTender | CompTender;

export interface SplitTenderPlan {
  tenders: PaymentTender[];
  grandTotal: number;
  balance: SplitTenderBalance;
}

export interface SplitTenderBalance {
  allocatedAmount: number;
  remainingBalance: number;
  totalCashTendered: number;
  totalCashChange: number;
  isFullyAllocated: boolean;
  isOverAllocated: boolean;
  isUnderAllocated: boolean;
}

export interface SplitTenderValidationResult {
  isValid: boolean;
  errors: string[];
}
