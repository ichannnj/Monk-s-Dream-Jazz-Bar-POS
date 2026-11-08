import { supabase } from '@/features/shared/infrastructure/supabase';
import type {
  ReadingData,
  ZReadingRecord,
  YReadingRecord,
  ShiftVariancePoint,
} from './readings.types';
import { mapReadingData, mapZReadingRecord, mapYReadingRecord } from './readingMappers';

export * from './readings.types';

export const readingsApi = {
  /**
   * Fetches the current, non-destructive X-Reading calculation directly from Postgres RPC.
   * @param drawer Till target ('consolidated' | 'main' | 'bar')
   * @param scope 'day' for full business day (Z/X), 'shift' for cashier handover (Y)
   */
  async fetchCurrentXReading(
    drawer: 'consolidated' | 'main' | 'bar' = 'consolidated',
    scope: 'day' | 'shift' = 'day'
  ): Promise<ReadingData> {
    const { data, error } = await (supabase.rpc as any)('get_current_x_reading', {
      p_drawer: drawer,
      p_scope: scope,
    });

    if (error) {
      console.error('[readingsApi] fetchCurrentXReading error:', error);
      throw error;
    }

    return mapReadingData(data);
  },

  /**
   * Safety Guard: Checks for unsettled/active open tabs before shift closing.
   */
  async checkUnsettledTabs(
    drawer: 'consolidated' | 'main' | 'bar' = 'consolidated'
  ): Promise<{ open_tab_count: number; open_tabs: any[] }> {
    const { data, error } = await (supabase.rpc as any)('check_unsettled_tabs', {
      p_drawer: drawer,
    });

    if (error) {
      console.error('[readingsApi] checkUnsettledTabs error:', error);
      return { open_tab_count: 0, open_tabs: [] };
    }

    return {
      open_tab_count: Number(data?.open_tab_count || 0),
      open_tabs: data?.open_tabs || [],
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

    return (data || []).map(mapZReadingRecord);
  },

  /**
   * Fetches all official historical Y-Readings (Shift Handovers).
   */
  async fetchYReadingHistory(): Promise<YReadingRecord[]> {
    const { data, error } = await (supabase.from as any)('pos_y_readings')
      .select('*')
      .order('closed_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[readingsApi] fetchYReadingHistory error:', error);
      throw error;
    }

    return (data || []).map(mapYReadingRecord);
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

    return mapZReadingRecord(data);
  },

  /**
   * Closes staff shift, reconciles physical cash, and records permanent Y-Reading (Handover).
   */
  async closeShiftAndGenerateYReading(params: {
    drawer: 'consolidated' | 'main' | 'bar';
    countedCash: number;
    outgoingStaffId?: string | null;
    incomingStaffName?: string;
    notes?: string;
  }): Promise<YReadingRecord> {
    const { data, error } = await (supabase.rpc as any)('close_shift_and_generate_y_reading', {
      p_drawer: params.drawer,
      p_counted_cash: params.countedCash,
      p_outgoing_staff_id: params.outgoingStaffId || null,
      p_incoming_staff_name: params.incomingStaffName || 'Incoming Staff',
      p_notes: params.notes || null,
    });

    if (error) {
      console.error('[readingsApi] closeShiftAndGenerateYReading error:', error);
      throw error;
    }

    return mapYReadingRecord(data);
  },

  /**
   * Fetches unified shift variance history combining recent Z and Y readings.
   */
  async fetchShiftVarianceHistory(): Promise<ShiftVariancePoint[]> {
    const [zReadings, yReadings] = await Promise.all([
      readingsApi.fetchZReadingHistory(),
      readingsApi.fetchYReadingHistory(),
    ]);

    const unified: ShiftVariancePoint[] = [
      ...zReadings.map((z) => ({
        id: z.id,
        type: 'Z' as const,
        number: z.z_number,
        date: new Date(z.closed_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        timestamp: z.closed_at,
        expected: z.expected_cash,
        counted: z.counted_cash,
        variance: z.variance,
        drawer: z.drawer_target,
        staffName: z.performed_by_name,
      })),
      ...yReadings.map((y) => ({
        id: y.id,
        type: 'Y' as const,
        number: y.y_number,
        date: new Date(y.closed_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        timestamp: y.closed_at,
        expected: y.expected_cash,
        counted: y.counted_cash,
        variance: y.variance,
        drawer: y.drawer_target,
        staffName: y.outgoing_staff_name,
      })),
    ];

    // Sort chronologically ascending for trend visualization
    return unified
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-14);
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
