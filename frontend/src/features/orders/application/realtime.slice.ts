import { realtimeGateway } from '../../shared/infrastructure/realtime';
import type { OrderStoreSet, OrderStoreGet } from '../domain/order.types';
import type { DrawerEntry } from '../../../types/floor';
import {
  handleRealtimeTableTransferAlert,
  handleRealtimeInventoryAlert,
} from './realtimeNotificationHelpers';
import { applyTableTransferToLocalTables } from './realtimeTableTransfer';
import { deriveTabTotal, deriveTableStatus, deriveTableStateTimestamp } from './order.helpers';

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
              tables: state.tables.map((t) => {
                const updatedTabs = isClosedOrBilled
                  ? (t.tabs || []).filter((tab) => tab.id !== tabId)
                  : (t.tabs || []).map((tab) =>
                      tab.id === tabId ? { ...tab, status: 'open' as const } : tab
                    );
                const hasActive = updatedTabs.length > 0;
                return {
                  ...t,
                  tabs: updatedTabs,
                  hasOpenCheck: hasActive,
                  status: hasActive ? deriveTableStatus(true, updatedTabs) : 'empty',
                };
              }),
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
                  const existing = itemsCopy[itemIdx];
                  itemsCopy[itemIdx] = {
                    ...existing,
                    status: newStatus,
                    preparingAt: item.preparing_at || existing.preparingAt,
                    readyAt: item.ready_at || existing.readyAt,
                    servedAt: item.delivered_at || existing.servedAt,
                    stateChangedAt: item.state_changed_at || existing.stateChangedAt,
                  };
                  const nextTab = { ...tab, items: itemsCopy };
                  nextTab.totalAmount = deriveTabTotal(nextTab);
                  return nextTab;
                }
                return tab;
              });

              if (!tableModified) return table;

              const hasActive = Boolean(table.hasOpenCheck || updatedTabs.length > 0);
              const nextStatus = deriveTableStatus(hasActive, updatedTabs);
              const nextTableTotal = updatedTabs.reduce(
                (acc, cur) => acc + (cur.totalAmount || 0),
                0
              );
              const nextStateChangedAt =
                nextStatus !== table.status
                  ? deriveTableStateTimestamp(nextStatus, updatedTabs, table.occupiedSinceIso)
                  : table.stateChangedAt;

              return {
                ...table,
                status: nextStatus,
                totalAmount: nextTableTotal,
                stateChangedAt: nextStateChangedAt,
                tabs: updatedTabs,
              };
            });

            const updatedTakeout = state.takeoutOrders.map((order) => {
              const itemIdx = order.items.findIndex((i) => i.id === itemId);
              if (itemIdx >= 0) {
                const itemsCopy = [...order.items];
                const existing = itemsCopy[itemIdx];
                itemsCopy[itemIdx] = {
                  ...existing,
                  status: newStatus,
                  preparingAt: item.preparing_at || existing.preparingAt,
                  readyAt: item.ready_at || existing.readyAt,
                  servedAt: item.delivered_at || existing.servedAt,
                  stateChangedAt: item.state_changed_at || existing.stateChangedAt,
                };
                const activeItems = itemsCopy.filter((i) => i.status !== 'cancelled');
                const allReady =
                  activeItems.length > 0 &&
                  activeItems.every((i) => i.status === 'ready' || i.status === 'served');
                return {
                  ...order,
                  items: itemsCopy,
                  status: allReady
                    ? ('ready' as const)
                    : order.status === 'ready'
                      ? ('preparing' as const)
                      : order.status,
                };
              }
              return order;
            });

            const updatedOnline = state.onlineOrders.map((order) => {
              const itemIdx = order.items.findIndex((i) => i.id === itemId);
              if (itemIdx >= 0) {
                const itemsCopy = [...order.items];
                const existing = itemsCopy[itemIdx];
                itemsCopy[itemIdx] = {
                  ...existing,
                  status: newStatus,
                  preparingAt: item.preparing_at || existing.preparingAt,
                  readyAt: item.ready_at || existing.readyAt,
                  servedAt: item.delivered_at || existing.servedAt,
                  stateChangedAt: item.state_changed_at || existing.stateChangedAt,
                };
                const activeItems = itemsCopy.filter((i) => i.status !== 'cancelled');
                const allReady =
                  activeItems.length > 0 &&
                  activeItems.every((i) => i.status === 'ready' || i.status === 'served');
                return {
                  ...order,
                  items: itemsCopy,
                  status: allReady
                    ? ('ready' as const)
                    : order.status === 'ready'
                      ? ('preparing' as const)
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
            const entryType = (entry.action_type || 'sale').toLowerCase() as any;
            const entryAmount = parseFloat(entry.amount) || 0;
            const entryReason = entry.reason || 'Cash movement';
            const target = (entry.drawer_target || 'main') as 'main' | 'bar';

            const alreadyExists = get().drawerEntries.some(
              (d) => d.id === entry.id || (entry.payment_id && d.reason?.includes(entry.payment_id))
            );
            if (!alreadyExists) {
              const newEntry: DrawerEntry = {
                id: entry.id,
                type: entryType,
                amount: entryAmount,
                reason: entryReason,
                performedBy: 'Staff',
                timestamp: new Date(entry.created_at || Date.now()).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                drawerTarget: target,
              };
              set((state) => {
                // Replace matching local optimistic 'drw-' entry instead of appending a duplicate
                const nowMs = Date.now();
                let replacedOptimistic = false;
                const nextEntries = state.drawerEntries.map((d) => {
                  const drwTs = d.id.startsWith('drw-') ? Number(d.id.slice(4)) : NaN;
                  const isFreshOptimistic = Number.isFinite(drwTs) && nowMs - drwTs < 30000;
                  if (
                    !replacedOptimistic &&
                    isFreshOptimistic &&
                    d.type === entryType &&
                    Math.abs(d.amount - entryAmount) < 0.01 &&
                    d.drawerTarget === target &&
                    (entryType === 'sale' ||
                      d.reason === entryReason ||
                      entryReason.includes(d.reason))
                  ) {
                    replacedOptimistic = true;
                    return {
                      ...newEntry,
                      performedBy: d.performedBy || newEntry.performedBy,
                    };
                  }
                  return d;
                });

                return {
                  drawerEntries: replacedOptimistic
                    ? nextEntries
                    : [newEntry, ...state.drawerEntries],
                };
              });
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
