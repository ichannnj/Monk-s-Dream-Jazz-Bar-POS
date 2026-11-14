/**
 * Automated Unit Test Suite for Split-Tender Settlement Store Integration
 * Monk's Dream Jazz Bar POS
 * Run via: node --experimental-strip-types --import ./scripts/register-loader.js scripts/test-split-tender-settlement.ts
 */

import assert from 'node:assert/strict';
import {
  calculateTenderBalance,
  validateSplitTenders,
  mapTendersToDbPayload,
} from '../frontend/src/features/checkout/domain/splitTenderCalculator.ts';
import type { PaymentTender } from '../frontend/src/features/checkout/domain/splitTender.types.ts';
import { createSettlementSlice } from '../frontend/src/features/checkout/application/settlement.slice.ts';

console.log('🧪 Running Split-Tender Store & Application Settlement Tests...\n');

// -------------------------------------------------------------
// Seam 1: Domain Balance & Validation Calculations
// -------------------------------------------------------------
console.log('--- Seam 1: Domain Balance & Validation Calculations ---');
{
  const grandTotal = 1500;
  const tenders: PaymentTender[] = [
    { id: 't1', method: 'cash', amount: 500, tendered: 1000 },
    { id: 't2', method: 'digital_wallet', channel: 'GCash', referenceNumber: '1234', amount: 1000 },
  ];

  const balance = calculateTenderBalance(tenders, grandTotal);
  assert.equal(balance.allocatedAmount, 1500);
  assert.equal(balance.remainingBalance, 0);
  assert.equal(balance.totalCashTendered, 1000);
  assert.equal(balance.totalCashChange, 500);
  assert.equal(balance.isFullyAllocated, true);
  assert.equal(balance.isOverAllocated, false);
  assert.equal(balance.isUnderAllocated, false);

  const validation = validateSplitTenders(tenders, grandTotal);
  assert.equal(validation.isValid, true);
  assert.equal(validation.errors.length, 0);

  const dbPayload = mapTendersToDbPayload(tenders);
  assert.equal(dbPayload.length, 2);
  assert.equal(dbPayload[0].payment_method, 'CASH');
  assert.equal(dbPayload[0].amount, 500);
  assert.equal(dbPayload[0].tendered_amount, 1000);
  assert.equal(dbPayload[1].payment_method, 'DIGITAL_WALLET');
  assert.equal(dbPayload[1].amount, 1000);
  assert.equal(dbPayload[1].payment_channel, 'GCash');
  assert.equal(dbPayload[1].reference_number, '1234');

  console.log('  ✅ [PASS] Seam 1: Correct balance, cash change, and db payload mapping');
}

// -------------------------------------------------------------
// Seam 2: settlement.slice settleTab with Split Tenders
// -------------------------------------------------------------
console.log('\n--- Seam 2: settlement.slice settleTab with Split Tenders ---');
{
  let state: any = {
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
  const set = (updater: any) => {
    state = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
  };

  const slice = createSettlementSlice(set as any, get as any);

  const splitTenders: PaymentTender[] = [
    { id: 't1', method: 'cash', amount: 800, tendered: 1000 },
    { id: 't2', method: 'digital_wallet', channel: 'Maya', referenceNumber: '5678', amount: 1000 },
  ];

  slice.settleTab('table-1', 1, 'split', 'Coltrane', 0, 'staff-1', undefined, undefined, {
    grossSubtotal: 1800,
    totalAmountDue: 1800,
    vatableSales: 1607.14,
    vatAmount: 192.86,
    tenders: splitTenders,
  } as any);

  // Check state mutations
  assert.equal(state.checks.length, 1);
  const check = state.checks[0];
  assert.equal(check.total, 1800);
  assert.equal(check.paymentMethod, 'split');
  assert.equal(check.tableOrRef, 'Table 1 (Bill Evans)');
  assert.ok(check.tendersSummary?.includes('Cash: ₱800.00'));
  assert.ok(check.tendersSummary?.includes('Maya [Ref: 5678]: ₱1,000.00'));

  // Drawer entries: only cash portion (₱800.00) should be recorded in drawer
  assert.equal(state.drawerEntries.length, 1);
  assert.equal(state.drawerEntries[0].amount, 800);
  assert.ok(state.drawerEntries[0].reason.includes('Cash Settle'));

  console.log(
    '  ✅ [PASS] Seam 2: settleTab updates checks with tendersSummary and credits cash drawer for cash tender only'
  );
}

// -------------------------------------------------------------
// Seam 3: settlement.slice settleTakeoutOrder with Split Tenders
// -------------------------------------------------------------
console.log('\n--- Seam 3: settlement.slice settleTakeoutOrder with Split Tenders ---');
{
  let state: any = {
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
  const set = (updater: any) => {
    state = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
  };

  const slice = createSettlementSlice(set as any, get as any);

  const splitTenders: PaymentTender[] = [
    { id: 't1', method: 'card', last4Digits: '9921', amount: 700 },
    { id: 't2', method: 'cash', amount: 500, tendered: 500 },
  ];

  slice.settleTakeoutOrder('takeout-88', 'split', {
    totalAmountDue: 1200,
    tenders: splitTenders,
    completeOrder: true,
  });

  assert.equal(state.checks.length, 1);
  const check = state.checks[0];
  assert.equal(check.total, 1200);
  assert.equal(check.paymentMethod, 'split');
  assert.ok(check.tendersSummary?.includes('Card (ending 9921): ₱700.00'));
  assert.ok(check.tendersSummary?.includes('Cash: ₱500.00'));

  // Drawer entries: only cash portion (₱500.00) should be recorded
  assert.equal(state.drawerEntries.length, 1);
  assert.equal(state.drawerEntries[0].amount, 500);

  console.log(
    '  ✅ [PASS] Seam 3: settleTakeoutOrder records split check and drawer transaction for cash only'
  );
}

console.log('\n============================================================');
console.log('🎉 ALL SPLIT TENDER STORE TESTS PASSED');
console.log('============================================================\n');
