import { supabase } from '@/features/shared/infrastructure/supabase';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';
import { toBusinessDate, toManilaHour } from '@/features/shared/utils/businessDay';
import type {
  OperatingMode,
  SalesAnalyticsOverview,
  SalesOverviewFilterParams,
  TableAdmin,
} from '../admin.types';
import { financialSummaryApi, stationMatches } from './financialSummary.api';
import type { DateBounds } from '@/features/shared/utils/businessDay';

export const salesAndTablesApi = {
  async getSalesOverview(
    params?: SalesOverviewFilterParams | OperatingMode
  ): Promise<SalesAnalyticsOverview> {
    const filterOptions: SalesOverviewFilterParams =
      typeof params === 'string' ? { filterMode: params } : params || {};

    const bounds: DateBounds = {
      startDate: filterOptions.startDate,
      endDate: filterOptions.endDate,
      label: 'Sales Overview',
      benchmarkLabel: 'Historical',
    };
    const station = filterOptions.station || 'ALL';
    const mode = filterOptions.filterMode || 'ALL';

    let query = (supabase.from as any)('payments').select(
      'id, amount, payment_method, operating_mode, created_at, drawer_target, tab_id, tabs(order_channel, operating_mode)'
    );

    if (filterOptions.startDate) {
      query = query.gte('created_at', filterOptions.startDate);
    }
    if (filterOptions.endDate) {
      query = query.lt('created_at', filterOptions.endDate);
    }

    let attendanceQuery = (supabase.from as any)('attendance_records').select(
      'total_day_pay, is_present, date'
    );
    if (filterOptions.startDate) {
      attendanceQuery = attendanceQuery.gte('date', toBusinessDate(filterOptions.startDate));
    }
    if (filterOptions.endDate) {
      attendanceQuery = attendanceQuery.lte(
        'date',
        toBusinessDate(new Date(filterOptions.endDate).getTime() - 1)
      );
    }

    const [paymentsRes, attendanceRes, summary, cogsSummary] = await Promise.all([
      query,
      attendanceQuery.eq('is_present', true),
      financialSummaryApi.getFinancialSummary(bounds, station, mode),
      financialSummaryApi.getActualCogs(bounds, station),
    ]);

    if (paymentsRes.error) {
      console.error('[salesAndTablesApi.getSalesOverview] DB query error:', paymentsRes.error);
      throw paymentsRes.error;
    }

    const attendanceRows = (attendanceRes.data || []) as any[];
    const totalLaborExpense = attendanceRows.reduce(
      (sum, row) => sum + (Number(row.total_day_pay) || 0),
      0
    );

    const channelBreakdown: Record<string, { sales: number; count: number }> = {
      CAFE_AREA: { sales: 0, count: 0 },
      BAR_AREA: { sales: 0, count: 0 },
      TAKEOUT_COUNTER: { sales: 0, count: 0 },
      GRAB_FOOD: { sales: 0, count: 0 },
      FOODPANDA: { sales: 0, count: 0 },
    };

    const hourlyBucket = new Map<number, { sales: number; count: number }>();
    for (let h = 8; h <= 23; h++) {
      hourlyBucket.set(h, { sales: 0, count: 0 });
    }

    const filtered = ((paymentsRes.data || []) as any[]).filter((p: any) => {
      const itemMode = (p.operating_mode || p.tabs?.operating_mode || 'CAFE').toUpperCase();
      if (mode !== 'ALL' && itemMode !== mode) return false;
      return stationMatches(station, p.tabs?.order_channel, p.drawer_target);
    });

    for (const p of filtered) {
      const amt = Number(p.amount) || 0;
      const channel = p.tabs?.order_channel || 'CAFE_AREA';
      if (!channelBreakdown[channel]) {
        channelBreakdown[channel] = { sales: 0, count: 0 };
      }
      channelBreakdown[channel].sales += amt;
      channelBreakdown[channel].count += 1;

      const hour = toManilaHour(p.created_at);
      const currentH = hourlyBucket.get(hour) || { sales: 0, count: 0 };
      hourlyBucket.set(hour, { sales: currentH.sales + amt, count: currentH.count + 1 });
    }

    let maxHourSales = 0;
    let peakHourStr = '';
    const hourlySales = Array.from({ length: 16 }, (_, i) => {
      const hourNum = i + 8;
      const label = `${hourNum.toString().padStart(2, '0')}:00`;
      const bucket = hourlyBucket.get(hourNum) || { sales: 0, count: 0 };
      if (bucket.sales > maxHourSales) {
        maxHourSales = bucket.sales;
        peakHourStr = label;
      }
      return {
        hour: label,
        sales: bucket.sales,
        orderCount: bucket.count,
      };
    });

    const orderCount = summary.orderCount;
    const averageTicket = orderCount > 0 ? summary.netSales / orderCount : 0;
    const totalModeSales = summary.cafeNetSales + summary.eventNetSales;
    const cafePercent =
      totalModeSales > 0 ? Math.round((summary.cafeNetSales / totalModeSales) * 100) : 0;

    return {
      grossSales: summary.grossSales,
      orderCount,
      averageTicket,
      totalLaborExpense,
      totalCogs: cogsSummary.actualCogs,
      estimatedNetProfit: Math.max(
        0,
        Number(
          (
            summary.netSales -
            summary.vatAmount -
            summary.serviceCharge -
            cogsSummary.actualCogs -
            totalLaborExpense
          ).toFixed(2)
        )
      ),
      channelBreakdown,
      tenderBreakdown: {
        cash: summary.tenderCash,
        card: summary.tenderCard,
        digital: summary.tenderDigital,
        delivery: summary.tenderDelivery,
        total: summary.totalTender,
      },
      hourlySales,
      peakHourLabel: maxHourSales > 0 ? peakHourStr : undefined,
      modeBreakdown: {
        cafeSales: summary.cafeNetSales,
        eventSales: summary.eventNetSales,
        cafeOrderCount: summary.cafeOrderCount,
        eventOrderCount: summary.eventOrderCount,
        totalSales: totalModeSales,
        cafePercent,
        eventPercent: totalModeSales > 0 ? 100 - cafePercent : 0,
      },
    };
  },

  async getTables(): Promise<TableAdmin[]> {
    const { data, error } = await supabase
      .from('tables')
      .select('id, table_number, zone, capacity, is_occupied')
      .order('table_number', { ascending: true });
    if (error) throw error;
    return (data || []) as TableAdmin[];
  },

  async createTable(table: {
    table_number: string;
    zone: 'CAFE_AREA' | 'BAR_AREA';
    capacity: number;
  }): Promise<TableAdmin> {
    const { data, error } = await supabase.from('tables').insert(table).select().single();
    if (error) throw error;
    realtimeGateway.broadcastPosSync('table_created');
    return data as TableAdmin;
  },

  async updateTable(
    id: string,
    updates: Partial<{
      table_number: string;
      zone: 'CAFE_AREA' | 'BAR_AREA';
      capacity: number;
      is_occupied: boolean;
    }>
  ): Promise<void> {
    const { error } = await supabase.from('tables').update(updates).eq('id', id);
    if (error) throw error;
    realtimeGateway.broadcastPosSync('table_updated');
  },

  async deleteTable(id: string): Promise<void> {
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) throw error;
    realtimeGateway.broadcastPosSync('table_deleted');
  },

  async releaseTable(id: string): Promise<{ success: boolean; closedTabsCount: number }> {
    const { data, error } = await (supabase.rpc as any)('admin_force_release_table', {
      p_table_id: id,
    });
    if (error) throw error;
    realtimeGateway.broadcastPosSync('table_released');
    return (data as any) || { success: true, closedTabsCount: 0 };
  },

  async resetStationMetrics(
    pin: string
  ): Promise<{ success: boolean; reset_at?: string; manager_name?: string; error?: string }> {
    const { data, error } = await (supabase.rpc as any)('reset_station_turnaround_metrics', {
      p_manager_pin: pin.trim(),
    });
    if (error) {
      return { success: false, error: error.message || 'Failed to reset station metrics.' };
    }
    return (data as any) || { success: true };
  },

  async clearStationMetricsReset(): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await (supabase.rpc as any)('clear_station_turnaround_reset');
    if (error) {
      return { success: false, error: error.message || 'Failed to clear reset baseline.' };
    }
    return (data as any) || { success: true };
  },
};
