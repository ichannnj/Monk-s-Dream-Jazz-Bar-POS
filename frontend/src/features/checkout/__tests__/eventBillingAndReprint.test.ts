import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateTabBilling } from '../utils/taxAndDiscountCalculator';
import { buildReceiptBytes } from '@/features/printer/services/escposBuilder';
import {
  computeCashlessMetrics,
  reprintCustomerCheck,
} from '@/features/admin/presentation/views/transactions/cashless/cashlessUtils';
import { printerApi } from '@/features/printer/data/printer.api';
import type { SettledCheckItem } from '@/features/check-history/domain/check.types';

describe('Event Billing, ESC/POS Receipts & Cashless Reprint Regressions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('excludes door charge from service charge and senior discount while adding corkage accurately', () => {
    const result = calculateTabBilling(
      [
        {
          id: 'dc-1',
          productName: 'Event Door Charge',
          unitPrice: 300,
          quantity: 2,
          stationTarget: 'bar',
          categorySlug: 'door_charge',
          isSeniorDiscounted: true, // Even if tagged, door charges must not get Senior/PWD discount
        },
        {
          id: 'item-1',
          productName: 'Bolognese',
          unitPrice: 550,
          quantity: 1,
          stationTarget: 'kitchen',
          categorySlug: 'pasta',
          isSeniorDiscounted: true,
        },
      ],
      {
        operatingMode: 'CAFE',
        orderType: 'DINE_IN',
        serviceChargeEnabled: true,
        cafeFoodServiceChargeRate: 10,
        eventServiceChargeRate: 10,
        discountType: 'SENIOR_CITIZEN',
        corkageAmount: 110,
        seniorPwdId: 'OSCA-1234',
        seniorPwdName: 'Miles Davis',
      }
    );

    // Gross = 600 (Door Charge) + 550 (Food) = 1150
    expect(result.grossSubtotal).toBe(1150);
    // Food SC only in CAFE mode (10% of 550 = 55; Door Charge = 0 SC)
    expect(result.serviceCharge).toBe(55);
    // Senior VAT-exempt only on 550 food -> 491.07, 20% = 98.21, payable = 392.86
    expect(result.vatExemptSales).toBe(491.07);
    expect(result.seniorDiscountAmount).toBe(98.21);
    expect(result.corkageAmount).toBe(110);
    // Total = 600 (door) + 392.86 (senior food) + 55 (SC) + 110 (corkage) = 1157.86
    expect(result.totalAmountDue).toBe(1157.86);
  });

  it('preserves explicit zero total on COMP receipts without falling back to gross subtotal', () => {
    const bytes = buildReceiptBytes(
      {
        receiptNumber: 'CHK-COMP-1',
        tableLabel: 'Table 2',
        tabName: 'VIP Guest',
        cashierName: 'Manager',
        items: [{ productName: 'Ristretto', unitPrice: 125, quantity: 1 }],
        subtotal: 125,
        discountAmount: 125,
        total: 0,
        paymentMethod: 'COMP',
        tendered: 0,
        change: 0,
      },
      false,
      '57mm'
    );

    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('PHP 0.00');
    expect(text).toContain('PAYMENT METHOD:');
    expect(text).toContain('COMP');
  });

  it('aligns Senior/PWD VAT relief in receipt breakdown so displayed line math matches grand total', () => {
    const billing = calculateTabBilling(
      [
        {
          id: 'i1',
          productName: 'Pasta',
          unitPrice: 205,
          quantity: 1,
          stationTarget: 'kitchen',
          isSeniorDiscounted: true,
        },
      ],
      {
        operatingMode: 'CAFE',
        orderType: 'DINE_IN',
        serviceChargeEnabled: false,
        discountType: 'SENIOR_CITIZEN',
      }
    );

    const bytes = buildReceiptBytes(
      {
        receiptNumber: 'CHK-SC-205',
        tableLabel: 'Table 1',
        tabName: 'Senior Guest',
        cashierName: 'Cashier',
        items: [{ productName: 'Pasta', unitPrice: 205, quantity: 1 }],
        subtotal: billing.grossSubtotal,
        discountAmount: billing.totalDiscountAmount,
        vatExemptSales: billing.vatExemptSales,
        serviceCharge: billing.serviceCharge,
        total: billing.totalAmountDue,
        paymentMethod: 'CASH',
        tendered: 200,
        change: Number((200 - billing.totalAmountDue).toFixed(2)),
      },
      false,
      '80mm'
    );

    const text = new TextDecoder().decode(bytes);
    expect(text).toContain(`PHP ${billing.totalAmountDue.toFixed(2)}`);
  });

  it('reprintCustomerCheck preserves peso amounts without multiplying by 100', async () => {
    const reprintSpy = vi.spyOn(printerApi, 'reprintJob').mockResolvedValue();

    const check: SettledCheckItem = {
      id: 'chk-1',
      paymentId: 'pay-1',
      tabId: 'tab-1',
      checkNumber: '#1042',
      orderType: 'dine_in',
      tableOrRef: 'Table 5',
      guestName: 'Coltrane',
      itemsCount: 1,
      items: [{ id: 'it-1', name: 'Espresso', quantity: 2, unitPrice: 125, subtotal: 250 }],
      subtotal: 250,
      discountAmount: 25,
      corkageFee: 50,
      vatableSales: 200.89,
      vatAmount: 24.11,
      serviceCharge: 25,
      total: 300,
      paymentMethod: 'DIGITAL_WALLET',
      paymentChannel: 'GCash',
      referenceNumber: '4321',
      drawerTarget: 'main',
      cashierName: 'Staff',
      settledAt: '2026-11-21T12:00:00Z',
      timestamp: '12:00 PM',
      orderChannel: 'POS_WAITER',
      operatingMode: 'CAFE',
    };

    await reprintCustomerCheck(check);

    expect(reprintSpy).toHaveBeenCalledTimes(1);
    const payload = reprintSpy.mock.calls[0][0].receipt_data;
    expect(payload.subtotal).toBe(250);
    expect(payload.corkageFee).toBe(50);
    expect(payload.discount).toBe(25);
    expect(payload.total).toBe(300);
    expect(payload.tendered).toBe(300);
  });

  it('computeCashlessMetrics excludes Cash split tenders and COMP settlements', () => {
    const metrics = computeCashlessMetrics([
      {
        id: '1',
        paymentId: 'p1',
        tabId: 't1',
        checkNumber: '#101',
        orderType: 'dine_in',
        tableOrRef: 'Table 1',
        guestName: 'A',
        itemsCount: 1,
        items: [],
        subtotal: 1000,
        discountAmount: 0,
        corkageFee: 0,
        vatableSales: 892.86,
        vatAmount: 107.14,
        serviceCharge: 0,
        total: 1000,
        paymentMethod: 'SPLIT',
        drawerTarget: 'main',
        cashierName: 'Cashier',
        settledAt: '2026-11-21T12:00:00Z',
        timestamp: '12:00 PM',
        orderChannel: 'POS_CASHIER',
        operatingMode: 'CAFE',
        tenders: [
          { method: 'cash', amount: 400 },
          { method: 'digital_wallet', channel: 'GCash', amount: 600 },
        ],
      },
      {
        id: '2',
        paymentId: 'p2',
        tabId: 't2',
        checkNumber: '#102',
        orderType: 'dine_in',
        tableOrRef: 'Table 2',
        guestName: 'B',
        itemsCount: 1,
        items: [],
        subtotal: 500,
        discountAmount: 500,
        corkageFee: 0,
        vatableSales: 0,
        vatAmount: 0,
        serviceCharge: 0,
        total: 0,
        paymentMethod: 'COMP',
        drawerTarget: 'main',
        cashierName: 'Manager',
        settledAt: '2026-11-21T12:05:00Z',
        timestamp: '12:05 PM',
        orderChannel: 'POS_CASHIER',
        operatingMode: 'CAFE',
      },
    ]);

    expect(metrics.totalCashless).toBe(600);
    expect(metrics.gcashTotal).toBe(600);
    expect(metrics.cardTotal).toBe(0);
    expect(metrics.count).toBe(1);
  });
});
