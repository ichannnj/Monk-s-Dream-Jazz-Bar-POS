import { CustomerTab, OrderLineItem, FloorAlert } from '../../../types/floor';
import { tablesApi } from '../data/tables.api';
import { ordersApi } from '../../orders/data/orders.api';
import { posHlc, deriveTabTotal, deriveTableStatus } from '../../orders/application/order.helpers';
import { OrderStoreSet, OrderStoreGet } from '../../orders/domain/order.types';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { useVenueStore } from '../../shared/stores/useVenueStore';
import { supabase } from '../../shared/infrastructure/supabase';
import { realtimeGateway } from '../../shared/infrastructure/realtime';
import { resolveTableUuid } from '../../floor/data/resolver';
import { toast } from '../../shared/toast/useToastStore';

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
    const currentOperatingMode = useVenueStore.getState().operatingMode;
    const nowIso = new Date().toISOString();

    const newTab: CustomerTab = {
      id: localTabId,
      tabIndex: nextTabIndex,
      guestName: finalGuestName,
      status: 'open',
      totalAmount: 0,
      items: [],
      openedAt: new Date(nowIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      openedAtIso: nowIso,
      operatingMode: currentOperatingMode,
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
          elapsedTime: tableWasEmpty ? '00:01' : t.elapsedTime,
          occupiedSinceIso: tableWasEmpty ? nowIso : t.occupiedSinceIso || nowIso,
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
        operatingMode: currentOperatingMode,
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
          realtimeGateway.broadcastPosSync('tab_opened');
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
    const nowIso = new Date().toISOString();

    const roundTaggedItems = items.map((i, idx) => ({
      ...i,
      id: i.id || `item-${tableId}-tab${tabIndex}-r${targetRound}-${Date.now()}-${idx}`,
      roundNumber: targetRound,
      status: i.status || ('pending' as const),
      createdAt: i.createdAt || nowIso,
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
          status: i.status,
          modifiers: i.modifiers,
          notes: i.notes,
        })),
      })
      .then((res) => {
        if (res.items && res.items.length > 0) {
          // Map returned database item UUIDs cleanly onto newly added items
          const newlyAddedMap = new Map<string, { id: string; createdAt?: string }>();
          const dbOrderCreatedAt = (res.order as any)?.created_at;
          res.items.forEach((dbIt: any, idx: number) => {
            const localItem = roundTaggedItems[idx];
            if (localItem && dbIt.id) {
              newlyAddedMap.set(localItem.id, {
                id: dbIt.id,
                createdAt: dbIt.created_at || dbOrderCreatedAt || localItem.createdAt,
              });
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
                    const mapped = newlyAddedMap.get(it.id);
                    if (mapped) {
                      return { ...it, id: mapped.id, createdAt: mapped.createdAt || it.createdAt };
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
          if (res.depletion?.lowStockAlerts && res.depletion.lowStockAlerts.length > 0) {
            res.depletion.lowStockAlerts.forEach((alt) => {
              toast.warning(
                `${alt.ingredientName}: ${Number(alt.currentStock).toFixed(2)} ${alt.unit} remaining (Par: ${alt.minAlertLevel} ${alt.unit})`,
                { title: alt.isDepleted ? 'Stock Depleted' : 'Low Stock Alert' }
              );
            });
          }
          realtimeGateway.broadcastPosSync('dine_in_order_dispatched');
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
    let targetTabRef: CustomerTab | undefined;
    let isTableEmptyResult = false;

    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return state;

      targetTabRef = (table.tabs || []).find((t) => t.tabIndex === tabIndex);
      const remainingTabs = (table.tabs || []).filter((t) => t.tabIndex !== tabIndex);
      const remainingActiveTabs = (table.activeTabs || []).filter((num) => num !== tabIndex);
      const remainingAmount = remainingTabs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
      const isTableEmpty = remainingActiveTabs.length === 0 || remainingTabs.length === 0;
      isTableEmptyResult = isTableEmpty;
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

    // Asynchronously close tab and free table in Supabase
    (async () => {
      try {
        const validTableId = await resolveTableUuid(tableId);
        const isUuid =
          targetTabRef?.id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetTabRef.id);

        if (isUuid && targetTabRef) {
          await supabase
            .from('tabs')
            .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
            .eq('id', targetTabRef.id);
        } else if (validTableId) {
          // Fallback: close the matching open tab on this table
          const { data: openTabs } = await supabase
            .from('tabs')
            .select('id')
            .eq('table_id', validTableId)
            .eq('status', 'OPEN')
            .limit(1);
          if (openTabs && openTabs.length > 0) {
            await supabase
              .from('tabs')
              .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
              .eq('id', openTabs[0].id);
          }
        }

        if (isTableEmptyResult && validTableId) {
          await supabase
            .from('tables')
            .update({ is_occupied: false, updated_at: new Date().toISOString() })
            .eq('id', validTableId);
        }
      } catch (err) {
        console.warn('[closeEmptyTab] Background database close notice:', err);
      }
    })();
  },
});
