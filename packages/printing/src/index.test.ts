import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UsbEscPosPrinter,
  type RunnerChitPayload,
  type CustomerReceiptPayload,
  type BillStatementPayload,
  type DeliveryTagPayload,
  type TakeoutSlipPayload,
} from '../dist/index.js';

test('UsbEscPosPrinter renders runner chit with checkboxes and notes', () => {
  const printer = new UsbEscPosPrinter('/dev/null');
  const payload: RunnerChitPayload = {
    orderNumber: '1042',
    tableNumber: 4,
    tabName: 'Guest: John',
    roundNumber: 1,
    waiterName: 'Sarah',
    timestamp: '2026-10-29 01:00',
    items: [
      {
        name: 'Artisan Pour-Over',
        quantity: 2,
        station: 'station:bar',
        notes: 'Extra hot oat milk',
      },
      { name: 'Truffle Mushroom Pasta', quantity: 1, station: 'station:kitchen' },
    ],
  };

  const buffer = printer.renderRunnerChit(payload);
  const text = buffer.toString('utf-8');

  assert.ok(text.includes('ORDER DISPATCH SLIP'));
  assert.ok(text.includes('1042'));
  assert.ok(text.includes('Table 4'));
  assert.ok(text.includes('Guest: John'));
  assert.ok(text.includes('2x  Artisan Pour-Over'));
  assert.ok(text.includes('Extra hot oat milk'));
  assert.ok(text.includes('1x  Truffle Mushroom Pasta'));
});

test('UsbEscPosPrinter renders customer receipt with branded jazz bar footer', () => {
  const printer = new UsbEscPosPrinter('/dev/null');
  const payload: CustomerReceiptPayload = {
    receiptNumber: 'REC-9001',
    tableNumber: 4,
    tabName: 'Guest: John',
    waiterName: 'Sarah',
    timestamp: '2026-10-29 01:30',
    items: [
      { name: 'Artisan Pour-Over', quantity: 2, price: 250.0, total: 500.0 },
      { name: 'Truffle Mushroom Pasta', quantity: 1, price: 450.0, total: 450.0 },
    ],
    subtotal: 950.0,
    corkageFee: 0,
    total: 950.0,
    tendered: 1000.0,
    change: 50.0,
    paymentMethod: 'CASH',
  };

  const buffer = printer.renderReceiptBytes(payload);
  const text = buffer.toString('utf-8');

  assert.ok(text.includes("MONK'S DREAM"));
  assert.ok(text.includes('JAZZ BAR AND CAFE'));
  assert.ok(text.includes('REC-9001'));
  assert.ok(text.includes('950.00'));
  assert.ok(text.includes('1,000.00'));
  assert.ok(text.includes('50.00'));
  assert.ok(text.includes('THIS IS NOT AN OFFICIAL RECEIPT'));
  assert.ok(text.includes('Please come back for the next set.'));
});

test('UsbEscPosPrinter renders takeout and delivery tags', () => {
  const printer = new UsbEscPosPrinter('/dev/null');
  const takeout: TakeoutSlipPayload = {
    orderNumber: 'T-105',
    customerName: 'Marcus Miller',
    items: [{ name: 'Iced Americano', quantity: 2, notes: 'Less ice' }],
    timestamp: '2026-10-29 01:15',
    isPrepaid: true,
  };

  const takeoutBuf = printer.renderTakeoutSlip(takeout);
  const takeoutText = takeoutBuf.toString('utf-8');
  assert.ok(takeoutText.includes('*** TAKEOUT / TO-GO ***'));
  assert.ok(takeoutText.includes('#T-105'));
  assert.ok(takeoutText.includes('Marcus Miller'));
  assert.ok(takeoutText.includes('[PREPAID]'));

  const delivery: DeliveryTagPayload = {
    platform: 'GRABFOOD',
    platformReference: 'GF-8842',
    customerName: 'Miles Davis',
    riderName: 'Rider: Mike',
    itemCount: 3,
    timestamp: '2026-10-29 01:20',
    address: '742 Evergreen Terrace',
  };

  const deliveryBuf = printer.renderDeliveryTag(delivery);
  const deliveryText = deliveryBuf.toString('utf-8');
  assert.ok(deliveryText.includes('*** ONLINE DELIVERY BAG ***'));
  assert.ok(deliveryText.includes('GRABFOOD #GF-8842'));
  assert.ok(deliveryText.includes('Miles Davis'));
  assert.ok(deliveryText.includes('Rider: Mike'));
});

test('UsbEscPosPrinter renders bill statement slip and aggregates duplicate items across rounds', () => {
  const printer = new UsbEscPosPrinter('/dev/null');
  const bill: BillStatementPayload = {
    receiptNumber: 'MD-BILL-4001',
    tableNumber: 2,
    tableLabel: 'Table 2',
    tabName: 'Thelonious Monk',
    waiterName: 'Sarah K.',
    operatingMode: 'CAFE',
    timestamp: '2026-11-12 02:30',
    items: [
      { name: 'Cortado', quantity: 1, price: 160.0, temperature: 'HOT', size: '12oz' },
      { name: 'Cortado', quantity: 1, price: 160.0, temperature: 'HOT', size: '12oz' },
      { name: 'Matcha Latte', quantity: 1, price: 180.0, notes: 'Soy milk' },
    ],
    subtotal: 500.0,
    serviceCharge: 0,
    total: 500.0,
  };

  const billBuf = printer.renderBillStatementBytes(bill);
  const billText = billBuf.toString('utf-8');

  assert.ok(billText.includes('*** BILL STATEMENT / GUEST CHECK ***'));
  assert.ok(billText.includes('*** UNPAID - PLEASE PAY AT CASHIER ***'));
  assert.ok(billText.includes('Table 2'));
  assert.ok(billText.includes('Thelonious Monk'));
  assert.ok(billText.includes('2x   Cortado'));
  assert.ok(billText.includes('1x   Matcha Latte'));
  assert.ok(billText.includes('PHP 500.00'));

  // Ensure cash drawer solenoid pulse (0x1B 0x70) is NOT in the bill statement buffer
  let hasDrawerKick = false;
  for (let i = 0; i < billBuf.length - 4; i++) {
    if (
      billBuf[i] === 0x1b &&
      billBuf[i + 1] === 0x70 &&
      billBuf[i + 2] === 0x00 &&
      billBuf[i + 3] === 0x19 &&
      billBuf[i + 4] === 0xfa
    ) {
      hasDrawerKick = true;
      break;
    }
  }
  assert.equal(hasDrawerKick, false, 'Bill statement must never pulse the cash drawer kick');
});

test('UsbEscPosPrinter renders multi-tender split payment breakdown', () => {
  const printer = new UsbEscPosPrinter('/dev/null');
  const payload: CustomerReceiptPayload = {
    receiptNumber: 'REC-9002',
    tableNumber: 3,
    tabName: 'Guest: Bill Evans',
    waiterName: 'Sarah',
    timestamp: '2026-11-14 18:00',
    items: [
      { name: 'Negroni', quantity: 2, price: 350.0, total: 700.0 },
      { name: 'Truffle Mushroom Pasta', quantity: 1, price: 450.0, total: 450.0 },
    ],
    subtotal: 1150.0,
    total: 1150.0,
    paymentMethod: 'SPLIT',
    tenders: [
      { method: 'cash', amount: 500.0, tendered: 1000.0, change: 500.0 },
      { method: 'digital_wallet', channel: 'GCash', referenceNumber: '8812', amount: 400.0 },
      { method: 'card', last4Digits: '4242', amount: 250.0 },
    ],
  };

  const buffer = printer.renderReceiptBytes(payload);
  const text = buffer.toString('utf-8');

  assert.ok(text.includes('PAYMENT BREAKDOWN (SPLIT):'), 'Should show split header');
  assert.ok(text.includes('CASH:'), 'Should show cash line');
  assert.ok(text.includes('PHP 500.00'), 'Should show cash amount');
  assert.ok(text.includes('Cash Tendered:'), 'Should show cash tendered detail');
  assert.ok(text.includes('PHP 1,000.00'), 'Should format 1000 tendered');
  assert.ok(text.includes('Change:'), 'Should show change detail');
  assert.ok(text.includes('GCASH [Ref: 8812]:'), 'Should show GCash channel and ref');
  assert.ok(text.includes('PHP 400.00'), 'Should show GCash amount');
  assert.ok(text.includes('CARD [**** 4242]:'), 'Should show card with masked digits');
  assert.ok(text.includes('PHP 250.00'), 'Should show card amount');
});
