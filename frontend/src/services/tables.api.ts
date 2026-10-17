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
        .select(`
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
        `)
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
}

export const tablesApi = new TablesApi();
