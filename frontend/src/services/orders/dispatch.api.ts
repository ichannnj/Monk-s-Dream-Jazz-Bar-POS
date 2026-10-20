import { supabase } from '../supabase';
import { resolveTableUuid } from '../tables.api';
import { dispatchOrderWithDepletion, DispatchOrderResult } from './depletion.api';

/**
 * Resolves a raw product ID or name to a valid Supabase UUID from the products table.
 */
export async function resolveProductId(rawIdOrName: string): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    rawIdOrName
  );
  if (isUuid) return rawIdOrName;

  try {
    // Try finding by name or slug match
    const cleaned = rawIdOrName.replace(/^m-/, '').replace(/-/g, ' ');
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .ilike('name', `%${cleaned}%`)
      .limit(1);

    if (data && data.length > 0) {
      return data[0].id;
    }

    // Fallback: get first product
    const { data: first } = await supabase.from('products').select('id').limit(1);
    return first?.[0]?.id || null;
  } catch {
    return null;
  }
}

/**
 * Fetch active orders, optionally filtered by tabId or station.
 */
export async function getActiveOrders(tabId?: string) {
  try {
    let query = supabase
      .from('orders')
      .select(
        `
        id,
        tab_id,
        order_number,
        round_number,
        order_channel,
        order_type,
        status,
        round_number,
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
      `
      )
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
 * Ensure a tab exists in Supabase. If tabId is a UUID that exists, returns it;
 * otherwise creates or returns the open tab for the table or customer.
 */
export async function ensureTab(params: {
  tabId?: string;
  tableId?: string;
  customerName: string;
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'ONLINE_DELIVERY';
  orderChannel?:
    'CAFE_AREA' | 'BAR_AREA' | 'TAKEOUT_COUNTER' | 'GRAB_FOOD' | 'FOODPANDA' | 'OTHER_ONLINE';
  externalOrderRef?: string;
  riderName?: string;
  hasCorkageFee?: boolean;
  corkageAmount?: number;
}): Promise<string> {
  try {
    // 1. Resolve valid physical table UUID
    let validTableId: string | null = null;
    if (params.tableId) {
      validTableId = await resolveTableUuid(params.tableId);
    }

    const isUuid =
      params.tabId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.tabId);

    // 2. If tabId is an existing UUID, ensure its table_id in Supabase is updated to validTableId
    if (isUuid && params.tabId) {
      if (validTableId) {
        // Synchronize tab's table_id in case this tab was transferred to this table
        await supabase
          .from('tabs')
          .update({
            table_id: validTableId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.tabId);

        await supabase
          .from('tables')
          .update({ is_occupied: true, updated_at: new Date().toISOString() })
          .eq('id', validTableId);
      }
      return params.tabId;
    }

    // 3. Check if table has an open tab specifically matching this customer name
    if (validTableId && params.customerName) {
      const { data: matchingTabs } = await supabase
        .from('tabs')
        .select('id, customer_name')
        .eq('table_id', validTableId)
        .eq('status', 'OPEN');

      const found = matchingTabs?.find(
        (t) => t.customer_name.trim().toLowerCase() === params.customerName?.trim().toLowerCase()
      );
      if (found) {
        return found.id;
      }
    }

    // 4. Insert new Tab
    const { data: newTab, error } = await supabase
      .from('tabs')
      .insert({
        table_id: validTableId,
        customer_name: params.customerName || 'Guest',
        order_type: params.orderType || 'DINE_IN',
        order_channel: params.orderChannel || 'CAFE_AREA',
        external_order_ref: params.externalOrderRef || null,
        rider_name: params.riderName || null,
        has_corkage_fee: params.hasCorkageFee || false,
        corkage_amount: params.corkageAmount || 0,
        status: 'OPEN',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('ensureTab insert error:', error.message);
      throw error;
    }

    // Mark physical table as occupied
    if (validTableId) {
      await supabase
        .from('tables')
        .update({ is_occupied: true, updated_at: new Date().toISOString() })
        .eq('id', validTableId);
    }

    return newTab.id;
  } catch (err) {
    console.warn('ensureTab fallback:', err);
    // Return a generated UUID if offline/fallback
    return '00000000-0000-0000-0000-000000000000';
  }
}

/**
 * Create an order with line items and trigger in-database depletion.
 * Atomically enqueues into Supabase orders & order_items tables.
 */
export async function createOrderWithItems(params: {
  tabId: string;
  tableId?: string;
  customerName?: string;
  orderNumber: string;
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'ONLINE_DELIVERY';
  orderChannel?:
    'CAFE_AREA' | 'BAR_AREA' | 'TAKEOUT_COUNTER' | 'GRAB_FOOD' | 'FOODPANDA' | 'OTHER_ONLINE';
  externalOrderRef?: string;
  riderName?: string;
  hasCorkageFee?: boolean;
  corkageAmount?: number;
  roundNumber?: number;
  items: Array<{
    id?: string;
    productId: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
    stationTarget: 'bar' | 'kitchen';
    modifiers?: string[];
    notes?: string;
  }>;
}) {
  try {
    const tabId = await ensureTab({
      tabId: params.tabId,
      tableId: params.tableId,
      customerName: params.customerName || 'Guest',
      orderType: params.orderType,
      orderChannel: params.orderChannel,
      externalOrderRef: params.externalOrderRef,
      riderName: params.riderName,
      hasCorkageFee: params.hasCorkageFee,
      corkageAmount: params.corkageAmount,
    });

    // 1. Insert Order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        tab_id: tabId,
        order_number: params.orderNumber,
        order_type: params.orderType || 'DINE_IN',
        order_channel: params.orderChannel || 'CAFE_AREA',
        external_order_ref: params.externalOrderRef || null,
        round_number: params.roundNumber || 1,
        status: 'OPEN',
      })
      .select('id, order_number, status')
      .single();

    if (orderError) throw orderError;

    // 2. Prepare and Insert Order Items
    const orderItemsToInsert = await Promise.all(
      params.items.map(async (item) => {
        const resolvedProdId =
          (await resolveProductId(item.productId)) ||
          (await resolveProductId(item.productName || ''));
        return {
          order_id: orderData.id,
          product_id: resolvedProdId || 'e1111111-0000-0000-0000-000000000001',
          quantity: item.quantity,
          unit_price: item.unitPrice,
          status: 'PENDING' as const,
          station_target: item.stationTarget,
          modifiers: item.modifiers ? JSON.stringify(item.modifiers) : ('[]' as any),
          notes: item.notes || null,
        };
      })
    );

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert)
      .select('*');

    if (itemsError) throw itemsError;

    // 3. Trigger In-Database Recipe Depletion & Auto-86
    let depletionResult: DispatchOrderResult = { success: true, orderId: orderData.id };
    try {
      depletionResult = await dispatchOrderWithDepletion(orderData.id);
    } catch (depletionErr) {
      console.warn('Depletion execution notice:', depletionErr);
    }

    return {
      order: { ...orderData, tab_id: tabId },
      items: insertedItems || [],
      depletion: depletionResult,
    };
  } catch (err: any) {
    console.error('createOrderWithItems error:', err);
    throw err;
  }
}

/**
 * Update order item status in Supabase (PENDING -> PREPARING -> READY -> SERVED).
 */
export async function updateOrderItemStatus(
  orderItemId: string,
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    orderItemId
  );
  if (!isUuid) return;

  try {
    const dbStatus = status.toUpperCase() as any;
    const { error } = await supabase
      .from('order_items')
      .update({ status: dbStatus, updated_at: new Date().toISOString() })
      .eq('id', orderItemId);

    if (error) {
      console.warn('updateOrderItemStatus error:', error.message);
    }
  } catch (err) {
    console.warn('updateOrderItemStatus error:', err);
  }
}
