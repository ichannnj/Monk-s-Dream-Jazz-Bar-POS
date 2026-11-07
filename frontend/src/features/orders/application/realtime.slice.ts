import { realtimeGateway } from '../../shared/infrastructure/realtime';
import { OrderStoreSet, OrderStoreGet } from '../domain/order.types';
import { toast } from '../../shared/toast/useToastStore';
import { playTransferAlertSound } from '../../shared/infrastructure/audio';

export const createRealtimeSlice = (set: OrderStoreSet, get: OrderStoreGet) => {
  let hydrateTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleHydration = (delayMs = 250) => {
    if (hydrateTimer) clearTimeout(hydrateTimer);
    hydrateTimer = setTimeout(() => {
      hydrateTimer = null;
      get().hydrateFromSupabase();
    }, delayMs);
  };

  return {
    initRealtimeSync: () => {
      // 1. Initial live hydration and offline queue drain
      get().hydrateFromSupabase();
      get().drainOfflineQueue();

      // 2. Resilient Tier 3: 10s Silent Background Self-Healing Heartbeat
      const heartbeatInterval = setInterval(() => {
        get().hydrateFromSupabase();
      }, 10000);

      // 3. Resilient Tier 2: Instant Wakeup & Focus Revalidation (Zero latency on wake / tab return)
      let removeVisibilityListeners = () => {};
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const handleVisibilityOrFocus = () => {
          if (document.visibilityState === 'visible') {
            scheduleHydration(100);
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('focus', handleVisibilityOrFocus);
        removeVisibilityListeners = () => {
          document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
          window.removeEventListener('focus', handleVisibilityOrFocus);
        };
      }

      // 4. Resilient Tier 1: Subscribe to centralized global realtime channels
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

          // Re-hydrate on item changes to ensure multi-station & takeout/online states stay synchronized
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

        onInventoryChange: (payload) => {
          if (payload.new) {
            const item = payload.new;
            const currentStock = parseFloat(item.current_stock) || 0;
            const minAlert = parseFloat(item.min_alert_level) || 0;
            if (currentStock <= minAlert) {
              const isDepleted = currentStock <= 0;
              get().addAlert({
                title: isDepleted ? `🔴 Depleted: ${item.name}` : `🟡 Low Stock: ${item.name}`,
                description: `${item.name} is down to ${currentStock.toFixed(2)} ${item.unit} (Par: ${minAlert} ${item.unit}). Orders remain active.`,
                type: 'auto_86',
                targetRef: item.id,
              });
              toast.warning(`${item.name}: ${currentStock.toFixed(2)} ${item.unit} remaining`, {
                title: isDepleted ? 'Ingredient Depleted' : 'Low Stock Warning',
              });
            }
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
        if (hydrateTimer) clearTimeout(hydrateTimer);
        clearInterval(heartbeatInterval);
        removeVisibilityListeners();
        unsub();
      };
    },
  };
};
