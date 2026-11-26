import { describe, it, expect } from 'vitest';
import { calculateTabBilling, type PricingLineItem } from '../utils/taxAndDiscountCalculator';

describe('User-Centered Billing, Service Charge & Discount Engine (Non-BIR VAT Mode)', () => {
  it('defaults service charge to 0 when not explicitly enabled and keeps VAT outputs at 0', () => {
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
    expect(result.vatableSales).toBe(0.0);
    expect(result.vatAmount).toBe(0.0);
    expect(result.vatExemptSales).toBe(0.0);
    expect(result.serviceCharge).toBe(0.0);
    expect(result.serviceChargeRate).toBe(0);
    expect(result.totalAmountDue).toBe(150.0);
  });

  it('applies Service Charge uniformly to ALL F&B items (Bar + Kitchen) regardless of Cafe vs Event Mode', () => {
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

    const cafeResult = calculateTabBilling(items, {
      operatingMode: 'CAFE',
      orderType: 'DINE_IN',
      serviceChargeEnabled: true,
      serviceChargeRate: 10,
    });

    const eventResult = calculateTabBilling(items, {
      operatingMode: 'EVENT',
      orderType: 'DINE_IN',
      serviceChargeEnabled: true,
      serviceChargeRate: 10,
    });

    expect(cafeResult.grossSubtotal).toBe(600.0);
    expect(cafeResult.serviceCharge).toBe(60.0);
    expect(cafeResult.totalAmountDue).toBe(660.0);
    expect(eventResult.serviceCharge).toBe(cafeResult.serviceCharge);
    expect(eventResult.totalAmountDue).toBe(cafeResult.totalAmountDue);
  });

  it('allows Service Charge on Takeout orders when explicitly enabled at settlement', () => {
    const items: PricingLineItem[] = [
      {
        id: 'item-5',
        productName: 'Burger',
        unitPrice: 400,
        quantity: 1,
        stationTarget: 'kitchen',
      },
    ];

    const withoutSc = calculateTabBilling(items, {
      operatingMode: 'CAFE',
      orderType: 'TAKEOUT',
      serviceChargeEnabled: false,
      serviceChargeRate: 10,
    });
    expect(withoutSc.serviceCharge).toBe(0.0);
    expect(withoutSc.totalAmountDue).toBe(400.0);

    const withSc = calculateTabBilling(items, {
      operatingMode: 'CAFE',
      orderType: 'TAKEOUT',
      serviceChargeEnabled: true,
      serviceChargeRate: 10,
    });
    expect(withSc.serviceCharge).toBe(40.0);
    expect(withSc.totalAmountDue).toBe(440.0);
  });

  it('retains internal Senior/PWD 2-step (/1.12 + 20%) math and computes SC on original gross before discount', () => {
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
      serviceChargeEnabled: true,
      serviceChargeRate: 10,
    });

    // 150 / 1.12 = 133.93; 20% = 26.79; payable = 107.14; full deduction = 42.86
    expect(result.grossSubtotal).toBe(150.0);
    expect(result.seniorTwentyPercentDiscount).toBe(26.79);
    expect(result.seniorVatReliefAmount).toBe(16.07);
    expect(result.seniorDiscountAmount).toBe(42.86);
    expect(result.totalDiscountAmount).toBe(42.86);
    expect(result.netAfterDiscount).toBe(107.14);
    expect(result.serviceCharge).toBe(15.0); // 10% of 150 gross
    expect(result.totalAmountDue).toBe(122.14);
    expect(result.vatableSales).toBe(0);
    expect(result.vatAmount).toBe(0);
    expect(result.vatExemptSales).toBe(0);
  });

  it('handles partial table discount with mixed Senior and Regular items cleanly', () => {
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
      serviceChargeEnabled: true,
      serviceChargeRate: 10,
    });

    expect(result.grossSubtotal).toBe(600.0);
    expect(result.seniorItemsGross).toBe(300.0);
    expect(result.regularItemsGross).toBe(300.0);
    // 300 / 1.12 = 267.86; 20% = 53.57; payable = 214.29; deduction = 85.71
    expect(result.seniorDiscountAmount).toBe(85.71);
    expect(result.netAfterDiscount).toBe(514.29);
    expect(result.serviceCharge).toBe(60.0);
    expect(result.totalAmountDue).toBe(574.29);
  });

  it('excludes Door Charge from Service Charge, Senior/PWD discount, AND Custom/Promo discounts', () => {
    const items: PricingLineItem[] = [
      {
        id: 'dc-1',
        productName: 'Event Door Charge',
        unitPrice: 300,
        quantity: 2,
        stationTarget: 'bar',
        categorySlug: 'door_charge',
        isSeniorDiscounted: true,
      },
      {
        id: 'bev-1',
        productName: 'Beer Bucket',
        unitPrice: 500,
        quantity: 1,
        stationTarget: 'bar',
        isSeniorDiscounted: false,
      },
    ];

    const seniorResult = calculateTabBilling(items, {
      operatingMode: 'EVENT',
      orderType: 'DINE_IN',
      discountType: 'SENIOR_CITIZEN',
      serviceChargeEnabled: true,
      serviceChargeRate: 10,
    });

    expect(seniorResult.grossSubtotal).toBe(1100.0);
    expect(seniorResult.fnbItemsGross).toBe(500.0);
    expect(seniorResult.doorChargeGross).toBe(600.0);
    expect(seniorResult.serviceCharge).toBe(50.0); // 10% ONLY on 500 Beer Bucket
    expect(seniorResult.seniorDiscountAmount).toBe(0.0);
    expect(seniorResult.totalAmountDue).toBe(1150.0);

    const promoResult = calculateTabBilling(items, {
      operatingMode: 'EVENT',
      orderType: 'DINE_IN',
      discountType: 'PROMO',
      customDiscountPercent: 20,
      serviceChargeEnabled: true,
      serviceChargeRate: 10,
    });

    // 20% promo applies ONLY to 500 Beer Bucket (-100), SC = 10% of 500 (+50)
    expect(promoResult.customDiscountAmount).toBe(100.0);
    expect(promoResult.netAfterDiscount).toBe(1000.0);
    expect(promoResult.serviceCharge).toBe(50.0);
    expect(promoResult.totalAmountDue).toBe(1050.0);
  });
});
