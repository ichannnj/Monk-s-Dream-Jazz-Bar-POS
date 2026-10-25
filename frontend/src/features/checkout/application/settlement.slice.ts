import { CustomerTab, CheckItem, DrawerEntry, OrderLineItem } from '../../../types/floor';
import { tablesApi } from '../../table-service/data/tables.api';
import { deriveTableStatus } from '../../orders/application/order.helpers';
import { OrderStoreSet, OrderStoreGet } from '../../orders/domain/order.types';

export const createSettlementSlice = (set: OrderStoreSet, _get: OrderStoreGet) => ({
  settleTab: (
    tableId: string,
    tabIndex: number,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    cashierName = 'Coltrane (Cashier)',
    discountAmount = 0
  ) => {
    let grandTotalPaid = 0;
    let targetTabRef: CustomerTab | undefined;

    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return state;

      const targetTab = table.tabs?.find((t) => t.tabIndex === tabIndex);
      targetTabRef = targetTab;
      const subtotal = targetTab?.totalAmount || 0;
      const netSubtotal = Math.max(0, subtotal - discountAmount);
      const tax = netSubtotal * 0.1;
      const grandTotal = netSubtotal + tax;
      grandTotalPaid = grandTotal;

      // Create Check record
      const newCheck: CheckItem = {
        id: `chk-${Date.now()}`,
        checkNumber: `#${1042 + state.checks.length}`,
        orderType: 'dine_in',
        tableOrRef: `Table ${table.code}`,
        guestName: targetTab?.guestName || `Tab #${tabIndex}`,
        itemsCount: targetTab?.items.length || 1,
        subtotal: netSubtotal,
        tax: tax,
        total: grandTotal,
        paymentMethod: paymentMethod,
        status: 'paid',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        cashierName: cashierName,
        itemsSummary:
          targetTab?.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ') || 'Table Bill',
      };

      // If payment is cash, log to drawer
      let nextDrawer = state.drawerEntries;
      if (paymentMethod === 'cash') {
        const cashDrawerEntry: DrawerEntry = {
          id: `drw-${Date.now()}`,
          type: 'sale',
          amount: grandTotal,
          reason: `Table ${table.code} (${targetTab?.guestName}) Cash Settle`,
          performedBy: cashierName,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
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

    tablesApi
      .settleTabAndRecordPayment({
        tabId: targetTabRef?.id || '00000000-0000-0000-0000-000000000000',
        paymentMethod: dbMethod,
        amount: grandTotalPaid,
        discountAmount,
        notes: `Settled by ${cashierName}`,
      })
      .catch((err) => {
        console.warn('Background settleTab offline notice:', err);
      });
  },

  settleTableGroup: (
    tableId: string,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    cashierName = 'Coltrane (Cashier)'
  ) => {
    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return state;

      const subtotal = table.totalAmount || 0;
      const tax = subtotal * 0.1;
      const grandTotal = subtotal + tax;

      const allItems: OrderLineItem[] = [];
      table.tabs?.forEach((tab) => allItems.push(...tab.items));

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
        status: 'paid',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        cashierName: cashierName,
        itemsSummary:
          allItems.map((i) => `${i.quantity}x ${i.productName}`).join(', ') ||
          'Combined Table Bill',
      };

      let nextDrawer = state.drawerEntries;
      if (paymentMethod === 'cash') {
        const cashDrawerEntry: DrawerEntry = {
          id: `drw-${Date.now()}`,
          type: 'sale',
          amount: grandTotal,
          reason: `Table ${table.code} Combined Group Cash Settle`,
          performedBy: cashierName,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
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
  },
});
