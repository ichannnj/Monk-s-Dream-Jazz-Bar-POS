import { supabase } from '@/features/shared/infrastructure/supabase';
import type { DateBounds } from '@/features/shared/utils/businessDay';

/**
 * Financial Summary API
 *
 * Single source of truth for Admin money figures. Delegates to the
 * `get_financial_summary` Postgres RPC, which mirrors the exact expressions
 * used by `get_current_x_reading`:
 *
 *   gross_sales    = SUM(amount + discount_amount)
 *   net_sales      = SUM(amount)
 *   discount_total = SUM(discount_amount)
 *
 * Order counts use COUNT(DISTINCT tab_id), so a tab split across multiple
 * tenders is counted once. If the RPC is unavailable (migration not yet
 * applied) the same arithmetic is reproduced client-side instead of silently
 * falling back to net-sales-as-gross.
 */

export interface FinancialSummary {
  grossSales: number;
  discountTotal: number;
  netSales: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  serviceCharge: number;
  tenderCash: number;
  tenderCard: number;
  tenderDigital: number;
  tenderDelivery: number;
  tenderComp: number;
  totalTender: number;
  transactionCount: number;
  orderCount: number;
  cafeNetSales: number;
  eventNetSales: number;
  cafeOrderCount: number;
  eventOrderCount: number;
}

export interface ActualCogsSummary {
  actualCogs: number;
  costedLineCount: number;
  uncostedLineCount: number;
  isComplete: boolean;
}

export const EMPTY_FINANCIAL_SUMMARY: FinancialSummary = {
  grossSales: 0,
  discountTotal: 0,
  netSales: 0,
  vatableSales: 0,
  vatAmount: 0,
  vatExemptSales: 0,
  serviceCharge: 0,
  tenderCash: 0,
  tenderCard: 0,
  tenderDigital: 0,
  tenderDelivery: 0,
  tenderComp: 0,
  totalTender: 0,
  transactionCount: 0,
  orderCount: 0,
  cafeNetSales: 0,
  eventNetSales: 0,
  cafeOrderCount: 0,
  eventOrderCount: 0,
};

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapFinancialSummary(raw: Record<string, unknown> | null): FinancialSummary {
  if (!raw) return { ...EMPTY_FINANCIAL_SUMMARY };
  return {
    grossSales: num(raw.gross_sales),
    discountTotal: num(raw.discount_total),
    netSales: num(raw.net_sales),
    vatableSales: num(raw.vatable_sales),
    vatAmount: num(raw.vat_amount),
    vatExemptSales: num(raw.vat_exempt_sales),
    serviceCharge: num(raw.service_charge),
    tenderCash: num(raw.tender_cash),
    tenderCard: num(raw.tender_card),
    tenderDigital: num(raw.tender_digital),
    tenderDelivery: num(raw.tender_delivery),
    tenderComp: num(raw.tender_comp),
    totalTender: num(raw.total_tender),
    transactionCount: num(raw.transaction_count),
    orderCount: num(raw.order_count),
    cafeNetSales: num(raw.cafe_net_sales),
    eventNetSales: num(raw.event_net_sales),
    cafeOrderCount: num(raw.cafe_order_count),
    eventOrderCount: num(raw.event_order_count),
  };
}

export function stationMatches(
  station: string,
  orderChannel: string | null | undefined,
  drawerTarget?: string | null
): boolean {
  const target = (station || 'ALL').toUpperCase();
  if (target === 'ALL') return true;
  const channel = (orderChannel || '').toUpperCase();
  const drawer = (drawerTarget || '').toUpperCase();
  switch (target) {
    case 'CAFE_AREA':
      // Legacy rows predating operating_mode/order_channel tie back to the main til.
      return channel === 'CAFE_AREA' || (channel === '' && drawer === 'MAIN');
    case 'BAR_AREA':
      return channel === 'BAR_AREA' || (channel === '' && drawer === 'BAR');
    case 'TAKEOUT_COUNTER':
      return channel === 'TAKEOUT_COUNTER';
    case 'GRAB_FOOD':
      return channel === 'GRAB_FOOD' || channel === 'FOODPANDA' || channel === 'OTHER_ONLINE';
    case 'FOODPANDA':
      return channel === 'FOODPANDA';
    default:
      return true;
  }
}

async function fetchFallbackSummary(
  bounds: DateBounds,
  station: string,
  mode: string
): Promise<FinancialSummary> {
  let query = (supabase.from as any)('payments').select(
    'amount, discount_amount, service_charge, vatable_sales, vat_amount, vat_exempt_sales, payment_method, operating_mode, drawer_target, tab_id, created_at, tabs(order_channel, operating_mode)'
  );
  if (bounds.startDate) query = query.gte('created_at', bounds.startDate);
  if (bounds.endDate) query = query.lt('created_at', bounds.endDate);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []) as any[];
  const targetMode = (mode || 'ALL').toUpperCase();
  const tabs = new Map<string, true>();
  const cafeTabs = new Map<string, true>();
  const eventTabs = new Map<string, true>();

  const summary: FinancialSummary = { ...EMPTY_FINANCIAL_SUMMARY };

  for (const row of rows) {
    const tab = row.tabs || {};
    const channel = tab.order_channel;
    if (!stationMatches(station, channel, row.drawer_target)) continue;

    const operatingMode = (row.operating_mode || tab.operating_mode || 'CAFE').toUpperCase();
    if (targetMode === 'EVENT' && operatingMode !== 'EVENT') continue;
    if (targetMode === 'CAFE' && operatingMode === 'EVENT') continue;

    const amount = num(row.amount);
    const discount = num(row.discount_amount);
    summary.grossSales += amount + discount;
    summary.discountTotal += discount;
    summary.netSales += amount;
    summary.vatableSales += num(row.vatable_sales);
    summary.vatAmount += num(row.vat_amount);
    summary.vatExemptSales += num(row.vat_exempt_sales);
    summary.serviceCharge += num(row.service_charge);
    summary.totalTender += amount;
    summary.transactionCount += 1;

    switch (String(row.payment_method || '').toUpperCase()) {
      case 'CASH':
        summary.tenderCash += amount;
        break;
      case 'CARD':
        summary.tenderCard += amount;
        break;
      case 'DIGITAL_WALLET':
        summary.tenderDigital += amount;
        break;
      case 'GRAB_PAY_IN_APP':
      case 'FOODPANDA_IN_APP':
        summary.tenderDelivery += amount;
        break;
      case 'COMP':
        summary.tenderComp += amount;
        break;
      default:
        break;
    }

    if (operatingMode === 'EVENT') {
      summary.eventNetSales += amount;
      if (row.tab_id) eventTabs.set(row.tab_id, true);
    } else {
      summary.cafeNetSales += amount;
      if (row.tab_id) cafeTabs.set(row.tab_id, true);
    }
    if (row.tab_id) tabs.set(row.tab_id, true);
  }

  summary.orderCount = tabs.size;
  summary.cafeOrderCount = cafeTabs.size;
  summary.eventOrderCount = eventTabs.size;

  return summary;
}

export const financialSummaryApi = {
  /**
   * Consolidated gross/net/VAT/service-charge/tender summary for the given
   * business-day bounds, station and operating mode.
   */
  async getFinancialSummary(
    bounds: DateBounds,
    station: string = 'ALL',
    mode: string = 'ALL'
  ): Promise<FinancialSummary> {
    try {
      const { data, error } = await (supabase.rpc as any)('get_financial_summary', {
        p_start: bounds.startDate ?? null,
        p_end: bounds.endDate ?? null,
        p_station: station,
        p_mode: mode,
      });
      if (error) throw error;
      return mapFinancialSummary(data as Record<string, unknown> | null);
    } catch (error) {
      console.warn(
        '[financialSummaryApi] get_financial_summary unavailable, using client fallback:',
        error
      );
      return fetchFallbackSummary(bounds, station, mode);
    }
  },

  /**
   * Real Cost of Goods Sold derived from recipe BOM x inventory unit cost.
   */
  async getActualCogs(bounds: DateBounds, station: string = 'ALL'): Promise<ActualCogsSummary> {
    try {
      const { data, error } = await (supabase.rpc as any)('get_actual_cogs', {
        p_start: bounds.startDate ?? null,
        p_end: bounds.endDate ?? null,
        p_station: station,
      });
      if (error) throw error;
      const raw = (data || {}) as Record<string, unknown>;
      return {
        actualCogs: num(raw.actual_cogs),
        costedLineCount: num(raw.costed_line_count),
        uncostedLineCount: num(raw.uncosted_line_count),
        isComplete: raw.is_complete === true,
      };
    } catch (error) {
      console.warn('[financialSummaryApi] get_actual_cogs unavailable:', error);
      return {
        actualCogs: 0,
        costedLineCount: 0,
        uncostedLineCount: 0,
        isComplete: false,
      };
    }
  },
};
