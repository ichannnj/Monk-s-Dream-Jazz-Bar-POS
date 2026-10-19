/**
 * Tables & Floor Tabs API
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 */
import { supabase } from './supabase';

export interface TransferTabParams {
  originTableId: string;
  targetTableId: string;
  tabId: string;
  staffId: string;
  reason: string;
}

export interface TransferTabResult {
  success: boolean;
  tabId?: string;
  originTableId?: string;
  targetTableId?: string;
  error?: string;
}

export class TablesApi {
  /**
   * Fetch all floor tables with occupancy status and active tabs.
   */
  async getTables() {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select(
          `
          id,
          table_number,
          capacity,
          is_occupied,
          zone,
          tabs (
            id,
            customer_name,
            status,
            order_type,
            operating_mode
          )
        `
        )
        .order('table_number', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (err) {
      console.warn('getTables error:', err);
      return [];
    }
  }

  /**
   * Immediately open and persist a new customer tab for a table in Supabase.
   */
  async openTab(params: {
    tableId: string;
    customerName: string;
    guestCount?: number;
    orderType?: 'DINE_IN' | 'TAKEOUT' | 'ONLINE_DELIVERY';
    orderChannel?: 'CAFE_AREA' | 'BAR_AREA';
  }): Promise<{ id: string; customerName: string; tableId: string }> {
    try {
      const isTableUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        params.tableId
      );
      let validTableId = params.tableId;
      if (!isTableUuid) {
        const { data } = await supabase
          .from('tables')
          .select('id')
          .or(`table_number.eq.${params.tableId},table_number.eq.Table ${params.tableId}`)
          .limit(1);
        if (data && data.length > 0) validTableId = data[0].id;
      }

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
        tableId: data.table_id || validTableId,
      };
    } catch (err) {
      console.error('openTab error:', err);
      throw err;
    }
  }

  /**
   * Transfer a tab or entire table to a new location.
   * Calls PostgreSQL stored procedure `transfer_table_tab`.
   */
  async transferTableTab(params: TransferTabParams): Promise<TransferTabResult> {
    try {
      const { data, error } = await supabase.rpc('transfer_table_tab', {
        p_origin_table_id: params.originTableId,
        p_target_table_id: params.targetTableId,
        p_tab_id: params.tabId,
        p_staff_id: params.staffId,
        p_reason: params.reason,
      });

      if (error) {
        throw new Error(error.message || 'Failed to transfer table tab.');
      }

      return (data as any) || { success: true };
    } catch (err: any) {
      console.error('transferTableTab error:', err);
      throw err;
    }
  }

  /**
   * Settle a customer tab, record payment, update drawer on cash, and queue customer receipt.
   * Calls PostgreSQL stored procedure `settle_tab_and_record_payment`.
   */
  async settleTabAndRecordPayment(params: {
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

  /**
   * Create and persist a new customer tab for a table.
   */
  async createTab(params: {
    tableId?: string;
    customerName: string;
    orderType?: 'DINE_IN' | 'TAKEOUT' | 'ONLINE_DELIVERY';
    orderChannel?:
      'CAFE_AREA' | 'BAR_AREA' | 'TAKEOUT_COUNTER' | 'GRAB_FOOD' | 'FOODPANDA' | 'OTHER_ONLINE';
    hasCorkageFee?: boolean;
    corkageAmount?: number;
  }): Promise<{ id: string } | null> {
    try {
      let validTableId: string | null = null;
      if (params.tableId) {
        const isTableUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          params.tableId
        );
        if (isTableUuid) {
          validTableId = params.tableId;
        } else {
          const { data: tableData } = await supabase
            .from('tables')
            .select('id')
            .or(`table_number.eq.${params.tableId},table_number.eq.Table ${params.tableId}`)
            .limit(1);
          validTableId = tableData?.[0]?.id || null;
        }
      }

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
}

export const tablesApi = new TablesApi();
