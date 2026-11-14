import type { StateCreator } from 'zustand';
import type {
  TableItem,
  TakeoutOrder,
  OnlineDeliveryOrder,
  CheckItem,
  DrawerEntry,
  FloorAlert,
  ChatMessage,
  OrderLineItem,
} from '../../../types/floor';

import type { PaymentTender } from '../../checkout/domain/splitTender.types';

export interface QueuedMutation {
  id: string;
  hlc: string;
  type: 'create_order' | 'transfer_table' | 'settle_tab' | 'update_status';
  payload: any;
  timestamp: number;
  retryCount?: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  lastError?: string;
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
  upsertTabDoorCharge: (
    tableId: string,
    tabIndex: number,
    quantity: number,
    unitPrice: number,
    eventId?: string,
    notes?: string
  ) => Promise<void>;
  transferTableOrTab: (
    originId: string,
    targetId: string,
    mode: 'entire' | 'tab',
    tabIndex?: number,
    reason?: string
  ) => void;
  closeEmptyTab: (tableId: string, tabIndex: number) => void;
  transferOrderItemsToTab: (
    tableId: string,
    sourceTabIndex: number,
    targetTabIndex: number | 'new',
    itemTransfers: Array<{ orderItemId: string; quantity: number }>,
    newTabName?: string
  ) => Promise<void>;
  settleTab: (
    tableId: string,
    tabIndex: number,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp' | 'split',
    cashierName?: string,
    discountAmount?: number,
    staffId?: string,
    paymentChannel?: string,
    referenceNumber?: string,
    billingDetails?: {
      serviceCharge?: number;
      vatableSales?: number;
      vatAmount?: number;
      vatExemptSales?: number;
      discountType?: string;
      seniorPwdId?: string;
      seniorPwdName?: string;
      grossSubtotal?: number;
      totalAmountDue?: number;
      corkageAmount?: number;
      tenderedAmount?: number;
      shouldPrintReceipt?: boolean;
      tenders?: PaymentTender[];
    }
  ) => void;
  settleTableGroup: (
    tableId: string,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp' | 'split',
    cashierName?: string,
    staffId?: string,
    paymentChannel?: string,
    referenceNumber?: string,
    billingDetails?: {
      serviceCharge?: number;
      vatableSales?: number;
      vatAmount?: number;
      vatExemptSales?: number;
      discountType?: string;
      seniorPwdId?: string;
      seniorPwdName?: string;
      grossSubtotal?: number;
      totalAmountDue?: number;
      corkageAmount?: number;
      tenderedAmount?: number;
      shouldPrintReceipt?: boolean;
      tenders?: PaymentTender[];
    }
  ) => void;
  settleTakeoutOrder: (
    takeoutId: string,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp' | 'split',
    options?: {
      completeOrder?: boolean;
      cashierName?: string;
      discountAmount?: number;
      staffId?: string;
      paymentChannel?: string;
      referenceNumber?: string;
      serviceCharge?: number;
      vatableSales?: number;
      vatAmount?: number;
      vatExemptSales?: number;
      discountType?: string;
      seniorPwdId?: string;
      seniorPwdName?: string;
      totalAmountDue?: number;
      tenderedAmount?: number;
      shouldPrintReceipt?: boolean;
      tenders?: PaymentTender[];
    }
  ) => void;
  createTakeoutOrder: (
    customerName: string,
    items: OrderLineItem[],
    isPrepaid?: boolean,
    notes?: string
  ) => TakeoutOrder;
  addItemsToTakeoutOrder: (takeoutId: string, items: OrderLineItem[]) => void;
  updateTakeoutStatus: (id: string, status: 'preparing' | 'ready' | 'completed') => void;
  createOnlineOrder: (
    platform: 'grabfood' | 'foodpanda',
    platformOrderRef: string,
    riderName: string,
    customerName: string,
    items: OrderLineItem[]
  ) => OnlineDeliveryOrder;
  addItemsToOnlineOrder: (onlineId: string, items: OrderLineItem[]) => void;
  updateOnlineStatus: (id: string, status: 'preparing' | 'ready' | 'completed') => void;
  addDrawerEntry: (
    type: 'float' | 'cash_in' | 'cash_out' | 'drop' | 'sale',
    amount: number,
    reason: string,
    performedBy: string,
    drawerTarget?: 'main' | 'bar'
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
