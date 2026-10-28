import {
  TakeoutOrder,
  OnlineDeliveryOrder,
  DrawerEntry,
  ChatMessage,
  FloorAlert,
  OrderLineItem,
} from '../../../types/floor';
import { OrderStoreSet, OrderStoreGet } from '../domain/order.types';

export const createChannelsSlice = (set: OrderStoreSet, get: OrderStoreGet) => ({
  createTakeoutOrder: (
    customerName: string,
    items: OrderLineItem[],
    isPrepaid = true,
    notes?: string
  ): TakeoutOrder => {
    const nextTicketNum = `T-${107 + get().takeoutOrders.length}`;
    const itemsTotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

    const newOrder: TakeoutOrder = {
      id: `to-${Date.now()}`,
      ticketNumber: nextTicketNum,
      customerName: customerName.trim() || 'Walk-in Guest',
      items: items,
      total: itemsTotal,
      status: 'preparing',
      elapsedTime: '1m',
      isPrepaid: isPrepaid,
      notes: notes,
    };

    set((state) => ({
      takeoutOrders: [newOrder, ...state.takeoutOrders],
      alerts: [
        {
          id: `alt-${Date.now()}`,
          title: `🛍️ New Takeout Order: #${nextTicketNum}`,
          description: `Guest: ${customerName} (${items.length} items to-go). Packaging: To-go cups & boxes.`,
          type: 'station_ready',
          time: 'Just now',
          isRead: false,
          targetRef: nextTicketNum,
        },
        ...state.alerts,
      ],
    }));

    return newOrder;
  },

  updateTakeoutStatus: (id: string, status: 'preparing' | 'ready' | 'completed') => {
    set((state) => ({
      takeoutOrders: state.takeoutOrders.map((o) => (o.id === id ? { ...o, status } : o)),
    }));
  },

  createOnlineOrder: (
    platform: 'grabfood' | 'foodpanda',
    platformOrderRef: string,
    riderName: string,
    customerName: string,
    items: OrderLineItem[]
  ): OnlineDeliveryOrder => {
    const itemsTotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

    const newOrder: OnlineDeliveryOrder = {
      id: `od-${Date.now()}`,
      platform: platform,
      platformOrderRef: platformOrderRef.trim().toUpperCase(),
      riderName: riderName.trim() || 'Rider Assigned',
      customerName: customerName.trim() || 'Online Customer',
      items: items,
      total: itemsTotal,
      status: 'preparing',
      elapsedTime: '1m',
      paymentStatus: platform === 'grabfood' ? 'PAID_ONLINE_GRAB' : 'PAID_ONLINE_FOODPANDA',
    };

    set((state) => ({
      onlineOrders: [newOrder, ...state.onlineOrders],
      alerts: [
        {
          id: `alt-${Date.now()}`,
          title: `🛵 Online Delivery Entered: ${platformOrderRef}`,
          description: `${platform === 'grabfood' ? 'GrabFood' : 'Foodpanda'} #${platformOrderRef} - Rider: ${riderName}. Bag chit printed.`,
          type: 'station_ready',
          time: 'Just now',
          isRead: false,
          targetRef: platformOrderRef,
        },
        ...state.alerts,
      ],
    }));

    return newOrder;
  },

  updateOnlineStatus: (id: string, status: 'preparing' | 'ready' | 'completed') => {
    set((state) => ({
      onlineOrders: state.onlineOrders.map((o) => (o.id === id ? { ...o, status } : o)),
    }));
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
