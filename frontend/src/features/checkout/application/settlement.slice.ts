import { CustomerTab, CheckItem, DrawerEntry, OrderLineItem } from '../../../types/floor';
import { tablesApi } from '../../table-service/data/tables.api';
import { deriveTableStatus } from '../../orders/application/order.helpers';
import { OrderStoreSet, OrderStoreGet } from '../../orders/domain/order.types';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { supabase } from '../../shared/infrastructure/supabase';
import { resolveTableUuid } from '../../floor/data/resolver';

export const createSettlementSlice = (set: OrderStoreSet, _get: OrderStoreGet) => ({
  settleTab: (
    tableId: string,
    tabIndex: number,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    cashierName?: string,
    discountAmount = 0,
    staffId?: string
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
          });
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
    staffId?: string
  ) => {
    const effectiveCashierName =
      cashierName || useAuthStore.getState().currentUser?.displayName || 'Coltrane (Cashier)';
    const effectiveStaffId = staffId || useAuthStore.getState().currentUser?.id;
    let tabsToSettle: CustomerTab[] = [];

    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return state;

      tabsToSettle = [...(table.tabs || [])];
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
      } catch (err) {
        console.warn('[settleTableGroup] Background database error:', err);
      }
    })();
  },
});
