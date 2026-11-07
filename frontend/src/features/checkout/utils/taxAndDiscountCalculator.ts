/**
 * Philippine Statutory Pricing, VAT Extraction, Service Charge, and Discount Engine
 * Compliant with:
 * - NIRC Sec. 106/108 & BIR RR 16-2005 (12% VAT-inclusive pricing)
 * - RA 9994, RA 10754 & BIR RR 7-2010, RMC 38-2012, RMC 71-2022 (Senior/PWD 20% discount on VAT-exempt base)
 * - RA 11360 (Service Charge distribution & mode/station rules)
 */

export interface PricingLineItem {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  stationTarget: 'bar' | 'kitchen';
  /** Whether this specific item is tagged for Senior Citizen / PWD statutory discount */
  isSeniorDiscounted?: boolean;
}

export type DiscountType = 'NONE' | 'SENIOR_CITIZEN' | 'PWD' | 'CUSTOM' | 'PROMO';

export interface BillingCalculationOptions {
  operatingMode: 'CAFE' | 'EVENT';
  orderType: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  serviceChargeEnabled?: boolean;
  cafeFoodServiceChargeRate?: number; // default 10%
  eventServiceChargeRate?: number; // default 10%
  discountType?: DiscountType;
  customDiscountAmount?: number; // Fixed peso promo discount
  customDiscountPercent?: number; // Percentage promo discount
  corkageAmount?: number;
  seniorPwdId?: string;
  seniorPwdName?: string;
}

export interface BillingCalculationResult {
  grossSubtotal: number;
  regularItemsGross: number;
  seniorItemsGross: number;

  // Tax metrics (BIR compliant)
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;

  // Discount metrics
  seniorDiscountAmount: number;
  customDiscountAmount: number;
  totalDiscountAmount: number;

  // Service charge metrics
  serviceCharge: number;
  serviceChargeRate: number;
  corkageAmount: number;

  // Final amount due
  totalAmountDue: number;
}

/** Round to 2 decimal places */
export function roundPhp(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateTabBilling(
  items: PricingLineItem[],
  options: BillingCalculationOptions
): BillingCalculationResult {
  const {
    operatingMode = 'CAFE',
    orderType = 'DINE_IN',
    serviceChargeEnabled = true,
    cafeFoodServiceChargeRate = 10,
    eventServiceChargeRate = 10,
    discountType = 'NONE',
    customDiscountAmount = 0,
    customDiscountPercent = 0,
    corkageAmount = 0,
  } = options;

  let grossSubtotal = 0;
  let regularItemsGross = 0;
  let seniorItemsGross = 0;
  let serviceCharge = 0;

  const isSeniorOrPwd = discountType === 'SENIOR_CITIZEN' || discountType === 'PWD';
  const isDineIn = orderType === 'DINE_IN';

  // 1. Classify items and calculate service charge per item
  items.forEach((item) => {
    const lineTotal = item.unitPrice * item.quantity;
    grossSubtotal += lineTotal;

    const isItemSenior = isSeniorOrPwd && Boolean(item.isSeniorDiscounted);
    if (isItemSenior) {
      seniorItemsGross += lineTotal;
    } else {
      regularItemsGross += lineTotal;
    }

    // Service Charge (Dine-in only)
    if (isDineIn && serviceChargeEnabled) {
      let applicableScRate: number;

      if (operatingMode === 'EVENT') {
        applicableScRate = eventServiceChargeRate;
      } else {
        // CAFE mode: Food (kitchen) gets SC, Coffee/Beverages (bar) get 0%
        if (item.stationTarget === 'kitchen') {
          applicableScRate = cafeFoodServiceChargeRate;
        } else {
          applicableScRate = 0;
        }
      }

      if (applicableScRate > 0) {
        // Direct gross basis: X% of the item's menu price
        const itemSc = lineTotal * (applicableScRate / 100);
        serviceCharge += itemSc;
      }
    }
  });

  grossSubtotal = roundPhp(grossSubtotal);
  regularItemsGross = roundPhp(regularItemsGross);
  seniorItemsGross = roundPhp(seniorItemsGross);
  serviceCharge = roundPhp(serviceCharge);

  // 2. Compute Philippine VAT breakdown
  // Regular items: inclusive of 12% VAT
  const vatableSales = regularItemsGross > 0 ? roundPhp(regularItemsGross / 1.12) : 0;
  const vatAmount = regularItemsGross > 0 ? roundPhp(regularItemsGross - vatableSales) : 0;

  // Senior/PWD items: 100% exempt from 12% VAT
  const vatExemptSales = seniorItemsGross > 0 ? roundPhp(seniorItemsGross / 1.12) : 0;
  const zeroRatedSales = 0;

  // 3. Compute Discounts
  let seniorDiscountAmount = 0;
  if (isSeniorOrPwd && vatExemptSales > 0) {
    // 20% statutory discount applied strictly to the VAT-exempt base
    seniorDiscountAmount = roundPhp(vatExemptSales * 0.2);
  }

  let finalCustomDiscount = 0;
  if (discountType === 'CUSTOM' || discountType === 'PROMO') {
    if (customDiscountPercent > 0) {
      finalCustomDiscount = roundPhp(grossSubtotal * (customDiscountPercent / 100));
    } else if (customDiscountAmount > 0) {
      finalCustomDiscount = roundPhp(Math.min(grossSubtotal, customDiscountAmount));
    }
  }

  const totalDiscountAmount = roundPhp(seniorDiscountAmount + finalCustomDiscount);

  // 4. Compute Final Amount Due
  // Senior net payable = vatExemptSales - seniorDiscountAmount
  const seniorPayable = roundPhp(vatExemptSales - seniorDiscountAmount);

  // Grand Total = Regular Gross + Senior Payable + Service Charge + Corkage - Custom Discount
  const totalAmountDue = Math.max(
    0,
    roundPhp(
      regularItemsGross + seniorPayable + serviceCharge + corkageAmount - finalCustomDiscount
    )
  );

  const effectiveScRate =
    operatingMode === 'EVENT' ? eventServiceChargeRate : cafeFoodServiceChargeRate;

  return {
    grossSubtotal,
    regularItemsGross,
    seniorItemsGross,
    vatableSales,
    vatAmount,
    vatExemptSales,
    zeroRatedSales,
    seniorDiscountAmount,
    customDiscountAmount: finalCustomDiscount,
    totalDiscountAmount,
    serviceCharge,
    serviceChargeRate: effectiveScRate,
    corkageAmount: roundPhp(corkageAmount),
    totalAmountDue,
  };
}
