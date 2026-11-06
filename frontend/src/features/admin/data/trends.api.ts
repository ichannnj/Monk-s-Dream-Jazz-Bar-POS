import { supabase } from '@/features/shared/infrastructure/supabase';
import type {
  SalesTrendsReport,
  SalesTrendsFilterParams,
  DayOfWeekTrend,
  TimelineDataPoint,
  BestSellerTrendItem,
} from '../domain/trends.types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_SHORT_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Standard restaurant week order: Monday (1) to Sunday (0)
const RESTAURANT_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function getIsoWeekLabel(date: Date): { key: string; label: string; shortLabel: string } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  // Compute Monday date of this week
  const monday = new Date(date);
  const diffToMon = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - diffToMon);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const mFmt = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const sFmt = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    key: `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`,
    label: `Week ${weekNo} (${mFmt} – ${sFmt})`,
    shortLabel: `W${weekNo}`,
  };
}

export const trendsApi = {
  /**
   * Generates a comprehensive Sales and Product Trends Report directly from PostgreSQL
   */
  async getSalesTrendsReport(params?: SalesTrendsFilterParams): Promise<SalesTrendsReport> {
    const filterOptions = params || {};

    // 1. Build Payments Query for Financial Trends
    let paymentsQuery = (supabase.from as any)('payments').select(
      'id, amount, payment_method, operating_mode, created_at, drawer_target, tab_id, tabs(order_channel, operating_mode)'
    );

    if (filterOptions.startDate) {
      paymentsQuery = paymentsQuery.gte('created_at', filterOptions.startDate);
    }
    if (filterOptions.endDate) {
      paymentsQuery = paymentsQuery.lt('created_at', filterOptions.endDate);
    }

    // 2. Build Order Items Query for Best Sellers & Product Demand
    let orderItemsQuery = (supabase.from as any)('order_items').select(
      'id, product_id, quantity, unit_price, status, created_at, products(id, name, base_price, categories(id, name))'
    );

    if (filterOptions.startDate) {
      orderItemsQuery = orderItemsQuery.gte('created_at', filterOptions.startDate);
    }
    if (filterOptions.endDate) {
      orderItemsQuery = orderItemsQuery.lt('created_at', filterOptions.endDate);
    }

    // Execute queries in parallel
    const [paymentsRes, orderItemsRes] = await Promise.all([
      paymentsQuery,
      orderItemsQuery.neq('status', 'CANCELLED'),
    ]);

    if (paymentsRes.error) {
      console.error('[trendsApi.getSalesTrendsReport] Payments query error:', paymentsRes.error);
      throw paymentsRes.error;
    }

    if (orderItemsRes.error) {
      console.warn(
        '[trendsApi.getSalesTrendsReport] Order items query error:',
        orderItemsRes.error
      );
    }

    const rawPayments = (paymentsRes.data || []) as any[];
    const rawOrderItems = (orderItemsRes.data || []) as any[];

    // Filter payments by operating mode and station if specified
    const filteredPayments = rawPayments.filter((p) => {
      if (filterOptions.filterMode && filterOptions.filterMode !== 'ALL') {
        const mode = p.operating_mode || p.tabs?.operating_mode;
        if (mode !== filterOptions.filterMode) return false;
      }
      if (filterOptions.station && filterOptions.station !== 'ALL') {
        const channel = (p.tabs?.order_channel || '').toUpperCase();
        const drawer = (p.drawer_target || '').toUpperCase();
        if (filterOptions.station === 'CAFE_AREA') {
          return drawer.includes('BAR') || channel.includes('CAFE');
        }
        if (filterOptions.station === 'BAR_AREA') {
          return drawer.includes('BAR') || channel.includes('BAR');
        }
        if (filterOptions.station === 'TAKEOUT_COUNTER') {
          return channel.includes('TAKEOUT');
        }
        if (filterOptions.station === 'GRAB_FOOD') {
          return channel.includes('GRAB');
        }
      }
      return true;
    });

    // Compute Totals
    let totalGrossSales = 0;
    const totalOrders = filteredPayments.length;

    // Day of Week Accumulators: index 0 to 6
    const dayOfWeekData = Array.from({ length: 7 }, (_, i) => ({
      sales: 0,
      count: 0,
      datesSeen: new Set<string>(),
    }));

    // Timeline Maps
    const dailyMap = new Map<string, { date: Date; sales: number; count: number }>();
    const weeklyMap = new Map<
      string,
      { label: string; shortLabel: string; date: Date; sales: number; count: number }
    >();
    const monthlyMap = new Map<
      string,
      { label: string; shortLabel: string; date: Date; sales: number; count: number }
    >();

    for (const p of filteredPayments) {
      const amt = Number(p.amount) || 0;
      totalGrossSales += amt;

      const pDate = new Date(p.created_at);
      if (isNaN(pDate.getTime())) continue;

      const dayIdx = pDate.getDay(); // 0-6
      const dateKey = pDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
      const monthKey = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
      const weekInfo = getIsoWeekLabel(pDate);

      // Accumulate Day of Week
      dayOfWeekData[dayIdx].sales += amt;
      dayOfWeekData[dayIdx].count += 1;
      dayOfWeekData[dayIdx].datesSeen.add(dateKey);

      // Accumulate Daily Timeline
      const curDaily = dailyMap.get(dateKey) || { date: pDate, sales: 0, count: 0 };
      curDaily.sales += amt;
      curDaily.count += 1;
      dailyMap.set(dateKey, curDaily);

      // Accumulate Weekly Timeline
      const curWeekly = weeklyMap.get(weekInfo.key) || {
        label: weekInfo.label,
        shortLabel: weekInfo.shortLabel,
        date: pDate,
        sales: 0,
        count: 0,
      };
      curWeekly.sales += amt;
      curWeekly.count += 1;
      weeklyMap.set(weekInfo.key, curWeekly);

      // Accumulate Monthly Timeline
      const monthLabel = pDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const monthShort = pDate.toLocaleDateString('en-US', { month: 'short' });
      const curMonthly = monthlyMap.get(monthKey) || {
        label: monthLabel,
        shortLabel: monthShort,
        date: pDate,
        sales: 0,
        count: 0,
      };
      curMonthly.sales += amt;
      curMonthly.count += 1;
      monthlyMap.set(monthKey, curMonthly);
    }

    const averageTicket = totalOrders > 0 ? totalGrossSales / totalOrders : 0;

    // Build Day of Week Trends in restaurant order (Mon -> Sun)
    let maxDaySales = 0;
    for (const d of dayOfWeekData) {
      if (d.sales > maxDaySales) maxDaySales = d.sales;
    }

    const dayOfWeekTrends: DayOfWeekTrend[] = RESTAURANT_DAY_ORDER.map((dayIdx) => {
      const raw = dayOfWeekData[dayIdx];
      const distinctDatesCount = Math.max(raw.datesSeen.size, 1);
      const avgSales = raw.sales / distinctDatesCount;
      const pctOfWeekly = totalGrossSales > 0 ? (raw.sales / totalGrossSales) * 100 : 0;
      const isBestDay = maxDaySales > 0 && raw.sales === maxDaySales;

      return {
        dayIndex: dayIdx,
        dayName: DAY_NAMES[dayIdx],
        shortName: DAY_SHORT_NAMES[dayIdx],
        totalSales: raw.sales,
        orderCount: raw.count,
        averageSales: avgSales,
        isBestDay,
        percentageOfWeeklyTotal: Math.round(pctOfWeekly * 10) / 10,
      };
    });

    const bestDay = dayOfWeekTrends.find((d) => d.isBestDay) || null;

    // Build Daily Timeline (sorted chronologically)
    const sortedDailyKeys = Array.from(dailyMap.keys()).sort();
    const maxDailySales = Math.max(...Array.from(dailyMap.values()).map((d) => d.sales), 0);

    const dailyTimeline: TimelineDataPoint[] = sortedDailyKeys.map((dateKey) => {
      const d = dailyMap.get(dateKey)!;
      const dateObj = new Date(dateKey + 'T00:00:00');
      const label = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const shortLabel = String(dateObj.getDate()).padStart(2, '0');
      const isPeak = maxDailySales > 0 && d.sales === maxDailySales;

      return {
        key: dateKey,
        label,
        shortLabel,
        sales: d.sales,
        orderCount: d.count,
        averageTicket: d.count > 0 ? d.sales / d.count : 0,
        isPeak,
        periodType: 'day',
      };
    });

    const peakDaily = dailyTimeline.find((d) => d.isPeak) || null;

    // Build Weekly Timeline (sorted chronologically)
    const sortedWeeklyKeys = Array.from(weeklyMap.keys()).sort();
    const maxWeeklySales = Math.max(...Array.from(weeklyMap.values()).map((w) => w.sales), 0);

    const weeklyTimeline: TimelineDataPoint[] = sortedWeeklyKeys.map((weekKey) => {
      const w = weeklyMap.get(weekKey)!;
      const isPeak = maxWeeklySales > 0 && w.sales === maxWeeklySales;

      return {
        key: weekKey,
        label: w.label,
        shortLabel: w.shortLabel,
        sales: w.sales,
        orderCount: w.count,
        averageTicket: w.count > 0 ? w.sales / w.count : 0,
        isPeak,
        periodType: 'week',
      };
    });

    const peakWeekly = weeklyTimeline.find((w) => w.isPeak) || null;

    // Build Monthly Timeline (sorted chronologically)
    const sortedMonthlyKeys = Array.from(monthlyMap.keys()).sort();
    const maxMonthlySales = Math.max(...Array.from(monthlyMap.values()).map((m) => m.sales), 0);

    const monthlyTimeline: TimelineDataPoint[] = sortedMonthlyKeys.map((monthKey) => {
      const m = monthlyMap.get(monthKey)!;
      const isPeak = maxMonthlySales > 0 && m.sales === maxMonthlySales;

      return {
        key: monthKey,
        label: m.label,
        shortLabel: m.shortLabel,
        sales: m.sales,
        orderCount: m.count,
        averageTicket: m.count > 0 ? m.sales / m.count : 0,
        isPeak,
        periodType: 'month',
      };
    });

    const peakMonthly = monthlyTimeline.find((m) => m.isPeak) || null;

    // 3. Aggregate Best Sellers Matrix
    const productAggregationMap = new Map<
      string,
      {
        id: string;
        name: string;
        category: string;
        soldCount: number;
        salesAmount: number;
        unitPrice: number;
      }
    >();

    const categoriesSet = new Set<string>();

    for (const item of rawOrderItems) {
      const pid = item.product_id;
      const prodName = item.products?.name || 'Menu Item';
      const catName = item.products?.categories?.name || 'General';
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unit_price || item.products?.base_price || 0);
      const totalItemSales = qty * price;

      categoriesSet.add(catName);

      const existing = productAggregationMap.get(pid) || {
        id: pid,
        name: prodName,
        category: catName,
        soldCount: 0,
        salesAmount: 0,
        unitPrice: price,
      };

      existing.soldCount += qty;
      existing.salesAmount += totalItemSales;
      if (price > 0) existing.unitPrice = price;

      productAggregationMap.set(pid, existing);
    }

    const aggregatedProducts = Array.from(productAggregationMap.values());
    const topRevenue = aggregatedProducts.reduce(
      (max, p) => (p.salesAmount > max ? p.salesAmount : max),
      0
    );
    const topSold = aggregatedProducts.reduce(
      (max, p) => (p.soldCount > max ? p.soldCount : max),
      0
    );

    // Default ranking by revenue
    const sortedProducts = aggregatedProducts.sort((a, b) => b.salesAmount - a.salesAmount);

    const bestSellers: BestSellerTrendItem[] = sortedProducts.map((p, idx) => {
      const progressPercent =
        topRevenue > 0
          ? Math.min(100, Math.max(10, Math.round((p.salesAmount / topRevenue) * 100)))
          : 10;
      const revenueShare =
        totalGrossSales > 0 ? Math.round((p.salesAmount / totalGrossSales) * 1000) / 10 : 0;

      return {
        id: p.id,
        rank: idx + 1,
        name: p.name,
        category: p.category,
        soldCount: p.soldCount,
        salesAmount: p.salesAmount,
        unitPrice: p.unitPrice,
        progressPercent,
        revenueSharePercent: revenueShare,
      };
    });

    const topSellingProduct = bestSellers.length > 0 ? bestSellers[0] : null;

    return {
      timeframeLabel: filterOptions.startDate ? 'Selected Filter' : 'Current Timeframe',
      totalGrossSales,
      totalOrders,
      averageTicket,
      bestDayOfWeek: bestDay
        ? {
            dayName: bestDay.dayName,
            totalSales: bestDay.totalSales,
            averageSales: bestDay.averageSales,
            orderCount: bestDay.orderCount,
            percentage: bestDay.percentageOfWeeklyTotal,
          }
        : null,
      bestDate: peakDaily
        ? {
            dateStr: peakDaily.key,
            formattedDate: peakDaily.label,
            sales: peakDaily.sales,
            orderCount: peakDaily.orderCount,
          }
        : null,
      bestWeek: peakWeekly
        ? {
            weekLabel: peakWeekly.label,
            sales: peakWeekly.sales,
            orderCount: peakWeekly.orderCount,
          }
        : null,
      bestMonth: peakMonthly
        ? {
            monthLabel: peakMonthly.label,
            sales: peakMonthly.sales,
            orderCount: peakMonthly.orderCount,
          }
        : null,
      topSellingProduct,
      dayOfWeekTrends,
      dailyTimeline,
      weeklyTimeline,
      monthlyTimeline,
      bestSellers,
      availableCategories: ['All Categories', ...Array.from(categoriesSet).sort()],
    };
  },
};
