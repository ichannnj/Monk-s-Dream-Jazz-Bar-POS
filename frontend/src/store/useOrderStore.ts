import { create } from 'zustand';
import { SEED_TABLES } from '../mock/tables.mock';
import { SEED_TAKEOUT_ORDERS, SEED_ONLINE_ORDERS } from '../mock/orders.mock';
import { OrderState } from './order/order.types';
import { createTableTabSlice } from './order/slices/tableTab.slice';
import { createTransferSlice } from './order/slices/transfer.slice';
import { createSettlementSlice } from './order/slices/settlement.slice';
import { createItemStatusSlice } from './order/slices/itemStatus.slice';
import { createChannelsSlice } from './order/slices/channels.slice';
import { createHydrationSlice } from './order/slices/hydration.slice';
import { createRealtimeSlice } from './order/slices/realtime.slice';

export { deriveTabTotal, deriveTableStatus, posHlc } from './order/order.helpers';
export type { QueuedMutation, OrderState } from './order/order.types';

export const useOrderStore = create<OrderState>((set, get) => ({
  tables: SEED_TABLES,
  takeoutOrders: SEED_TAKEOUT_ORDERS,
  onlineOrders: SEED_ONLINE_ORDERS,
  checks: [],
  drawerEntries: [],
  alerts: [],
  chatMessages: [],
  isHydrated: false,
  offlineQueue: [],

  ...createTableTabSlice(set, get),
  ...createTransferSlice(set, get),
  ...createSettlementSlice(set, get),
  ...createItemStatusSlice(set, get),
  ...createChannelsSlice(set, get),
  ...createHydrationSlice(set, get),
  ...createRealtimeSlice(set, get),
}));
