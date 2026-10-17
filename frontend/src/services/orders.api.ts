/**
 * Orders & Kitchen/Bar Dispatch API
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 */
import { supabase } from './supabase';

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

export class OrdersApi {
  /**
   * Dispatches an order, executing atomic inventory depletion and Auto-86 updates
   * via PostgreSQL stored procedure `dispatch_order_with_depletion`.
   */
  async dispatchOrderWithDepletion(orderId: string): Promise<DispatchOrderResult> {
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
   * Fetch active orders, optionally filtered by tabId or station.
   */
  async getActiveOrders(tabId?: string) {
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          tab_id,
          order_number,
          order_channel,
          order_type,
          status,
          created_at,
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            status,
            station_target,
            notes,
            is_depleted
          )
        `)
        .neq('status', 'CANCELLED');

      if (tabId) {
        query = query.eq('tab_id', tabId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (err) {
      console.warn('getActiveOrders fallback / error:', err);
      return [];
    }
  }

  /**
   * Cancel an order item with stock restoral or waste logging (Phase 2).
   */
  async cancelOrderItem(
    orderItemId: string,
    staffId: string,
    reason: string
  ): Promise<CancelOrderItemResult> {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .update({ status: 'CANCELLED', notes: `Void reason: ${reason}` })
        .eq('id', orderItemId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return { success: true, orderItemId: data.id };
    } catch (err: any) {
      console.error('cancelOrderItem error:', err);
      throw err;
    }
  }
}

export const ordersApi = new OrdersApi();
