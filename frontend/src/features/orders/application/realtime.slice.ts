import { realtimeGateway } from '../../shared/infrastructure/realtime';
import type { OrderStoreSet, OrderStoreGet } from '../domain/order.types';
import type { DrawerEntry } from '../../../types/floor';
import {
  handleRealtimeTableTransferAlert,
  handleRealtimeInventoryAlert,
} from './realtimeNotificationHelpers';
import { applyTableTransferToLocalTables } from './realtimeTableTransfer';

export const createRealtimeSlice = (set: OrderStoreSet, get: OrderStoreGet) => {
  let hydrateTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleHydration = (delayMs = 250) => {
    if (hydrateTimer) clearTimeout(hydrateTimer);
    hydrateTimer = setTimeout(() => {
      hydrateTimer = null;
      get().hydrateFromSupabase();
      get().drainOfflineQueue();
    }, delayMs);
  };

  return {
    initRealtimeSync: () => {
      get().hydrateFromSupabase();
      get().drainOfflineQueue();

      const heartbeatInterval = setInterval(() => {
        get().hydrateFromSupabase();
        get().drainOfflineQueue();
      }, 10000);

      let removeVisibilityListeners = () => {};
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const handleVisibilityOrFocus = () => {
          if (document.visibilityState === 'visible') {
            scheduleHydration(100);
          }
        };
        const handleOnline = () => {
          get().drainOfflineQueue();
          scheduleHydration(50);
        };
        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('focus', handleVisibilityOrFocus);
        window.addEventListener('online', handleOnline);
        removeVisibilityListeners = () => {
          document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
          window.removeEventListener('focus', handleVisibilityOrFocus);
          window.removeEventListener('online', handleOnline);
        };
      }

      const unsub = realtimeGateway.subscribeGlobalPOSRealtime({
        onTableChange: (payload) => {
          if (payload.new) {
            const updatedTable = payload.new;
            set((state) => {
              const tableExists = state.tables.some(
                (t) => t.id === updatedTable.id || t.code === updatedTable.table_number
              );
              if (!tableExists || payload.eventType === 'INSERT') {
                scheduleHydration(80);
                return state;
              }
              return {
                tables: state.tables.map((t) =>
                  t.id === updatedTable.id || t.code === updatedTable.table_number
                    ? {
                        ...t,
                        status: updatedTable.is_occupied
                          ? t.status === 'empty'
                            ? 'occupied'
                            : t.status
                          : 'empty',
                        hasOpenCheck: updatedTable.is_occupied,
                      }
                    : t
                ),
              };
            });
          } else if (payload.eventType === 'DELETE') {
            scheduleHydration(80);
          }
          scheduleHydration(150);
        },

        onTabChange: (payload) => {
          if (payload.new) {
            const tabId = payload.new.id;
            const isClosedOrBilled =
              payload.new.status === 'BILLED' || payload.new.status === 'CLOSED';
            const isPrepaid = Boolean(payload.new.is_prepaid);

            set((state) => ({
              tables: state.tables.map((t) => ({
                ...t,
                tabs: isClosedOrBilled
                  ? (t.tabs || []).filter((tab) => tab.id !== tabId)
                  : (t.tabs || []).map((tab) =>
                      tab.id === tabId ? { ...tab, status: 'open' as const } : tab
                    ),
              })),
              takeoutOrders: state.takeoutOrders.map((o) => {
                if (o.id !== tabId && o.tabId !== tabId) return o;
                return {
                  ...o,
                  isPrepaid: isPrepaid || o.isPrepaid,
                  status: isClosedOrBilled ? ('completed' as const) : o.status,
                };
              }),
              onlineOrders: state.onlineOrders.map((o) => {
                if (o.id !== tabId && o.tabId !== tabId) return o;
                return {
                  ...o,
                  status: isClosedOrBilled ? ('completed' as const) : o.status,
                };
              }),
            }));
          }
          scheduleHydration();
        },

        onOrderChange: () => {
          scheduleHydration();
        },

        onOrderItemChange: (payload) => {
          const item = payload.new;
          if (!item) return;

          const itemId = item.id;
          const newStatus = (item.status || 'pending').toLowerCase() as any;

          set((state) => {
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

          scheduleHydration();
        },

        onPaymentChange: (payload) => {
          if (payload.new?.tab_id) {
            const paidTabId = payload.new.tab_id;
            set((state) => ({
              takeoutOrders: state.takeoutOrders.map((o) =>
                o.id === paidTabId || o.tabId === paidTabId ? { ...o, isPrepaid: true } : o
              ),
            }));
          }
          scheduleHydration();
        },

        onPosSyncNeeded: () => {
          scheduleHydration(150);
        },

        onTableTransfer: (payload) => {
          handleRealtimeTableTransferAlert(payload, get().addAlert);
          set((state) => ({
            tables: applyTableTransferToLocalTables(state.tables, payload),
          }));
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

        onInventoryChange: (payload) => {
          if (payload.new) {
            handleRealtimeInventoryAlert(payload.new, get().addAlert);
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
            const alreadyExists = get().drawerEntries.some(
              (d) => d.id === entry.id || (entry.payment_id && d.reason?.includes(entry.payment_id))
            );
            if (!alreadyExists) {
              const target = (entry.drawer_target || 'main') as 'main' | 'bar';
              const newEntry: DrawerEntry = {
                id: entry.id,
                type: (entry.action_type || 'sale').toLowerCase() as any,
                amount: parseFloat(entry.amount) || 0,
                reason: entry.reason || 'Cash movement',
                performedBy: 'Staff',
                timestamp: new Date(entry.created_at || Date.now()).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                drawerTarget: target,
              };
              set((state) => ({
                drawerEntries: [newEntry, ...state.drawerEntries],
              }));
            }
          }
        },
      });

      return () => {
        if (hydrateTimer) clearTimeout(hydrateTimer);
        clearInterval(heartbeatInterval);
        removeVisibilityListeners();
        unsub();
      };
    },
  };
};
