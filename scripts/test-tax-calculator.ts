import assert from 'node:assert';
import { calculateTabBilling } from '../frontend/src/features/checkout/utils/taxAndDiscountCalculator.ts';
import type { PricingLineItem } from '../frontend/src/features/checkout/utils/taxAndDiscountCalculator.ts';

console.log('🧪 Running Tax, Service Charge, and Discount Engine Unit Tests...');

// Test 1: Standard ₱150 item (Coffee / Bar) in Cafe Mode - Dine In
{
  const items: PricingLineItem[] = [
    {
      id: 'item-1',
      productName: 'Americano',
      unitPrice: 150,
      quantity: 1,
      stationTarget: 'bar',
    },
  ];

  const result = calculateTabBilling(items, {
    operatingMode: 'CAFE',
    orderType: 'DINE_IN',
  });

  assert.strictEqual(result.grossSubtotal, 150.0);
  assert.strictEqual(result.vatableSales, 133.93);
  assert.strictEqual(result.vatAmount, 16.07);
  assert.strictEqual(result.vatExemptSales, 0.0);
  assert.strictEqual(result.serviceCharge, 0.0); // 0% on coffee in Cafe mode
  assert.strictEqual(result.totalAmountDue, 150.0);
  console.log('  ✅ Test 1 Passed: Standard VAT-inclusive ₱150 bar coffee in Cafe Mode (0% SC).');
}

// Test 2: Standard ₱500 item (Food / Kitchen) in Cafe Mode - Dine In (10% SC)
{
  const items: PricingLineItem[] = [
    {
      id: 'item-2',
      productName: 'Truffle Pasta',
      unitPrice: 500,
      quantity: 1,
      stationTarget: 'kitchen',
    },
  ];

  const result = calculateTabBilling(items, {
    operatingMode: 'CAFE',
    orderType: 'DINE_IN',
    cafeFoodServiceChargeRate: 10,
  });

  assert.strictEqual(result.grossSubtotal, 500.0);
  assert.strictEqual(result.vatableSales, 446.43);
  assert.strictEqual(result.vatAmount, 53.57);
  assert.strictEqual(result.serviceCharge, 50.0); // 10% of ₱500
  assert.strictEqual(result.totalAmountDue, 550.0); // ₱500 food + ₱50 SC
  console.log(
    '  ✅ Test 2 Passed: Standard VAT-inclusive ₱500 kitchen food in Cafe Mode (10% SC = ₱50, Total = ₱550).'
  );
}

// Test 3: Senior Citizen ₱150 Food item in Cafe Mode - Dine In (10% SC)
{
  const items: PricingLineItem[] = [
    {
      id: 'item-3',
      productName: 'Club Sandwich',
      unitPrice: 150,
      quantity: 1,
      stationTarget: 'kitchen',
      isSeniorDiscounted: true,
    },
  ];

  const result = calculateTabBilling(items, {
    operatingMode: 'CAFE',
    orderType: 'DINE_IN',
    discountType: 'SENIOR_CITIZEN',
    cafeFoodServiceChargeRate: 10,
  });

  assert.strictEqual(result.grossSubtotal, 150.0);
  assert.strictEqual(result.vatableSales, 0.0);
  assert.strictEqual(result.vatAmount, 0.0);
  assert.strictEqual(result.vatExemptSales, 133.93); // 150 / 1.12
  assert.strictEqual(result.seniorDiscountAmount, 26.79); // 133.93 * 0.20
  assert.strictEqual(result.serviceCharge, 15.0); // 10% SC retained
  // Net payable = (133.93 - 26.79) + 15.00 = 107.14 + 15.00 = 122.14
  assert.strictEqual(result.totalAmountDue, 122.14);
  console.log(
    '  ✅ Test 3 Passed: Senior Citizen ₱150 Food: VAT-Exempt ₱133.93, 20% Disc ₱26.79, 10% SC ₱15.00 -> Total ₱122.14.'
  );
}

// Test 4: Mixed Order (1 Bar Drink ₱200 + 1 Kitchen Dish ₱400) in Cafe Mode vs Event Mode
{
  const items: PricingLineItem[] = [
    {
      id: 'item-4a',
      productName: 'Cold Brew',
      unitPrice: 200,
      quantity: 1,
      stationTarget: 'bar',
    },
    {
      id: 'item-4b',
      productName: 'Burger',
      unitPrice: 400,
      quantity: 1,
      stationTarget: 'kitchen',
    },
  ];

  // Cafe Mode
  const cafeResult = calculateTabBilling(items, {
    operatingMode: 'CAFE',
    orderType: 'DINE_IN',
    cafeFoodServiceChargeRate: 10,
    eventServiceChargeRate: 10,
  });

  assert.strictEqual(cafeResult.grossSubtotal, 600.0);
  assert.strictEqual(cafeResult.serviceCharge, 40.0); // only 10% on ₱400 burger
  assert.strictEqual(cafeResult.totalAmountDue, 640.0);

  // Event Mode
  const eventResult = calculateTabBilling(items, {
    operatingMode: 'EVENT',
    orderType: 'DINE_IN',
    cafeFoodServiceChargeRate: 10,
    eventServiceChargeRate: 10,
  });

  assert.strictEqual(eventResult.grossSubtotal, 600.0);
  assert.strictEqual(eventResult.serviceCharge, 60.0); // 10% on both = 20 + 40
  assert.strictEqual(eventResult.totalAmountDue, 660.0);

  console.log('  ✅ Test 4 Passed: Mixed order Cafe Mode SC = ₱40.00 vs Event Mode SC = ₱60.00.');
}

// Test 5: Takeout Order - Zero Service Charge
{
  const items: PricingLineItem[] = [
    {
      id: 'item-5',
      productName: 'Burger',
      unitPrice: 400,
      quantity: 1,
      stationTarget: 'kitchen',
    },
  ];

  const result = calculateTabBilling(items, {
    operatingMode: 'EVENT',
    orderType: 'TAKEOUT',
    eventServiceChargeRate: 10,
  });

  assert.strictEqual(result.serviceCharge, 0.0);
  assert.strictEqual(result.totalAmountDue, 400.0);
  console.log('  ✅ Test 5 Passed: Takeout order has strictly ₱0.00 service charge.');
}

// Test 6: Mixed Table (1 Senior item + 1 Regular item)
{
  const items: PricingLineItem[] = [
    {
      id: 'item-6a',
      productName: 'Senior Pasta',
      unitPrice: 300,
      quantity: 1,
      stationTarget: 'kitchen',
      isSeniorDiscounted: true,
    },
    {
      id: 'item-6b',
      productName: 'Regular Pasta',
      unitPrice: 300,
      quantity: 1,
      stationTarget: 'kitchen',
      isSeniorDiscounted: false,
    },
  ];

  const result = calculateTabBilling(items, {
    operatingMode: 'CAFE',
    orderType: 'DINE_IN',
    discountType: 'SENIOR_CITIZEN',
    cafeFoodServiceChargeRate: 10,
  });

  assert.strictEqual(result.grossSubtotal, 600.0);
  assert.strictEqual(result.seniorItemsGross, 300.0);
  assert.strictEqual(result.regularItemsGross, 300.0);
  assert.strictEqual(result.vatableSales, 267.86); // 300 / 1.12
  assert.strictEqual(result.vatAmount, 32.14); // 300 - 267.86
  assert.strictEqual(result.vatExemptSales, 267.86); // 300 / 1.12
  assert.strictEqual(result.seniorDiscountAmount, 53.57); // 267.86 * 0.20
  assert.strictEqual(result.serviceCharge, 60.0); // 10% on both pastas
  // Senior pays: 267.86 - 53.57 = 214.29 + 30 SC = 244.29
  // Regular pays: 300.00 + 30 SC = 330.00
  // Total = 244.29 + 330.00 = 574.29
  assert.strictEqual(result.totalAmountDue, 574.29);
  console.log('  ✅ Test 6 Passed: Mixed Table with 1 Senior item and 1 Regular item.');
}

console.log('🎉 All 6 Billing & Tax Engine Unit Tests Passed Perfectly!\n');
