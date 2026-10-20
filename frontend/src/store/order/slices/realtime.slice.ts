import { realtimeGateway } from '../../../services/realtime';
import { OrderStoreSet, OrderStoreGet } from '../order.types';

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
