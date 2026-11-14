import { supabase } from '../../shared/infrastructure/supabase';
import { resolveTableUuid } from '../../floor/data/resolver';
import { realtimeGateway } from '../../shared/infrastructure/realtime';

export async function openTab(params: {
  tableId: string;
  customerName: string;
  guestCount?: number;
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'ONLINE_DELIVERY';
  orderChannel?: 'CAFE_AREA' | 'BAR_AREA';
}): Promise<{ id: string; customerName: string; tableId: string }> {
  try {
    const validTableId = await resolveTableUuid(params.tableId);

    const { data, error } = await supabase
      .from('tabs')
      .insert({
        table_id: validTableId,
        customer_name: params.customerName.trim() || 'Guest',
        order_type: params.orderType || 'DINE_IN',
        order_channel: params.orderChannel || 'CAFE_AREA',
        status: 'OPEN',
      })
      .select('id, customer_name, table_id')
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to open customer tab.');
    }

    // Mark physical table as occupied
    if (validTableId) {
      await supabase
        .from('tables')
        .update({ is_occupied: true, updated_at: new Date().toISOString() })
        .eq('id', validTableId);
    }

    realtimeGateway.broadcastPosSync('tab_opened');

    return {
      id: data.id,
      customerName: data.customer_name,
      tableId: data.table_id || validTableId || params.tableId,
    };
  } catch (err) {
    console.error('openTab error:', err);
    throw err;
  }
}

export async function createTab(params: {
  tableId?: string;
  customerName: string;
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'ONLINE_DELIVERY';
  orderChannel?:
    'CAFE_AREA' | 'BAR_AREA' | 'TAKEOUT_COUNTER' | 'GRAB_FOOD' | 'FOODPANDA' | 'OTHER_ONLINE';
  hasCorkageFee?: boolean;
  corkageAmount?: number;
  openedById?: string;
  operatingMode?: 'CAFE' | 'EVENT';
}): Promise<{ id: string } | null> {
  try {
    const validTableId = params.tableId ? await resolveTableUuid(params.tableId) : null;
    const effectiveMode = params.operatingMode || 'CAFE';

    const { data, error } = await supabase
      .from('tabs')
      .insert({
        table_id: validTableId,
        customer_name: params.customerName || 'Guest',
        order_type: params.orderType || 'DINE_IN',
        order_channel: (params.orderChannel || 'CAFE_AREA') as any,
        has_corkage_fee: params.hasCorkageFee || false,
        corkage_amount: params.corkageAmount || 0,
        opened_by_id: params.openedById || null,
        operating_mode: effectiveMode,
        status: 'OPEN',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('createTab insert error:', error.message);
      throw error;
    }

    if (validTableId) {
      await supabase
        .from('tables')
        .update({ is_occupied: true, updated_at: new Date().toISOString() })
        .eq('id', validTableId);
    }

    realtimeGateway.broadcastPosSync('tab_created');

    return data;
  } catch (err) {
    console.warn('createTab fallback:', err);
    return null;
  }
}

export async function settleTabAndRecordPayment(params: {
  tabId: string;
  staffId?: string;
  paymentMethod:
    'CASH' | 'CARD' | 'DIGITAL_WALLET' | 'GRAB_PAY_IN_APP' | 'FOODPANDA_IN_APP' | 'COMP';
  amount: number;
  corkageAmount?: number;
  discountAmount?: number;
  tipAmount?: number;
  notes?: string;
  keepOpenForPrep?: boolean;
  paymentChannel?: string;
  referenceNumber?: string;
  serviceCharge?: number;
  vatableSales?: number;
  vatAmount?: number;
  vatExemptSales?: number;
  discountType?: string;
  seniorPwdId?: string;
  seniorPwdName?: string;
  tenderedAmount?: number;
  drawerTarget?: 'main' | 'bar';
  shouldPrintReceipt?: boolean;
  tenders?: Array<{
    payment_method: string;
    amount: number;
    tendered_amount?: number;
    payment_channel?: string;
    reference_number?: string;
    notes?: string;
  }>;
}) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    params.tabId
  );
  if (!isUuid) {
    console.warn('settleTabAndRecordPayment skipped for non-UUID tab:', params.tabId);
    return { success: true };
  }

  try {
    const rpcPayload: Record<string, any> = {
      p_tab_id: params.tabId,
      p_staff_id: (params.staffId || null) as any,
      p_payment_method: params.paymentMethod,
      p_amount: params.amount,
      p_corkage_amount: params.corkageAmount || 0,
      p_discount_amount: params.discountAmount || 0,
      p_tip_amount: params.tipAmount || 0,
      p_notes: (params.notes || null) as any,
      p_keep_open_for_prep: Boolean(params.keepOpenForPrep),
      p_payment_channel: (params.paymentChannel || null) as any,
      p_reference_number: (params.referenceNumber || null) as any,
      p_service_charge: params.serviceCharge || 0,
      p_vatable_sales: params.vatableSales ?? null,
      p_vat_amount: params.vatAmount ?? null,
      p_vat_exempt_sales: params.vatExemptSales ?? null,
      p_discount_type: (params.discountType || null) as any,
      p_senior_pwd_id: (params.seniorPwdId || null) as any,
      p_senior_pwd_name: (params.seniorPwdName || null) as any,
      p_tendered_amount: params.tenderedAmount ?? null,
      p_drawer_target: (params.drawerTarget || null) as any,
      p_should_print_receipt: params.shouldPrintReceipt !== false,
      p_tenders: params.tenders ? (params.tenders as any) : null,
    };

    let { data, error } = await (supabase.rpc as any)('settle_tab_and_record_payment', rpcPayload);

    if (
      error &&
      (error.message?.includes('p_tenders') ||
        error.message?.includes('p_tendered_amount') ||
        error.message?.includes('p_drawer_target') ||
        error.message?.includes('p_service_charge'))
    ) {
      // Fallback if latest migration parameters not yet updated
      const {
        p_tenders: _pt,
        p_tendered_amount: _ta,
        p_drawer_target: _dtg,
        p_should_print_receipt: _spr,
        ...restPayload
      } = rpcPayload;

      const retry = await (supabase.rpc as any)('settle_tab_and_record_payment', restPayload);
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw new Error(error.message || 'Failed to settle tab and record payment.');
    }

    realtimeGateway.broadcastPosSync('payment_settled');

    return (data as any) || { success: true };
  } catch (err: any) {
    console.error('settleTabAndRecordPayment error:', err);
    throw err;
  }
}

export async function completeOffPremiseTab(params: { tabId: string; staffId?: string }) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    params.tabId
  );
  if (!isUuid) {
    return { success: true };
  }

  try {
    const { data, error } = await (supabase.rpc as any)('complete_off_premise_tab', {
      p_tab_id: params.tabId,
      p_staff_id: params.staffId || null,
    });

    if (error) {
      // Fallback direct update if RPC is not yet deployed
      await supabase
        .from('tabs')
        .update({ status: 'BILLED', updated_at: new Date().toISOString() })
        .eq('id', params.tabId);
      await supabase
        .from('orders')
        .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
        .eq('tab_id', params.tabId);
      realtimeGateway.broadcastPosSync('tab_completed');
      return { success: true };
    }

    realtimeGateway.broadcastPosSync('tab_completed');
    return data || { success: true };
  } catch (err) {
    console.warn('completeOffPremiseTab error:', err);
    return { success: false };
  }
}

export async function transferOrderItemsToTab(params: {
  sourceTabId: string;
  targetTabId?: string;
  tableId?: string;
  newTabName?: string;
  itemTransfers: Array<{ orderItemId: string; quantity: number }>;
  staffId?: string;
}): Promise<{ success: boolean; sourceTabId?: string; targetTabId?: string }> {
  try {
    const isSourceUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.sourceTabId
    );

    let resolvedTableId = params.tableId;
    if (resolvedTableId) {
      resolvedTableId = (await resolveTableUuid(resolvedTableId)) || undefined;
    }

    if (isSourceUuid) {
      const { data, error } = await (supabase.rpc as any)('transfer_order_items_to_tab', {
        p_source_tab_id: params.sourceTabId,
        p_target_tab_id: params.targetTabId || null,
        p_table_id: resolvedTableId || null,
        p_new_tab_name: params.newTabName || null,
        p_item_transfers: params.itemTransfers.map((i) => ({
          order_item_id: i.orderItemId,
          quantity: i.quantity,
        })),
        p_staff_id: params.staffId || null,
      });

      if (error) {
        console.warn('transfer_order_items_to_tab RPC warning:', error.message);
      } else {
        realtimeGateway.broadcastPosSync('tab_items_transferred');
        return data || { success: true };
      }
    }

    realtimeGateway.broadcastPosSync('tab_items_transferred');
    return { success: true };
  } catch (err) {
    console.error('transferOrderItemsToTab error:', err);
    return { success: false };
  }
}
