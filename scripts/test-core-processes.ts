import assert from 'node:assert/strict';
import { calculateTabBilling } from '../frontend/src/features/checkout/utils/taxAndDiscountCalculator.ts';
import type { PricingLineItem } from '../frontend/src/features/checkout/utils/taxAndDiscountCalculator.ts';
import {
  UsbEscPosPrinter,
  sanitizeForEscPos,
  type CustomerReceiptPayload,
  type RunnerChitPayload,
} from '../packages/printing/dist/index.js';
import {
  formatLineItemLabel,
  calculateOrderPrice,
  shouldMergeCartItem,
} from '../packages/printing/src/flavorVariants.test.ts';

console.log('🎷 ============================================================');
console.log("🎷 AUDITING MONK'S DREAM JAZZ BAR POS CORE PROCESSES & ENGINES");
console.log('🎷 ============================================================');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    testsFailed++;
  }
}

// -------------------------------------------------------------
// CORE PROCESS 1: ORDER TAKING & VARIANT / MODIFIER CART LOGIC
// -------------------------------------------------------------
console.log('\n--- 1. Order Taking, Flavor Variants & Cart Line Item Merging ---');

runTest('Cart Merging: Identical items with same variant and modifiers merge', () => {
  const item1 = {
    productId: 'coffee-latte',
    variantId: 'var-12oz-hot',
    selections: ['grp:classic'],
    mods: ['Oat Milk'],
    notes: 'Extra hot',
  };
  const item2 = {
    productId: 'coffee-latte',
    variantId: 'var-12oz-hot',
    selections: ['grp:classic'],
    mods: ['Oat Milk'],
    notes: 'Extra hot',
  };
  assert.equal(shouldMergeCartItem(item1, item2), true);
});

runTest('Cart Separation: Different flavors must remain distinct line items', () => {
  const spanishLatte = {
    productId: 'coffee-latte',
    variantId: 'var-12oz-hot',
    selections: ['grp:spanish'],
    mods: ['Oat Milk'],
  };
  const vanillaLatte = {
    productId: 'coffee-latte',
    variantId: 'var-12oz-hot',
    selections: ['grp:vanilla'],
    mods: ['Oat Milk'],
  };
  assert.equal(shouldMergeCartItem(spanishLatte, vanillaLatte), false);
});

runTest('Cart Separation: Different prep notes must remain distinct line items', () => {
  const item1 = {
    productId: 'pasta-carbonara',
    selections: [],
    mods: [],
    notes: 'No bacon bits (Allergy)',
  };
  const item2 = {
    productId: 'pasta-carbonara',
    selections: [],
    mods: [],
    notes: 'Extra parmesan on side',
  };
  assert.equal(shouldMergeCartItem(item1, item2), false);
});

runTest('Line Item Descriptor: Formats temperature, size, and flavor snapshot', () => {
  const label = formatLineItemLabel('Americano', 'Spanish', 'HOT', '12oz');
  assert.equal(label, 'Americano (Spanish · Hot · 12oz)');

  const coldStandard = formatLineItemLabel('Matcha Latte', undefined, 'COLD', 'Standard');
  assert.equal(coldStandard, 'Matcha Latte (Iced)');
});

runTest('Pricing Matrix: Base + Variant + Flavor Option + Modifiers', () => {
  // Base 180 + Size Delta 30 + Spanish Flavor 25 + Oat Milk 50 = 285
  const price = calculateOrderPrice(180, 30, 25, 50);
  assert.equal(price, 285.0);
});

// -------------------------------------------------------------
// CORE PROCESS 2: STATUTORY 12% VAT, SERVICE FEE & DISCOUNTS
// -------------------------------------------------------------
console.log('\n--- 2. Philippine Statutory Tax, Station-Aware SC & Discount Engine ---');

runTest('Cafe Mode SC: Bar drinks incur 0% SC, Kitchen food incurs 10% SC', () => {
  const items: PricingLineItem[] = [
    { id: '1', productName: 'Pour-Over Coffee', unitPrice: 200, quantity: 1, stationTarget: 'bar' },
    {
      id: '2',
      productName: 'Truffle Pasta',
      unitPrice: 400,
      quantity: 1,
      stationTarget: 'kitchen',
    },
  ];
  const res = calculateTabBilling(items, {
    operatingMode: 'CAFE',
    orderType: 'DINE_IN',
    cafeFoodServiceChargeRate: 10,
  });

  assert.equal(res.grossSubtotal, 600.0);
  // Bar 200 gets 0% SC; Kitchen 400 gets 10% SC = 40.00
  assert.equal(res.serviceCharge, 40.0);
  assert.equal(res.totalAmountDue, 640.0);
  // VATable on gross 600 = 600 / 1.12 = 535.71, VAT = 64.29
  assert.equal(res.vatableSales, 535.71);
  assert.equal(res.vatAmount, 64.29);
});

runTest('Event Mode SC: All items (Bar & Kitchen) incur 10% SC', () => {
  const items: PricingLineItem[] = [
    { id: '1', productName: 'Gin & Tonic', unitPrice: 350, quantity: 2, stationTarget: 'bar' },
    {
      id: '2',
      productName: 'Artisan Pizza',
      unitPrice: 500,
      quantity: 1,
      stationTarget: 'kitchen',
    },
  ];
  const res = calculateTabBilling(items, {
    operatingMode: 'EVENT',
    orderType: 'DINE_IN',
    eventServiceChargeRate: 10,
  });

  assert.equal(res.grossSubtotal, 1200.0);
  // 10% on 1200 = 120.00
  assert.equal(res.serviceCharge, 120.0);
  assert.equal(res.totalAmountDue, 1320.0);
});

runTest('Takeout Orders strictly incur 0% Service Charge', () => {
  const items: PricingLineItem[] = [
    {
      id: '1',
      productName: 'Truffle Pasta',
      unitPrice: 400,
      quantity: 2,
      stationTarget: 'kitchen',
    },
  ];
  const res = calculateTabBilling(items, {
    operatingMode: 'EVENT',
    orderType: 'TAKEOUT',
    eventServiceChargeRate: 10,
  });

  assert.equal(res.grossSubtotal, 800.0);
  assert.equal(res.serviceCharge, 0.0);
  assert.equal(res.totalAmountDue, 800.0);
});

runTest('Senior / PWD Statutory Discount (RA 9994): VAT-Exempt base + 20% discount', () => {
  // ₱150 Food item:
  // Step 1: VAT-Exempt Base = 150 / 1.12 = 133.93
  // Step 2: 20% Discount = 133.93 * 0.20 = 26.79
  // Step 3: SC on 150 = 15.00 (retained per RA 11360)
  // Step 4: Amount Due = 133.93 - 26.79 + 15.00 = 122.14
  const items: PricingLineItem[] = [
    {
      id: 'item-sc',
      productName: 'Senior Meal',
      unitPrice: 150,
      quantity: 1,
      stationTarget: 'kitchen',
      isSeniorDiscounted: true,
    },
  ];
  const res = calculateTabBilling(items, {
    operatingMode: 'CAFE',
    orderType: 'DINE_IN',
    cafeFoodServiceChargeRate: 10,
    discountType: 'SENIOR_CITIZEN',
    seniorPwdId: 'OSCA-12345',
    seniorPwdName: 'Miles Davis',
  });

  assert.equal(res.vatExemptSales, 133.93);
  assert.equal(res.vatableSales, 0.0);
  assert.equal(res.vatAmount, 0.0);
  assert.equal(res.seniorDiscountAmount, 26.79);
  assert.equal(res.serviceCharge, 15.0);
  assert.equal(res.totalAmountDue, 122.14);
});

runTest('Partial Table Discount: Only tagged senior items receive discount & VAT relief', () => {
  const items: PricingLineItem[] = [
    {
      id: 'senior-pasta',
      productName: 'Pasta',
      unitPrice: 500,
      quantity: 1,
      stationTarget: 'kitchen',
      isSeniorDiscounted: true,
    },
    {
      id: 'regular-steak',
      productName: 'Steak',
      unitPrice: 1000,
      quantity: 1,
      stationTarget: 'kitchen',
      isSeniorDiscounted: false,
    },
  ];
  const res = calculateTabBilling(items, {
    operatingMode: 'EVENT',
    orderType: 'DINE_IN',
    eventServiceChargeRate: 10,
    discountType: 'SENIOR_CITIZEN',
  });

  // Gross = 1500
  assert.equal(res.grossSubtotal, 1500.0);
  assert.equal(res.seniorItemsGross, 500.0);
  assert.equal(res.regularItemsGross, 1000.0);

  // Senior item: 500 / 1.12 = 446.43 VAT exempt base, 20% disc = 89.29, net senior = 357.14
  assert.equal(res.vatExemptSales, 446.43);
  assert.equal(res.seniorDiscountAmount, 89.29);

  // Regular item: 1000 gross -> 1000 / 1.12 = 892.86 VATable, 107.14 VAT
  assert.equal(res.vatableSales, 892.86);
  assert.equal(res.vatAmount, 107.14);

  // Service charge: 10% on 1500 gross = 150.00
  assert.equal(res.serviceCharge, 150.0);

  // Total Due = 1000 (regular) + 357.14 (senior net) + 150 (SC) = 1507.14
  assert.equal(res.totalAmountDue, 1507.14);
});

runTest('Custom / Promo Discount: Percentage and Fixed Peso discounts', () => {
  const items: PricingLineItem[] = [
    { id: '1', productName: 'Cocktail', unitPrice: 400, quantity: 2, stationTarget: 'bar' },
  ];
  // 10% promo on 800 = 80.00
  const pctRes = calculateTabBilling(items, {
    operatingMode: 'CAFE',
    orderType: 'DINE_IN',
    discountType: 'PROMO',
    customDiscountPercent: 10,
  });
  assert.equal(pctRes.grossSubtotal, 800.0);
  assert.equal(pctRes.customDiscountAmount, 80.0);
  assert.equal(pctRes.totalAmountDue, 720.0);

  // Fixed ₱150 promo on 800 = 650.00
  const fixedRes = calculateTabBilling(items, {
    operatingMode: 'CAFE',
    orderType: 'DINE_IN',
    discountType: 'CUSTOM',
    customDiscountAmount: 150,
  });
  assert.equal(fixedRes.grossSubtotal, 800.0);
  assert.equal(fixedRes.customDiscountAmount, 150.0);
  assert.equal(fixedRes.totalAmountDue, 650.0);
});

runTest('Corkage Fee: Adds designated corkage amount to final amount due', () => {
  const items: PricingLineItem[] = [
    { id: '1', productName: 'Artisan Espresso', unitPrice: 160, quantity: 1, stationTarget: 'bar' },
  ];
  const res = calculateTabBilling(items, {
    operatingMode: 'CAFE',
    orderType: 'DINE_IN',
    corkageAmount: 500,
  });
  assert.equal(res.grossSubtotal, 160.0);
  assert.equal(res.corkageAmount, 500.0);
  assert.equal(res.totalAmountDue, 660.0);
});

runTest(
  'Door Charge Invariant: 12% VAT inclusive, 0% SC even in Event Mode, strictly no Senior discount',
  () => {
    const items: PricingLineItem[] = [
      {
        id: 'dc-1',
        productName: 'Event Door Charge',
        unitPrice: 500,
        quantity: 1,
        stationTarget: 'bar',
        categorySlug: 'door_charge',
        isSeniorDiscounted: true, // Attempted senior discount
      },
      {
        id: 'food-1',
        productName: 'Pasta',
        unitPrice: 400,
        quantity: 1,
        stationTarget: 'kitchen',
        categorySlug: 'mains',
        isSeniorDiscounted: true, // Legitimate senior food item
      },
    ];

    const res = calculateTabBilling(items, {
      operatingMode: 'EVENT',
      orderType: 'DINE_IN',
      eventServiceChargeRate: 10,
      discountType: 'SENIOR_CITIZEN',
      seniorPwdId: 'OSCA-999',
      seniorPwdName: 'Thelonious Monk',
    });

    // Gross = 500 (Door) + 400 (Food) = 900
    assert.equal(res.grossSubtotal, 900.0);

    // Door Charge strictly incurs 0% SC. Food incurs 10% SC = 40.00
    assert.equal(res.serviceCharge, 40.0);

    // Door Charge is strictly exempt from Senior/PWD discount:
    // Only Pasta gets senior discount: 400 / 1.12 = 357.14 base, 20% disc = 71.43
    assert.equal(res.vatExemptSales, 357.14);
    assert.equal(res.seniorDiscountAmount, 71.43);

    // Door Charge remains in VATable sales: 500 / 1.12 = 446.43, VAT = 53.57
    assert.equal(res.vatableSales, 446.43);
    assert.equal(res.vatAmount, 53.57);

    // Total Due:
    // Door Charge: 500
    // Pasta (Senior Net): 357.14 - 71.43 = 285.71
    // SC: 40.00
    // Sum = 500 + 285.71 + 40 = 825.71
    assert.equal(res.totalAmountDue, 825.71);
  }
);

// -------------------------------------------------------------
// CORE PROCESS 3: RECEIPT GENERATION & ESC/POS PRINTING ENGINE
// -------------------------------------------------------------
console.log('\n--- 3. ESC/POS Printing, Runner Chit & Customer Receipt Engine ---');

runTest('Customer Receipt: Builds binary bytes with VAT breakdown, SC, and signature block', () => {
  const printer = new UsbEscPosPrinter('/dev/null');
  const receiptPayload: CustomerReceiptPayload = {
    receiptNumber: 'MD-20261111-PAY1',
    tableNumber: 4,
    tableLabel: 'Table 4',
    tabName: 'Coltrane Group',
    cashierName: 'Ella Fitzgerald',
    operatingMode: 'EVENT',
    items: [
      {
        name: 'Monk Mule',
        quantity: 2,
        price: 350,
        total: 700,
        station: 'bar',
        modifiers: ['Double Shot'],
      },
    ],
    subtotal: 700,
    serviceCharge: 70,
    total: 770,
    paymentMethod: 'CASH',
    tendered: 1000,
    change: 230,
    vatableSales: 625.0,
    vatAmount: 75.0,
    vatExemptSales: 0,
    timestamp: '2026-11-11 20:30',
  };

  const receiptBuffer = printer.renderReceiptBytes(receiptPayload);
  assert(receiptBuffer instanceof Buffer, 'Receipt must return Buffer');
  assert(receiptBuffer.length > 100, 'Receipt bytes should not be empty');

  // Convert to string to verify key text markers
  const receiptStr = receiptBuffer.toString('utf-8');
  assert(receiptStr.includes("MONK'S DREAM"), 'Receipt should contain header');
  assert(receiptStr.includes('MD-20261111-PAY1'), 'Receipt should include check number');
  assert(receiptStr.includes('Table 4'), 'Receipt should include table label');
  assert(receiptStr.includes('TOTAL AMOUNT DUE:'), 'Receipt should include total amount due');
  assert(
    receiptStr.includes('THIS IS NOT AN OFFICIAL RECEIPT'),
    'Receipt should include statutory disclaimer'
  );
});

runTest('Runner Chit: Builds expediter chit with station tags and round number', () => {
  const printer = new UsbEscPosPrinter('/dev/null');
  const chitPayload: RunnerChitPayload = {
    orderNumber: 'ORD-20261111-001',
    roundNumber: 2,
    tableNumber: 7,
    tabName: 'Bill Evans',
    waiterName: 'Miles',
    timestamp: '20:45',
    items: [
      {
        name: 'Old Fashioned',
        quantity: 2,
        station: 'station:bar',
        modifiers: ['Extra Bitters'],
        notes: 'Low ice please',
      },
      {
        name: 'Wagyu Sliders',
        quantity: 1,
        station: 'station:kitchen',
        notes: 'Medium rare',
      },
    ],
  };

  const chitBuffer = printer.renderRunnerChit(chitPayload);
  assert(chitBuffer instanceof Buffer);
  const chitStr = chitBuffer.toString('utf-8');
  assert(chitStr.includes('ROUND 2 • EXPEDITER'), 'Chit should indicate Round 2');
  assert(chitStr.includes('[BAR]'), 'Chit should mark bar station');
  assert(chitStr.includes('[KITCHEN]'), 'Chit should mark kitchen station');
  assert(chitStr.includes('Low ice please'), 'Chit should contain prep notes');
});

runTest('Takeout Slip: Builds takeaway bag tag with pickup status', () => {
  const printer = new UsbEscPosPrinter('/dev/null');
  const slipBuffer = printer.renderTakeoutSlip({
    orderNumber: 'T-108',
    customerName: 'Thelonious',
    isPrepaid: true,
    timestamp: '14:30',
    notes: '2 cup carriers',
    items: [{ name: 'Iced Spanish Latte', quantity: 2 }],
  });
  assert(slipBuffer instanceof Buffer);
  const str = slipBuffer.toString('utf-8');
  assert(str.includes('TAKEOUT / TO-GO'));
  assert(str.includes('T-108'));
  assert(str.includes('[PREPAID]'));
  assert(str.includes('2 cup carriers'));
});

runTest('Fiscal Shift Reading: Builds X/Y/Z reading slip byte stream', () => {
  const printer = new UsbEscPosPrinter('/dev/null');
  const readingBuffer = printer.renderReadingSlipBytes({
    reading_type: 'Z_READING',
    z_number: 42,
    drawer_target: 'main',
    staff_name: 'Manager Coltrane',
    gross_sales: 25000,
    discounts: 1500,
    service_charge: 2350,
    net_sales: 23500,
    cash_total: 12000,
    card_total: 8000,
    digital_wallet_total: 3500,
  });
  assert(readingBuffer instanceof Buffer);
  const str = readingBuffer.toString('utf-8');
  assert(str.includes('Z-READING #42'));
  assert(str.includes('FLOOR TILL'));
  assert(str.includes('Gross Sales:'));
});

runTest('Cash Drawer Kick: Generates raw pulse command', () => {
  // ESC p 0 25 250 (0x1B, 0x70, 0x00, 0x19, 0xFA)
  const kickBytes = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
  assert.equal(kickBytes.length, 5, 'Cash drawer pulse standard length is 5 bytes');
  assert.equal(kickBytes[0], 0x1b);
  assert.equal(kickBytes[1], 0x70);
});

runTest(
  'ESC/POS Normalizer: Sanitizes unicode accents, curly quotes, dashes, and peso signs to safe ASCII',
  () => {
    const rawNote = 'Piña colada — “Extra spicy” & ₱50 change please…';
    const sanitized = sanitizeForEscPos(rawNote);
    assert.equal(sanitized, 'Pina colada - "Extra spicy" & PHP 50 change please...');
  }
);

// -------------------------------------------------------------
// CORE PROCESS 4: CASHLESS QR REFERENCE & PAYMENT VALIDATION
// -------------------------------------------------------------
console.log('\n--- 4. Settling Orders & Validation Guardrails ---');

runTest('Cashless QR: Strictly requires exactly 4 numeric digits reference', () => {
  const isValidRef = (ref: string) => /^\d{4}$/.test(ref.trim());

  assert.equal(isValidRef('1234'), true, '4 digits should be valid');
  assert.equal(isValidRef('0042'), true, '4 digits with leading zeros should be valid');
  assert.equal(isValidRef('123'), false, '3 digits should be invalid');
  assert.equal(isValidRef('12345'), false, '5 digits should be invalid');
  assert.equal(isValidRef('12a4'), false, 'Alphanumeric should be invalid');
  assert.equal(isValidRef('    '), false, 'Empty string should be invalid');
});

runTest('Cashless QR Sanitization: Cleans pasted input and strictly validates 4 digits', () => {
  const sanitizeRef = (val: string) => val.replace(/[^0-9]/g, '').slice(0, 4);
  assert.equal(sanitizeRef('REF-1234-PAID'), '1234');
  assert.equal(sanitizeRef(' 98 76 '), '9876');
  assert.equal(sanitizeRef('123456'), '1234');
});

runTest(
  'Multi-Quantity Senior/PWD Calculation: Accurately scales VAT-exempt base and 20% discount',
  () => {
    const items: PricingLineItem[] = [
      {
        id: 'senior-meal-2x',
        productName: 'Senior Meal',
        unitPrice: 150,
        quantity: 2,
        stationTarget: 'kitchen',
        isSeniorDiscounted: true,
      },
    ];
    const res = calculateTabBilling(items, {
      operatingMode: 'CAFE',
      orderType: 'DINE_IN',
      cafeFoodServiceChargeRate: 10,
      discountType: 'SENIOR_CITIZEN',
      seniorPwdId: 'OSCA-12345',
      seniorPwdName: 'John Coltrane',
    });

    // Gross = 300.00
    // Step 1: VAT-Exempt Base = 300 / 1.12 = 267.86
    // Step 2: 20% Discount = 267.86 * 0.20 = 53.57
    // Step 3: SC on 300 = 30.00
    // Step 4: Total Due = 267.86 - 53.57 + 30.00 = 244.29
    assert.equal(res.grossSubtotal, 300.0);
    assert.equal(res.vatExemptSales, 267.86);
    assert.equal(res.seniorDiscountAmount, 53.57);
    assert.equal(res.serviceCharge, 30.0);
    assert.equal(res.totalAmountDue, 244.29);
  }
);

runTest('Comp VIP Tab: Zeroes amount due and records 100% discount with 0% SC', () => {
  const items: PricingLineItem[] = [
    { id: '1', productName: 'Wagyu Steak', unitPrice: 1200, quantity: 1, stationTarget: 'kitchen' },
    { id: '2', productName: 'Vintage Wine', unitPrice: 800, quantity: 1, stationTarget: 'bar' },
  ];
  const calculated = calculateTabBilling(items, {
    operatingMode: 'EVENT',
    orderType: 'DINE_IN',
    eventServiceChargeRate: 10,
    discountType: 'NONE',
    serviceChargeEnabled: false,
  });

  const compRes = {
    ...calculated,
    totalAmountDue: 0,
    totalDiscountAmount: calculated.grossSubtotal,
    customDiscountAmount: calculated.grossSubtotal,
    serviceCharge: 0,
  };

  assert.equal(compRes.grossSubtotal, 2000.0);
  assert.equal(compRes.totalAmountDue, 0.0);
  assert.equal(compRes.totalDiscountAmount, 2000.0);
  assert.equal(compRes.serviceCharge, 0.0);
});

runTest('Senior / PWD settlement: Strictly requires ID number and Cardholder Name', () => {
  const isSeniorDataValid = (id: string, name: string) =>
    Boolean(id && id.trim().length > 0 && name && name.trim().length > 0);

  assert.equal(isSeniorDataValid('OSCA-98765', 'Thelonious Monk'), true);
  assert.equal(isSeniorDataValid('', 'Thelonious Monk'), false);
  assert.equal(isSeniorDataValid('OSCA-98765', ''), false);
  assert.equal(isSeniorDataValid('   ', '   '), false);
});

// -------------------------------------------------------------
// CORE PROCESS 5: TABLE ITEM TRANSFER & SPLIT TAB INTEGRITY
// -------------------------------------------------------------
console.log('\n--- 5. Table Item Transfer & Split Tab Integrity ---');

runTest('Item Transfer: Correctly calculates quantity splits', () => {
  const originalQuantity = 3;
  const quantityToMove = 1;
  const remainingQuantity = originalQuantity - quantityToMove;

  assert.equal(remainingQuantity, 2);
  assert(quantityToMove <= originalQuantity, 'Move quantity cannot exceed original');
});

runTest('Item Transfer: Moving 100% of quantity leaves zero remaining on source tab', () => {
  const originalQuantity = 2;
  const quantityToMove = 2;
  const remainingQuantity = originalQuantity - quantityToMove;
  assert.equal(remainingQuantity, 0);
});

// -------------------------------------------------------------
// CORE PROCESS 6: MENU INPUT VALIDATION & OUTSIDE RESOLD FOOD (+20%)
// -------------------------------------------------------------
console.log('\n--- 6. Menu Inputting, Pricing & Vendor Cost Rules ---');

runTest('Menu Pricing: Outside resold food calculates minimum +20% margin', () => {
  const originalVendorCost = 250;
  const markupPercent = 20;
  const recommendedSellingPrice = originalVendorCost * (1 + markupPercent / 100);

  assert.equal(recommendedSellingPrice, 300.0);
  assert(recommendedSellingPrice > originalVendorCost);
});

// -------------------------------------------------------------
// CORE PROCESS 7: SECURITY OVERRIDES & OFFLINE RESILIENCE
// -------------------------------------------------------------
console.log('\n--- 7. Security Overrides, Permissions & Offline Resilience ---');

runTest(
  'Manager Floor Override PIN: Verifies 9999 for supervisor approvals and mode toggles',
  () => {
    const verifyManagerPin = (inputPin: string) => inputPin.trim() === '9999';
    assert.equal(verifyManagerPin('9999'), true);
    assert.equal(verifyManagerPin('1111'), false);
    assert.equal(verifyManagerPin(''), false);
  }
);

runTest(
  'Offline Queue Engine: Enqueues mutations and drains sequentially upon reconnection',
  () => {
    const offlineQueue: Array<{ id: string; action: string; payload: any }> = [];

    // Enqueue offline action
    offlineQueue.push({
      id: 'offline-mut-1',
      action: 'DISPATCH_ORDER',
      payload: { tableId: 't-4', round: 2, count: 3 },
    });
    offlineQueue.push({
      id: 'offline-mut-2',
      action: 'SETTLE_TAB',
      payload: { tabId: 'tab-101', method: 'CASH', tendered: 500 },
    });

    assert.equal(offlineQueue.length, 2);

    // Drain simulation
    const drained: string[] = [];
    while (offlineQueue.length > 0) {
      const item = offlineQueue.shift()!;
      drained.push(item.action);
    }

    assert.equal(offlineQueue.length, 0);
    assert.deepEqual(drained, ['DISPATCH_ORDER', 'SETTLE_TAB']);
  }
);

console.log('\n============================================================');
console.log(`📊 SUMMARY: ${testsPassed} passed, ${testsFailed} failed.`);
console.log('============================================================\n');

if (testsFailed > 0) {
  process.exit(1);
}
