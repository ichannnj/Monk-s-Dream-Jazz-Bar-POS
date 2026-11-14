import { create } from 'zustand';
import type { OrderState } from '../domain/order.types';
import { loadDurableQueue } from '../data/durableQueue';
import { getInitialVenueState } from '../data/venueSnapshot';
import { createTableTabSlice } from '../../table-service/application/tableTab.slice';
import { createTransferSlice } from '../../table-service/application/transfer.slice';
import { createSettlementSlice } from '../../checkout/application/settlement.slice';
import { createItemStatusSlice } from './itemStatus.slice';
import { createChannelsSlice } from './channels.slice';
import { createHydrationSlice } from './hydration.slice';
import { createRealtimeSlice } from './realtime.slice';

export { deriveTabTotal, deriveTableStatus, posHlc } from './order.helpers';
export type { QueuedMutation, OrderState } from '../domain/order.types';

const initialVenueState = getInitialVenueState();

export const useOrderStore = create<OrderState>((set, get) => ({
  tables: initialVenueState.tables,
  takeoutOrders: initialVenueState.takeoutOrders,
  onlineOrders: initialVenueState.onlineOrders,
  checks: [],
  drawerEntries: initialVenueState.drawerEntries,
  alerts: [],
  chatMessages: [],
  isHydrated: initialVenueState.hasAuthoritativeSnapshot,
  offlineQueue: loadDurableQueue(),

  ...createTableTabSlice(set, get),
  ...createTransferSlice(set, get),
  ...createSettlementSlice(set, get),
  ...createItemStatusSlice(set, get),
  ...createChannelsSlice(set, get),
  ...createHydrationSlice(set, get),
  ...createRealtimeSlice(set, get),
}));
