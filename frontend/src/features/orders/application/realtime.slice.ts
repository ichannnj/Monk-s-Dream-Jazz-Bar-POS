import { realtimeGateway } from '../../shared/infrastructure/realtime';
import { OrderStoreSet, OrderStoreGet } from '../domain/order.types';
import { toast } from '../../shared/toast/useToastStore';
import { playTransferAlertSound } from '../../shared/infrastructure/audio';

export const createRealtimeSlice = (set: OrderStoreSet, get: OrderStoreGet) => ({
  initRealtimeSync: () => {
    // 1. Initial live hydration and offline queue drain
    get().hydrateFromSupabase();
    get().drainOfflineQueue();

    // 2. Subscribe to centralized global realtime channels
    const unsub = realtimeGateway.subscribeGlobalPOSRealtime({
      onTableChange: (payload) => {
        if (payload.new) {
          const updatedTable = payload.new;
          set((state) => ({
            tables: state.tables.map((t) =>
              t.id === updatedTable.id || t.code === updatedTable.table_number
                ? {
                    ...t,
                    status: updatedTable.is_occupied ? 'occupied' : 'empty',
                    hasOpenCheck: updatedTable.is_occupied,
                  }
                : t
            ),
          }));
        }
      },

      onTabChange: (payload) => {
        if (payload.eventType === 'INSERT') {
          get().hydrateFromSupabase();
        } else if (
          payload.new &&
          (payload.new.status === 'BILLED' || payload.new.status === 'CLOSED')
        ) {
          const tabId = payload.new.id;
          set((state) => ({
            tables: state.tables.map((t) => ({
              ...t,
              tabs: (t.tabs || []).map((tab) =>
                tab.id === tabId ? { ...tab, status: 'billed' as const } : tab
              ),
            })),
          }));
        }
      },

      onOrderChange: (payload) => {
        if (payload.eventType === 'INSERT') {
          get().hydrateFromSupabase();
        }
      },

      onOrderItemChange: (payload) => {
        const item = payload.new;
        if (!item) return;

        const itemId = item.id;
        const newStatus = (item.status || 'pending').toLowerCase() as any;

        set((state) => {
          // A. Update in Tables
          const updatedTables = state.tables.map((table) => {
            let tableModified = false;
            const updatedTabs = (table.tabs || []).map((tab) => {
              const itemIdx = tab.items.findIndex((i) => i.id === itemId);
              if (itemIdx >= 0) {
                tableModified = true;
                const itemsCopy = [...tab.items];
                itemsCopy[itemIdx] = { ...itemsCopy[itemIdx], status: newStatus };
                return { ...tab, items: itemsCopy };
              }
              return tab;
            });

            if (!tableModified) return table;

            const allItems = updatedTabs.flatMap((t) => t.items);
            let nextStatus = table.status;
            if (allItems.length > 0) {
              if (allItems.every((i) => i.status === 'served')) {
                nextStatus = 'served';
              } else if (allItems.every((i) => i.status === 'ready')) {
                nextStatus = 'ready';
              } else if (allItems.some((i) => i.status === 'preparing')) {
                nextStatus = 'preparing';
              }
            }

            return {
              ...table,
              status: nextStatus,
              tabs: updatedTabs,
            };
          });

          // B. Update in Takeout
          const updatedTakeout = state.takeoutOrders.map((order) => {
            const itemIdx = order.items.findIndex((i) => i.id === itemId);
            if (itemIdx >= 0) {
              const itemsCopy = [...order.items];
              itemsCopy[itemIdx] = { ...itemsCopy[itemIdx], status: newStatus };
              return {
                ...order,
                items: itemsCopy,
                status: itemsCopy.every((i) => i.status === 'ready')
                  ? ('ready' as const)
                  : order.status,
              };
            }
            return order;
          });

          // C. Update in Online
          const updatedOnline = state.onlineOrders.map((order) => {
            const itemIdx = order.items.findIndex((i) => i.id === itemId);
            if (itemIdx >= 0) {
              const itemsCopy = [...order.items];
              itemsCopy[itemIdx] = { ...itemsCopy[itemIdx], status: newStatus };
              return {
                ...order,
                items: itemsCopy,
                status: itemsCopy.every((i) => i.status === 'ready')
                  ? ('ready' as const)
                  : order.status,
              };
            }
            return order;
          });

          return {
            tables: updatedTables,
            takeoutOrders: updatedTakeout,
            onlineOrders: updatedOnline,
          };
        });

        // If item was an INSERT from another tablet, re-hydrate to retrieve complete order data
        if (payload.eventType === 'INSERT') {
          get().hydrateFromSupabase();
        }
      },

      onTableTransfer: (payload) => {
        playTransferAlertSound();
        const guestSuffix = payload.guestName ? ` · "${payload.guestName}"` : '';
        const prepSuffix =
          payload.prepItemsCount > 0
            ? ` (${payload.prepItemsCount} item${payload.prepItemsCount === 1 ? '' : 's'} in prep)`
            : '';
        toast.info(
          `🔁 ${payload.originTableCode} ➔ ${payload.targetTableCode}${guestSuffix}${prepSuffix}`,
          {
            title: 'Table Relocated',
            duration: 7000,
          }
        );
        get().addAlert({
          title: `🔁 Table Transferred: ${payload.originTableCode} ➔ ${payload.targetTableCode}`,
          description: `Customer relocated to ${payload.targetTableCode}. Reason: ${
            payload.reason || 'Guest relocation request'
          }`,
          type: 'transfer',
          targetRef: payload.targetTableCode,
        });

        // Apply transfer to local state if not already updated on this station
        const currentTables = get().tables;
        const originTbl = currentTables.find(
          (t) => t.id === payload.originTableId || t.code === payload.originTableCode
        );
        const targetTbl = currentTables.find(
          (t) => t.id === payload.targetTableId || t.code === payload.targetTableCode
        );

        if (originTbl && targetTbl && (originTbl.tabs || []).length > 0) {
          const tabsToMove =
            payload.mode === 'tab' && payload.tabIndex
              ? (originTbl.tabs || []).filter((tb) => tb.tabIndex === payload.tabIndex)
              : originTbl.tabs || [];

          if (tabsToMove.length > 0) {
            const nowTime = new Date(payload.timestamp || Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const adjustedTabs = tabsToMove.map((tb) => ({
              ...tb,
              transferredFrom: {
                tableCode: originTbl.code,
                transferredAt: nowTime,
              },
            }));

            const remainingOriginTabs = (originTbl.tabs || []).filter(
              (tb) => !tabsToMove.some((mt) => mt.id === tb.id)
            );

            set((state) => ({
              tables: state.tables.map((t) => {
                if (t.id === originTbl.id || t.code === originTbl.code) {
                  const isEmptyNow = remainingOriginTabs.length === 0;
                  return {
                    ...t,
                    status: isEmptyNow ? ('empty' as const) : t.status,
                    guests: isEmptyNow ? 0 : t.guests,
                    hasOpenCheck: !isEmptyNow,
                    activeTabs: remainingOriginTabs.map((tb) => tb.tabIndex),
                    tabs: remainingOriginTabs,
                    elapsedTime: isEmptyNow ? '0m' : t.elapsedTime,
                  };
                }
                if (t.id === targetTbl.id || t.code === targetTbl.code) {
                  return {
                    ...t,
                    status: 'occupied' as const,
                    hasOpenCheck: true,
                    tabs: [...(t.tabs || []), ...adjustedTabs],
                    activeTabs: [...t.activeTabs, ...adjustedTabs.map((tb) => tb.tabIndex)],
                  };
                }
                return t;
              }),
            }));
          }
        }
      },

      onTransferLog: (payload) => {
        if (payload.new) {
          get().addAlert({
            title: 'Table Transferred',
            description: `Tab re-routed from origin table. Reason: ${payload.new.reason || 'Floor rearrangement'}`,
            type: 'transfer',
            targetRef: payload.new.tab_id,
          });
          get().hydrateFromSupabase();
        }
      },

      onProductChange: (payload) => {
        if (payload.new && payload.new.auto_86) {
          get().addAlert({
            title: 'Product Auto-86',
            description: `${payload.new.name} is now 86'd (${payload.new.out_of_stock_reason || 'Depleted'}).`,
            type: 'auto_86',
            targetRef: payload.new.id,
          });
        }
      },

      onBuzzout: (buzzoutPayload) => {
        get().addAlert({
          title: 'Order Ready for Runner',
          description: `Order for ${buzzoutPayload.customerName || buzzoutPayload.tableNumber || 'Guest'} is completely prepared.`,
          type: 'station_ready',
          targetRef: buzzoutPayload.orderId,
        });
      },

      onCashDrawerChange: (payload) => {
        if (payload.new) {
          const entry = payload.new;
          get().addDrawerEntry(
            (entry.action_type || 'sale').toLowerCase() as any,
            parseFloat(entry.amount) || 0,
            entry.reason || 'Cash movement',
            'Staff'
          );
        }
      },
    });

    return () => {
      unsub();
    };
  },
});
