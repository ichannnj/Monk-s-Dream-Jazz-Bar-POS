import { describe, it, expect } from 'vitest';
import { calculateTabBilling, type PricingLineItem } from '../utils/taxAndDiscountCalculator';

describe('Philippine Statutory Tax, Station-Aware SC & Discount Engine', () => {
  it('extracts 12% VAT and applies 0% SC for bar drinks in Cafe Mode', () => {
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

    expect(result.grossSubtotal).toBe(150.0);
    expect(result.vatableSales).toBe(133.93);
    expect(result.vatAmount).toBe(16.07);
    expect(result.vatExemptSales).toBe(0.0);
    expect(result.serviceCharge).toBe(0.0); // 0% on coffee/bar in Cafe mode
    expect(result.totalAmountDue).toBe(150.0);
  });

  it('applies 10% SC for kitchen food in Cafe Mode', () => {
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

    expect(result.grossSubtotal).toBe(500.0);
    expect(result.vatableSales).toBe(446.43);
    expect(result.vatAmount).toBe(53.57);
    expect(result.serviceCharge).toBe(50.0); // 10% of ₱500
    expect(result.totalAmountDue).toBe(550.0); // ₱500 food + ₱50 SC
  });

  it('correctly calculates Senior Citizen 2-step statutory discount (RA 9994) with retained SC', () => {
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

    expect(result.grossSubtotal).toBe(150.0);
    expect(result.vatableSales).toBe(0.0);
    expect(result.vatAmount).toBe(0.0);
    expect(result.vatExemptSales).toBe(133.93); // 150 / 1.12
    expect(result.seniorDiscountAmount).toBe(26.79); // 133.93 * 0.20
    expect(result.serviceCharge).toBe(15.0); // 10% SC retained
    // Net payable = (133.93 - 26.79) + 15.00 = 107.14 + 15.00 = 122.14
    expect(result.totalAmountDue).toBe(122.14);
  });

  it('applies station-aware SC rules in Cafe Mode vs Event Mode for mixed orders', () => {
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

    // Cafe Mode: Bar 0% SC, Kitchen 10% SC
    const cafeResult = calculateTabBilling(items, {
      operatingMode: 'CAFE',
      orderType: 'DINE_IN',
      cafeFoodServiceChargeRate: 10,
      eventServiceChargeRate: 10,
    });

    expect(cafeResult.grossSubtotal).toBe(600.0);
    expect(cafeResult.serviceCharge).toBe(40.0); // only 10% on ₱400 burger
    expect(cafeResult.totalAmountDue).toBe(640.0);

    // Event Mode: 10% SC across all items
    const eventResult = calculateTabBilling(items, {
      operatingMode: 'EVENT',
      orderType: 'DINE_IN',
      cafeFoodServiceChargeRate: 10,
      eventServiceChargeRate: 10,
    });

    expect(eventResult.grossSubtotal).toBe(600.0);
    expect(eventResult.serviceCharge).toBe(60.0); // 10% on both = 20 + 40
    expect(eventResult.totalAmountDue).toBe(660.0);
  });

  it('strictly enforces 0% service charge on takeout orders regardless of operating mode', () => {
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

    expect(result.serviceCharge).toBe(0.0);
    expect(result.totalAmountDue).toBe(400.0);
  });

  it('handles partial table discount with mixed Senior and Regular items', () => {
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

    expect(result.grossSubtotal).toBe(600.0);
    expect(result.seniorItemsGross).toBe(300.0);
    expect(result.regularItemsGross).toBe(300.0);
    expect(result.vatableSales).toBe(267.86); // 300 / 1.12
    expect(result.vatAmount).toBe(32.14); // 300 - 267.86
    expect(result.vatExemptSales).toBe(267.86); // 300 / 1.12
    expect(result.seniorDiscountAmount).toBe(53.57); // 267.86 * 0.20
    expect(result.serviceCharge).toBe(60.0); // 10% on both pastas
    expect(result.totalAmountDue).toBe(574.29);
  });
});
