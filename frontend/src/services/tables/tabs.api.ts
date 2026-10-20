import { supabase } from '../supabase';
import { resolveTableUuid } from './resolver';

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
}): Promise<{ id: string } | null> {
  try {
    const validTableId = params.tableId ? await resolveTableUuid(params.tableId) : null;

    const { data, error } = await supabase
      .from('tabs')
      .insert({
        table_id: validTableId,
        customer_name: params.customerName || 'Guest',
        order_type: params.orderType || 'DINE_IN',
        order_channel: (params.orderChannel || 'CAFE_AREA') as any,
        has_corkage_fee: params.hasCorkageFee || false,
        corkage_amount: params.corkageAmount || 0,
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
}) {
  try {
    const { data, error } = await supabase.rpc('settle_tab_and_record_payment', {
      p_tab_id: params.tabId,
      p_staff_id: params.staffId || null,
      p_payment_method: params.paymentMethod,
      p_amount: params.amount,
      p_corkage_amount: params.corkageAmount || 0,
      p_discount_amount: params.discountAmount || 0,
      p_tip_amount: params.tipAmount || 0,
      p_notes: params.notes || null,
    });

    if (error) {
      throw new Error(error.message || 'Failed to settle tab and record payment.');
    }

    return (data as any) || { success: true };
  } catch (err: any) {
    console.error('settleTabAndRecordPayment error:', err);
    throw err;
  }
}
