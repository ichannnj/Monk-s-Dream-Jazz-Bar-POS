import { describe, it, expect } from 'vitest';
import { buildReceiptBytes, buildBillStatementBytes } from './escposBuilder';

describe('ESC/POS Receipt & Bill Statement Generation', () => {
  const sampleItems = [
    {
      productName: 'Cortado',
      unitPrice: 160,
      quantity: 1,
      temperature: 'HOT',
      size: '12oz',
    },
    {
      productName: 'Cortado',
      unitPrice: 160,
      quantity: 1,
      temperature: 'HOT',
      size: '12oz',
    },
    {
      productName: 'Truffle Mushroom Pasta',
      unitPrice: 380,
      quantity: 1,
    },
  ];

  it('buildReceiptBytes produces valid byte sequence and aggregates duplicate items', () => {
    const receiptData = {
      receiptNumber: 'MD-20261112-0001',
      operatingMode: 'CAFE',
      tableLabel: 'Table 4',
      tabName: 'Miles Davis',
      cashierName: 'Sarah K.',
      items: sampleItems,
      subtotal: 700,
      total: 700,
      paymentMethod: 'CASH',
      tendered: 1000,
      change: 300,
    };

    const bytes = buildReceiptBytes(receiptData, false);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);

    const text = new TextDecoder().decode(bytes);
    // Should have aggregated Cortado to 2x
    expect(text).toContain('2x  Cortado');
    expect(text).toContain('1x  Truffle Mushroom Pasta');
  });

  it('buildBillStatementBytes produces valid byte sequence with UNPAID banner and no drawer kick', () => {
    const billData = {
      receiptNumber: 'BILL-0001',
      operatingMode: 'CAFE',
      tableLabel: 'Table 4',
      tabName: 'Miles Davis',
      waiterName: 'Sarah K.',
      items: sampleItems,
      subtotal: 700,
      total: 700,
    };

    const bytes = buildBillStatementBytes(billData);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);

    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('BILL STATEMENT / GUEST CHECK');
    expect(text).toContain('UNPAID — PLEASE PAY AT CASHIER');
    expect(text).toContain('2x  Cortado');
    expect(text).toContain('1x  Truffle Mushroom Pasta');
    expect(text).toContain('TOTAL AMOUNT DUE:');

    // Confirm drawer kick sequence (ESC p 0 25 250 -> 0x1B, 0x70, 0x00, 0x19, 0xFA) is NOT present
    let hasDrawerKick = false;
    for (let i = 0; i < bytes.length - 4; i++) {
      if (
        bytes[i] === 0x1b &&
        bytes[i + 1] === 0x70 &&
        bytes[i + 2] === 0x00 &&
        bytes[i + 3] === 0x19 &&
        bytes[i + 4] === 0xfa
      ) {
        hasDrawerKick = true;
        break;
      }
    }
    expect(hasDrawerKick).toBe(false);
  });
});
