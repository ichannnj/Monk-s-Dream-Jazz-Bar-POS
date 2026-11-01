import { supabase } from '@/features/shared/infrastructure/supabase';

export interface ReadingData {
  reading_type: 'X_READING' | 'Z_READING';
  z_number?: number;
  drawer_target: 'consolidated' | 'main' | 'bar';
  opened_at: string;
  generated_at?: string;
  closed_at?: string;
  performed_by_name?: string;
  gross_sales: number;
  discount_total: number;
  net_sales: number;
  vatable_sales: number;
  vat_amount: number;
  vat_exempt_sales: number;
  service_charge: number;
  tender_cash: number;
  tender_card: number;
  tender_digital: number;
  tender_delivery: number;
  total_tender: number;
  opening_float: number;
  cash_in: number;
  cash_out: number;
  safe_drops: number;
  expected_cash: number;
  counted_cash?: number;
  variance?: number;
  transaction_count: number;
  first_payment_id?: string;
  last_payment_id?: string;
  first_receipt_no: string;
  last_receipt_no: string;
  notes?: string;
}

export interface ZReadingRecord {
  id: string;
  z_number: number;
  drawer_target: 'consolidated' | 'main' | 'bar';
  opened_at: string;
  closed_at: string;
  performed_by: string | null;
  performed_by_name: string;
  gross_sales: number;
  net_sales: number;
  discount_total: number;
  vatable_sales: number;
  vat_amount: number;
  vat_exempt_sales: number;
  service_charge: number;
  tender_cash: number;
  tender_card: number;
  tender_digital: number;
  tender_delivery: number;
  total_tender: number;
  opening_float: number;
  cash_in: number;
  cash_out: number;
  safe_drops: number;
  expected_cash: number;
  counted_cash: number;
  variance: number;
  transaction_count: number;
  first_receipt_no: string | null;
  last_receipt_no: string | null;
  notes: string | null;
  created_at: string;
}

export const readingsApi = {
  /**
   * Fetches the current, non-destructive X-Reading calculation directly from Postgres RPC.
   */
  async fetchCurrentXReading(
    drawer: 'consolidated' | 'main' | 'bar' = 'consolidated'
  ): Promise<ReadingData> {
    const { data, error } = await (supabase.rpc as any)('get_current_x_reading', {
      p_drawer: drawer,
    });

    if (error) {
      console.error('[readingsApi] fetchCurrentXReading error:', error);
      throw error;
    }

    return {
      ...data,
      gross_sales: Number(data.gross_sales || 0),
      discount_total: Number(data.discount_total || 0),
      net_sales: Number(data.net_sales || 0),
      vatable_sales: Number(data.vatable_sales || 0),
      vat_amount: Number(data.vat_amount || 0),
      vat_exempt_sales: Number(data.vat_exempt_sales || 0),
      service_charge: Number(data.service_charge || 0),
      tender_cash: Number(data.tender_cash || 0),
      tender_card: Number(data.tender_card || 0),
      tender_digital: Number(data.tender_digital || 0),
      tender_delivery: Number(data.tender_delivery || 0),
      total_tender: Number(data.total_tender || 0),
      opening_float: Number(data.opening_float || 0),
      cash_in: Number(data.cash_in || 0),
      cash_out: Number(data.cash_out || 0),
      safe_drops: Number(data.safe_drops || 0),
      expected_cash: Number(data.expected_cash || 0),
      transaction_count: Number(data.transaction_count || 0),
    };
  },

  /**
   * Fetches all official historical Z-Readings.
   */
  async fetchZReadingHistory(): Promise<ZReadingRecord[]> {
    const { data, error } = await (supabase.from as any)('pos_z_readings')
      .select('*')
      .order('closed_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[readingsApi] fetchZReadingHistory error:', error);
      throw error;
    }

    return (data || []).map((row: any) => ({
      ...row,
      z_number: Number(row.z_number),
      gross_sales: Number(row.gross_sales || 0),
      net_sales: Number(row.net_sales || 0),
      discount_total: Number(row.discount_total || 0),
      vatable_sales: Number(row.vatable_sales || 0),
      vat_amount: Number(row.vat_amount || 0),
      vat_exempt_sales: Number(row.vat_exempt_sales || 0),
      service_charge: Number(row.service_charge || 0),
      tender_cash: Number(row.tender_cash || 0),
      tender_card: Number(row.tender_card || 0),
      tender_digital: Number(row.tender_digital || 0),
      tender_delivery: Number(row.tender_delivery || 0),
      total_tender: Number(row.total_tender || 0),
      opening_float: Number(row.opening_float || 0),
      cash_in: Number(row.cash_in || 0),
      cash_out: Number(row.cash_out || 0),
      safe_drops: Number(row.safe_drops || 0),
      expected_cash: Number(row.expected_cash || 0),
      counted_cash: Number(row.counted_cash || 0),
      variance: Number(row.variance || 0),
      transaction_count: Number(row.transaction_count || 0),
    }));
  },

  /**
   * Closes active shift, reconciles physical cash, and records permanent Z-Reading.
   */
  async closeShiftAndGenerateZReading(params: {
    drawer: 'consolidated' | 'main' | 'bar';
    countedCash: number;
    performedBy?: string | null;
    notes?: string;
  }): Promise<ZReadingRecord> {
    const { data, error } = await (supabase.rpc as any)('close_shift_and_generate_z_reading', {
      p_drawer: params.drawer,
      p_counted_cash: params.countedCash,
      p_performed_by: params.performedBy || null,
      p_notes: params.notes || null,
    });

    if (error) {
      console.error('[readingsApi] closeShiftAndGenerateZReading error:', error);
      throw error;
    }

    return {
      ...data,
      z_number: Number(data.z_number),
      gross_sales: Number(data.gross_sales || 0),
      net_sales: Number(data.net_sales || 0),
      discount_total: Number(data.discount_total || 0),
      vatable_sales: Number(data.vatable_sales || 0),
      vat_amount: Number(data.vat_amount || 0),
      vat_exempt_sales: Number(data.vat_exempt_sales || 0),
      service_charge: Number(data.service_charge || 0),
      tender_cash: Number(data.tender_cash || 0),
      tender_card: Number(data.tender_card || 0),
      tender_digital: Number(data.tender_digital || 0),
      tender_delivery: Number(data.tender_delivery || 0),
      total_tender: Number(data.total_tender || 0),
      opening_float: Number(data.opening_float || 0),
      cash_in: Number(data.cash_in || 0),
      cash_out: Number(data.cash_out || 0),
      safe_drops: Number(data.safe_drops || 0),
      expected_cash: Number(data.expected_cash || 0),
      counted_cash: Number(data.counted_cash || 0),
      variance: Number(data.variance || 0),
      transaction_count: Number(data.transaction_count || 0),
    };
  },

  /**
   * Enqueues an 80mm thermal slip print job into the print_jobs queue.
   */
  async enqueueThermalPrintJob(reading: ReadingData): Promise<void> {
    const { error } = await supabase.from('print_jobs').insert({
      job_type: reading.reading_type,
      receipt_data: reading as any,
      status: 'PENDING',
    });

    if (error) {
      console.error('[readingsApi] enqueueThermalPrintJob error:', error);
      throw error;
    }
  },
};
