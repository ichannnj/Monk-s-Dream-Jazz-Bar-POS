import { describe, it, expect } from 'vitest';
import { buildReceiptBytes } from '../escposBuilder';
import { buildBillStatementBytes } from '../escposSpecialSlips';

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
    // Should have aggregated Cortado to 2x with unit price breakdown
    expect(text).toContain('Cortado');
    expect(text).toContain('2 x @160.00');
    expect(text).toContain('320.00');
    expect(text).toContain('Truffle Mushroom');
    expect(text).toContain('SERVICE CHARGE (NONE):');

    // Header mobile number check
    expect(text).toContain('+63 917 833 3445');

    // Non-BIR provisional receipt assertions
    expect(text).not.toContain('MODE:');
    expect(text).not.toContain('TAX & STATUTORY BREAKDOWN');
    expect(text).not.toContain('VATable Sales');
    expect(text).toContain('THIS IS NOT AN OFFICIAL RECEIPT');
    expect(text).toContain('YET');
    expect(text).not.toContain('•◡');
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
    expect(text).toContain('UNPAID - PLEASE PAY AT CASHIER');
    expect(text).toContain('+63 917 833 3445');
    expect(text).toContain('Cortado');
    expect(text).toContain('Truffle Mushroom');

    // Non-BIR provisional bill statement assertions
    expect(text).not.toContain('MODE:');
    expect(text).not.toContain('TAX & STATUTORY (EST.)');
    expect(text).not.toContain('VATable Sales');
    expect(text).toContain('THIS IS NOT AN OFFICIAL RECEIPT');
    expect(text).toContain('YET');
    expect(text).not.toContain('•◡');

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

  it('buildReceiptBytes formats correctly for 57mm compact paper (32 cols)', () => {
    const receiptData = {
      receiptNumber: 'MD-57MM-001',
      operatingMode: 'EVENT',
      tableLabel: 'Table 1',
      tabName: 'Ella F.',
      cashierName: 'Miles',
      items: sampleItems,
      subtotal: 700,
      total: 700,
      paymentMethod: 'CASH',
      tendered: 1000,
      change: 300,
    };

    const bytes57 = buildReceiptBytes(receiptData, false, '57mm');
    expect(bytes57).toBeInstanceOf(Uint8Array);
    const text57 = new TextDecoder().decode(bytes57);

    expect(text57).toContain('Jazz Cafe and Bar');
    expect(text57).toContain('+63 917 833 3445');
    expect(text57).toContain('CHECK #: MD-57MM-001');
    expect(text57).not.toContain('MODE:');
    expect(text57).not.toContain('TAX & STATUTORY');
    expect(text57).toContain('THIS IS NOT AN OFFICIAL RECEIPT');
    expect(text57).toContain('YET');
    expect(text57).not.toContain('•◡');
    expect(text57).toContain('TOTAL DUE:');
    expect(text57).toContain('--------------------------------');
  });

  it('guarantees only clean printable ASCII characters are emitted in text chunks', () => {
    const dirtyData = {
      receiptNumber: 'MD-DIRTY-001',
      tableLabel: 'Table 9 (VIP • Section)',
      tabName: 'Renée & François — Table Tab (•◡-)-♡',
      cashierName: 'Sarah K. (Cashier)',
      items: [
        {
          productName: 'Café Espresso • Blend…',
          unitPrice: 150,
          quantity: 1,
          modifiers: ['Vanilla Syrup (+₱50.00)', 'Extra “Oat” Milk'],
          notes: 'Special prep: warm & sweet — please! (•◡-)-♡',
        },
      ],
      subtotal: 200,
      total: 200,
      paymentMethod: 'CASH',
      tendered: 500,
      change: 300,
    };

    const bytes = buildReceiptBytes(dirtyData, false, '57mm');
    // Decode text
    const text = new TextDecoder().decode(bytes);

    // Verify diacritics normalized, dashes converted, currency sanitized
    expect(text).toContain('Cafe Espresso -');
    expect(text).toContain('Blend...');
    expect(text).toContain('Renee & Francois - Table Tab');
    expect(text).toContain('+50.00');
    expect(text).toContain('"Oat"');
    expect(text).not.toContain('•');
    expect(text).not.toContain('—');
    expect(text).not.toContain('₱');
    expect(text).not.toContain('♡');
    expect(text).not.toContain('◡');
  });

  it('multiplies paid modifier price by quantity on receipts so itemized lines sum to subtotal', () => {
    const bytes = buildReceiptBytes(
      {
        receiptNumber: 'MD-MOD-QTY2',
        items: [
          {
            productName: 'Latte',
            unitPrice: 200, // 150 base + 50 mod
            quantity: 2,
            modifiers: ['Oat Milk (+₱50.00)'],
          },
        ],
        subtotal: 400,
        serviceCharge: 40,
        serviceChargeRate: 10,
        total: 440,
        paymentMethod: 'CASH',
        tendered: 500,
        change: 60,
      },
      false,
      '80mm'
    );
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('2 x @150.00');
    expect(text).toContain('300.00');
    expect(text).toContain('Oat Milk (@50.00)');
    expect(text).toContain('+100.00');
    expect(text).toContain('SERVICE CHARGE (10%):');
  });

  it('computes accurate LESS: SENIOR CITIZEN DISC. and NET AFTER DISCOUNT for partial Senior/PWD receipts', () => {
    // 1x Senior Pasta (300) + 1x Regular Pasta (300) = 600 subtotal, 60 SC
    // seniorTotalDeduction = 85.71, netAfterDiscount = 514.29, total = 574.29
    const partialSeniorData = {
      receiptNumber: 'MD-PARTIAL-SC',
      subtotal: 600,
      discountAmount: 85.71,
      serviceCharge: 60,
      serviceChargeRate: 10,
      total: 574.29,
      discountType: 'SENIOR_CITIZEN',
      seniorPwdId: '1234-5678',
      seniorPwdName: 'Maria Santos',
      paymentMethod: 'CASH',
      tendered: 600,
      change: 25.71,
      items: [
        { productName: 'Senior Pasta', unitPrice: 300, quantity: 1 },
        { productName: 'Regular Pasta', unitPrice: 300, quantity: 1 },
      ],
    };

    const receiptText = new TextDecoder().decode(buildReceiptBytes(partialSeniorData, false));
    expect(receiptText).toContain('LESS: SENIOR CITIZEN DISC.:');
    expect(receiptText).toContain('-85.71');
    expect(receiptText).toContain('NET AFTER DISCOUNT:');
    expect(receiptText).toContain('514.29');
    expect(receiptText).toContain('574.29');

    const billText = new TextDecoder().decode(buildBillStatementBytes(partialSeniorData));
    expect(billText).toContain('-85.71');
    expect(billText).toContain('514.29');
    expect(billText).toContain('574.29');
  });
});
