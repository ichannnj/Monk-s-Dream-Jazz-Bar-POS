import { supabase } from '@/features/shared/infrastructure/supabase';
import type {
  StationTelemetry,
  TableTurnoverTelemetry,
  StationsOverviewTelemetry,
} from '../../domain/admin.types';
import { formatDuration, formatTurnover } from './timeframeBounds';

export async function fetchFloorTableOccupancy() {
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
  const occupiedTables = allTables.filter((t) => openTableIds.has(t.id)).length;
  const activeOpenTabs = openTabs.length;
  const occupancyPercent = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  return { totalTables, occupiedTables, activeOpenTabs, occupancyPercent };
}

export async function fetchStationsAndTurnoverTelemetry({
  bounds,
  effectiveStationStart,
  nowMs,
  lowStockItems,
  occupiedTables,
}: {
  bounds: { startDate?: string; endDate?: string };
  effectiveStationStart?: string;
  nowMs: number;
  lowStockItems: any[];
  occupiedTables: number;
}): Promise<{
  stations: StationTelemetry[];
  tableTurnover: TableTurnoverTelemetry;
  stationsOverview: StationsOverviewTelemetry;
}> {
  let openOrdersQuery = (supabase.from as any)('orders')
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

  if (effectiveStationStart)
    openOrdersQuery = openOrdersQuery.gte('created_at', effectiveStationStart);
  if (bounds.endDate) openOrdersQuery = openOrdersQuery.lt('created_at', bounds.endDate);

  let completedItemsQuery = (supabase.from as any)('order_items')
    .select(
      `
      id, status, created_at, delivered_at, updated_at, station_target,
      products(name, category_id, categories(name)),
      orders!inner(id, status, created_at, tab_id)
    `
    )
    .eq('status', 'SERVED');

  if (effectiveStationStart)
    completedItemsQuery = completedItemsQuery.gte('updated_at', effectiveStationStart);
  if (bounds.endDate) completedItemsQuery = completedItemsQuery.lt('updated_at', bounds.endDate);

  let settledTabsQuery = (supabase.from as any)('tabs')
    .select('id, table_id, customer_name, order_type, status, created_at, updated_at')
    .eq('status', 'BILLED');

  if (effectiveStationStart)
    settledTabsQuery = settledTabsQuery.gte('updated_at', effectiveStationStart);
  if (bounds.endDate) settledTabsQuery = settledTabsQuery.lt('updated_at', bounds.endDate);

  const [openOrdersRes, completedItemsRes, settledTabsRes, stationStatusRes] = await Promise.all([
    openOrdersQuery,
    completedItemsQuery,
    settledTabsQuery,
    (supabase.from as any)('station_status').select('*'),
  ]);

  const openOrders = openOrdersRes.data || [];
  const completedItems = (completedItemsRes.data || []) as any[];
  const settledTabs = (settledTabsRes.data || []) as any[];

  let barTickets = 0;
  let barElapsedSum = 0;
  let barLate = 0;
  const barTimestamps: string[] = [];

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
    const activeItems = items.filter((i: any) => i.status !== 'SERVED' && i.status !== 'CANCELLED');

    const hasBar = activeItems.some((i: any) => {
      const target = i.station_target || '';
      return target === 'bar' || target === 'cafe';
    });
    const hasKitchen = activeItems.some((i: any) => i.station_target === 'kitchen');
    const hasRunner = activeItems.some((i: any) => i.status === 'READY');

    if (hasBar) {
      barTickets++;
      barElapsedSum += elapsedSec;
      barTimestamps.push(orderIso);
      if (elapsedSec > 480) barLate++;
    }
    if (hasKitchen) {
      kitchenTickets++;
      kitchenElapsedSum += elapsedSec;
      kitchenTimestamps.push(orderIso);
      if (elapsedSec > 900) kitchenLate++;
    }
    if (hasRunner) {
      runnerTickets++;
      runnerElapsedSum += elapsedSec;
      runnerTimestamps.push(orderIso);
      if (elapsedSec > 180) runnerLate++;
    }
  }

  let barDone = 0;
  let barDoneSec = 0;
  let barDoneLate = 0;

  let kitchenDone = 0;
  let kitchenDoneSec = 0;
  let kitchenDoneLate = 0;

  let runnerDone = 0;
  let runnerDoneSec = 0;
  let runnerDoneLate = 0;

  for (const item of completedItems) {
    const target = item.station_target || '';
    const endIso = item.delivered_at || item.updated_at || item.created_at;
    const startIso = item.created_at || item.orders?.created_at || endIso;
    const durationSec = Math.max(
      1,
      Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000)
    );

    if (target === 'bar' || target === 'cafe') {
      barDone++;
      barDoneSec += durationSec;
      if (durationSec > 480) barDoneLate++;
    } else if (target === 'kitchen') {
      kitchenDone++;
      kitchenDoneSec += durationSec;
      if (durationSec > 900) kitchenDoneLate++;
    }
    runnerDone++;
    runnerDoneSec += durationSec;
    if (durationSec > 180) runnerDoneLate++;
  }

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
  const tableTurnover: TableTurnoverTelemetry = {
    avgMinutes: avgTableTurnoverMinutes,
    avgFormatted: formatTurnover(avgTableTurnoverMinutes),
    totalTablesTurned: turnedTablesCount,
    activeOccupiedTables: occupiedTables,
  };

  const totalCompletedTickets = barDone + kitchenDone + runnerDone;
  const totalAllTickets = totalCompletedTickets + barTickets + kitchenTickets + runnerTickets;
  const totalAllLate =
    barDoneLate + barLate + kitchenDoneLate + kitchenLate + runnerDoneLate + runnerLate;
  const overallSlaPercent =
    totalAllTickets > 0
      ? Number((((totalAllTickets - totalAllLate) / totalAllTickets) * 100).toFixed(1))
      : 100;

  const stationSpeeds = [
    { name: 'Bar & Cafe', sec: barDone > 0 ? barDoneSec / barDone : 99999 },
    { name: 'Kitchen Hot Line', sec: kitchenDone > 0 ? kitchenDoneSec / kitchenDone : 99999 },
    { name: 'FOH Expediter', sec: runnerDone > 0 ? runnerDoneSec / runnerDone : 99999 },
  ];
  stationSpeeds.sort((a, b) => a.sec - b.sec);
  const fastestStation = stationSpeeds[0].sec < 99999 ? stationSpeeds[0].name : 'Bar & Cafe';

  const stationLoads = [
    { name: 'Bar & Cafe', count: barDone + barTickets },
    { name: 'Kitchen Hot Line', count: kitchenDone + kitchenTickets },
    { name: 'FOH Expediter', count: runnerDone + runnerTickets },
  ];
  stationLoads.sort((a, b) => b.count - a.count);
  const busiestStation = stationLoads[0].count > 0 ? stationLoads[0].name : 'Bar & Cafe';

  const stationsOverview: StationsOverviewTelemetry = {
    totalCompletedTickets,
    overallSlaPercent,
    fastestStation,
    busiestStation,
  };

  const statusMap = new Map<string, { is_online: boolean; last_heartbeat: string | null }>();
  (stationStatusRes.data || []).forEach((r: any) => {
    statusMap.set(r.station_key, {
      is_online: Boolean(r.is_online),
      last_heartbeat: r.last_heartbeat || null,
    });
  });

  const isStationReallyOnline = (stationKey: string): boolean => {
    const info = statusMap.get(stationKey);
    if (!info || !info.is_online || !info.last_heartbeat) return false;
    return nowMs - new Date(info.last_heartbeat).getTime() < 300000;
  };

  const stations: StationTelemetry[] = [
    {
      stationKey: 'bar',
      name: 'Bar & Cafe Station',
      isOnline: isStationReallyOnline('bar') || isStationReallyOnline('cafe'),
      targetTicketTime: '08:00',
      activeTickets: barTickets,
      avgTicketTime: barDone > 0 ? formatDuration(barDoneSec / barDone) : 'Idle',
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
          i.name.toLowerCase().includes('wine') ||
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
      avgTicketTime: kitchenDone > 0 ? formatDuration(kitchenDoneSec / kitchenDone) : 'Idle',
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
      avgTicketTime: runnerDone > 0 ? formatDuration(runnerDoneSec / runnerDone) : 'Idle',
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

  return { stations, tableTurnover, stationsOverview };
}
