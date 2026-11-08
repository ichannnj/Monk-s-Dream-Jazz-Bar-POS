import { CustomerTab, OrderLineItem, TakeoutOrder } from '../../../types/floor';
import { OrderStoreSet, OrderStoreGet } from '../../orders/domain/order.types';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { useVenueStore } from '../../shared/stores/useVenueStore';
import { calculateTabBilling, PricingLineItem } from '../utils/taxAndDiscountCalculator';
import { backgroundSettleTabDb, SettlementBillingDetails } from './settlementHelpers';
import { backgroundSettleTakeoutDb } from './offPremiseSettlement';
import { backgroundSettleTableGroupDb } from './tableGroupSettlement';
import {
  determineDrawerTarget,
  createCashDrawerEntry,
  createCheckItemRecord,
  updateTableOnSettlement,
  updateTableGroupOnSettlement,
  updateTakeoutOnSettlement,
} from './settlementStateUpdaters';

export const createSettlementSlice = (set: OrderStoreSet, get: OrderStoreGet) => ({
  settleTab: (
    tableId: string,
    tabIndex: number,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    cashierName?: string,
    discountAmount = 0,
    staffId?: string,
    paymentChannel?: string,
    referenceNumber?: string,
    billingDetails?: SettlementBillingDetails
  ) => {
    let grandTotalPaid = 0;
    let targetTabRef: CustomerTab | undefined;
    let computedDrawerTarget: 'main' | 'bar' = 'main';
    const effectiveCashierName =
      cashierName || useAuthStore.getState().currentUser?.displayName || 'Coltrane (Cashier)';
    const effectiveStaffId = staffId || useAuthStore.getState().currentUser?.id;

    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return state;

      const targetTab = table.tabs?.find((t) => t.tabIndex === tabIndex);
      targetTabRef = targetTab;
      const subtotal = billingDetails?.grossSubtotal ?? (targetTab?.totalAmount || 0);
      const effectiveDiscount = discountAmount > 0 ? discountAmount : 0;
      const serviceCharge = billingDetails?.serviceCharge || 0;
      const netSubtotal = Math.max(0, subtotal - effectiveDiscount);
      const corkageFee =
        billingDetails?.corkageAmount ??
        (targetTab?.hasCorkageFee ? targetTab.corkageAmount || 0 : 0);
      const vatableSales = billingDetails?.vatableSales ?? Number((netSubtotal / 1.12).toFixed(2));
      const vatAmount =
        billingDetails?.vatAmount ?? Number((netSubtotal - vatableSales).toFixed(2));
      const grandTotal =
        billingDetails?.totalAmountDue !== undefined
          ? billingDetails.totalAmountDue
          : netSubtotal + serviceCharge + corkageFee;
      grandTotalPaid = grandTotal;

      computedDrawerTarget = determineDrawerTarget(
        effectiveCashierName,
        table.area,
        useAuthStore.getState().currentUser?.role
      );

      const newCheck = createCheckItemRecord({
        checkNumber: `#${1042 + state.checks.length}`,
        orderType: 'dine_in',
        tableOrRef: `Table ${table.code} (${targetTab?.guestName || `Tab ${tabIndex}`})`,
        guestName: targetTab?.guestName || 'Guest',
        itemsCount: targetTab?.items.length || 0,
        subtotal,
        tax: vatAmount,
        total: grandTotal,
        paymentMethod,
        paymentChannel,
        referenceNumber,
        cashierName: effectiveCashierName,
        itemsSummary:
          targetTab?.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ') || 'Table Bill',
      });

      const nextDrawer =
        paymentMethod === 'cash'
          ? [
              createCashDrawerEntry(
                grandTotal,
                `Table ${table.code} (${targetTab?.guestName}) Cash Settle`,
                effectiveCashierName,
                computedDrawerTarget
              ),
              ...state.drawerEntries,
            ]
          : state.drawerEntries;

      return {
        tables: updateTableOnSettlement(state.tables, tableId, tabIndex),
        checks: [newCheck, ...state.checks],
        drawerEntries: nextDrawer,
      };
    });

    backgroundSettleTabDb({
      targetTabId: targetTabRef?.id,
      tableId,
      paymentMethod,
      grandTotalPaid,
      discountAmount,
      effectiveStaffId,
      effectiveCashierName,
      paymentChannel,
      referenceNumber,
      billingDetails,
      computedDrawerTarget,
    });
  },

  settleTableGroup: (
    tableId: string,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    cashierName?: string,
    staffId?: string,
    paymentChannel?: string,
    referenceNumber?: string,
    billingDetails?: SettlementBillingDetails
  ) => {
    const effectiveCashierName =
      cashierName || useAuthStore.getState().currentUser?.displayName || 'Coltrane (Cashier)';
    const effectiveStaffId = staffId || useAuthStore.getState().currentUser?.id;
    let tabsToSettle: CustomerTab[] = [];
    let groupGrandTotal = 0;
    let computedDrawerTarget: 'main' | 'bar' = 'main';

    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return state;

      tabsToSettle = [...(table.tabs || [])];
      const venueState = useVenueStore.getState();
      const allItems: OrderLineItem[] = [];
      table.tabs?.forEach((tab) => allItems.push(...(tab.items || [])));

      const totalCorkage =
        billingDetails?.corkageAmount ??
        (table.tabs || []).reduce((acc, tab) => {
          return acc + (tab.hasCorkageFee ? tab.corkageAmount || 0 : 0);
        }, 0);

      const pricingItems: PricingLineItem[] = allItems.map((it) => ({
        id: it.id,
        productName: it.productName,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        stationTarget: it.stationTarget || 'kitchen',
      }));

      const billing = calculateTabBilling(pricingItems, {
        operatingMode: venueState.operatingMode || 'CAFE',
        orderType: 'DINE_IN',
        serviceChargeEnabled: venueState.serviceChargeEnabled,
        cafeFoodServiceChargeRate: venueState.cafeFoodServiceChargeRate,
        eventServiceChargeRate: venueState.eventServiceChargeRate,
        corkageAmount: totalCorkage,
      });

      const subtotal = billingDetails?.grossSubtotal ?? billing.grossSubtotal;
      const tax = billingDetails?.vatAmount ?? billing.vatAmount;
      const grandTotal = billingDetails?.totalAmountDue ?? billing.totalAmountDue;
      groupGrandTotal = grandTotal;

      computedDrawerTarget = determineDrawerTarget(
        effectiveCashierName,
        table.area,
        useAuthStore.getState().currentUser?.role
      );

      const newCheck = createCheckItemRecord({
        checkNumber: `#${1042 + state.checks.length}`,
        orderType: 'dine_in',
        tableOrRef: `Table ${table.code} (Group Settle)`,
        guestName: table.tabs?.map((t) => t.guestName).join(' & ') || `Table ${table.code}`,
        itemsCount: allItems.length,
        subtotal,
        tax,
        total: grandTotal,
        paymentMethod,
        paymentChannel,
        referenceNumber,
        cashierName: effectiveCashierName,
        itemsSummary:
          allItems.map((i) => `${i.quantity}x ${i.productName}`).join(', ') ||
          'Combined Table Bill',
      });

      const nextDrawer =
        paymentMethod === 'cash'
          ? [
              createCashDrawerEntry(
                grandTotal,
                `Table ${table.code} Combined Group Cash Settle`,
                effectiveCashierName,
                computedDrawerTarget
              ),
              ...state.drawerEntries,
            ]
          : state.drawerEntries;

      return {
        tables: updateTableGroupOnSettlement(state.tables, tableId),
        checks: [newCheck, ...state.checks],
        drawerEntries: nextDrawer,
      };
    });

    backgroundSettleTableGroupDb({
      tableId,
      tabsToSettle,
      paymentMethod,
      groupGrandTotal,
      effectiveStaffId,
      effectiveCashierName,
      paymentChannel,
      referenceNumber,
      billingDetails,
      computedDrawerTarget,
    });
  },

  settleTakeoutOrder: (
    takeoutId: string,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    options?: {
      completeOrder?: boolean;
      cashierName?: string;
      discountAmount?: number;
      staffId?: string;
      paymentChannel?: string;
      referenceNumber?: string;
      serviceCharge?: number;
      vatableSales?: number;
      vatAmount?: number;
      vatExemptSales?: number;
      discountType?: string;
      seniorPwdId?: string;
      seniorPwdName?: string;
      totalAmountDue?: number;
      tenderedAmount?: number;
      shouldPrintReceipt?: boolean;
    }
  ) => {
    const completeOrder = Boolean(options?.completeOrder);
    const discountAmount = options?.discountAmount || 0;
    const effectiveCashierName =
      options?.cashierName ||
      useAuthStore.getState().currentUser?.displayName ||
      'Coltrane (Cashier)';
    const effectiveStaffId = options?.staffId || useAuthStore.getState().currentUser?.id;
    const paymentChannel = options?.paymentChannel;
    const referenceNumber = options?.referenceNumber;

    let targetOrderRef: TakeoutOrder | undefined;
    let grandTotalPaid = 0;

    set((state) => {
      const targetOrder = state.takeoutOrders.find(
        (o) => o.id === takeoutId || o.tabId === takeoutId
      );
      if (!targetOrder) return state;

      targetOrderRef = targetOrder;
      const subtotal = targetOrder.total || 0;
      const netSubtotal = Math.max(0, subtotal - discountAmount);
      const vatableSales = options?.vatableSales ?? Number((netSubtotal / 1.12).toFixed(2));
      const vatAmount = options?.vatAmount ?? Number((netSubtotal - vatableSales).toFixed(2));
      const grandTotal =
        options?.totalAmountDue !== undefined ? options.totalAmountDue : netSubtotal;
      grandTotalPaid = grandTotal;

      const newCheck = createCheckItemRecord({
        checkNumber: `#${1042 + state.checks.length}`,
        orderType: 'takeout',
        tableOrRef: `Takeout #${targetOrder.ticketNumber}`,
        guestName: targetOrder.customerName || 'Walk-in Guest',
        itemsCount: targetOrder.items.length || 1,
        subtotal: netSubtotal,
        tax: vatAmount,
        total: grandTotal,
        paymentMethod,
        paymentChannel,
        referenceNumber,
        cashierName: effectiveCashierName,
        itemsSummary:
          targetOrder.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ') ||
          'Takeout Order',
      });

      const drawerTarget = determineDrawerTarget(
        effectiveCashierName,
        undefined,
        useAuthStore.getState().currentUser?.role
      );

      const nextDrawer =
        paymentMethod === 'cash'
          ? [
              createCashDrawerEntry(
                grandTotal,
                `Takeout #${targetOrder.ticketNumber} (${targetOrder.customerName}) Cash Settle`,
                effectiveCashierName,
                drawerTarget
              ),
              ...state.drawerEntries,
            ]
          : state.drawerEntries;

      return {
        takeoutOrders: updateTakeoutOnSettlement(
          state.takeoutOrders,
          takeoutId,
          completeOrder,
          paymentMethod
        ),
        checks: [newCheck, ...state.checks],
        drawerEntries: nextDrawer,
      };
    });

    backgroundSettleTakeoutDb({
      takeoutId,
      targetOrderRef,
      paymentMethod,
      grandTotalPaid,
      discountAmount,
      effectiveStaffId,
      effectiveCashierName,
      completeOrder,
      paymentChannel,
      referenceNumber,
      options,
      getTakeoutOrders: () => get().takeoutOrders,
    });
  },
});
