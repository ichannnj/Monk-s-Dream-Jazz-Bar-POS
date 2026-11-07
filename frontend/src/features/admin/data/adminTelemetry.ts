import { supabase } from '@/features/shared/infrastructure/supabase';
import type {
  DashboardTelemetry,
  BestSellerItem,
  StationTelemetry,
  CategorySalesItem,
  AttentionAlert,
  HourlySalesPoint,
  TimeframeFilter,
  TableTurnoverTelemetry,
  StationsOverviewTelemetry,
} from '../domain/admin.types';

export function getTimeframeBounds(timeframe: TimeframeFilter): {
  startDate?: string;
  endDate?: string;
  benchmarkStart?: string;
  benchmarkEnd?: string;
  label: string;
  benchmarkLabel: string;
} {
  const now = new Date();

  if (timeframe === 'today') {
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const startBenchmark = new Date(startToday);
    startBenchmark.setDate(startBenchmark.getDate() - 7);
    const endBenchmark = new Date(startBenchmark);
    endBenchmark.setDate(endBenchmark.getDate() + 1);

    return {
      startDate: startToday.toISOString(),
      benchmarkStart: startBenchmark.toISOString(),
      benchmarkEnd: endBenchmark.toISOString(),
      label: 'Today (Live Shift)',
      benchmarkLabel: 'vs Same Day Last Week',
    };
  }

  if (timeframe === 'yesterday') {
    const startYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const endYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const startBenchmark = new Date(startYesterday);
    startBenchmark.setDate(startBenchmark.getDate() - 7);
    const endBenchmark = new Date(startBenchmark);
    endBenchmark.setDate(endBenchmark.getDate() + 1);

    return {
      startDate: startYesterday.toISOString(),
      endDate: endYesterday.toISOString(),
      benchmarkStart: startBenchmark.toISOString(),
      benchmarkEnd: endBenchmark.toISOString(),
      label: 'Yesterday',
      benchmarkLabel: 'vs Prior Week Same Day',
    };
  }

  if (timeframe === 'week') {
    const currentDay = now.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const startWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - distanceToMonday,
      0,
      0,
      0
    );

    const startBenchmark = new Date(startWeek);
    startBenchmark.setDate(startBenchmark.getDate() - 7);
    const endBenchmark = new Date(startWeek);

    return {
      startDate: startWeek.toISOString(),
      benchmarkStart: startBenchmark.toISOString(),
      benchmarkEnd: endBenchmark.toISOString(),
      label: 'This Week (WTD)',
      benchmarkLabel: 'vs Prior Week',
    };
  }

  if (timeframe === 'month') {
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const startBenchmark = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const endBenchmark = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    return {
      startDate: startMonth.toISOString(),
      benchmarkStart: startBenchmark.toISOString(),
      benchmarkEnd: endBenchmark.toISOString(),
      label: 'This Month (MTD)',
      benchmarkLabel: 'vs Prior Month',
    };
  }

  // 'all'
  return {
    label: 'All-Time History',
    benchmarkLabel: 'Lifetime Aggregate',
  };
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export const adminTelemetryService = {
  async fetchDashboardTelemetry(
    timeframe: TimeframeFilter = 'today',
    options?: { ignoreResetBaseline?: boolean }
  ): Promise<DashboardTelemetry> {
    const bounds = getTimeframeBounds(timeframe);

    try {
      // 1. QUERY PAYMENTS (Strictly from DB)
      let paymentsQuery = (supabase.from as any)('payments').select(
        'id, amount, payment_method, operating_mode, created_at, tab_id, tabs(order_channel, operating_mode)'
      );

      if (bounds.startDate) paymentsQuery = paymentsQuery.gte('created_at', bounds.startDate);
      if (bounds.endDate) paymentsQuery = paymentsQuery.lt('created_at', bounds.endDate);

      // Query Benchmark Payments for comparative percentage
      let benchmarkQuery = (supabase.from as any)('payments').select('amount');
      if (bounds.benchmarkStart)
        benchmarkQuery = benchmarkQuery.gte('created_at', bounds.benchmarkStart);
      if (bounds.benchmarkEnd)
        benchmarkQuery = benchmarkQuery.lt('created_at', bounds.benchmarkEnd);

      // Query Staff Attendance Records & Active Staff Roster
      let attendanceQuery = (supabase.from as any)('attendance_records').select(
        'id, user_id, date, is_present, shift_status, base_daily_pay, addon_pay, total_day_pay'
      );
      if (bounds.startDate) {
        attendanceQuery = attendanceQuery.gte('date', bounds.startDate.split('T')[0]);
      }
      if (bounds.endDate) {
        attendanceQuery = attendanceQuery.lte('date', bounds.endDate.split('T')[0]);
      }

      const [paymentsRes, benchmarkRes, settingsRes, attendanceRes, staffRes] = await Promise.all([
        paymentsQuery,
        bounds.benchmarkStart ? benchmarkQuery : Promise.resolve({ data: [] }),
        (supabase.from as any)('venue_settings')
          .select('operating_mode, station_metrics_reset_at')
          .limit(1)
          .maybeSingle(),
        attendanceQuery,
        supabase.from('users').select('id, is_active, is_workflow_staff').eq('is_active', true),
      ]);

      const payments = (paymentsRes.data || []) as any[];
      const benchmarkPayments = (benchmarkRes.data || []) as any[];
      const activeOperatingMode = (settingsRes?.data?.operating_mode || 'CAFE') as 'CAFE' | 'EVENT';
      const stationMetricsResetAt = (settingsRes?.data?.station_metrics_reset_at || null) as
        string | null;
      const attendanceRows = (attendanceRes.data || []) as any[];
      const activeStaffRows = (staffRes.data || []) as any[];

      // Compute Attendance & Payroll Metrics
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
      const totalPayrollExpense = presentRows.reduce(
        (sum, r) => sum + (Number(r.total_day_pay) || 0),
        0
      );

      // Compute Revenue & Payment Methods Split & Operating Mode Split
      let liveSalesTotal = 0;
      let cashSales = 0;
      let digitalSales = 0;
      let cardSales = 0;
      let cafeSales = 0;
      let eventSales = 0;
      let cafeOrdersCount = 0;
      let eventOrdersCount = 0;
      const hourlyBucket = new Map<number, number>();

      for (const p of payments) {
        const amt = Number(p.amount) || 0;
        liveSalesTotal += amt;

        if (p.payment_method === 'CASH') cashSales += amt;
        else if (p.payment_method === 'DIGITAL_WALLET') digitalSales += amt;
        else if (p.payment_method === 'CARD') cardSales += amt;

        // Operating Mode Split
        const mode = p.operating_mode || p.tabs?.operating_mode || 'CAFE';
        if (mode === 'EVENT') {
          eventSales += amt;
          eventOrdersCount++;
        } else {
          cafeSales += amt;
          cafeOrdersCount++;
        }

        const h = new Date(p.created_at).getHours();
        hourlyBucket.set(h, (hourlyBucket.get(h) || 0) + amt);
      }

      const cafePercentage =
        liveSalesTotal > 0 ? Math.round((cafeSales / liveSalesTotal) * 100) : 0;
      const eventPercentage = liveSalesTotal > 0 ? 100 - cafePercentage : 0;
      const cafeAvgCheck = cafeOrdersCount > 0 ? cafeSales / cafeOrdersCount : 0;
      const eventAvgCheck = eventOrdersCount > 0 ? eventSales / eventOrdersCount : 0;

      const orderCount = payments.length;
      const averageCheck = orderCount > 0 ? liveSalesTotal / orderCount : 0;
      const guestCount = Math.round(orderCount * 1.5);
      const spendPerGuest = guestCount > 0 ? liveSalesTotal / guestCount : 0;

      // Comparative Growth Delta
      let salesGrowthPercent = 0;
      let ordersGrowthPercent = 0;
      if (benchmarkPayments.length > 0) {
        const benchmarkSales = benchmarkPayments.reduce(
          (acc, p) => acc + (Number(p.amount) || 0),
          0
        );
        if (benchmarkSales > 0) {
          salesGrowthPercent = Number(
            (((liveSalesTotal - benchmarkSales) / benchmarkSales) * 100).toFixed(1)
          );
        }
        ordersGrowthPercent = Number(
          (((orderCount - benchmarkPayments.length) / benchmarkPayments.length) * 100).toFixed(1)
        );
      }

      // Build Hourly Sales distribution (Standard venue operating hours: 8 AM to 11 PM)
      const hoursToDisplay = [8, 10, 12, 13, 14, 16, 18, 20, 22];
      let maxHourSales = 1;
      let peakHour = 13;

      for (const h of hoursToDisplay) {
        const s = hourlyBucket.get(h) || 0;
        if (s > maxHourSales) {
          maxHourSales = s;
          peakHour = h;
        }
      }

      const hourlySales: HourlySalesPoint[] = hoursToDisplay.map((h) => ({
        hourLabel: formatHour(h),
        sales: hourlyBucket.get(h) || 0,
        isPeak: h === peakHour && (hourlyBucket.get(h) || 0) > 0,
      }));

      // 2. QUERY LIVE FLOOR OCCUPANCY & TABLES (Strictly from DB)
      const [tablesRes, openTabsRes] = await Promise.all([
        supabase.from('tables').select('id, table_number, zone, capacity, is_occupied'),
        supabase
          .from('tabs')
          .select('id, status, customer_name, table_id, order_channel')
          .eq('status', 'OPEN'),
      ]);

      const allTables = tablesRes.data || [];
      const openTabs = openTabsRes.data || [];
      const openTableIds = new Set(
        openTabs.filter((tb) => tb.table_id).map((tb) => tb.table_id as string)
      );

      // Self-heal any desynchronized tables where is_occupied is true but has 0 open tabs
      const desyncedTables = allTables.filter((t) => t.is_occupied && !openTableIds.has(t.id));
      if (desyncedTables.length > 0) {
        Promise.resolve(
          supabase
            .from('tables')
            .update({ is_occupied: false, updated_at: new Date().toISOString() })
            .in(
              'id',
              desyncedTables.map((t) => t.id)
            )
        ).catch((err: unknown) => {
          console.warn('[adminTelemetry] Auto-heal table occupancy error:', err);
        });
      }

      const totalTables = allTables.length;
      // Authoritative occupancy: strictly requires an active OPEN tab for the table
      const occupiedTables = allTables.filter((t) => openTableIds.has(t.id)).length;
      const activeOpenTabs = openTabs.length;
      const occupancyPercent =
        totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

      // 3. QUERY BEST SELLERS & CATEGORY REVENUE (Strictly from order_items in DB)
      let orderItemsQuery = (supabase.from as any)('order_items')
        .select(
          'product_id, quantity, unit_price, status, created_at, products(name, category_id, categories(name))'
        )
        .neq('status', 'CANCELLED');

      if (bounds.startDate) orderItemsQuery = orderItemsQuery.gte('created_at', bounds.startDate);
      if (bounds.endDate) orderItemsQuery = orderItemsQuery.lt('created_at', bounds.endDate);

      const { data: orderItemsData } = await orderItemsQuery;
      const orderItems = orderItemsData || [];

      const productMap = new Map<
        string,
        { name: string; category: string; count: number; sales: number }
      >();
      const catMap = new Map<string, number>();

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
      }

      // Ranked Best Sellers
      const sortedProducts = Array.from(productMap.entries()).sort(
        (a, b) => b[1].count - a[1].count
      );
      const topCount = sortedProducts.length > 0 ? sortedProducts[0][1].count : 1;

      const bestSellers: BestSellerItem[] = sortedProducts.map(([id, d], idx) => ({
        id: `bs-${id}`,
        rank: idx + 1,
        name: d.name,
        category: d.category,
        soldCount: d.count,
        salesAmount: d.sales,
        progressPercent: Math.min(100, Math.max(10, Math.round((d.count / topCount) * 100))),
      }));

      // Sales By Category
      const sortedCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
      const topCatSales = sortedCats.length > 0 ? sortedCats[0][1] : 1;

      const categorySales: CategorySalesItem[] = sortedCats.map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: Math.min(100, Math.max(10, Math.round((amt / topCatSales) * 100))),
      }));

      // 4. QUERY LIVE ATTENTION ALERTS (Low Stock, Waste Logs, Voids strictly from DB)
      const [inventoryRes, wasteRes, cancelledRes] = await Promise.all([
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

      const alerts: AttentionAlert[] = [];

      // Alert 1: Low Stock Par Alerts
      const inventoryItems = inventoryRes.data || [];
      const lowStockItems = inventoryItems.filter(
        (i) => Number(i.current_stock) <= Number(i.min_alert_level)
      );
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

      // Alert 2: Recent Spillage / Waste
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

      // Alert 3: Cancelled / Voided Order Items
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

      // 5. STATIONS TELEMETRY (Query live active orders AND completed items in timeframe)
      const formatDuration = (totalSec: number): string => {
        const m = Math.floor(totalSec / 60);
        const s = Math.floor(totalSec % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      const { data: openOrdersData } = await (supabase.from as any)('orders')
        .select(
          `
          id, status, created_at,
          tabs!inner(id, status, customer_name),
          order_items(
            id, status, station_target, created_at, delivered_at, updated_at,
            products(name, category_id, categories(name))
          )
        `
        )
        .in('status', ['OPEN', 'IN_PREPARATION'])
        .eq('tabs.status', 'OPEN');

      const openOrders = openOrdersData || [];
      const nowMs = Date.now();

      // 5a. Determine effective start date for station metrics (respecting reset baseline for 'today')
      let effectiveStationStart = bounds.startDate;
      if (timeframe === 'today' && stationMetricsResetAt && !options?.ignoreResetBaseline) {
        effectiveStationStart = stationMetricsResetAt;
      }

      // 5b. Query completed order items in the timeframe (status = 'SERVED')
      let completedItemsQuery = (supabase.from as any)('order_items')
        .select(
          `
          id, status, created_at, delivered_at, updated_at, station_target,
          products(name, category_id, categories(name)),
          orders!inner(id, status, created_at, tab_id)
        `
        )
        .eq('status', 'SERVED');

      if (effectiveStationStart) {
        completedItemsQuery = completedItemsQuery.gte('updated_at', effectiveStationStart);
      }
      if (bounds.endDate) {
        completedItemsQuery = completedItemsQuery.lt('updated_at', bounds.endDate);
      }

      const { data: completedItemsData } = await completedItemsQuery;
      const completedItems = (completedItemsData || []) as any[];

      // Active In-Flight Tickets & Timestamps
      let barTickets = 0;
      let barElapsedSum = 0;
      let barLate = 0;
      const barTimestamps: string[] = [];

      let cafeTickets = 0;
      let cafeElapsedSum = 0;
      let cafeLate = 0;
      const cafeTimestamps: string[] = [];

      let kitchenTickets = 0;
      let kitchenElapsedSum = 0;
      let kitchenLate = 0;
      const kitchenTimestamps: string[] = [];

      let runnerTickets = 0;
      let runnerElapsedSum = 0;
      let runnerLate = 0;
      const runnerTimestamps: string[] = [];

      for (const ord of openOrders) {
        const orderIso = ord.created_at || new Date(nowMs).toISOString();
        const orderTime = new Date(orderIso).getTime();
        const elapsedSec = Math.max(0, Math.floor((nowMs - orderTime) / 1000));
        const items = ord.order_items || [];
        const activeItems = items.filter(
          (i: any) => i.status !== 'SERVED' && i.status !== 'CANCELLED'
        );

        const hasBar = activeItems.some((i: any) => {
          const cat = (i.products?.categories?.name || '').toLowerCase();
          const target = i.station_target || '';
          return (
            target === 'bar' &&
            !cat.includes('coffee') &&
            !cat.includes('espresso') &&
            !cat.includes('tea')
          );
        });

        const hasCafe = activeItems.some((i: any) => {
          const cat = (i.products?.categories?.name || '').toLowerCase();
          const target = i.station_target || '';
          return (
            target === 'cafe' ||
            (target === 'bar' &&
              (cat.includes('coffee') || cat.includes('espresso') || cat.includes('tea')))
          );
        });

        const hasKitchen = activeItems.some((i: any) => i.station_target === 'kitchen');
        const hasRunner = activeItems.some((i: any) => i.status === 'READY');

        if (hasBar) {
          barTickets++;
          barElapsedSum += elapsedSec;
          barTimestamps.push(orderIso);
          if (elapsedSec > 600) barLate++; // Target 10:00
        }
        if (hasCafe) {
          cafeTickets++;
          cafeElapsedSum += elapsedSec;
          cafeTimestamps.push(orderIso);
          if (elapsedSec > 360) cafeLate++; // Target 06:00
        }
        if (hasKitchen) {
          kitchenTickets++;
          kitchenElapsedSum += elapsedSec;
          kitchenTimestamps.push(orderIso);
          if (elapsedSec > 900) kitchenLate++; // Target 15:00
        }
        if (hasRunner) {
          runnerTickets++;
          runnerElapsedSum += elapsedSec;
          runnerTimestamps.push(orderIso);
          if (elapsedSec > 180) runnerLate++; // Target 03:00
        }
      }

      // Aggregate completed items per station
      let barDone = 0;
      let barDoneSec = 0;
      let barDoneLate = 0;

      let cafeDone = 0;
      let cafeDoneSec = 0;
      let cafeDoneLate = 0;

      let kitchenDone = 0;
      let kitchenDoneSec = 0;
      let kitchenDoneLate = 0;

      let runnerDone = 0;
      let runnerDoneSec = 0;
      let runnerDoneLate = 0;

      for (const item of completedItems) {
        const cat = (item.products?.categories?.name || '').toLowerCase();
        const target = item.station_target || '';
        const endIso = item.delivered_at || item.updated_at || item.created_at;
        const startIso = item.created_at || item.orders?.created_at || endIso;
        const durationSec = Math.max(
          1,
          Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000)
        );

        const isBar =
          target === 'bar' &&
          !cat.includes('coffee') &&
          !cat.includes('espresso') &&
          !cat.includes('tea');
        const isCafe =
          target === 'cafe' ||
          (target === 'bar' &&
            (cat.includes('coffee') || cat.includes('espresso') || cat.includes('tea')));
        const isKitchen = target === 'kitchen';

        if (isBar) {
          barDone++;
          barDoneSec += durationSec;
          if (durationSec > 600) barDoneLate++;
        }
        if (isCafe) {
          cafeDone++;
          cafeDoneSec += durationSec;
          if (durationSec > 360) cafeDoneLate++;
        }
        if (isKitchen) {
          kitchenDone++;
          kitchenDoneSec += durationSec;
          if (durationSec > 900) kitchenDoneLate++;
        }
        // Every served item was delivered to guest by Runner
        runnerDone++;
        runnerDoneSec += durationSec;
        if (durationSec > 180) runnerDoneLate++;
      }

      // 5c. Query Settled Tabs in timeframe to calculate REAL Table Turnover
      let settledTabsQuery = (supabase.from as any)('tabs')
        .select('id, table_id, customer_name, order_type, status, created_at, updated_at')
        .eq('status', 'BILLED');

      if (effectiveStationStart) {
        settledTabsQuery = settledTabsQuery.gte('updated_at', effectiveStationStart);
      }
      if (bounds.endDate) {
        settledTabsQuery = settledTabsQuery.lt('updated_at', bounds.endDate);
      }

      const { data: settledTabsData } = await settledTabsQuery;
      const settledTabs = (settledTabsData || []) as any[];

      let totalDwellMinutes = 0;
      let turnedTablesCount = 0;

      for (const tab of settledTabs) {
        if (tab.created_at && tab.updated_at) {
          const startMs = new Date(tab.created_at).getTime();
          const endMs = new Date(tab.updated_at).getTime();
          const dwellMins = Math.max(1, Math.round((endMs - startMs) / 60000));
          totalDwellMinutes += dwellMins;
          turnedTablesCount++;
        }
      }

      const avgTableTurnoverMinutes =
        turnedTablesCount > 0 ? Math.round(totalDwellMinutes / turnedTablesCount) : 0;

      const formatTurnover = (mins: number): string => {
        if (mins === 0) return '0 min';
        if (mins < 60) return `${mins} min`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
      };

      const tableTurnover: TableTurnoverTelemetry = {
        avgMinutes: avgTableTurnoverMinutes,
        avgFormatted: formatTurnover(avgTableTurnoverMinutes),
        totalTablesTurned: turnedTablesCount,
        activeOccupiedTables: occupiedTables,
      };

      const totalCompletedTickets = barDone + cafeDone + kitchenDone + runnerDone;
      const totalAllTickets =
        totalCompletedTickets + barTickets + cafeTickets + kitchenTickets + runnerTickets;
      const totalAllLate =
        barDoneLate +
        barLate +
        cafeDoneLate +
        cafeLate +
        kitchenDoneLate +
        kitchenLate +
        runnerDoneLate +
        runnerLate;
      const overallSlaPercent =
        totalAllTickets > 0
          ? Number((((totalAllTickets - totalAllLate) / totalAllTickets) * 100).toFixed(1))
          : 100;

      const stationSpeeds = [
        { name: 'Bar Counter', sec: barDone > 0 ? barDoneSec / barDone : 99999 },
        { name: 'Barista Espresso', sec: cafeDone > 0 ? cafeDoneSec / cafeDone : 99999 },
        { name: 'Kitchen Hot Line', sec: kitchenDone > 0 ? kitchenDoneSec / kitchenDone : 99999 },
        { name: 'FOH Expediter', sec: runnerDone > 0 ? runnerDoneSec / runnerDone : 99999 },
      ];
      stationSpeeds.sort((a, b) => a.sec - b.sec);
      const fastestStation =
        stationSpeeds[0].sec < 99999 ? stationSpeeds[0].name : 'Barista Espresso';

      const stationLoads = [
        { name: 'Bar Counter', count: barDone + barTickets },
        { name: 'Barista Espresso', count: cafeDone + cafeTickets },
        { name: 'Kitchen Hot Line', count: kitchenDone + kitchenTickets },
        { name: 'FOH Expediter', count: runnerDone + runnerTickets },
      ];
      stationLoads.sort((a, b) => b.count - a.count);
      const busiestStation = stationLoads[0].count > 0 ? stationLoads[0].name : 'Bar Counter';

      const stationsOverview: StationsOverviewTelemetry = {
        totalCompletedTickets,
        overallSlaPercent,
        fastestStation,
        busiestStation,
      };

      // 5d. Query live station online/heartbeat status from DB
      const { data: stationStatusRows } = await (supabase.from as any)('station_status').select(
        '*'
      );
      const statusMap = new Map<string, { is_online: boolean; last_heartbeat: string | null }>();
      (stationStatusRows || []).forEach((r: any) => {
        statusMap.set(r.station_key, {
          is_online: Boolean(r.is_online),
          last_heartbeat: r.last_heartbeat || null,
        });
      });

      const isStationReallyOnline = (stationKey: string): boolean => {
        const info = statusMap.get(stationKey);
        if (!info || !info.is_online) return false;
        if (!info.last_heartbeat) return false;
        // Require a live heartbeat within the last 5 minutes (300,000 ms)
        const elapsed = nowMs - new Date(info.last_heartbeat).getTime();
        return elapsed < 300000;
      };

      const stations: StationTelemetry[] = [
        {
          stationKey: 'bar',
          name: 'Bar Counter',
          isOnline: isStationReallyOnline('bar'),
          targetTicketTime: '10:00',
          activeTickets: barTickets,
          avgTicketTime:
            barDone > 0
              ? formatDuration(barDoneSec / barDone)
              : barTickets > 0
                ? formatDuration(barElapsedSum / barTickets)
                : 'Idle',
          avgTicketSeconds: barDone > 0 ? Math.round(barDoneSec / barDone) : 0,
          completedTickets: barDone,
          onTimeRate:
            barDone + barTickets > 0
              ? Math.round(
                  ((barDone + barTickets - (barDoneLate + barLate)) / (barDone + barTickets)) * 100
                )
              : 100,
          lateTickets: barDoneLate + barLate,
          activeTicketTimestamps: barTimestamps,
          stockoutCount: lowStockItems.filter(
            (i) =>
              i.name.toLowerCase().includes('bourbon') ||
              i.name.toLowerCase().includes('gin') ||
              i.name.toLowerCase().includes('wine')
          ).length,
        },
        {
          stationKey: 'cafe',
          name: 'Barista Espresso',
          isOnline: isStationReallyOnline('cafe'),
          targetTicketTime: '06:00',
          activeTickets: cafeTickets,
          avgTicketTime:
            cafeDone > 0
              ? formatDuration(cafeDoneSec / cafeDone)
              : cafeTickets > 0
                ? formatDuration(cafeElapsedSum / cafeTickets)
                : 'Idle',
          avgTicketSeconds: cafeDone > 0 ? Math.round(cafeDoneSec / cafeDone) : 0,
          completedTickets: cafeDone,
          onTimeRate:
            cafeDone + cafeTickets > 0
              ? Math.round(
                  ((cafeDone + cafeTickets - (cafeDoneLate + cafeLate)) /
                    (cafeDone + cafeTickets)) *
                    100
                )
              : 100,
          lateTickets: cafeDoneLate + cafeLate,
          activeTicketTimestamps: cafeTimestamps,
          stockoutCount: lowStockItems.filter(
            (i) =>
              i.name.toLowerCase().includes('milk') ||
              i.name.toLowerCase().includes('bean') ||
              i.name.toLowerCase().includes('syrup')
          ).length,
        },
        {
          stationKey: 'kitchen',
          name: 'Kitchen Hot Line',
          isOnline: isStationReallyOnline('kitchen'),
          targetTicketTime: '15:00',
          activeTickets: kitchenTickets,
          avgTicketTime:
            kitchenDone > 0
              ? formatDuration(kitchenDoneSec / kitchenDone)
              : kitchenTickets > 0
                ? formatDuration(kitchenElapsedSum / kitchenTickets)
                : 'Idle',
          avgTicketSeconds: kitchenDone > 0 ? Math.round(kitchenDoneSec / kitchenDone) : 0,
          completedTickets: kitchenDone,
          onTimeRate:
            kitchenDone + kitchenTickets > 0
              ? Math.round(
                  ((kitchenDone + kitchenTickets - (kitchenDoneLate + kitchenLate)) /
                    (kitchenDone + kitchenTickets)) *
                    100
                )
              : 100,
          lateTickets: kitchenDoneLate + kitchenLate,
          activeTicketTimestamps: kitchenTimestamps,
          stockoutCount: lowStockItems.filter(
            (i) =>
              i.name.toLowerCase().includes('pasta') ||
              i.name.toLowerCase().includes('dough') ||
              i.name.toLowerCase().includes('cheese')
          ).length,
        },
        {
          stationKey: 'runner',
          name: 'FOH Expediter',
          isOnline: isStationReallyOnline('runner'),
          targetTicketTime: '03:00',
          activeTickets: runnerTickets,
          avgTicketTime:
            runnerDone > 0
              ? formatDuration(runnerDoneSec / runnerDone)
              : runnerTickets > 0
                ? formatDuration(runnerElapsedSum / runnerTickets)
                : 'Idle',
          avgTicketSeconds: runnerDone > 0 ? Math.round(runnerDoneSec / runnerDone) : 0,
          completedTickets: runnerDone,
          onTimeRate:
            runnerDone + runnerTickets > 0
              ? Math.round(
                  ((runnerDone + runnerTickets - (runnerDoneLate + runnerLate)) /
                    (runnerDone + runnerTickets)) *
                    100
                )
              : 100,
          lateTickets: runnerDoneLate + runnerLate,
          activeTicketTimestamps: runnerTimestamps,
          stockoutCount: 0,
        },
      ];

      return {
        liveSalesTotal,
        salesGrowthPercent,
        orderCount,
        ordersGrowthPercent,
        ordersPerHour: Math.max(0, Math.round(orderCount / 7)),
        averageCheck,
        averageCheckGrowthPercent: 0,
        guestCount,
        guestGrowthPercent: 0,
        spendPerGuest,

        // Direct DB Operational Floor Metrics
        cashSales,
        digitalSales,
        cardSales,

        // Attendance & Payroll Expenses (Real DB Ledger)
        totalPayrollExpense,
        basePayrollTotal,
        bonusPayrollTotal,
        laborCostPercent:
          liveSalesTotal > 0
            ? Number(((totalPayrollExpense / liveSalesTotal) * 100).toFixed(1))
            : 0,
        estimatedCogs: Number((liveSalesTotal * 0.28).toFixed(2)),
        estimatedNetProfit: Math.max(
          0,
          Number((liveSalesTotal - liveSalesTotal * 0.28 - totalPayrollExpense).toFixed(2))
        ),
        clockedInStaffCount,
        completedShiftsCount,
        presentStaffCount,
        totalActiveStaffCount,

        // Operating Mode Revenue Split (Cafe vs Event vs Total)
        cafeSales,
        eventSales,
        cafePercentage,
        eventPercentage,
        cafeOrdersCount,
        eventOrdersCount,
        cafeAvgCheck,
        eventAvgCheck,
        activeOperatingMode,

        totalTables,
        occupiedTables,
        activeOpenTabs,
        occupancyPercent,
        timeframe,
        timeframeLabel: bounds.label,
        benchmarkLabel: bounds.benchmarkLabel,

        hourlySales,
        peakHourLabel: peakHour ? `Peak · ${formatHour(peakHour)}` : 'No Sales Yet',
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
      // In case of any unexpected network issue, return real zero state rather than mock numbers
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

        totalTables: 25,
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
