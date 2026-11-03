import {
  TakeoutOrder,
  OnlineDeliveryOrder,
  DrawerEntry,
  ChatMessage,
  FloorAlert,
  OrderLineItem,
} from '../../../types/floor';
import { OrderStoreSet, OrderStoreGet } from '../domain/order.types';
import { ordersApi } from '../data/orders.api';
import { tablesApi } from '../../table-service/data/tables.api';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { useVenueStore } from '../../shared/stores/useVenueStore';
import { realtimeGateway } from '../../shared/infrastructure/realtime';

export const createChannelsSlice = (set: OrderStoreSet, get: OrderStoreGet) => ({
  createTakeoutOrder: (
    customerName: string,
    items: OrderLineItem[],
    isPrepaid = true,
    notes?: string
  ): TakeoutOrder => {
    const existingNums = get()
      .takeoutOrders.map((o) => parseInt(o.ticketNumber.replace(/[^0-9]/g, ''), 10))
      .filter((n) => Number.isFinite(n));
    const maxNum = existingNums.length > 0 ? Math.max(106, ...existingNums) : 106;
    const nextTicketNum = `T-${maxNum + 1}`;
    const nowIso = new Date().toISOString();
    const localOrderId = `to-${Date.now()}`;
    const operatingMode = useVenueStore.getState().operatingMode;
    const currentUserId = useAuthStore.getState().currentUser?.id;

    const taggedItems: OrderLineItem[] = items.map((item, idx) => ({
      ...item,
      id: item.id || `item-${localOrderId}-r1-${Date.now()}-${idx}`,
      roundNumber: item.roundNumber || 1,
      status: item.status || ('pending' as const),
      createdAt: item.createdAt || nowIso,
    }));

    const itemsTotal = taggedItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    const finalName = customerName.trim() || 'Walk-in Guest';

    const newOrder: TakeoutOrder = {
      id: localOrderId,
      ticketNumber: nextTicketNum,
      customerName: finalName,
      items: taggedItems,
      total: itemsTotal,
      status: 'preparing',
      elapsedTime: '00:01',
      createdAt: nowIso,
      isPrepaid: isPrepaid,
      operatingMode,
      notes: notes,
    };

    set((state) => ({
      takeoutOrders: [newOrder, ...state.takeoutOrders],
      alerts: [
        {
          id: `alt-${Date.now()}`,
          title: `🛍️ New Takeout Order: #${nextTicketNum}`,
          description: `Guest: ${finalName} (${taggedItems.length} items to-go). ${isPrepaid ? 'Prepaid at Counter' : 'Pay on Pickup (DUE)'}.`,
          type: 'station_ready',
          time: 'Just now',
          isRead: false,
          targetRef: nextTicketNum,
        },
        ...state.alerts,
      ],
    }));

    // Persist Takeout Order + Items to Supabase & trigger BOM stock depletion
    ordersApi
      .createOrderWithItems({
        tabId: localOrderId,
        customerName: finalName,
        orderNumber: nextTicketNum,
        ticketNumber: nextTicketNum,
        orderType: 'TAKEOUT',
        orderChannel: 'TAKEOUT_COUNTER',
        roundNumber: 1,
        isPrepaid,
        notes,
        operatingMode,
        openedById: currentUserId,
        items: taggedItems.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          stationTarget: i.stationTarget,
          status: i.status,
          modifiers: i.modifiers,
          notes: i.notes || notes,
        })),
      })
      .then((res) => {
        const dbTabId = res.order?.tab_id;
        const dbCreatedAt = (res.order as any)?.created_at || nowIso;
        const newlyAddedMap = new Map<string, { id: string; createdAt?: string }>();

        (res.items || []).forEach((dbIt: any, idx: number) => {
          const localItem = taggedItems[idx];
          if (localItem && dbIt.id) {
            newlyAddedMap.set(localItem.id, {
              id: dbIt.id,
              createdAt: dbIt.created_at || dbCreatedAt,
            });
          }
        });

        set((state) => ({
          takeoutOrders: state.takeoutOrders.map((o) => {
            if (o.id !== localOrderId && o.ticketNumber !== nextTicketNum) return o;
            return {
              ...o,
              id: dbTabId && !dbTabId.startsWith('00000000') ? dbTabId : o.id,
              tabId: dbTabId && !dbTabId.startsWith('00000000') ? dbTabId : o.tabId,
              createdAt: dbCreatedAt,
              items: o.items.map((it) => {
                const mapped = newlyAddedMap.get(it.id);
                return mapped
                  ? { ...it, id: mapped.id, createdAt: mapped.createdAt || it.createdAt }
                  : it;
              }),
            };
          }),
        }));

        realtimeGateway.broadcastPosSync('takeout_created');
      })
      .catch((err) => {
        console.warn('Background takeout persistence deferred:', err);
      });

    return newOrder;
  },

  addItemsToTakeoutOrder: (takeoutId: string, items: OrderLineItem[]) => {
    const existing = get().takeoutOrders.find((o) => o.id === takeoutId || o.tabId === takeoutId);
    if (!existing) return;

    const maxRound =
      existing.items.length > 0 ? Math.max(1, ...existing.items.map((i) => i.roundNumber || 1)) : 1;
    const nextRound = maxRound + 1;
    const nowIso = new Date().toISOString();

    const taggedItems: OrderLineItem[] = items.map((item, idx) => ({
      ...item,
      id: item.id || `item-to-${takeoutId}-r${nextRound}-${Date.now()}-${idx}`,
      roundNumber: nextRound,
      status: item.status || ('pending' as const),
      createdAt: nowIso,
    }));

    set((state) => ({
      takeoutOrders: state.takeoutOrders.map((o) => {
        if (o.id !== takeoutId && o.tabId !== takeoutId) return o;
        const mergedItems = [...o.items, ...taggedItems];
        const activeItems = mergedItems.filter((i) => i.status !== 'cancelled');
        const nextTotal = activeItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
        return {
          ...o,
          items: mergedItems,
          total: nextTotal,
          status: 'preparing' as const,
        };
      }),
    }));

    ordersApi
      .createOrderWithItems({
        tabId: existing.tabId || existing.id,
        customerName: existing.customerName,
        orderNumber: `${existing.ticketNumber}-R${nextRound}`,
        ticketNumber: existing.ticketNumber,
        orderType: 'TAKEOUT',
        orderChannel: 'TAKEOUT_COUNTER',
        roundNumber: nextRound,
        isPrepaid: existing.isPrepaid,
        notes: existing.notes,
        operatingMode: existing.operatingMode,
        items: taggedItems.map((i) => ({
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
        const newlyAddedMap = new Map<string, string>();
        (res.items || []).forEach((dbIt: any, idx: number) => {
          const localItem = taggedItems[idx];
          if (localItem && dbIt.id) {
            newlyAddedMap.set(localItem.id, dbIt.id);
          }
        });

        set((state) => ({
          takeoutOrders: state.takeoutOrders.map((o) => {
            if (o.id !== takeoutId && o.tabId !== takeoutId) return o;
            return {
              ...o,
              items: o.items.map((it) =>
                newlyAddedMap.has(it.id) ? { ...it, id: newlyAddedMap.get(it.id)! } : it
              ),
            };
          }),
        }));

        realtimeGateway.broadcastPosSync('takeout_items_added');
      })
      .catch((err) => {
        console.warn('Background addItemsToTakeoutOrder error:', err);
      });
  },

  updateTakeoutStatus: (id: string, status: 'preparing' | 'ready' | 'completed') => {
    const targetOrder = get().takeoutOrders.find((o) => o.id === id || o.tabId === id);
    const itemIdsToUpdate: Array<{ id: string; nextStatus: 'ready' | 'served' }> = [];

    set((state) => ({
      takeoutOrders: state.takeoutOrders.map((o) => {
        if (o.id !== id && o.tabId !== id) return o;
        const updatedItems = o.items.map((item) => {
          if (item.status === 'cancelled') return item;
          if (status === 'ready' && item.status !== 'ready' && item.status !== 'served') {
            itemIdsToUpdate.push({ id: item.id, nextStatus: 'ready' });
            return { ...item, status: 'ready' as const };
          }
          if (status === 'completed' && item.status !== 'served') {
            itemIdsToUpdate.push({ id: item.id, nextStatus: 'served' });
            return { ...item, status: 'served' as const };
          }
          return item;
        });
        return { ...o, status, items: updatedItems };
      }),
    }));

    itemIdsToUpdate.forEach(({ id: itemId, nextStatus }) => {
      ordersApi.updateOrderItemStatus(itemId, nextStatus);
    });

    if (status === 'completed' && targetOrder) {
      const dbTabId = targetOrder.tabId || targetOrder.id;
      const staffId = useAuthStore.getState().currentUser?.id;
      tablesApi.completeOffPremiseTab({ tabId: dbTabId, staffId }).then(() => {
        realtimeGateway.broadcastPosSync('takeout_completed');
      });
    } else {
      realtimeGateway.broadcastPosSync('takeout_status_updated');
    }
  },

  createOnlineOrder: (
    platform: 'grabfood' | 'foodpanda',
    platformOrderRef: string,
    riderName: string,
    customerName: string,
    items: OrderLineItem[]
  ): OnlineDeliveryOrder => {
    const nowIso = new Date().toISOString();
    const localOrderId = `od-${Date.now()}`;
    const cleanRef = platformOrderRef.trim().toUpperCase();
    const cleanRider = riderName.trim() || 'Rider Assigned';
    const cleanCustomer = customerName.trim() || 'Online Customer';
    const operatingMode = useVenueStore.getState().operatingMode;
    const currentUserId = useAuthStore.getState().currentUser?.id;

    const taggedItems: OrderLineItem[] = items.map((item, idx) => ({
      ...item,
      id: item.id || `item-${localOrderId}-r1-${Date.now()}-${idx}`,
      roundNumber: item.roundNumber || 1,
      status: item.status || ('pending' as const),
      createdAt: item.createdAt || nowIso,
    }));

    const itemsTotal = taggedItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

    const newOrder: OnlineDeliveryOrder = {
      id: localOrderId,
      platform: platform,
      platformOrderRef: cleanRef,
      riderName: cleanRider,
      customerName: cleanCustomer,
      items: taggedItems,
      total: itemsTotal,
      status: 'preparing',
      elapsedTime: '00:01',
      createdAt: nowIso,
      operatingMode,
      paymentStatus: platform === 'grabfood' ? 'PAID_ONLINE_GRAB' : 'PAID_ONLINE_FOODPANDA',
    };

    set((state) => ({
      onlineOrders: [newOrder, ...state.onlineOrders],
      alerts: [
        {
          id: `alt-${Date.now()}`,
          title: `🛵 Online Delivery Entered: ${cleanRef}`,
          description: `${platform === 'grabfood' ? 'GrabFood' : 'Foodpanda'} #${cleanRef} - Rider: ${cleanRider}. Bag chit printed.`,
          type: 'station_ready',
          time: 'Just now',
          isRead: false,
          targetRef: cleanRef,
        },
        ...state.alerts,
      ],
    }));

    // Persist Online Delivery Order + Items to Supabase
    ordersApi
      .createOrderWithItems({
        tabId: localOrderId,
        customerName: cleanCustomer,
        orderNumber: cleanRef,
        ticketNumber: cleanRef,
        orderType: 'ONLINE_DELIVERY',
        orderChannel: platform === 'foodpanda' ? 'FOODPANDA' : 'GRAB_FOOD',
        externalOrderRef: cleanRef,
        riderName: cleanRider,
        roundNumber: 1,
        isPrepaid: true,
        operatingMode,
        openedById: currentUserId,
        items: taggedItems.map((i) => ({
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
        const dbTabId = res.order?.tab_id;
        const dbCreatedAt = (res.order as any)?.created_at || nowIso;
        const newlyAddedMap = new Map<string, { id: string; createdAt?: string }>();

        (res.items || []).forEach((dbIt: any, idx: number) => {
          const localItem = taggedItems[idx];
          if (localItem && dbIt.id) {
            newlyAddedMap.set(localItem.id, {
              id: dbIt.id,
              createdAt: dbIt.created_at || dbCreatedAt,
            });
          }
        });

        set((state) => ({
          onlineOrders: state.onlineOrders.map((o) => {
            if (o.id !== localOrderId && o.platformOrderRef !== cleanRef) return o;
            return {
              ...o,
              id: dbTabId && !dbTabId.startsWith('00000000') ? dbTabId : o.id,
              tabId: dbTabId && !dbTabId.startsWith('00000000') ? dbTabId : o.tabId,
              createdAt: dbCreatedAt,
              items: o.items.map((it) => {
                const mapped = newlyAddedMap.get(it.id);
                return mapped
                  ? { ...it, id: mapped.id, createdAt: mapped.createdAt || it.createdAt }
                  : it;
              }),
            };
          }),
        }));

        realtimeGateway.broadcastPosSync('online_created');
      })
      .catch((err) => {
        console.warn('Background online order persistence deferred:', err);
      });

    return newOrder;
  },

  addItemsToOnlineOrder: (onlineId: string, items: OrderLineItem[]) => {
    const existing = get().onlineOrders.find((o) => o.id === onlineId || o.tabId === onlineId);
    if (!existing) return;

    const maxRound =
      existing.items.length > 0 ? Math.max(1, ...existing.items.map((i) => i.roundNumber || 1)) : 1;
    const nextRound = maxRound + 1;
    const nowIso = new Date().toISOString();

    const taggedItems: OrderLineItem[] = items.map((item, idx) => ({
      ...item,
      id: item.id || `item-od-${onlineId}-r${nextRound}-${Date.now()}-${idx}`,
      roundNumber: nextRound,
      status: item.status || ('pending' as const),
      createdAt: nowIso,
    }));

    set((state) => ({
      onlineOrders: state.onlineOrders.map((o) => {
        if (o.id !== onlineId && o.tabId !== onlineId) return o;
        const mergedItems = [...o.items, ...taggedItems];
        const activeItems = mergedItems.filter((i) => i.status !== 'cancelled');
        const nextTotal = activeItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
        return {
          ...o,
          items: mergedItems,
          total: nextTotal,
          status: 'preparing' as const,
        };
      }),
    }));

    ordersApi
      .createOrderWithItems({
        tabId: existing.tabId || existing.id,
        customerName: existing.customerName,
        orderNumber: `${existing.platformOrderRef}-R${nextRound}`,
        ticketNumber: existing.platformOrderRef,
        orderType: 'ONLINE_DELIVERY',
        orderChannel: existing.platform === 'foodpanda' ? 'FOODPANDA' : 'GRAB_FOOD',
        externalOrderRef: existing.platformOrderRef,
        riderName: existing.riderName,
        roundNumber: nextRound,
        isPrepaid: true,
        operatingMode: existing.operatingMode,
        items: taggedItems.map((i) => ({
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
        const newlyAddedMap = new Map<string, string>();
        (res.items || []).forEach((dbIt: any, idx: number) => {
          const localItem = taggedItems[idx];
          if (localItem && dbIt.id) {
            newlyAddedMap.set(localItem.id, dbIt.id);
          }
        });

        set((state) => ({
          onlineOrders: state.onlineOrders.map((o) => {
            if (o.id !== onlineId && o.tabId !== onlineId) return o;
            return {
              ...o,
              items: o.items.map((it) =>
                newlyAddedMap.has(it.id) ? { ...it, id: newlyAddedMap.get(it.id)! } : it
              ),
            };
          }),
        }));

        realtimeGateway.broadcastPosSync('online_items_added');
      })
      .catch((err) => {
        console.warn('Background addItemsToOnlineOrder error:', err);
      });
  },

  updateOnlineStatus: (id: string, status: 'preparing' | 'ready' | 'completed') => {
    const targetOrder = get().onlineOrders.find((o) => o.id === id || o.tabId === id);
    const itemIdsToUpdate: Array<{ id: string; nextStatus: 'ready' | 'served' }> = [];

    set((state) => ({
      onlineOrders: state.onlineOrders.map((o) => {
        if (o.id !== id && o.tabId !== id) return o;
        const updatedItems = o.items.map((item) => {
          if (item.status === 'cancelled') return item;
          if (status === 'ready' && item.status !== 'ready' && item.status !== 'served') {
            itemIdsToUpdate.push({ id: item.id, nextStatus: 'ready' });
            return { ...item, status: 'ready' as const };
          }
          if (status === 'completed' && item.status !== 'served') {
            itemIdsToUpdate.push({ id: item.id, nextStatus: 'served' });
            return { ...item, status: 'served' as const };
          }
          return item;
        });
        return { ...o, status, items: updatedItems };
      }),
    }));

    itemIdsToUpdate.forEach(({ id: itemId, nextStatus }) => {
      ordersApi.updateOrderItemStatus(itemId, nextStatus);
    });

    if (status === 'completed' && targetOrder) {
      const dbTabId = targetOrder.tabId || targetOrder.id;
      const staffId = useAuthStore.getState().currentUser?.id;
      tablesApi.completeOffPremiseTab({ tabId: dbTabId, staffId }).then(() => {
        realtimeGateway.broadcastPosSync('online_completed');
      });
    } else {
      realtimeGateway.broadcastPosSync('online_status_updated');
    }
  },

  addDrawerEntry: (
    type: 'float' | 'cash_in' | 'cash_out' | 'drop' | 'sale',
    amount: number,
    reason: string,
    performedBy: string,
    drawerTarget: 'main' | 'bar' = 'main'
  ) => {
    const newEntry: DrawerEntry = {
      id: `drw-${Date.now()}`,
      type,
      amount,
      reason,
      performedBy,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      drawerTarget,
    };

    set((state) => ({
      drawerEntries: [newEntry, ...state.drawerEntries],
    }));
  },

  addChatMessage: (
    channel: 'all' | 'bar' | 'kitchen',
    message: string,
    senderName: string,
    senderRole: string
  ) => {
    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      channel,
      message,
      senderName,
      senderRole,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, newMsg],
    }));
  },

  markAlertRead: (id: string) => {
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
    }));
  },

  addAlert: (alert: Omit<FloorAlert, 'id' | 'time' | 'isRead'>) => {
    const newAlert: FloorAlert = {
      ...alert,
      id: `alt-${Date.now()}`,
      time: 'Just now',
      isRead: false,
    };
    set((state) => ({
      alerts: [newAlert, ...state.alerts],
    }));
  },
});
