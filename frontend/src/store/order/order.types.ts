import { StateCreator } from 'zustand';
import {
  TableItem,
  TakeoutOrder,
  OnlineDeliveryOrder,
  CheckItem,
  DrawerEntry,
  FloorAlert,
  ChatMessage,
  OrderLineItem,
} from '../../types/floor';

export interface QueuedMutation {
  id: string;
  hlc: string;
  type: 'create_order' | 'transfer_table' | 'settle_tab' | 'update_status';
  payload: any;
  timestamp: number;
}

export interface OrderState {
  tables: TableItem[];
  takeoutOrders: TakeoutOrder[];
  onlineOrders: OnlineDeliveryOrder[];
  checks: CheckItem[];
  drawerEntries: DrawerEntry[];
  alerts: FloorAlert[];
  chatMessages: ChatMessage[];
  isHydrated: boolean;
  offlineQueue: QueuedMutation[];

  openTableTab: (
    tableId: string,
    guestName: string,
    guestCount?: number
  ) => { tabIndex: number; tabId: string };
  addItemsToTab: (
    tableId: string,
    tabIndex: number,
    items: OrderLineItem[],
    hasCorkageFee?: boolean,
    corkageAmount?: number
  ) => void;
  transferTableOrTab: (
    originId: string,
    targetId: string,
    mode: 'entire' | 'tab',
    tabIndex?: number,
    reason?: string
  ) => void;
  closeEmptyTab: (tableId: string, tabIndex: number) => void;
  settleTab: (
    tableId: string,
    tabIndex: number,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    cashierName?: string,
    discountAmount?: number
  ) => void;
  settleTableGroup: (
    tableId: string,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    cashierName?: string
  ) => void;
  createTakeoutOrder: (
    customerName: string,
    items: OrderLineItem[],
    isPrepaid?: boolean,
    notes?: string
  ) => TakeoutOrder;
  updateTakeoutStatus: (id: string, status: 'preparing' | 'ready' | 'completed') => void;
  createOnlineOrder: (
    platform: 'grabfood' | 'foodpanda',
    platformOrderRef: string,
    riderName: string,
    customerName: string,
    items: OrderLineItem[]
  ) => OnlineDeliveryOrder;
  updateOnlineStatus: (id: string, status: 'preparing' | 'ready' | 'completed') => void;
  addDrawerEntry: (
    type: 'float' | 'cash_in' | 'cash_out' | 'drop' | 'sale',
    amount: number,
    reason: string,
    performedBy: string
  ) => void;
  addChatMessage: (
    channel: 'all' | 'bar' | 'kitchen',
    message: string,
    senderName: string,
    senderRole: string
  ) => void;
  markAlertRead: (id: string) => void;
  addAlert: (alert: Omit<FloorAlert, 'id' | 'time' | 'isRead'>) => void;
  updateOrderItemStatus: (
    itemId: string,
    status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
  ) => void;
  markRoundServed: (
    tableId: string,
    tabIndex: number,
    roundNumber: number,
    stationTarget?: 'bar' | 'kitchen'
  ) => void;
  markTakeoutServed: (orderId: string) => void;
  markOnlineServed: (orderId: string) => void;
  voidOrderItem: (
    itemId: string,
    staffId: string,
    reason: string,
    tableId?: string,
    tabIndex?: number
  ) => Promise<boolean>;
  hydrateFromSupabase: () => Promise<void>;
  drainOfflineQueue: () => Promise<void>;
  initRealtimeSync: () => () => void;
}

export type OrderStoreSet = Parameters<StateCreator<OrderState>>[0];
export type OrderStoreGet = Parameters<StateCreator<OrderState>>[1];
export type OrderSlice<T> = StateCreator<OrderState, [], [], T>;
