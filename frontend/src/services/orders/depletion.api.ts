import { supabase } from '../supabase';

export interface DispatchOrderResult {
  success: boolean;
  orderId?: string;
  depletions?: Array<{
    inventoryItemId: string;
    quantityDeducted: number;
    unit: string;
    newStock: number;
  }>;
  auto86Triggered?: string[];
  error?: string;
}

export interface CancelOrderItemResult {
  success: boolean;
  orderItemId?: string;
  restoredStock?: boolean;
  wasteLogged?: boolean;
  error?: string;
}

/**
 * Dispatches an order, executing atomic inventory depletion and Auto-86 updates
 * via PostgreSQL stored procedure `dispatch_order_with_depletion`.
 */
export async function dispatchOrderWithDepletion(orderId: string): Promise<DispatchOrderResult> {
  try {
    const { data, error } = await supabase.rpc('dispatch_order_with_depletion', {
      p_order_id: orderId,
    });

    if (error) {
      throw new Error(error.message || 'Failed to dispatch order with inventory depletion.');
    }

    return (data as any) || { success: true, orderId };
  } catch (err: any) {
    console.error('dispatchOrderWithDepletion error:', err);
    throw err;
  }
}

/**
 * Cancel an order item with stock restoral or waste logging (Phase 2).
 */
export async function cancelOrderItem(
  orderItemId: string,
  staffId: string,
  reason: string
): Promise<CancelOrderItemResult> {
  try {
    const { data, error } = await supabase.rpc('cancel_order_item_with_restoral', {
      p_order_item_id: orderItemId,
      p_staff_id: staffId,
      p_reason: reason,
    });

    if (error) {
      throw new Error(error.message || 'Failed to cancel order item.');
    }

    return (data as any) || { success: true, orderItemId };
  } catch (err: any) {
    console.error('cancelOrderItem error:', err);
    throw err;
  }
}
