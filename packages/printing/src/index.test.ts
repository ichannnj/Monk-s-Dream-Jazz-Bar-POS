import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UsbEscPosPrinter,
  MockPrinter,
  type RunnerChitPayload,
  type CustomerReceiptPayload,
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
