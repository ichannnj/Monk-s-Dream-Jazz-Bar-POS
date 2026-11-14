import { describe, it, expect } from 'vitest';
import {
  calculateTenderBalance,
  validateSplitTenders,
  mapTendersToDbPayload,
} from '../domain/splitTenderCalculator';
import type { PaymentTender } from '../domain/splitTender.types';
import { createSettlementSlice } from '../application/settlement.slice';

describe('Split-Tender Settlement Domain & Application Layer', () => {
  describe('Domain Balance & Validation Calculations', () => {
    it('calculates allocated amount, remaining balance, and cash change accurately', () => {
      const grandTotal = 1500;
      const tenders: PaymentTender[] = [
        { id: 't1', method: 'cash', amount: 500, tendered: 1000 },
        {
          id: 't2',
          method: 'digital_wallet',
          channel: 'GCash',
          referenceNumber: '1234',
          amount: 1000,
        },
      ];

      const balance = calculateTenderBalance(tenders, grandTotal);
      expect(balance.allocatedAmount).toBe(1500);
      expect(balance.remainingBalance).toBe(0);
      expect(balance.totalCashTendered).toBe(1000);
      expect(balance.totalCashChange).toBe(500);
      expect(balance.isFullyAllocated).toBe(true);
      expect(balance.isOverAllocated).toBe(false);
      expect(balance.isUnderAllocated).toBe(false);

      const validation = validateSplitTenders(tenders, grandTotal);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      const dbPayload = mapTendersToDbPayload(tenders);
      expect(dbPayload).toHaveLength(2);
      expect(dbPayload[0]).toMatchObject({
        payment_method: 'CASH',
        amount: 500,
        tendered_amount: 1000,
      });
      expect(dbPayload[1]).toMatchObject({
        payment_method: 'DIGITAL_WALLET',
        amount: 1000,
        payment_channel: 'GCash',
        reference_number: '1234',
      });
    });

    it('flags under-allocation and over-allocation correctly', () => {
      const grandTotal = 2000;

      // Under-allocated
      const underTenders: PaymentTender[] = [
        { id: 't1', method: 'cash', amount: 1500, tendered: 1500 },
      ];
      const underBalance = calculateTenderBalance(underTenders, grandTotal);
      expect(underBalance.isUnderAllocated).toBe(true);
      expect(underBalance.remainingBalance).toBe(500);

      // Over-allocated
      const overTenders: PaymentTender[] = [
        { id: 't1', method: 'cash', amount: 2500, tendered: 2500 },
      ];
      const overBalance = calculateTenderBalance(overTenders, grandTotal);
      expect(overBalance.isOverAllocated).toBe(true);
      expect(overBalance.remainingBalance).toBe(0);
      expect(overBalance.allocatedAmount - grandTotal).toBe(500);
    });

    it('rejects digital wallet tender missing 4-digit reference number', () => {
      const grandTotal = 1000;
      const invalidTenders: PaymentTender[] = [
        {
          id: 't1',
          method: 'digital_wallet',
          channel: 'GCash',
          referenceNumber: '12',
          amount: 1000,
        },
      ];

      const validation = validateSplitTenders(invalidTenders, grandTotal);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('4 numeric digits'))).toBe(true);
    });
  });

  describe('settlement.slice State Mutations', () => {
    it('settleTab updates checks with tendersSummary and credits cash drawer for cash tender only', () => {
      type MockState = {
        tables: Array<{
          id: string;
          code: string;
          area: string;
          tabs: Array<{
            id: string;
            tabIndex: number;
            guestName: string;
            totalAmount: number;
            items: Array<{ id: string; productName: string; quantity: number; unitPrice: number }>;
          }>;
        }>;
        checks: Array<{
          total: number;
          paymentMethod: string;
          tableOrRef: string;
          tendersSummary?: string;
        }>;
        drawerEntries: Array<{
          amount: number;
          reason: string;
        }>;
      };

      let state: MockState = {
        tables: [
          {
            id: 'table-1',
            code: '1',
            area: 'main',
            tabs: [
              {
                id: 'tab-101',
                tabIndex: 1,
                guestName: 'Bill Evans',
                totalAmount: 1800,
                items: [
                  { id: 'i1', productName: 'Old Fashioned', quantity: 2, unitPrice: 450 },
                  { id: 'i2', productName: 'Truffle Pasta', quantity: 1, unitPrice: 900 },
                ],
              },
            ],
          },
        ],
        checks: [],
        drawerEntries: [],
      };

      const get = () => state;
      const set = (updater: unknown) => {
        state =
          typeof updater === 'function'
            ? (updater as (s: MockState) => MockState)(state)
            : { ...state, ...(updater as Partial<MockState>) };
      };

      // Create settlement slice
      const slice = createSettlementSlice(set as never, get as never);

      const splitTenders: PaymentTender[] = [
        { id: 't1', method: 'cash', amount: 800, tendered: 1000 },
        {
          id: 't2',
          method: 'digital_wallet',
          channel: 'Maya',
          referenceNumber: '5678',
          amount: 1000,
        },
      ];

      slice.settleTab('table-1', 1, 'split', 'Coltrane', 0, 'staff-1', undefined, undefined, {
        grossSubtotal: 1800,
        totalAmountDue: 1800,
        vatableSales: 1607.14,
        vatAmount: 192.86,
        tenders: splitTenders,
      } as never);

      // Verify check mutation
      expect(state.checks).toHaveLength(1);
      const check = state.checks[0]!;
      expect(check.total).toBe(1800);
      expect(check.paymentMethod).toBe('split');
      expect(check.tableOrRef).toBe('Table 1 (Bill Evans)');
      expect(check.tendersSummary).toContain('Cash: ₱800.00');
      expect(check.tendersSummary).toContain('Maya [Ref: 5678]: ₱1,000.00');

      // Drawer entry: only cash portion (₱800.00) is credited
      expect(state.drawerEntries).toHaveLength(1);
      expect(state.drawerEntries[0]!.amount).toBe(800);
      expect(state.drawerEntries[0]!.reason).toContain('Cash Settle');
    });

    it('settleTakeoutOrder records split check and drawer transaction for cash tender only', () => {
      type MockTakeoutState = {
        takeoutOrders: Array<{
          id: string;
          ticketNumber: number;
          customerName: string;
          total: number;
          items: Array<{ id: string; productName: string; quantity: number; unitPrice: number }>;
          status: string;
        }>;
        checks: Array<{
          total: number;
          paymentMethod: string;
          tendersSummary?: string;
        }>;
        drawerEntries: Array<{
          amount: number;
        }>;
      };

      let state: MockTakeoutState = {
        takeoutOrders: [
          {
            id: 'takeout-88',
            ticketNumber: 88,
            customerName: 'Chet Baker',
            total: 1200,
            items: [{ id: 'i3', productName: 'Pour Over', quantity: 4, unitPrice: 300 }],
            status: 'preparing',
          },
        ],
        checks: [],
        drawerEntries: [],
      };

      const get = () => state;
      const set = (updater: unknown) => {
        state =
          typeof updater === 'function'
            ? (updater as (s: MockTakeoutState) => MockTakeoutState)(state)
            : { ...state, ...(updater as Partial<MockTakeoutState>) };
      };

      const slice = createSettlementSlice(set as never, get as never);

      const splitTenders: PaymentTender[] = [
        { id: 't1', method: 'card', last4Digits: '9921', amount: 700 },
        { id: 't2', method: 'cash', amount: 500, tendered: 500 },
      ];

      slice.settleTakeoutOrder('takeout-88', 'split', {
        totalAmountDue: 1200,
        tenders: splitTenders,
        completeOrder: true,
      });

      expect(state.checks).toHaveLength(1);
      const check = state.checks[0]!;
      expect(check.total).toBe(1200);
      expect(check.paymentMethod).toBe('split');
      expect(check.tendersSummary).toContain('Card (ending 9921): ₱700.00');
      expect(check.tendersSummary).toContain('Cash: ₱500.00');

      expect(state.drawerEntries).toHaveLength(1);
      expect(state.drawerEntries[0]!.amount).toBe(500);
    });
  });
});
