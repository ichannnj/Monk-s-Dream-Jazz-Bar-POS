import { CustomerTab, OrderLineItem, FloorAlert } from '../../../types/floor';
import { tablesApi } from '../data/tables.api';
import { ordersApi } from '../../orders/data/orders.api';
import { posHlc, deriveTabTotal, deriveTableStatus } from '../../orders/application/order.helpers';
import { OrderStoreSet, OrderStoreGet } from '../../orders/domain/order.types';
import { useAuthStore } from '../../auth/application/useAuthStore';

export const createTableTabSlice = (set: OrderStoreSet, get: OrderStoreGet) => ({
  openTableTab: (tableId: string, guestName: string, guestCount = 1) => {
    const targetTable = get().tables.find((t) => t.id === tableId);
    const isTargetEmpty = !targetTable || targetTable.status === 'empty';

    const existingIndices = isTargetEmpty
      ? []
      : [...(targetTable?.activeTabs || []), ...(targetTable?.tabs || []).map((tb) => tb.tabIndex)];
    const nextTabIndex = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 1;
    const finalGuestName = guestName.trim() || `Guest ${nextTabIndex}`;
    const localTabId = `tab-${tableId}-${nextTabIndex}`;

    const newTab: CustomerTab = {
      id: localTabId,
      tabIndex: nextTabIndex,
      guestName: finalGuestName,
      status: 'open',
      totalAmount: 0,
      items: [],
      openedAt: 'Just now',
    };

    set((state) => {
      const updatedTables = state.tables.map((t) => {
        if (t.id !== tableId) return t;

        const tableWasEmpty = t.status === 'empty';
        const existingTabs = tableWasEmpty ? [] : t.tabs || [];
        const nextTabs = [...existingTabs, newTab];
        const nextActiveTabs = tableWasEmpty
          ? [nextTabIndex]
          : Array.from(new Set([...t.activeTabs, nextTabIndex]));

        return {
          ...t,
          status: 'occupied' as const,
          guests: tableWasEmpty ? guestCount : t.guests > 0 ? t.guests + guestCount : guestCount,
          hasOpenCheck: true,
          activeTabs: nextActiveTabs,
          maxTabs: Math.max(t.maxTabs || 1, nextTabIndex, nextActiveTabs.length, 99),
          tabs: nextTabs,
          elapsedTime: tableWasEmpty ? '1m' : t.elapsedTime,
        };
      });

      return { tables: updatedTables };
    });

    // Asynchronously insert new tab into Supabase so it has a real DB UUID immediately
    const currentUserId = useAuthStore.getState().currentUser?.id;
    tablesApi
      .createTab({
        tableId: tableId,
        customerName: finalGuestName,
        orderType: 'DINE_IN',
        orderChannel: targetTable?.area === 'bar' ? 'BAR_AREA' : 'CAFE_AREA',
        openedById: currentUserId,
      })
      .then((res) => {
        if (res?.id) {
          set((state) => ({
            tables: state.tables.map((t) => {
              if (t.id !== tableId) return t;
              return {
                ...t,
                tabs: (t.tabs || []).map((tb) =>
                  tb.tabIndex === nextTabIndex ? { ...tb, id: res.id } : tb
                ),
              };
            }),
          }));
        }
      })
      .catch((err) => {
        console.warn('Background tab persistence deferred:', err);
      });

    return { tabIndex: nextTabIndex, tabId: localTabId };
  },

  addItemsToTab: (
    tableId: string,
    tabIndex: number,
    items: OrderLineItem[],
    hasCorkageFee = false,
    corkageAmount = 0
  ) => {
    // 1. Calculate sequential per-tab round number
    const existingTable = get().tables.find((t) => t.id === tableId);
    const existingTab = existingTable?.tabs?.find((t) => t.tabIndex === tabIndex);
    const existingItems = existingTab?.items || [];
    const maxExistingRound =
      existingItems.length > 0 ? Math.max(0, ...existingItems.map((i) => i.roundNumber || 1)) : 0;
    const targetRound = maxExistingRound + 1;

    const roundTaggedItems = items.map((i, idx) => ({
      ...i,
      id: i.id || `item-${tableId}-tab${tabIndex}-r${targetRound}-${Date.now()}-${idx}`,
      roundNumber: targetRound,
      status: i.status || ('pending' as const),
    }));

    set((state) => {
      const updatedTables = state.tables.map((table) => {
        if (table.id !== tableId) return table;

        const updatedTabs = (table.tabs || []).map((tab) => {
          if (tab.tabIndex !== tabIndex) return tab;

          const updatedItems = [...tab.items, ...roundTaggedItems];
          const nextCorkageFee = hasCorkageFee || tab.hasCorkageFee;
          const nextCorkageAmount = (tab.corkageAmount || 0) + (hasCorkageFee ? corkageAmount : 0);

          const updatedTab: CustomerTab = {
            ...tab,
            items: updatedItems,
            hasCorkageFee: nextCorkageFee,
            corkageAmount: nextCorkageAmount,
            totalAmount: 0,
          };
          updatedTab.totalAmount = deriveTabTotal(updatedTab);
          return updatedTab;
        });

        // Compute total amount on table across all active non-cancelled items
        const tableTotal = updatedTabs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);

        return {
          ...table,
          status: deriveTableStatus(table.activeTabs.length > 0, updatedTabs),
          totalAmount: tableTotal,
          tabs: updatedTabs,
        };
      });

      // Add station notification with explicit table and tab references
      const targetTable = state.tables.find((t) => t.id === tableId);
      const guestDisplayName = existingTab?.guestName || `Tab #${tabIndex}`;
      const newAlert: FloorAlert = {
        id: `alt-${Date.now()}`,
        title: `🚀 Order Sent: ${targetTable?.code || tableId} • ${guestDisplayName} • Round ${targetRound}`,
        description: `Round ${targetRound}: ${items.length} item(s) dispatched to stations. Chit printed.`,
        type: 'station_ready',
        time: 'Just now',
        isRead: false,
        targetRef: targetTable?.code,
      };

      return {
        tables: updatedTables,
        alerts: [newAlert, ...state.alerts],
      };
    });

    // Background asynchronous Supabase persistence
    const currentTable = get().tables.find((t) => t.id === tableId);
    const currentTab = currentTable?.tabs?.find((t) => t.tabIndex === tabIndex);
    const mutationId = `mut-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const hlcTs = posHlc.now();

    ordersApi
      .createOrderWithItems({
        tabId: currentTab?.id || `tab-${tableId}-${tabIndex}`,
        tableId: tableId,
        customerName: currentTab?.guestName || `Guest ${tabIndex}`,
        orderNumber: `#${currentTable?.code || 'T'}-${tabIndex}-R${targetRound}-${Date.now().toString().slice(-4)}`,
        orderType: 'DINE_IN',
        hasCorkageFee,
        corkageAmount,
        roundNumber: targetRound,
        items: roundTaggedItems.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          stationTarget: i.stationTarget,
          modifiers: i.modifiers,
          notes: i.notes,
        })),
      })
      .then((res) => {
        if (res.items && res.items.length > 0) {
          // Map returned database item UUIDs cleanly onto newly added items
          const newlyAddedMap = new Map<string, string>();
          res.items.forEach((dbIt: any, idx: number) => {
            const localItem = roundTaggedItems[idx];
            if (localItem && dbIt.id) {
              newlyAddedMap.set(localItem.id, dbIt.id);
            }
          });

          set((state) => ({
            tables: state.tables.map((t) => {
              if (t.id !== tableId) return t;
              return {
                ...t,
                tabs: (t.tabs || []).map((tb) => {
                  if (tb.tabIndex !== tabIndex) return tb;
                  const updatedItems = tb.items.map((it) => {
                    if (newlyAddedMap.has(it.id)) {
                      return { ...it, id: newlyAddedMap.get(it.id)! };
                    }
                    return it;
                  });
                  return {
                    ...tb,
                    id: res.order?.tab_id || tb.id,
                    items: updatedItems,
                  };
                }),
              };
            }),
          }));
        }
      })
      .catch((err) => {
        console.warn('Background order dispatch deferred to offline queue:', err);
        set((state) => ({
          offlineQueue: [
            ...state.offlineQueue,
            {
              id: mutationId,
              hlc: hlcTs,
              type: 'create_order',
              payload: { tableId, tabIndex, items, hasCorkageFee, corkageAmount },
              timestamp: Date.now(),
            },
          ],
        }));
      });
  },

  closeEmptyTab: (tableId: string, tabIndex: number) => {
    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return state;

      const remainingTabs = (table.tabs || []).filter((t) => t.tabIndex !== tabIndex);
      const remainingActiveTabs = (table.activeTabs || []).filter((num) => num !== tabIndex);
      const remainingAmount = remainingTabs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
      const isTableEmpty = remainingActiveTabs.length === 0 || remainingTabs.length === 0;
      const nextTableStatus = isTableEmpty ? 'empty' : deriveTableStatus(true, remainingTabs);

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

      return { tables: updatedTables };
    });
  },
});
