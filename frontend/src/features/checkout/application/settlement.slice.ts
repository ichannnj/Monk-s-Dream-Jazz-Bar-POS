import {
  CustomerTab,
  CheckItem,
  DrawerEntry,
  OrderLineItem,
  TakeoutOrder,
} from '../../../types/floor';
import { tablesApi } from '../../table-service/data/tables.api';
import { deriveTableStatus } from '../../orders/application/order.helpers';
import { OrderStoreSet, OrderStoreGet } from '../../orders/domain/order.types';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { useVenueStore } from '../../shared/stores/useVenueStore';
import { calculateTabBilling, PricingLineItem } from '../utils/taxAndDiscountCalculator';
import { supabase } from '../../shared/infrastructure/supabase';
import { realtimeGateway } from '../../shared/infrastructure/realtime';
import { resolveTableUuid } from '../../floor/data/resolver';

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
    billingDetails?: {
      serviceCharge?: number;
      vatableSales?: number;
      vatAmount?: number;
      vatExemptSales?: number;
      discountType?: string;
      seniorPwdId?: string;
      seniorPwdName?: string;
      grossSubtotal?: number;
    }
  ) => {
    let grandTotalPaid = 0;
    let targetTabRef: CustomerTab | undefined;
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

      // Philippine VAT-inclusive calculation
      const vatableSales =
        billingDetails?.vatableSales ?? Number(((subtotal - effectiveDiscount) / 1.12).toFixed(2));
      const vatAmount =
        billingDetails?.vatAmount ??
        Number((subtotal - effectiveDiscount - vatableSales).toFixed(2));

      const grandTotal =
        billingDetails?.grossSubtotal !== undefined
          ? ((billingDetails as any).totalAmountDue ??
            Math.max(0, subtotal - effectiveDiscount + serviceCharge))
          : Math.max(0, subtotal - effectiveDiscount + serviceCharge);

      grandTotalPaid = grandTotal;

      // Create Check record
      const newCheck: CheckItem = {
        id: `chk-${Date.now()}`,
        checkNumber: `#${1042 + state.checks.length}`,
        orderType: 'dine_in',
        tableOrRef: `Table ${table.code}`,
        guestName: targetTab?.guestName || `Tab #${tabIndex}`,
        itemsCount: targetTab?.items.length || 1,
        subtotal: subtotal,
        tax: vatAmount,
        total: grandTotal,
        paymentMethod: paymentMethod,
        paymentChannel,
        referenceNumber,
        status: 'paid',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        cashierName: effectiveCashierName,
        itemsSummary:
          targetTab?.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ') || 'Table Bill',
      };

      // If payment is cash, log to drawer (scoped to Bar Till or Main Floor Till)
      let nextDrawer = state.drawerEntries;
      if (paymentMethod === 'cash') {
        const isBar =
          effectiveCashierName.toLowerCase().includes('bar') ||
          effectiveCashierName.toLowerCase().includes('thelonious') ||
          effectiveCashierName.toLowerCase().includes('bill');
        const drawerTarget: 'main' | 'bar' = isBar ? 'bar' : 'main';

        const cashDrawerEntry: DrawerEntry = {
          id: `drw-${Date.now()}`,
          type: 'sale',
          amount: grandTotal,
          reason: `Table ${table.code} (${targetTab?.guestName}) Cash Settle`,
          performedBy: effectiveCashierName,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          drawerTarget,
        };
        nextDrawer = [cashDrawerEntry, ...state.drawerEntries];
      }

      // Update Table state
      const remainingTabs = (table.tabs || []).filter((t) => t.tabIndex !== tabIndex);
      const remainingActiveTabs = table.activeTabs.filter((num) => num !== tabIndex);
      const remainingAmount = remainingTabs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
      const isTableEmpty = remainingActiveTabs.length === 0 || remainingTabs.length === 0;
      const nextTableStatus = isTableEmpty
        ? 'empty'
        : deriveTableStatus(remainingActiveTabs.length > 0, remainingTabs);

      const updatedTables = state.tables.map((t) => {
        if (t.id !== tableId) return t;

        return {
          ...t,
          activeTabs: isTableEmpty ? [] : remainingActiveTabs,
          tabs: isTableEmpty ? [] : remainingTabs,
          status: isTableEmpty ? ('empty' as const) : nextTableStatus,
          hasOpenCheck: !isTableEmpty,
          totalAmount: isTableEmpty ? undefined : remainingAmount,
          guests: isTableEmpty ? 0 : Math.max(1, t.guests - 1),
          elapsedTime: isTableEmpty ? '0m' : t.elapsedTime,
        };
      });

      return {
        tables: updatedTables,
        checks: [newCheck, ...state.checks],
        drawerEntries: nextDrawer,
      };
    });

    // Background asynchronous Supabase tab settlement
    let dbMethod: 'CASH' | 'CARD' | 'DIGITAL_WALLET' | 'COMP' = 'CASH';
    if (paymentMethod === 'card') dbMethod = 'CARD';
    else if (paymentMethod === 'digital_wallet') dbMethod = 'DIGITAL_WALLET';
    else if (paymentMethod === 'comp') dbMethod = 'COMP';

    (async () => {
      try {
        let tabUuid = targetTabRef?.id;
        const isUuid =
          tabUuid &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tabUuid);

        if (!isUuid) {
          const validTableId = await resolveTableUuid(tableId);
          if (validTableId) {
            const { data: openTabs } = await supabase
              .from('tabs')
              .select('id')
              .eq('table_id', validTableId)
              .eq('status', 'OPEN')
              .order('created_at', { ascending: true })
              .limit(1);
            if (openTabs && openTabs.length > 0) {
              tabUuid = openTabs[0].id;
            }
          }
        }

        if (
          tabUuid &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tabUuid)
        ) {
          await tablesApi.settleTabAndRecordPayment({
            tabId: tabUuid,
            paymentMethod: dbMethod,
            amount: grandTotalPaid,
            discountAmount,
            staffId: effectiveStaffId,
            notes: `Settled by ${effectiveCashierName}`,
            paymentChannel,
            referenceNumber,
            serviceCharge: billingDetails?.serviceCharge,
            vatableSales: billingDetails?.vatableSales,
            vatAmount: billingDetails?.vatAmount,
            vatExemptSales: billingDetails?.vatExemptSales,
            discountType: billingDetails?.discountType,
            seniorPwdId: billingDetails?.seniorPwdId,
            seniorPwdName: billingDetails?.seniorPwdName,
          });
          realtimeGateway.broadcastPosSync('tab_settled');
        }
      } catch (err) {
        console.warn('Background settleTab offline notice:', err);
      }
    })();
  },

  settleTableGroup: (
    tableId: string,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    cashierName?: string,
    staffId?: string,
    paymentChannel?: string,
    referenceNumber?: string
  ) => {
    const effectiveCashierName =
      cashierName || useAuthStore.getState().currentUser?.displayName || 'Coltrane (Cashier)';
    const effectiveStaffId = staffId || useAuthStore.getState().currentUser?.id;
    let tabsToSettle: CustomerTab[] = [];

    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return state;

      tabsToSettle = [...(table.tabs || [])];
      const venueState = useVenueStore.getState();
      const allItems: OrderLineItem[] = [];
      table.tabs?.forEach((tab) => allItems.push(...(tab.items || [])));

      const totalCorkage = (table.tabs || []).reduce((acc, tab) => {
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

      const subtotal = billing.grossSubtotal;
      const tax = billing.vatAmount;
      const grandTotal = billing.totalAmountDue;

      const newCheck: CheckItem = {
        id: `chk-${Date.now()}`,
        checkNumber: `#${1042 + state.checks.length}`,
        orderType: 'dine_in',
        tableOrRef: `Table ${table.code} (Group Settle)`,
        guestName: table.tabs?.map((t) => t.guestName).join(' & ') || `Table ${table.code}`,
        itemsCount: allItems.length,
        subtotal: subtotal,
        tax: tax,
        total: grandTotal,
        paymentMethod: paymentMethod,
        paymentChannel,
        referenceNumber,
        status: 'paid',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        cashierName: effectiveCashierName,
        itemsSummary:
          allItems.map((i) => `${i.quantity}x ${i.productName}`).join(', ') ||
          'Combined Table Bill',
      };

      let nextDrawer = state.drawerEntries;
      if (paymentMethod === 'cash') {
        const isBar =
          effectiveCashierName.toLowerCase().includes('bar') ||
          effectiveCashierName.toLowerCase().includes('thelonious') ||
          effectiveCashierName.toLowerCase().includes('bill');
        const drawerTarget: 'main' | 'bar' = isBar ? 'bar' : 'main';

        const cashDrawerEntry: DrawerEntry = {
          id: `drw-${Date.now()}`,
          type: 'sale',
          amount: grandTotal,
          reason: `Table ${table.code} Combined Group Cash Settle`,
          performedBy: effectiveCashierName,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          drawerTarget,
        };
        nextDrawer = [cashDrawerEntry, ...state.drawerEntries];
      }

      const updatedTables = state.tables.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          status: 'empty' as const,
          guests: 0,
          hasOpenCheck: false,
          totalAmount: undefined,
          activeTabs: [],
          tabs: [],
          elapsedTime: '0m',
        };
      });

      return {
        tables: updatedTables,
        checks: [newCheck, ...state.checks],
        drawerEntries: nextDrawer,
      };
    });

    // Background asynchronous Supabase entire table settlement
    let dbMethod: 'CASH' | 'CARD' | 'DIGITAL_WALLET' | 'COMP' = 'CASH';
    if (paymentMethod === 'card') dbMethod = 'CARD';
    else if (paymentMethod === 'digital_wallet') dbMethod = 'DIGITAL_WALLET';
    else if (paymentMethod === 'comp') dbMethod = 'COMP';

    (async () => {
      try {
        const validTableId = await resolveTableUuid(tableId);

        // Settle each known tab on this table
        for (const tab of tabsToSettle) {
          const isUuid =
            tab.id &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tab.id);
          const tabAmt = (tab.totalAmount || 0) * 1.1;
          if (isUuid) {
            await tablesApi
              .settleTabAndRecordPayment({
                tabId: tab.id,
                paymentMethod: dbMethod,
                amount: tabAmt,
                staffId: effectiveStaffId,
                notes: `Group Settle by ${effectiveCashierName}`,
              })
              .catch((e) => console.warn('[settleTableGroup] tab settle warn:', e));
          }
        }

        // If there are any remaining open tabs on this table in Supabase, close or settle them
        if (validTableId) {
          const { data: remainingOpenTabs } = await supabase
            .from('tabs')
            .select('id, customer_name')
            .eq('table_id', validTableId)
            .eq('status', 'OPEN');

          if (remainingOpenTabs && remainingOpenTabs.length > 0) {
            for (const rem of remainingOpenTabs) {
              await tablesApi
                .settleTabAndRecordPayment({
                  tabId: rem.id,
                  paymentMethod: dbMethod,
                  amount: 0,
                  staffId: effectiveStaffId,
                  notes: `Group Settle cleanup (${rem.customer_name})`,
                })
                .catch(() => {
                  supabase
                    .from('tabs')
                    .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
                    .eq('id', rem.id);
                });
            }
          }

          // Ensure table is freed in DB
          await supabase
            .from('tables')
            .update({ is_occupied: false, updated_at: new Date().toISOString() })
            .eq('id', validTableId);
        }
        realtimeGateway.broadcastPosSync('table_group_settled');
      } catch (err) {
        console.warn('[settleTableGroup] Background database error:', err);
      }
    })();
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

      // Philippine VAT-inclusive extraction
      const vatableSales = options?.vatableSales ?? Number((netSubtotal / 1.12).toFixed(2));
      const vatAmount = options?.vatAmount ?? Number((netSubtotal - vatableSales).toFixed(2));
      const grandTotal = netSubtotal;
      grandTotalPaid = grandTotal;

      const newCheck: CheckItem = {
        id: `chk-${Date.now()}`,
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
        status: 'paid',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        cashierName: effectiveCashierName,
        itemsSummary:
          targetOrder.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ') ||
          'Takeout Order',
      };

      let nextDrawer = state.drawerEntries;
      if (paymentMethod === 'cash') {
        const isBar =
          effectiveCashierName.toLowerCase().includes('bar') ||
          effectiveCashierName.toLowerCase().includes('thelonious') ||
          effectiveCashierName.toLowerCase().includes('bill');
        const drawerTarget: 'main' | 'bar' = isBar ? 'bar' : 'main';

        const cashDrawerEntry: DrawerEntry = {
          id: `drw-${Date.now()}`,
          type: 'sale',
          amount: grandTotal,
          reason: `Takeout #${targetOrder.ticketNumber} (${targetOrder.customerName}) Cash Settle`,
          performedBy: effectiveCashierName,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          drawerTarget,
        };
        nextDrawer = [cashDrawerEntry, ...state.drawerEntries];
      }

      const updatedTakeout = state.takeoutOrders.map((o) => {
        if (o.id !== takeoutId && o.tabId !== takeoutId) return o;
        return {
          ...o,
          isPrepaid: true,
          paymentMethod,
          status: completeOrder ? ('completed' as const) : o.status,
          items: completeOrder
            ? o.items.map((i) =>
                i.status === 'cancelled' ? i : { ...i, status: 'served' as const }
              )
            : o.items,
        };
      });

      return {
        takeoutOrders: updatedTakeout,
        checks: [newCheck, ...state.checks],
        drawerEntries: nextDrawer,
      };
    });

    // Background asynchronous Supabase takeout settlement
    let dbMethod: 'CASH' | 'CARD' | 'DIGITAL_WALLET' | 'COMP' = 'CASH';
    if (paymentMethod === 'card') dbMethod = 'CARD';
    else if (paymentMethod === 'digital_wallet') dbMethod = 'DIGITAL_WALLET';
    else if (paymentMethod === 'comp') dbMethod = 'COMP';

    (async () => {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let tabUuid = targetOrderRef?.tabId || targetOrderRef?.id;

        // Wait briefly if createTakeoutOrder's DB insert is still in flight
        for (let attempt = 0; attempt < 12 && (!tabUuid || !uuidRegex.test(tabUuid)); attempt++) {
          await new Promise((r) => setTimeout(r, 250));
          const liveOrder = get().takeoutOrders.find(
            (o) =>
              o.id === takeoutId ||
              o.tabId === takeoutId ||
              (targetOrderRef && o.ticketNumber === targetOrderRef.ticketNumber)
          );
          if (liveOrder?.tabId && uuidRegex.test(liveOrder.tabId)) {
            tabUuid = liveOrder.tabId;
            break;
          }
          if (liveOrder?.id && uuidRegex.test(liveOrder.id)) {
            tabUuid = liveOrder.id;
            break;
          }
        }

        if (!tabUuid || !uuidRegex.test(tabUuid)) {
          const { data: openTakeoutTabs } = await supabase
            .from('tabs')
            .select('id')
            .eq('order_type', 'TAKEOUT')
            .eq('status', 'OPEN')
            .order('created_at', { ascending: false })
            .limit(1);
          if (openTakeoutTabs && openTakeoutTabs.length > 0) {
            tabUuid = openTakeoutTabs[0].id;
          }
        }

        if (tabUuid && uuidRegex.test(tabUuid)) {
          await tablesApi.settleTabAndRecordPayment({
            tabId: tabUuid,
            paymentMethod: dbMethod,
            amount: grandTotalPaid,
            discountAmount,
            staffId: effectiveStaffId,
            notes: `Takeout #${targetOrderRef?.ticketNumber || ''} settled by ${effectiveCashierName}`,
            keepOpenForPrep: !completeOrder,
            paymentChannel,
            referenceNumber,
            serviceCharge: options?.serviceCharge,
            vatableSales: options?.vatableSales,
            vatAmount: options?.vatAmount,
            vatExemptSales: options?.vatExemptSales,
            discountType: options?.discountType,
            seniorPwdId: options?.seniorPwdId,
            seniorPwdName: options?.seniorPwdName,
          });
          realtimeGateway.broadcastPosSync('takeout_settled');
        }
      } catch (err) {
        console.warn('Background settleTakeoutOrder notice:', err);
      }
    })();
  },
});
