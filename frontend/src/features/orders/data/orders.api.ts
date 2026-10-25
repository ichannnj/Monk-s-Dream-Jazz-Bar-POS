/**
 * Orders & Kitchen/Bar Dispatch API
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 */

import {
  dispatchOrderWithDepletion,
  cancelOrderItem,
  DispatchOrderResult,
  CancelOrderItemResult,
} from './depletion.api';
import {
  resolveProductId,
  getActiveOrders,
  ensureTab,
  createOrderWithItems,
  updateOrderItemStatus,
} from './dispatch.api';

export class OrdersApi {
  dispatchOrderWithDepletion = dispatchOrderWithDepletion;
  cancelOrderItem = cancelOrderItem;
  resolveProductId = resolveProductId;
  getActiveOrders = getActiveOrders;
  ensureTab = ensureTab;
  createOrderWithItems = createOrderWithItems;
  updateOrderItemStatus = updateOrderItemStatus;
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
};
export type { DispatchOrderResult, CancelOrderItemResult };
