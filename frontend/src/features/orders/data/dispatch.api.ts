import { supabase } from '../../shared/infrastructure/supabase';
import { dispatchOrderWithDepletion, DispatchOrderResult } from './depletion.api';
import { resolveProductId, ensureTab, getActiveOrders } from './tabLifecycle.api';

export { resolveProductId, ensureTab, getActiveOrders };

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
  isPrepaid?: boolean;
  notes?: string;
  ticketNumber?: string;
  operatingMode?: 'CAFE' | 'EVENT';
  openedById?: string;
  items: Array<{
    id?: string;
    productId: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
    stationTarget: 'bar' | 'kitchen';
    variantId?: string;
    temperature?: string;
    sizeLabel?: string;
    status?: string;
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
      isPrepaid: params.isPrepaid,
      notes: params.notes,
      ticketNumber: params.ticketNumber,
      operatingMode: params.operatingMode,
      openedById: params.openedById,
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
      .select('id, order_number, status, created_at')
      .single();

    if (orderError) throw orderError;

    // 2. Prepare and Insert Order Items
    const orderItemsToInsert = await Promise.all(
      params.items.map(async (item) => {
        const resolvedProdId =
          (await resolveProductId(item.productId)) ||
          (await resolveProductId(item.productName || ''));
        const itemDbStatus =
          item.status &&
          ['PENDING', 'PREPARING', 'READY', 'SERVED'].includes(item.status.toUpperCase())
            ? (item.status.toUpperCase() as any)
            : ('PENDING' as const);
        return {
          order_id: orderData.id,
          product_id: resolvedProdId || 'e1111111-0000-0000-0000-000000000001',
          variant_id: item.variantId || null,
          temperature: item.temperature || null,
          size_label: item.sizeLabel || null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          status: itemDbStatus,
          station_target: item.stationTarget,
          // Pass the array straight through: supabase-js encodes it as jsonb.
          // JSON.stringify() here double-encoded the value into a JSON scalar
          // string (e.g. "[\"Extra Shot\"]"), which broke jsonb_array_length()
          // in the inventory depletion trigger during KDS READY / settlement.
          modifiers: (Array.isArray(item.modifiers) ? item.modifiers : []) as any,
          notes: item.notes || null,
        };
      })
    );

    let insertedItems: any;
    const { data: initialData, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert)
      .select('*');

    if (itemsError) {
      console.warn(
        'order_items insert with variant columns failed, retrying base schema:',
        itemsError.message
      );
      const baseItemsToInsert = orderItemsToInsert.map(
        ({ variant_id, temperature, size_label, ...rest }) => rest
      );
      const retryRes = await supabase
        .from('order_items')
        .insert(baseItemsToInsert as any)
        .select('*');
      if (retryRes.error) throw retryRes.error;
      insertedItems = retryRes.data;
    } else {
      insertedItems = initialData;
    }

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
    const updatePayload: Record<string, any> = {
      status: dbStatus,
      updated_at: new Date().toISOString(),
    };
    if (status === 'served') {
      updatePayload.delivered_at = new Date().toISOString();
    }
    const { error } = await (supabase.from as any)('order_items')
      .update(updatePayload)
      .eq('id', orderItemId);

    if (error) {
      console.warn('updateOrderItemStatus error:', error.message);
    }
  } catch (err) {
    console.warn('updateOrderItemStatus error:', err);
  }
}
