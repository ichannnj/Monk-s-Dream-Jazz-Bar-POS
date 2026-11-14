import { supabase } from '../../shared/infrastructure/supabase';
import type { TablesInsert, Enums, Json } from '@monks/shared';
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
  id?: string;
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

    const insertPayload: TablesInsert<'tabs'> = {
      table_id: validTableId,
      customer_name: params.customerName || 'Guest',
      order_type: params.orderType || 'DINE_IN',
      order_channel: params.orderChannel || 'CAFE_AREA',
      has_corkage_fee: params.hasCorkageFee || false,
      corkage_amount: params.corkageAmount || 0,
      opened_by_id: params.openedById || null,
      operating_mode: effectiveMode,
      status: 'OPEN',
      ...(params.id ? { id: params.id } : {}),
    };

    const { data, error } = await supabase.from('tabs').insert(insertPayload).select('id').single();

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
    interface SettleTabRpcArgs {
      p_tab_id: string;
      p_staff_id?: string | null;
      p_payment_method: Enums<'payment_method'>;
      p_amount: number;
      p_corkage_amount?: number;
      p_discount_amount?: number;
      p_tip_amount?: number;
      p_notes?: string | null;
      p_keep_open_for_prep?: boolean;
      p_payment_channel?: string | null;
      p_reference_number?: string | null;
      p_service_charge?: number;
      p_vatable_sales?: number | null;
      p_vat_amount?: number | null;
      p_vat_exempt_sales?: number | null;
      p_discount_type?: string | null;
      p_senior_pwd_id?: string | null;
      p_senior_pwd_name?: string | null;
      p_tendered_amount?: number | null;
      p_drawer_target?: string | null;
      p_should_print_receipt?: boolean;
      p_tenders?: Json | null;
    }

    const rpcPayload: SettleTabRpcArgs = {
      p_tab_id: params.tabId,
      p_staff_id: params.staffId || null,
      p_payment_method: params.paymentMethod,
      p_amount: params.amount,
      p_corkage_amount: params.corkageAmount || 0,
      p_discount_amount: params.discountAmount || 0,
      p_tip_amount: params.tipAmount || 0,
      p_notes: params.notes || null,
      p_keep_open_for_prep: Boolean(params.keepOpenForPrep),
      p_payment_channel: params.paymentChannel || null,
      p_reference_number: params.referenceNumber || null,
      p_service_charge: params.serviceCharge || 0,
      p_vatable_sales: params.vatableSales ?? null,
      p_vat_amount: params.vatAmount ?? null,
      p_vat_exempt_sales: params.vatExemptSales ?? null,
      p_discount_type: params.discountType || null,
      p_senior_pwd_id: params.seniorPwdId || null,
      p_senior_pwd_name: params.seniorPwdName || null,
      p_tendered_amount: params.tenderedAmount ?? null,
      p_drawer_target: params.drawerTarget || null,
      p_should_print_receipt: params.shouldPrintReceipt !== false,
      p_tenders: params.tenders ? (params.tenders as unknown as Json) : null,
    };

    let { data, error } = await supabase.rpc(
      'settle_tab_and_record_payment' as never,
      rpcPayload as never
    );

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

      const retry = await supabase.rpc(
        'settle_tab_and_record_payment' as never,
        restPayload as never
      );
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw new Error(error.message || 'Failed to settle tab and record payment.');
    }

    realtimeGateway.broadcastPosSync('payment_settled');

    return (data as unknown as { success: boolean }) || { success: true };
  } catch (err: unknown) {
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
    const { data, error } = await supabase.rpc(
      'complete_off_premise_tab' as never,
      {
        p_tab_id: params.tabId,
        p_staff_id: params.staffId || null,
      } as never
    );

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
    return (data as unknown as { success: boolean }) || { success: true };
  } catch (err: unknown) {
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
      const { data, error } = await supabase.rpc('transfer_order_items_to_tab', {
        p_source_tab_id: params.sourceTabId,
        p_target_tab_id: params.targetTabId || undefined,
        p_table_id: resolvedTableId || undefined,
        p_new_tab_name: params.newTabName || undefined,
        p_item_transfers: params.itemTransfers.map((i) => ({
          order_item_id: i.orderItemId,
          quantity: i.quantity,
        })),
        p_staff_id: params.staffId || undefined,
      });

      if (error) {
        console.warn('transfer_order_items_to_tab RPC warning:', error.message);
      } else {
        realtimeGateway.broadcastPosSync('tab_items_transferred');
        return (data as unknown as { success: boolean; targetTabId?: string }) || { success: true };
      }
    }

    realtimeGateway.broadcastPosSync('tab_items_transferred');
    return { success: true };
  } catch (err: unknown) {
    console.error('transferOrderItemsToTab error:', err);
    return { success: false };
  }
}
