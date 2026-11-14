import type {
  TakeoutOrder,
  OnlineDeliveryOrder,
  DrawerEntry,
  ChatMessage,
  FloorAlert,
  OrderLineItem,
} from '../../../types/floor';
import type { OrderStoreSet, OrderStoreGet } from '../domain/order.types';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { realtimeGateway } from '../../shared/infrastructure/realtime';
import { supabase } from '../../shared/infrastructure/supabase';
import {
  createTakeoutOrderAction,
  addItemsToTakeoutOrderAction,
  updateTakeoutStatusAction,
} from './takeoutOrderActions';
import {
  createOnlineOrderAction,
  addItemsToOnlineOrderAction,
  updateOnlineStatusAction,
} from './onlineDeliveryOrderActions';

export const createChannelsSlice = (set: OrderStoreSet, get: OrderStoreGet) => ({
  createTakeoutOrder: (
    customerName: string,
    items: OrderLineItem[],
    isPrepaid = true,
    notes?: string
  ): TakeoutOrder => {
    return createTakeoutOrderAction(set, get, customerName, items, isPrepaid, notes);
  },

  addItemsToTakeoutOrder: (takeoutId: string, items: OrderLineItem[]) => {
    addItemsToTakeoutOrderAction(set, get, takeoutId, items);
  },

  updateTakeoutStatus: (id: string, status: 'preparing' | 'ready' | 'completed') => {
    updateTakeoutStatusAction(set, get, id, status);
  },

  createOnlineOrder: (
    platform: 'grabfood' | 'foodpanda',
    platformOrderRef: string,
    riderName: string,
    customerName: string,
    items: OrderLineItem[]
  ): OnlineDeliveryOrder => {
    return createOnlineOrderAction(
      set,
      get,
      platform,
      platformOrderRef,
      riderName,
      customerName,
      items
    );
  },

  addItemsToOnlineOrder: (onlineId: string, items: OrderLineItem[]) => {
    addItemsToOnlineOrderAction(set, get, onlineId, items);
  },

  updateOnlineStatus: (id: string, status: 'preparing' | 'ready' | 'completed') => {
    updateOnlineStatusAction(set, get, id, status);
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

    // If manual till movement, persist to PostgreSQL cash_drawer_transactions
    if (type === 'cash_in' || type === 'cash_out' || type === 'drop' || type === 'float') {
      const dbAction =
        type === 'cash_in'
          ? 'CASH_IN'
          : type === 'cash_out'
            ? 'CASH_OUT'
            : type === 'drop'
              ? 'DROP'
              : 'FLOAT';
      const staffId = useAuthStore.getState().currentUser?.id;
      supabase
        .from('cash_drawer_transactions')
        .insert({
          action_type: dbAction as any,
          amount: amount,
          reason: reason,
          performed_by_id: staffId || null,
          drawer_target: drawerTarget,
        })
        .then(({ error }: any) => {
          if (error) {
            console.warn('[channels.slice] Failed to persist cash drawer movement:', error);
          } else {
            realtimeGateway.broadcastPosSync('cash_drawer_updated');
          }
        });
    }
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
