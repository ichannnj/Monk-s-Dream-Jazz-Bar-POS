import { supabase } from '@/features/shared/infrastructure/supabase';
import type { DashboardTelemetry, TimeframeFilter } from '../domain/admin.types';
import { getTimeframeBounds, formatHour } from './telemetry/timeframeBounds';
import {
  fetchFloorTableOccupancy,
  fetchStationsAndTurnoverTelemetry,
} from './telemetry/stationAndTableTelemetry';
import {
  computeSalesBreakdownAndVelocity,
  fetchOrderItemsAndAlertsTelemetry,
} from './telemetry/salesAndVelocityTelemetry';
import { financialSummaryApi } from './api/financialSummary.api';

export { getTimeframeBounds };

function windowHours(bounds: { startDate?: string; endDate?: string }): number {
  if (!bounds.startDate) return 1;
  const startMs = new Date(bounds.startDate).getTime();
  const endMs = bounds.endDate ? new Date(bounds.endDate).getTime() : Date.now();
  return Math.max(1, (endMs - startMs) / (60 * 60 * 1000));
}

export const adminTelemetryService = {
  async fetchDashboardTelemetry(
    timeframe: TimeframeFilter = 'today',
    options?: { ignoreResetBaseline?: boolean }
  ): Promise<DashboardTelemetry> {
    const bounds = getTimeframeBounds(timeframe);

    try {
      let paymentsQuery = (supabase.from as any)('payments').select(
        'id, amount, payment_method, operating_mode, created_at, tab_id, tabs(order_channel, operating_mode)'
      );
      if (bounds.startDate) paymentsQuery = paymentsQuery.gte('created_at', bounds.startDate);
      if (bounds.endDate) paymentsQuery = paymentsQuery.lt('created_at', bounds.endDate);

      // Attendance is stored on the business date (6:00 AM Manila cutoff), so
      // it must be queried with business-date strings and BOTH bounds applied.
      let attendanceQuery = (supabase.from as any)('attendance_records').select(
        'id, user_id, date, is_present, shift_status, base_daily_pay, addon_pay, total_day_pay'
      );
      if (bounds.businessStartDate) {
        attendanceQuery = attendanceQuery.gte('date', bounds.businessStartDate);
      }
      if (bounds.businessEndDate) {
        attendanceQuery = attendanceQuery.lte('date', bounds.businessEndDate);
      }

      const benchmarkBounds = {
        startDate: bounds.benchmarkStart,
        endDate: bounds.benchmarkEnd,
        label: 'Benchmark',
        benchmarkLabel: 'Benchmark',
      };

      const [
        paymentsRes,
        settingsRes,
        attendanceRes,
        staffRes,
        summary,
        benchmarkSummary,
        cogsSummary,
      ] = await Promise.all([
        paymentsQuery,
        (supabase.from as any)('venue_settings')
          .select('operating_mode, station_metrics_reset_at')
          .limit(1)
          .maybeSingle(),
        attendanceQuery,
        supabase.from('users').select('id, is_active, is_workflow_staff').eq('is_active', true),
        financialSummaryApi.getFinancialSummary(bounds, 'ALL', 'ALL'),
        bounds.benchmarkStart
          ? financialSummaryApi.getFinancialSummary(benchmarkBounds, 'ALL', 'ALL')
          : Promise.resolve(undefined),
        financialSummaryApi.getActualCogs(bounds, 'ALL'),
      ]);

      const payments = (paymentsRes.data || []) as any[];
      const activeOperatingMode = (settingsRes?.data?.operating_mode || 'CAFE') as 'CAFE' | 'EVENT';
      const stationMetricsResetAt = (settingsRes?.data?.station_metrics_reset_at || null) as
        string | null;
      const attendanceRows = (attendanceRes.data || []) as any[];
      const activeStaffRows = (staffRes.data || []) as any[];

      const totalActiveStaffCount = activeStaffRows.length;
      const presentRows = attendanceRows.filter((r) => r.is_present);
      const presentStaffCount = presentRows.length;
      const clockedInStaffCount = attendanceRows.filter(
        (r) => r.shift_status === 'CLOCKED_IN'
      ).length;
      const completedShiftsCount = attendanceRows.filter(
        (r) => r.shift_status === 'COMPLETED'
      ).length;

      const basePayrollTotal = presentRows.reduce(
        (sum, r) => sum + (Number(r.base_daily_pay) || 0),
        0
      );
      const bonusPayrollTotal = presentRows.reduce((sum, r) => sum + (Number(r.addon_pay) || 0), 0);
      // Admin accounts are payroll-exempt in the database (base/addon are 0),
      // so summing total_day_pay never charges management wages.
      const totalPayrollExpense = presentRows.reduce(
        (sum, r) => sum + (Number(r.total_day_pay) || 0),
        0
      );

      const salesMetrics = computeSalesBreakdownAndVelocity(
        payments,
        [],
        summary,
        benchmarkSummary
      );
      const { totalTables, occupiedTables, activeOpenTabs, occupancyPercent } =
        await fetchFloorTableOccupancy();
      const { bestSellers, categorySales, alerts, lowStockItems } =
        await fetchOrderItemsAndAlertsTelemetry(bounds);

      let effectiveStationStart = bounds.startDate;
      if (timeframe === 'today' && stationMetricsResetAt && !options?.ignoreResetBaseline) {
        effectiveStationStart = stationMetricsResetAt;
      }

      const nowMs = Date.now();
      const { stations, tableTurnover, stationsOverview } = await fetchStationsAndTurnoverTelemetry(
        {
          bounds,
          effectiveStationStart,
          nowMs,
          lowStockItems,
          occupiedTables,
        }
      );

      return {
        liveSalesTotal: salesMetrics.liveSalesTotal,
        salesGrowthPercent: salesMetrics.salesGrowthPercent,
        orderCount: salesMetrics.orderCount,
        ordersGrowthPercent: salesMetrics.ordersGrowthPercent,
        ordersPerHour:
          salesMetrics.orderCount > 0
            ? Number((salesMetrics.orderCount / windowHours(bounds)).toFixed(1))
            : 0,
        averageCheck: salesMetrics.averageCheck,
        averageCheckGrowthPercent: salesMetrics.averageCheckGrowthPercent,
        guestCount: salesMetrics.guestCount,
        guestGrowthPercent: salesMetrics.guestGrowthPercent,
        spendPerGuest: salesMetrics.spendPerGuest,

        cashSales: salesMetrics.cashSales,
        digitalSales: salesMetrics.digitalSales,
        cardSales: salesMetrics.cardSales,

        totalPayrollExpense,
        basePayrollTotal,
        bonusPayrollTotal,
        laborCostPercent:
          salesMetrics.liveSalesTotal > 0
            ? Number(((totalPayrollExpense / salesMetrics.liveSalesTotal) * 100).toFixed(1))
            : 0,
        estimatedCogs: cogsSummary.actualCogs,
        estimatedNetProfit: Math.max(
          0,
          Number(
            (
              salesMetrics.liveSalesTotal -
              salesMetrics.vatAmount -
              salesMetrics.serviceCharge -
              cogsSummary.actualCogs -
              totalPayrollExpense
            ).toFixed(2)
          )
        ),
        clockedInStaffCount,
        completedShiftsCount,
        presentStaffCount,
        totalActiveStaffCount,

        cafeSales: salesMetrics.cafeSales,
        eventSales: salesMetrics.eventSales,
        cafePercentage: salesMetrics.cafePercentage,
        eventPercentage: salesMetrics.eventPercentage,
        cafeOrdersCount: salesMetrics.cafeOrdersCount,
        eventOrdersCount: salesMetrics.eventOrdersCount,
        cafeAvgCheck: salesMetrics.cafeAvgCheck,
        eventAvgCheck: salesMetrics.eventAvgCheck,
        activeOperatingMode,

        totalTables,
        occupiedTables,
        activeOpenTabs,
        occupancyPercent,
        timeframe,
        timeframeLabel: bounds.label,
        benchmarkLabel: bounds.benchmarkLabel,

        hourlySales: salesMetrics.hourlySales,
        peakHourLabel: salesMetrics.peakHour
          ? `Peak · ${formatHour(salesMetrics.peakHour)}`
          : 'No Sales Yet',
        bestSellers,
        stations,
        tableTurnover,
        stationsOverview,
        stationMetricsResetAt,
        categorySales,
        alerts,
        lastUpdated: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      };
    } catch (err) {
      console.error('[adminTelemetryService] Database query error:', err);
      return {
        liveSalesTotal: 0,
        salesGrowthPercent: 0,
        orderCount: 0,
        ordersGrowthPercent: 0,
        ordersPerHour: 0,
        averageCheck: 0,
        averageCheckGrowthPercent: 0,
        guestCount: 0,
        guestGrowthPercent: 0,
        spendPerGuest: 0,
        cashSales: 0,
        digitalSales: 0,
        cardSales: 0,
        totalPayrollExpense: 0,
        basePayrollTotal: 0,
        bonusPayrollTotal: 0,
        laborCostPercent: 0,
        estimatedCogs: 0,
        estimatedNetProfit: 0,
        clockedInStaffCount: 0,
        completedShiftsCount: 0,
        presentStaffCount: 0,
        totalActiveStaffCount: 0,
        cafeSales: 0,
        eventSales: 0,
        cafePercentage: 0,
        eventPercentage: 0,
        cafeOrdersCount: 0,
        eventOrdersCount: 0,
        cafeAvgCheck: 0,
        eventAvgCheck: 0,
        activeOperatingMode: 'CAFE',
        totalTables: 0,
        occupiedTables: 0,
        activeOpenTabs: 0,
        occupancyPercent: 0,
        timeframe,
        timeframeLabel: bounds.label,
        benchmarkLabel: bounds.benchmarkLabel,
        hourlySales: [],
        peakHourLabel: 'No Sales Yet',
        bestSellers: [],
        stations: [],
        categorySales: [],
        alerts: [],
        lastUpdated: 'Offline / Connecting...',
      };
    }
  },
};
