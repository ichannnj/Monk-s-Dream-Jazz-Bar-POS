import { supabase } from '@/features/shared/infrastructure/supabase';
import type {
  BestSellerItem,
  CategorySalesItem,
  AttentionAlert,
  HourlySalesPoint,
} from '../../domain/admin.types';
import { formatHour } from './timeframeBounds';
import { EMPTY_FINANCIAL_SUMMARY, type FinancialSummary } from '../api/financialSummary.api';
import { toManilaHour } from '@/features/shared/utils/businessDay';

/**
 * Hourly operational window shown on the velocity chart. Every hour from
 * 08:00 through 23:00 inclusive is emitted so the curve is continuous.
 */
const OPERATIONAL_HOURS = Array.from({ length: 16 }, (_, index) => index + 8);

export function computeSalesBreakdownAndVelocity(
  payments: any[],
  benchmarkPayments: any[],
  summary: FinancialSummary = EMPTY_FINANCIAL_SUMMARY,
  benchmarkSummary?: FinancialSummary
) {
  const hourlyBucket = new Map<number, number>();

  for (const p of payments) {
    const amt = Number(p.amount) || 0;
    hourlyBucket.set(
      toManilaHour(p.created_at),
      (hourlyBucket.get(toManilaHour(p.created_at)) || 0) + amt
    );
  }

  // Authoritative money totals come from get_financial_summary (mirrors the
  // X-Reading). Distinct-tab order counts prevent split tenders inflating
  // average checks.
  const liveSalesTotal = summary.netSales;
  const grossSales = summary.grossSales;
  const discountTotal = summary.discountTotal;
  const orderCount = summary.orderCount;

  const cashSales = summary.tenderCash;
  const digitalSales = summary.tenderDigital;
  const cardSales = summary.tenderCard;

  const cafeSales = summary.cafeNetSales;
  const eventSales = summary.eventNetSales;
  const cafeOrdersCount = summary.cafeOrderCount;
  const eventOrdersCount = summary.eventOrderCount;

  const cafePercentage = liveSalesTotal > 0 ? Math.round((cafeSales / liveSalesTotal) * 100) : 0;
  const eventPercentage = liveSalesTotal > 0 ? 100 - cafePercentage : 0;
  const cafeAvgCheck = cafeOrdersCount > 0 ? cafeSales / cafeOrdersCount : 0;
  const eventAvgCheck = eventOrdersCount > 0 ? eventSales / eventOrdersCount : 0;

  const averageCheck = orderCount > 0 ? liveSalesTotal / orderCount : 0;
  // No covers field exists in the schema. One check = at least one guest, so
  // we report the check count rather than inventing a party multiplier.
  const guestCount = orderCount;
  const spendPerGuest = guestCount > 0 ? liveSalesTotal / guestCount : 0;

  let salesGrowthPercent = 0;
  let ordersGrowthPercent = 0;
  let averageCheckGrowthPercent = 0;
  let guestGrowthPercent = 0;

  if (benchmarkSummary && benchmarkSummary.orderCount > 0) {
    if (benchmarkSummary.netSales > 0) {
      salesGrowthPercent = Number(
        (((liveSalesTotal - benchmarkSummary.netSales) / benchmarkSummary.netSales) * 100).toFixed(
          1
        )
      );
    }
    ordersGrowthPercent = Number(
      (((orderCount - benchmarkSummary.orderCount) / benchmarkSummary.orderCount) * 100).toFixed(1)
    );
    const benchmarkAverageCheck = benchmarkSummary.netSales / benchmarkSummary.orderCount;
    if (benchmarkAverageCheck > 0) {
      averageCheckGrowthPercent = Number(
        (((averageCheck - benchmarkAverageCheck) / benchmarkAverageCheck) * 100).toFixed(1)
      );
    }
    if (benchmarkSummary.orderCount > 0) {
      guestGrowthPercent = Number(
        (((guestCount - benchmarkSummary.orderCount) / benchmarkSummary.orderCount) * 100).toFixed(
          1
        )
      );
    }
  } else if (benchmarkPayments.length > 0) {
    const benchmarkSales = benchmarkPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    if (benchmarkSales > 0) {
      salesGrowthPercent = Number(
        (((liveSalesTotal - benchmarkSales) / benchmarkSales) * 100).toFixed(1)
      );
    }
    ordersGrowthPercent = Number(
      (((orderCount - benchmarkPayments.length) / benchmarkPayments.length) * 100).toFixed(1)
    );
    const benchmarkAverageCheck = benchmarkSales / benchmarkPayments.length;
    if (benchmarkAverageCheck > 0) {
      averageCheckGrowthPercent = Number(
        (((averageCheck - benchmarkAverageCheck) / benchmarkAverageCheck) * 100).toFixed(1)
      );
    }
  }

  let peakHour: number | null = null;
  let maxHourSales = 0;
  for (const h of OPERATIONAL_HOURS) {
    const s = hourlyBucket.get(h) || 0;
    if (s > maxHourSales) {
      maxHourSales = s;
      peakHour = h;
    }
  }

  const hourlySales: HourlySalesPoint[] = OPERATIONAL_HOURS.map((h) => ({
    hourLabel: formatHour(h),
    sales: hourlyBucket.get(h) || 0,
    isPeak: peakHour !== null && h === peakHour,
  }));

  return {
    liveSalesTotal,
    grossSales,
    discountTotal,
    vatAmount: summary.vatAmount,
    vatableSales: summary.vatableSales,
    serviceCharge: summary.serviceCharge,
    cashSales,
    digitalSales,
    cardSales,
    deliverySales: summary.tenderDelivery,
    compSales: summary.tenderComp,
    totalTender: summary.totalTender,
    cafeSales,
    eventSales,
    cafePercentage,
    eventPercentage,
    cafeOrdersCount,
    eventOrdersCount,
    cafeAvgCheck,
    eventAvgCheck,
    orderCount,
    transactionCount: summary.transactionCount,
    averageCheck,
    guestCount,
    spendPerGuest,
    salesGrowthPercent,
    ordersGrowthPercent,
    averageCheckGrowthPercent,
    guestGrowthPercent,
    hourlySales,
    peakHour,
  };
}

export async function fetchOrderItemsAndAlertsTelemetry(bounds: {
  startDate?: string;
  endDate?: string;
}) {
  let orderItemsQuery = (supabase.from as any)('order_items')
    .select(
      'product_id, quantity, unit_price, status, created_at, orders(status, tabs(status, order_channel)), products(name, category_id, categories(name))'
    )
    .neq('status', 'CANCELLED');

  if (bounds.startDate) orderItemsQuery = orderItemsQuery.gte('created_at', bounds.startDate);
  if (bounds.endDate) orderItemsQuery = orderItemsQuery.lt('created_at', bounds.endDate);

  const [orderItemsRes, inventoryRes, wasteRes, cancelledRes] = await Promise.all([
    orderItemsQuery,
    supabase.from('inventory_items').select('id, name, current_stock, min_alert_level, unit'),
    (supabase.from as any)('waste_logs')
      .select('id, quantity, cost_lost, reason, created_at, inventory_items(name)')
      .order('created_at', { ascending: false })
      .limit(3),
    (supabase.from as any)('order_items')
      .select('id, product_id, quantity, unit_price, created_at, products(name)')
      .eq('status', 'CANCELLED')
      .order('created_at', { ascending: false })
      .limit(2),
  ]);

  // Only items on settled tabs count as sold. Open/unpaid tabs must not appear
  // in best sellers or category revenue.
  const orderItems = (orderItemsRes.data || []).filter((item: any) => {
    const tabStatus = String(item.orders?.tabs?.status || '').toUpperCase();
    const orderStatus = String(item.orders?.status || '').toUpperCase();
    return tabStatus === 'BILLED' || tabStatus === 'CLOSED' || orderStatus === 'COMPLETED';
  });

  const productMap = new Map<
    string,
    { name: string; category: string; count: number; sales: number }
  >();
  const catMap = new Map<string, number>();
  let totalItemSales = 0;

  for (const item of orderItems) {
    const pid = item.product_id;
    const name = item.products?.name || 'Menu Item';
    const cat = item.products?.categories?.name || 'General';
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const total = qty * price;

    const currentProd = productMap.get(pid) || { name, category: cat, count: 0, sales: 0 };
    currentProd.count += qty;
    currentProd.sales += total;
    productMap.set(pid, currentProd);

    catMap.set(cat, (catMap.get(cat) || 0) + total);
    totalItemSales += total;
  }

  const sortedProducts = Array.from(productMap.entries()).sort((a, b) => b[1].count - a[1].count);
  const topCount = sortedProducts.length > 0 ? sortedProducts[0][1].count : 1;

  const bestSellers: BestSellerItem[] = sortedProducts.map(([id, d], idx) => ({
    id: `bs-${id}`,
    rank: idx + 1,
    name: d.name,
    category: d.category,
    soldCount: d.count,
    salesAmount: d.sales,
    // Relative to the top seller (bar length), floored at 1% so a tiny bar
    // is still visible; the numeric share is computed against the total below.
    progressPercent: Math.max(1, Math.round((d.count / topCount) * 100)),
  }));

  const sortedCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);

  const categorySales: CategorySalesItem[] = sortedCats.map(([cat, amt]) => ({
    category: cat,
    amount: amt,
    percentage: totalItemSales > 0 ? Math.round((amt / totalItemSales) * 1000) / 10 : 0,
  }));

  const inventoryItems = inventoryRes.data || [];
  const lowStockItems = inventoryItems.filter(
    (i) => Number(i.current_stock) <= Number(i.min_alert_level)
  );
  const alerts: AttentionAlert[] = [];

  if (lowStockItems.length > 0) {
    const itemNames = lowStockItems
      .slice(0, 3)
      .map((i) => i.name)
      .join(', ');
    alerts.push({
      id: 'alert-low-stock',
      type: 'low_stock',
      badgeLabel: 'Low Stock',
      title: `${lowStockItems.length} items below par level (${itemNames})`,
      description: 'Restock raw inventory to prevent kitchen and bar service stockouts',
      targetRoute: 'inventory',
      createdAt: new Date().toISOString(),
    });
  }

  const wasteLogs = wasteRes.data || [];
  if (wasteLogs.length > 0) {
    const recent = wasteLogs[0];
    alerts.push({
      id: `alert-waste-${recent.id}`,
      type: 'void',
      badgeLabel: 'Spillage',
      title: `Waste recorded: ${recent.inventory_items?.name || 'Raw Ingredient'}`,
      description: `Loss of ₱${Number(recent.cost_lost || 0).toFixed(2)} (${recent.quantity} units) due to ${recent.reason}`,
      targetRoute: 'inventory',
      createdAt: recent.created_at,
    });
  }

  const cancelledItems = cancelledRes.data || [];
  if (cancelledItems.length > 0) {
    const voidItem = cancelledItems[0];
    alerts.push({
      id: `alert-void-${voidItem.id}`,
      type: 'void',
      badgeLabel: 'Void',
      title: `Item voided: ${voidItem.products?.name || 'Dish'}`,
      description: `Cancelled item (Qty: ${voidItem.quantity}, ₱${Number(voidItem.unit_price || 0).toFixed(2)})`,
      targetRoute: 'sales',
      createdAt: voidItem.created_at,
    });
  }

  return { bestSellers, categorySales, alerts, lowStockItems };
}
