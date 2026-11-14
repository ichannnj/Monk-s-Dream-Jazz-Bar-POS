/**
 * Orders & Kitchen/Bar Dispatch API
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 */

import { dispatchOrderWithDepletion, cancelOrderItem } from './depletion.api';
import type { DispatchOrderResult, CancelOrderItemResult } from './depletion.api';
import {
  resolveProductId,
  getActiveOrders,
  ensureTab,
  createOrderWithItems,
  updateOrderItemStatus,
  upsertTabDoorCharge,
} from './dispatch.api';

export class OrdersApi {
  dispatchOrderWithDepletion = dispatchOrderWithDepletion;
  cancelOrderItem = cancelOrderItem;
  resolveProductId = resolveProductId;
  getActiveOrders = getActiveOrders;
  ensureTab = ensureTab;
  createOrderWithItems = createOrderWithItems;
  updateOrderItemStatus = updateOrderItemStatus;
  upsertTabDoorCharge = upsertTabDoorCharge;
}

export const ordersApi = new OrdersApi();

export {
  dispatchOrderWithDepletion,
  cancelOrderItem,
  resolveProductId,
  getActiveOrders,
  ensureTab,
  createOrderWithItems,
  updateOrderItemStatus,
  upsertTabDoorCharge,
};
export type { DispatchOrderResult, CancelOrderItemResult };
