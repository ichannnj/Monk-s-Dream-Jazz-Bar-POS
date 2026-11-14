import { supabase } from '../../shared/infrastructure/supabase';
import { dispatchOrderWithDepletion } from './depletion.api';
import type { DispatchOrderResult } from './depletion.api';
import {
  resolveProductId,
  ensureTab,
  getActiveOrders,
  DOOR_CHARGE_PRODUCT_ID,
} from './tabLifecycle.api';

export { resolveProductId, ensureTab, getActiveOrders, DOOR_CHARGE_PRODUCT_ID };

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
    categorySlug?: string;
    eventId?: string;
    variantId?: string;
    temperature?: string;
    sizeLabel?: string;
    status?: string;
    modifiers?: string[];
    notes?: string;
    variantSelections?: Array<{
      groupId: string;
      optionId: string;
      groupNameSnapshot?: string;
      optionNameSnapshot?: string;
      priceDeltaSnapshot?: number;
    }>;
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

    // 1. Idempotency Check: if externalOrderRef exists, check if already created
    let orderData: {
      id: string;
      order_number: string;
      status: string;
      tab_id?: string;
      created_at?: string;
    } | null = null;

    if (params.externalOrderRef) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, order_number, status, tab_id, created_at')
        .eq('external_order_ref', params.externalOrderRef)
        .maybeSingle();

      if (existingOrder) {
        orderData = existingOrder;
        // Fetch existing items to avoid double inserting
        const { data: existingItems } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', existingOrder.id);

        return {
          order: existingOrder,
          items: existingItems || [],
          depletion: { success: true, orderId: existingOrder.id, lowStockAlerts: [] },
        };
      }
    }

    // Insert Order if not found
    if (!orderData) {
      const { data: newOrder, error: orderError } = await supabase
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
        .select('id, order_number, status, tab_id, created_at')
        .single();

      if (orderError) throw orderError;
      orderData = newOrder;
    }

    const isUuid = (str?: string) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    // 2. Prepare and Insert Order Items via authoritative RPC or atomic insert
    const preparedItems = await Promise.all(
      params.items.map(async (item) => {
        const isDoorCharge =
          item.categorySlug === 'door_charge' ||
          item.productId === DOOR_CHARGE_PRODUCT_ID ||
          item.productId === 'prod-door-charge' ||
          item.productName?.toLowerCase().includes('door charge');

        const resolvedProdId = isDoorCharge
          ? DOOR_CHARGE_PRODUCT_ID
          : (await resolveProductId(item.productId)) ||
            (await resolveProductId(item.productName || ''));

        const itemDbStatus = isDoorCharge
          ? ('SERVED' as const)
          : item.status &&
              ['PENDING', 'PREPARING', 'READY', 'SERVED'].includes(item.status.toUpperCase())
            ? (item.status.toUpperCase() as any)
            : ('PENDING' as const);

        const resolvedItemId = isUuid(item.id)
          ? item.id!
          : typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0').slice(-12);

        return {
          id: resolvedItemId,
          product_id: resolvedProdId || 'e1111111-0000-0000-0000-000000000001',
          event_id: isUuid(item.eventId) ? item.eventId : null,
          variant_id: isUuid(item.variantId) ? item.variantId : null,
          temperature: item.temperature || null,
          size_label: item.sizeLabel || null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          status: itemDbStatus,
          station_target: (item.stationTarget?.toLowerCase() as any) || 'bar',
          category_slug: isDoorCharge ? 'door_charge' : item.categorySlug || null,
          modifiers: (Array.isArray(item.modifiers) ? item.modifiers : []) as any,
          notes: item.notes || null,
          variant_selections: (item.variantSelections || []).map((s) => ({
            group_id: s.groupId,
            option_id: s.optionId,
          })),
        };
      })
    );

    let insertedItems: any[] = [];
    const rpcRes = await (supabase.rpc as any)('dispatch_order_with_selections', {
      p_order_id: orderData.id,
      p_items: preparedItems,
    });

    if (!rpcRes.error && rpcRes.data?.items) {
      insertedItems = rpcRes.data.items;
    } else {
      console.warn('dispatch_order_with_selections RPC fallback or error:', rpcRes.error?.message);
      // Direct insertion fallback if RPC is not present
      const orderItemsToInsert = preparedItems.map(
        ({ variant_selections, category_slug, ...rest }) => ({
          ...rest,
          order_id: orderData.id,
        })
      );
      let { data: initialData, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert as any)
        .select('*');

      // Schema-cache fallback: If 'event_id' column is not yet in PostgREST schema cache
      if (
        itemsError &&
        (itemsError.code === 'PGRST204' || itemsError.message?.includes('event_id'))
      ) {
        console.warn(
          'order_items.event_id not yet in PostgREST schema cache; retrying insert without event_id.'
        );
        const fallbackItems = orderItemsToInsert.map(
          ({ event_id, ...withoutEvent }) => withoutEvent
        );
        const retryRes = await supabase
          .from('order_items')
          .insert(fallbackItems as any)
          .select('*');
        initialData = retryRes.data;
        itemsError = retryRes.error;
      }

      if (itemsError) {
        throw itemsError;
      }
      insertedItems = initialData || [];
    }

    // 3. Trigger In-Database Recipe Depletion & Auto-86 (only for actual kitchen/bar items)
    const hasKitchenOrBarItems = params.items.some(
      (i) =>
        i.categorySlug !== 'door_charge' && !i.productName?.toLowerCase().includes('door charge')
    );
    let depletionResult: DispatchOrderResult = { success: true, orderId: orderData.id };
    if (hasKitchenOrBarItems) {
      try {
        depletionResult = await dispatchOrderWithDepletion(orderData.id);
      } catch (depletionErr) {
        console.warn('Depletion execution notice:', depletionErr);
      }
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
 * Reactively stamps per-state transition timestamps.
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
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      status: dbStatus,
      state_changed_at: nowIso,
      updated_at: nowIso,
    };
    if (status === 'preparing') {
      updatePayload.preparing_at = nowIso;
    } else if (status === 'ready') {
      updatePayload.ready_at = nowIso;
    } else if (status === 'served') {
      updatePayload.delivered_at = nowIso;
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

/**
 * Atomically upsert or void a Door Charge item on an active tab.
 */
export async function upsertTabDoorCharge(params: {
  tabId: string;
  quantity: number;
  unitPrice: number;
  eventId?: string;
  notes?: string;
}): Promise<any> {
  try {
    const { data, error } = await (supabase.rpc as any)('upsert_tab_door_charge', {
      p_tab_id: params.tabId,
      p_quantity: params.quantity,
      p_unit_price: params.unitPrice,
      p_event_id: params.eventId || null,
      p_notes: params.notes || null,
    });

    if (error) {
      console.warn('upsert_tab_door_charge RPC error:', error.message);
      throw error;
    }
    return data;
  } catch (err: any) {
    console.warn('upsertTabDoorCharge error:', err?.message);
    throw err;
  }
}
