import { create } from 'zustand';
import { SEED_TABLES } from '../../floor/data/tables.mock';
import { SEED_TAKEOUT_ORDERS, SEED_ONLINE_ORDERS } from '../data/orders.mock';
import { OrderState } from '../domain/order.types';
import { createTableTabSlice } from '../../table-service/application/tableTab.slice';
import { createTransferSlice } from '../../table-service/application/transfer.slice';
import { createSettlementSlice } from '../../checkout/application/settlement.slice';
import { createItemStatusSlice } from './itemStatus.slice';
import { createChannelsSlice } from './channels.slice';
import { createHydrationSlice } from './hydration.slice';
import { createRealtimeSlice } from './realtime.slice';

export { deriveTabTotal, deriveTableStatus, posHlc } from './order.helpers';
export type { QueuedMutation, OrderState } from '../domain/order.types';

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
