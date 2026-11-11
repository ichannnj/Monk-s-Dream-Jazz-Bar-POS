import { supabase } from '../../shared/infrastructure/supabase';

export interface LowStockAlertPayload {
  inventoryItemId: string;
  ingredientName: string;
  productName: string;
  currentStock: number;
  minAlertLevel: number;
  unit: string;
  isDepleted: boolean;
}

export interface DispatchOrderResult {
  success: boolean;
  orderId?: string;
  depletedItems?: number;
  depletions?: Array<{
    inventoryItemId: string;
    quantityDeducted: number;
    unit: string;
    newStock: number;
  }>;
  lowStockAlerts?: LowStockAlertPayload[];
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
    // Attempt 1: Call canonical RPC signature (p_order_item_id, p_reason, p_staff_id)
    let { data, error } = await supabase.rpc('cancel_order_item_with_restoral', {
      p_order_item_id: orderItemId,
      p_reason: reason,
      p_staff_id: staffId,
    });

    // Attempt 2: If ambiguous candidate error occurred, try legacy parameter order
    if (error && error.message?.includes('best candidate function')) {
      const altRpc = await supabase.rpc('cancel_order_item_with_restoral', {
        p_order_item_id: orderItemId,
        p_staff_id: staffId,
        p_reason: reason,
      });
      data = altRpc.data;
      error = altRpc.error;
    }

    // Attempt 3: Direct table fallback if PostgREST RPC is ambiguous or fails
    if (error) {
      console.warn(
        'cancel_order_item_with_restoral RPC error, using direct order_items update fallback:',
        error.message
      );
      const { error: directErr } = await (supabase.from as any)('order_items')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderItemId);

      if (directErr) {
        throw new Error(directErr.message || error.message || 'Failed to cancel order item.');
      }
      return { success: true, orderItemId };
    }

    return (data as any) || { success: true, orderItemId };
  } catch (err: any) {
    console.error('cancelOrderItem error:', err);
    throw err;
  }
}
