import { OrderLineItem, OnlineDeliveryOrder } from '../../../types/floor';
import { OrderStoreSet, OrderStoreGet } from '../domain/order.types';
import { ordersApi } from '../data/orders.api';
import { tablesApi } from '../../table-service/data/tables.api';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { useVenueStore } from '../../shared/stores/useVenueStore';
import { realtimeGateway } from '../../shared/infrastructure/realtime';

export const createOnlineOrderAction = (
  set: OrderStoreSet,
  get: OrderStoreGet,
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
        variantId: i.variantId,
        temperature: i.temperature,
        sizeLabel: i.sizeLabel,
        modifiers: i.modifiers,
        notes: i.notes,
        variantSelections: i.variantSelections,
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
};

export const addItemsToOnlineOrderAction = (
  set: OrderStoreSet,
  get: OrderStoreGet,
  onlineId: string,
  items: OrderLineItem[]
) => {
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
        variantId: i.variantId,
        temperature: i.temperature,
        sizeLabel: i.sizeLabel,
        modifiers: i.modifiers,
        notes: i.notes,
        variantSelections: i.variantSelections,
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
};

export const updateOnlineStatusAction = (
  set: OrderStoreSet,
  get: OrderStoreGet,
  id: string,
  status: 'preparing' | 'ready' | 'completed'
) => {
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
};
