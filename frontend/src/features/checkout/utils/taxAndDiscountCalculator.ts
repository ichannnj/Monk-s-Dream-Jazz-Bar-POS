/**
 * Philippine Pricing, Service Charge, and Discount Engine
 * - Operating mode (CAFE | EVENT) is strictly for monitoring/reporting and does NOT alter SC.
 * - Service Charge (when enabled at settlement) applies uniformly to ALL F&B items
 *   (Kitchen + Bar/Coffee, Dine-In and Takeout) on original gross menu prices before discounts.
 * - Event Door Charge and Corkage Fee are excluded from Service Charge and Discounts.
 * - Senior Citizen / PWD retains internal 2-step (/ 1.12 then 20%) math while VAT/tax
 *   displays are commented out prior to BIR registration.
 */

export interface PricingLineItem {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  stationTarget: 'bar' | 'kitchen';
  notes?: string;
  /** Whether this specific item is tagged for Senior Citizen / PWD statutory discount */
  isSeniorDiscounted?: boolean;
  /** Category slug (e.g. 'door_charge' for admission cover charges) */
  categorySlug?: string;
}

export type DiscountType = 'NONE' | 'SENIOR_CITIZEN' | 'PWD' | 'CUSTOM' | 'PROMO';

export interface BillingCalculationOptions {
  /** Monitoring-only tag; does not affect billing or service charge rules */
  operatingMode?: 'CAFE' | 'EVENT';
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  serviceChargeEnabled?: boolean;
  serviceChargeRate?: number; // Unified venue SC rate (default 10%)
  /** @deprecated Legacy rate kept optional for backward compatibility; unified serviceChargeRate is used */
  cafeFoodServiceChargeRate?: number;
  /** @deprecated Legacy rate kept optional for backward compatibility; unified serviceChargeRate is used */
  eventServiceChargeRate?: number;
  discountType?: DiscountType;
  customDiscountAmount?: number; // Fixed peso promo discount
  customDiscountPercent?: number; // Percentage promo discount
  corkageAmount?: number;
  seniorPwdId?: string;
  seniorPwdName?: string;
}

export interface BillingCalculationResult {
  grossSubtotal: number;
  fnbItemsGross: number;
  doorChargeGross: number;
  regularItemsGross: number;
  seniorItemsGross: number;

  // Tax metrics (commented out / 0 while non-BIR registered)
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;

  // Discount metrics
  seniorTwentyPercentDiscount: number;
  seniorVatReliefAmount: number;
  seniorDiscountAmount: number;
  customDiscountAmount: number;
  totalDiscountAmount: number;
  netAfterDiscount: number;

  // Service charge metrics
  serviceChargeBase: number;
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

export function isDoorChargeItem(item: { categorySlug?: string; productName?: string }): boolean {
  return (
    item.categorySlug === 'door_charge' ||
    (item.productName || '').toLowerCase().includes('door charge')
  );
}

export function calculateTabBilling(
  items: PricingLineItem[],
  options: BillingCalculationOptions = {}
): BillingCalculationResult {
  const {
    serviceChargeEnabled = false,
    serviceChargeRate = 10,
    discountType = 'NONE',
    customDiscountAmount = 0,
    customDiscountPercent = 0,
    corkageAmount = 0,
  } = options;

  let grossSubtotal = 0;
  let fnbItemsGross = 0;
  let doorChargeGross = 0;
  let regularItemsGross = 0;
  let seniorItemsGross = 0;

  const isSeniorOrPwd = discountType === 'SENIOR_CITIZEN' || discountType === 'PWD';

  // 1. Classify items (F&B vs Door Charge; Senior-tagged vs Regular)
  items.forEach((item) => {
    const lineTotal = Math.max(0, (item.unitPrice || 0) * (item.quantity || 0));
    grossSubtotal += lineTotal;

    const isDoorCharge = isDoorChargeItem(item);
    if (isDoorCharge) {
      doorChargeGross += lineTotal;
    } else {
      fnbItemsGross += lineTotal;
    }

    // Senior/PWD statutory discount: strictly excluded for Door Charge items
    const isItemSenior = isSeniorOrPwd && Boolean(item.isSeniorDiscounted) && !isDoorCharge;
    if (isItemSenior) {
      seniorItemsGross += lineTotal;
    } else {
      regularItemsGross += lineTotal;
    }
  });

  grossSubtotal = roundPhp(grossSubtotal);
  fnbItemsGross = roundPhp(fnbItemsGross);
  doorChargeGross = roundPhp(doorChargeGross);
  regularItemsGross = roundPhp(regularItemsGross);
  seniorItemsGross = roundPhp(seniorItemsGross);

  // 2. Compute Discounts (Strictly on F&B items; Door Charge & Corkage excluded)
  const seniorVatExemptBase = seniorItemsGross > 0 ? roundPhp(seniorItemsGross / 1.12) : 0;
  const seniorTwentyPercentDiscount =
    isSeniorOrPwd && seniorVatExemptBase > 0 ? roundPhp(seniorVatExemptBase * 0.2) : 0;
  const seniorPayable = roundPhp(seniorVatExemptBase - seniorTwentyPercentDiscount);
  const seniorVatReliefAmount =
    isSeniorOrPwd && seniorItemsGross > 0 ? roundPhp(seniorItemsGross - seniorVatExemptBase) : 0;
  // Exact gross-to-payable reduction so Items Subtotal - Total Discount + Corkage + SC = Total Due
  const seniorDiscountAmount =
    isSeniorOrPwd && seniorItemsGross > 0 ? roundPhp(seniorItemsGross - seniorPayable) : 0;

  let finalCustomDiscount = 0;
  if (discountType === 'CUSTOM' || discountType === 'PROMO') {
    const safePct = Math.max(0, customDiscountPercent || 0);
    const safeAmt = Math.max(0, customDiscountAmount || 0);
    if (safePct > 0) {
      const clampedPct = Math.min(100, safePct);
      finalCustomDiscount = roundPhp(fnbItemsGross * (clampedPct / 100));
    } else if (safeAmt > 0) {
      finalCustomDiscount = roundPhp(Math.min(fnbItemsGross, safeAmt));
    }
  }

  const totalDiscountAmount = roundPhp(seniorDiscountAmount + finalCustomDiscount);
  const netAfterDiscount = Math.max(0, roundPhp(grossSubtotal - totalDiscountAmount));

  // 3. Service Charge: User-centered choice at settlement; applies to ALL F&B items on original gross
  const effectiveScRate = serviceChargeEnabled ? Math.max(0, serviceChargeRate) : 0;
  const serviceChargeBase = effectiveScRate > 0 ? fnbItemsGross : 0;
  const serviceCharge =
    effectiveScRate > 0 ? roundPhp(serviceChargeBase * (effectiveScRate / 100)) : 0;

  /* TODO(BIR): Uncomment when BIR VAT-registered
  const netRegularGross = Math.max(0, regularItemsGross - finalCustomDiscount);
  const vatableSales = netRegularGross > 0 ? roundPhp(netRegularGross / 1.12) : 0;
  const vatAmount = netRegularGross > 0 ? roundPhp(netRegularGross - vatableSales) : 0;
  const vatExemptSales = seniorVatExemptBase;
  */
  const vatableSales = 0;
  const vatAmount = 0;
  const vatExemptSales = 0;
  const zeroRatedSales = 0;

  // 4. Compute Final Amount Due
  const safeCorkage = Math.max(0, roundPhp(corkageAmount));
  const totalAmountDue = Math.max(0, roundPhp(netAfterDiscount + safeCorkage + serviceCharge));

  return {
    grossSubtotal,
    fnbItemsGross,
    doorChargeGross,
    regularItemsGross,
    seniorItemsGross,
    vatableSales,
    vatAmount,
    vatExemptSales,
    zeroRatedSales,
    seniorTwentyPercentDiscount,
    seniorVatReliefAmount,
    seniorDiscountAmount,
    customDiscountAmount: finalCustomDiscount,
    totalDiscountAmount,
    netAfterDiscount,
    serviceChargeBase,
    serviceCharge,
    serviceChargeRate: effectiveScRate,
    corkageAmount: safeCorkage,
    totalAmountDue,
  };
}
