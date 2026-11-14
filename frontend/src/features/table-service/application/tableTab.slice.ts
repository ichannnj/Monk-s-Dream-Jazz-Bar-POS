import type { CustomerTab, OrderLineItem, FloorAlert } from '../../../types/floor';
import { tablesApi } from '../data/tables.api';
import { ordersApi } from '../../orders/data/orders.api';
import {
  enqueueDurableMutation,
  dequeueDurableMutation,
  loadDurableQueue,
} from '../../orders/data/durableQueue';
import { posHlc, deriveTabTotal, deriveTableStatus } from '../../orders/application/order.helpers';
import type { OrderStoreSet, OrderStoreGet } from '../../orders/domain/order.types';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { useVenueStore } from '../../shared/stores/useVenueStore';
import { realtimeGateway } from '../../shared/infrastructure/realtime';
import { toast } from '../../shared/toast/useToastStore';
import { transferOrderItemsToTabAction } from './tableTransferAndVoidActions';
import { closeEmptyTabAction } from './closeEmptyTabAction';

export const createTableTabSlice = (set: OrderStoreSet, get: OrderStoreGet) => ({
  openTableTab: (tableId: string, guestName: string, guestCount = 1) => {
    const targetTable = get().tables.find((t) => t.id === tableId);
    const isTargetEmpty = !targetTable || targetTable.status === 'empty';

    const existingIndices = isTargetEmpty
      ? []
      : [...(targetTable?.activeTabs || []), ...(targetTable?.tabs || []).map((tb) => tb.tabIndex)];
    const nextTabIndex = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 1;
    const finalGuestName = guestName.trim() || `Guest ${nextTabIndex}`;
    const localTabId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0').slice(-12);
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

    const currentUserId = useAuthStore.getState().currentUser?.id;
    tablesApi
      .createTab({
        id: localTabId,
        tableId: tableId,
        customerName: finalGuestName,
        orderType: 'DINE_IN',
        orderChannel: targetTable?.area === 'bar' ? 'BAR_AREA' : 'CAFE_AREA',
        openedById: currentUserId,
        operatingMode: currentOperatingMode,
      })
      .then((res) => {
        if (res?.id && res.id !== localTabId) {
          set((state) => ({
            tables: state.tables.map((t) => {
              if (t.id !== tableId) return t;
              return {
                ...t,
                tabs: (t.tabs || []).map((tb) =>
                  tb.tabIndex === nextTabIndex || tb.id === localTabId ? { ...tb, id: res.id } : tb
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

        const tableTotal = updatedTabs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);

        return {
          ...table,
          status: deriveTableStatus(table.activeTabs.length > 0, updatedTabs),
          totalAmount: tableTotal,
          tabs: updatedTabs,
        };
      });

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

    const currentTable = get().tables.find((t) => t.id === tableId);
    const currentTab = currentTable?.tabs?.find((t) => t.tabIndex === tabIndex);
    const mutationId = `mut-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const hlcTs = posHlc.now();
    const orderNumber = `#${currentTable?.code || 'T'}-${tabIndex}-R${targetRound}-${Date.now().toString().slice(-4)}`;
    const tabId = currentTab?.id || `tab-${tableId}-${tabIndex}`;
    const customerName = currentTab?.guestName || `Guest ${tabIndex}`;
    const mappedItems = roundTaggedItems.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      stationTarget: i.stationTarget,
      status: i.status,
      categorySlug: i.categorySlug,
      eventId: i.eventId,
      variantId: i.variantId,
      temperature: i.temperature,
      sizeLabel: i.sizeLabel,
      modifiers: i.modifiers,
      notes: i.notes,
      variantSelections: i.variantSelections,
    }));

    // Persist mutation to durable storage before network execution with complete order metadata
    enqueueDurableMutation({
      id: mutationId,
      hlc: hlcTs,
      type: 'create_order',
      payload: {
        tabId,
        tableId,
        tabIndex,
        customerName,
        orderNumber,
        orderType: 'DINE_IN',
        orderChannel: currentTable?.area === 'bar' ? 'BAR_AREA' : 'CAFE_AREA',
        roundNumber: targetRound,
        items: mappedItems,
        hasCorkageFee,
        corkageAmount,
      },
    });
    set({ offlineQueue: loadDurableQueue() });

    ordersApi
      .createOrderWithItems({
        tabId,
        tableId,
        customerName,
        orderNumber,
        orderType: 'DINE_IN',
        hasCorkageFee,
        corkageAmount,
        roundNumber: targetRound,
        items: mappedItems,
      })
      .then((res) => {
        // Mutation successfully reached the server: dequeue from durable offline storage
        dequeueDurableMutation(mutationId);
        set({ offlineQueue: loadDurableQueue() });

        if (res.items && res.items.length > 0) {
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
        // Mutation was already persisted to durable storage before dispatch; maintain queued state
        set({ offlineQueue: loadDurableQueue() });
      });
  },

  closeEmptyTab: (tableId: string, tabIndex: number) => {
    closeEmptyTabAction(set, tableId, tabIndex);
  },

  upsertTabDoorCharge: async (
    tableId: string,
    tabIndex: number,
    quantity: number,
    unitPrice: number,
    eventId?: string,
    notes?: string
  ) => {
    const table = get().tables.find((t) => t.id === tableId);
    const tab = table?.tabs?.find((t) => t.tabIndex === tabIndex);
    if (!tab) return;

    const doorChargeProdId = 'd1000001-0000-0000-0000-000000000001';
    const nowIso = new Date().toISOString();

    set((state) => {
      const updatedTables = state.tables.map((tbl) => {
        if (tbl.id !== tableId) return tbl;

        const updatedTabs = (tbl.tabs || []).map((tb) => {
          if (tb.tabIndex !== tabIndex) return tb;

          const existingIndex = tb.items.findIndex(
            (i) =>
              (i.categorySlug === 'door_charge' ||
                i.productId === doorChargeProdId ||
                i.productName.toLowerCase().includes('door charge')) &&
              i.status !== 'cancelled'
          );

          const nextItems = [...tb.items];

          if (quantity <= 0) {
            if (existingIndex >= 0) {
              nextItems[existingIndex] = {
                ...nextItems[existingIndex],
                status: 'cancelled',
                stateChangedAt: nowIso,
                notes: notes || 'Door charge voided / removed',
              };
            }
          } else {
            if (existingIndex >= 0) {
              nextItems[existingIndex] = {
                ...nextItems[existingIndex],
                quantity,
                unitPrice,
                eventId: eventId || nextItems[existingIndex].eventId,
                status: 'served',
                stateChangedAt: nowIso,
                notes: notes !== undefined ? notes : nextItems[existingIndex].notes,
              };
            } else {
              const newItem: OrderLineItem = {
                id: `dc-${Date.now()}`,
                productId: doorChargeProdId,
                productName: 'Event Door Charge',
                unitPrice,
                quantity,
                stationTarget: 'bar',
                categorySlug: 'door_charge',
                eventId,
                status: 'served',
                createdAt: nowIso,
                servedAt: nowIso,
                stateChangedAt: nowIso,
                notes,
                roundNumber: 1,
              };
              nextItems.push(newItem);
            }
          }

          const updatedTab: CustomerTab = {
            ...tb,
            items: nextItems,
            totalAmount: 0,
          };
          updatedTab.totalAmount = deriveTabTotal(updatedTab);
          return updatedTab;
        });

        const tableTotal = updatedTabs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);

        return {
          ...tbl,
          status: deriveTableStatus(tbl.activeTabs.length > 0, updatedTabs),
          totalAmount: tableTotal,
          tabs: updatedTabs,
        };
      });

      return { tables: updatedTables };
    });

    try {
      if (tab.id && !tab.id.startsWith('tab-')) {
        await ordersApi.upsertTabDoorCharge({
          tabId: tab.id,
          quantity,
          unitPrice,
          eventId,
          notes,
        });
        realtimeGateway.broadcastPosSync('door_charge_updated');
      }
    } catch (err) {
      console.warn('upsertTabDoorCharge backend error:', err);
    }
  },

  transferOrderItemsToTab: async (
    tableId: string,
    sourceTabIndex: number,
    targetTabIndex: number | 'new',
    itemTransfers: Array<{ orderItemId: string; quantity: number }>,
    newTabName?: string
  ) => {
    return transferOrderItemsToTabAction(
      set,
      tableId,
      sourceTabIndex,
      targetTabIndex,
      itemTransfers,
      newTabName
    );
  },
});
