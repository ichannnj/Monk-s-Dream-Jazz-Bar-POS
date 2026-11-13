import { supabase } from '../../shared/infrastructure/supabase';
import { resolveTableUuid } from '../../floor/data/resolver';

export const DOOR_CHARGE_PRODUCT_ID = 'd1000001-0000-0000-0000-000000000001';

/**
 * Resolves a raw product ID or name to a valid Supabase UUID from the products table.
 */
export async function resolveProductId(rawIdOrName: string): Promise<string | null> {
  if (!rawIdOrName) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    rawIdOrName
  );
  if (isUuid) return rawIdOrName;

  // Explicit mapping for Event Door Charge
  const lower = rawIdOrName.toLowerCase();
  if (
    lower === 'prod-door-charge' ||
    lower === 'door_charge' ||
    lower === 'door-charge' ||
    lower.includes('door charge')
  ) {
    return DOOR_CHARGE_PRODUCT_ID;
  }

  try {
    const cleaned = rawIdOrName.replace(/^m-/, '').replace(/-/g, ' ').trim();
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .ilike('name', `%${cleaned}%`)
      .limit(1);

    if (data && data.length > 0) {
      return data[0].id;
    }

    return null;
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
  isPrepaid?: boolean;
  notes?: string;
  ticketNumber?: string;
  operatingMode?: 'CAFE' | 'EVENT';
  openedById?: string;
}): Promise<string> {
  try {
    let validTableId: string | null = null;
    if (params.tableId) {
      validTableId = await resolveTableUuid(params.tableId);
    }

    const isUuid =
      params.tabId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.tabId);

    if (isUuid && params.tabId) {
      if (validTableId) {
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

    const baseTabPayload: Record<string, any> = {
      table_id: validTableId,
      customer_name: params.customerName || 'Guest',
      order_type: params.orderType || 'DINE_IN',
      order_channel: params.orderChannel || 'CAFE_AREA',
      external_order_ref: params.externalOrderRef || null,
      rider_name: params.riderName || null,
      has_corkage_fee: params.hasCorkageFee || false,
      corkage_amount: params.corkageAmount || 0,
      operating_mode: params.operatingMode || 'CAFE',
      opened_by_id: params.openedById || null,
      status: 'OPEN',
    };

    const extendedTabPayload: Record<string, any> = {
      ...baseTabPayload,
      is_prepaid: params.isPrepaid ?? params.orderType === 'ONLINE_DELIVERY',
      notes: params.notes || null,
      ticket_number: params.ticketNumber || null,
    };

    let { data: newTab, error } = await (supabase.from as any)('tabs')
      .insert(extendedTabPayload)
      .select('id')
      .single();

    if (error) {
      const retry = await supabase
        .from('tabs')
        .insert(baseTabPayload as any)
        .select('id')
        .single();
      newTab = retry.data;
      error = retry.error;
    }

    if (error || !newTab) {
      console.warn('ensureTab insert error:', error?.message);
      throw error;
    }

    if (validTableId) {
      await supabase
        .from('tables')
        .update({ is_occupied: true, updated_at: new Date().toISOString() })
        .eq('id', validTableId);
    }

    return newTab.id;
  } catch (err) {
    console.warn('ensureTab fallback:', err);
    return '00000000-0000-0000-0000-000000000000';
  }
}
