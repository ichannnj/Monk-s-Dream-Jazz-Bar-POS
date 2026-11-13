import { TableItem, TakeoutOrder, OnlineDeliveryOrder } from '@/types/floor';
import { BarTicket, StockInventoryItem } from '../../barista/types';
import { getElapsedSeconds, formatElapsedTimer } from '@/features/shared/utils/elapsedTime';

export function mapDineInTableTickets(
  tables: TableItem[],
  stationTarget: 'bar' | 'kitchen',
  inventory: StockInventoryItem[],
  dismissedTicketIds?: Set<string>
): BarTicket[] {
  const list: BarTicket[] = [];

  tables.forEach((table) => {
    (table.tabs || []).forEach((tab) => {
      if (tab.status === 'billed' || (tab as any).status === 'closed') return;
      const stationItems = (tab.items || []).filter(
        (item) => item.stationTarget === stationTarget && item.categorySlug !== 'door_charge'
      );
      if (stationItems.length === 0) return;

      const roundsMap = new Map<number, typeof stationItems>();
      stationItems.forEach((item) => {
        const r = item.roundNumber || 1;
        if (!roundsMap.has(r)) roundsMap.set(r, []);
        roundsMap.get(r)!.push(item);
      });

      const sortedRoundNums = Array.from(roundsMap.keys()).sort((a, b) => a - b);
      sortedRoundNums.forEach((roundNum) => {
        const roundItems = roundsMap.get(roundNum)!;
        const activeRoundItems = roundItems.filter((i) => i.status !== 'cancelled');
        const allCancelled =
          roundItems.length > 0 && roundItems.every((i) => i.status === 'cancelled');

        const ticketId = `tbl-${table.id}-tab${tab.tabIndex}-r${roundNum}-${stationTarget}`;
        if (activeRoundItems.length === 0) {
          if (!allCancelled || dismissedTicketIds?.has(ticketId)) return;
        }

        const allServed =
          activeRoundItems.length > 0 && activeRoundItems.every((i) => i.status === 'served');
        if (allServed) return;

        const allReady =
          activeRoundItems.length > 0 && activeRoundItems.every((i) => i.status === 'ready');
        const hasPrep = activeRoundItems.some((i) => i.status === 'preparing');
        const hasCancelled = roundItems.some((i) => i.status === 'cancelled');

        let stage: BarTicket['stage'] = 'new';
        if (allCancelled) stage = 'cancelled';
        else if (allReady) stage = 'ready';
        else if (hasPrep) stage = 'preparing';

        const badges: string[] = [];
        if (stage === 'cancelled') {
          badges.push('🚨 ORDER CANCELLED', 'DO NOT PREPARE');
        } else {
          if (roundNum > 1) badges.push(`ROUND ${roundNum}`);
          if (stage === 'new') badges.push('NEW', 'JUST IN');
          else if (stage === 'preparing') badges.push('PREPARING');
          else badges.push('READY');
          if (hasCancelled) badges.push('ITEM VOIDED');
        }
        if (tab.transferredFrom) {
          badges.push(`MOVED: ${tab.transferredFrom.tableCode} ➔ ${table.code}`);
        }

        const otherStationItems = (tab.items || []).filter(
          (i) => (i.roundNumber || 1) === roundNum && i.stationTarget !== stationTarget
        );
        const otherLabel = stationTarget === 'bar' ? 'food item(s) at Kitchen' : 'drink(s) at Bar';
        const multiStationTag =
          otherStationItems.length > 0
            ? `Multi-Station · ${otherStationItems.length} ${otherLabel}`
            : undefined;

        const roundCreatedAt =
          activeRoundItems.find((i) => i.createdAt)?.createdAt ||
          tab.openedAtIso ||
          table.occupiedSinceIso;

        const stageTimestamp =
          stage === 'ready'
            ? activeRoundItems
                .map((i) => i.readyAt || i.stateChangedAt)
                .filter(Boolean)
                .sort()
                .reverse()[0] || roundCreatedAt
            : stage === 'preparing'
              ? activeRoundItems
                  .map((i) => i.preparingAt || i.stateChangedAt)
                  .filter(Boolean)
                  .sort()[0] || roundCreatedAt
              : roundCreatedAt;

        const elapsedSecs = getElapsedSeconds(stageTimestamp, table.elapsedTime);
        const minutes = Math.max(1, Math.floor(elapsedSecs / 60));
        const cleanCode = table.code
          .replace('Table ', 'T')
          .replace('Cafe ', 'C')
          .replace('Bar ', 'B');
        const guestStr = tab.guestName ? ` · "${tab.guestName}"` : '';

        list.push({
          id: ticketId,
          orderNumber: `#${cleanCode}-${tab.tabIndex}-R${roundNum}`,
          tableOrSource: `${table.code} · Tab ${tab.tabIndex}${guestStr}`,
          stage,
          roundNumber: roundNum,
          tableId: table.id,
          tabIndex: tab.tabIndex,
          createdAt: roundCreatedAt,
          stageTimestamp,
          elapsedTime: formatElapsedTimer(elapsedSecs),
          minutesElapsed: minutes,
          badges,
          multiStationTag,
          transferredFrom: tab.transferredFrom,
          items: roundItems.map((bi) => ({
            ...bi,
            isVoided: bi.status === 'cancelled',
            is86: inventory.find((inv) =>
              inv.name.toLowerCase().includes(bi.productName.toLowerCase())
            )?.is86,
          })),
          voidNote: allCancelled
            ? '! All items voided/cancelled · Stop preparation'
            : hasCancelled
              ? '! Item(s) voided · Do not prepare'
              : undefined,
          serverName: tab.guestName,
        });
      });
    });
  });

  return list;
}

export function mapTakeoutTickets(
  takeoutOrders: TakeoutOrder[],
  stationTarget: 'bar' | 'kitchen',
  dismissedTicketIds?: Set<string>
): BarTicket[] {
  const list: BarTicket[] = [];

  takeoutOrders.forEach((order) => {
    if (order.status === 'completed') return;
    const stationItems = (order.items || []).filter(
      (i) => i.stationTarget === stationTarget && i.categorySlug !== 'door_charge'
    );
    const activeItems = stationItems.filter((i) => i.status !== 'cancelled');
    const allCancelled =
      stationItems.length > 0 && stationItems.every((i) => i.status === 'cancelled');

    const ticketId = `takeout-${order.id}`;
    if (activeItems.length === 0) {
      if (!allCancelled || dismissedTicketIds?.has(ticketId)) return;
    }
    if (activeItems.length > 0 && activeItems.every((i) => i.status === 'served')) return;

    const allReady = activeItems.length > 0 && activeItems.every((i) => i.status === 'ready');
    const hasPrep = activeItems.some((i) => i.status === 'preparing');
    let stage: BarTicket['stage'] = 'new';
    if (allCancelled) stage = 'cancelled';
    else if (order.status === 'ready' || allReady) stage = 'ready';
    else if (hasPrep || order.status === 'preparing') stage = 'preparing';

    const orderCreatedAt = order.createdAt || activeItems.find((i) => i.createdAt)?.createdAt;
    const stageTimestamp =
      stage === 'ready'
        ? activeItems
            .map((i) => i.readyAt || i.stateChangedAt)
            .filter(Boolean)
            .sort()
            .reverse()[0] || orderCreatedAt
        : stage === 'preparing'
          ? activeItems
              .map((i) => i.preparingAt || i.stateChangedAt)
              .filter(Boolean)
              .sort()[0] || orderCreatedAt
          : orderCreatedAt;

    const elapsedSecs = getElapsedSeconds(stageTimestamp, order.elapsedTime);
    const minutes = Math.max(1, Math.floor(elapsedSecs / 60));

    const otherStationItems = (order.items || []).filter(
      (i) => i.stationTarget !== stationTarget && i.status !== 'cancelled'
    );
    const otherLabel = stationTarget === 'bar' ? 'food item(s) at Kitchen' : 'drink(s) at Bar';
    const multiStationTag =
      otherStationItems.length > 0
        ? `Multi-Station · ${otherStationItems.length} ${otherLabel}`
        : undefined;

    list.push({
      id: ticketId,
      takeoutId: order.id,
      orderNumber: order.ticketNumber,
      tableOrSource: `Takeout · ${order.customerName}`,
      stage,
      createdAt: orderCreatedAt,
      stageTimestamp,
      isPrepaid: order.isPrepaid,
      elapsedTime: formatElapsedTimer(elapsedSecs),
      minutesElapsed: minutes,
      badges:
        stage === 'cancelled'
          ? ['🚨 ORDER CANCELLED', 'DO NOT PREPARE']
          : stage === 'new'
            ? ['NEW', 'JUST IN']
            : stage === 'preparing'
              ? ['PREPARING']
              : ['READY'],
      multiStationTag,
      specialNote: order.notes ? `! ${order.notes}` : undefined,
      voidNote: allCancelled ? '! Order voided/cancelled · Stop preparation' : undefined,
      items: stationItems,
      serverName: order.customerName,
    });
  });

  return list;
}

export function mapOnlineDeliveryTickets(
  onlineOrders: OnlineDeliveryOrder[],
  stationTarget: 'bar' | 'kitchen',
  dismissedTicketIds?: Set<string>
): BarTicket[] {
  const list: BarTicket[] = [];

  onlineOrders.forEach((order) => {
    if (order.status === 'completed') return;
    const stationItems = (order.items || []).filter(
      (i) => i.stationTarget === stationTarget && i.categorySlug !== 'door_charge'
    );
    const activeItems = stationItems.filter((i) => i.status !== 'cancelled');
    const allCancelled =
      stationItems.length > 0 && stationItems.every((i) => i.status === 'cancelled');

    const ticketId = `online-${order.id}`;
    if (activeItems.length === 0) {
      if (!allCancelled || dismissedTicketIds?.has(ticketId)) return;
    }
    if (activeItems.length > 0 && activeItems.every((i) => i.status === 'served')) return;

    const platformLabel = order.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
    const allReady = activeItems.length > 0 && activeItems.every((i) => i.status === 'ready');
    const hasPrep = activeItems.some((i) => i.status === 'preparing');
    let stage: BarTicket['stage'] = 'new';
    if (allCancelled) stage = 'cancelled';
    else if (order.status === 'ready' || allReady) stage = 'ready';
    else if (hasPrep || order.status === 'preparing') stage = 'preparing';

    const orderCreatedAt = order.createdAt || activeItems.find((i) => i.createdAt)?.createdAt;
    const stageTimestamp =
      stage === 'ready'
        ? activeItems
            .map((i) => i.readyAt || i.stateChangedAt)
            .filter(Boolean)
            .sort()
            .reverse()[0] || orderCreatedAt
        : stage === 'preparing'
          ? activeItems
              .map((i) => i.preparingAt || i.stateChangedAt)
              .filter(Boolean)
              .sort()[0] || orderCreatedAt
          : orderCreatedAt;

    const elapsedSecs = getElapsedSeconds(stageTimestamp, order.elapsedTime);
    const minutes = Math.max(1, Math.floor(elapsedSecs / 60));

    const otherStationItems = (order.items || []).filter(
      (i) => i.stationTarget !== stationTarget && i.status !== 'cancelled'
    );
    const otherLabel = stationTarget === 'bar' ? 'food item(s) at Kitchen' : 'drink(s) at Bar';
    const multiStationTag =
      otherStationItems.length > 0
        ? `Multi-Station · ${otherStationItems.length} ${otherLabel}`
        : undefined;

    list.push({
      id: ticketId,
      onlineId: order.id,
      orderNumber: order.platformOrderRef,
      tableOrSource: `${platformLabel} · ${order.riderName}`,
      stage,
      createdAt: orderCreatedAt,
      stageTimestamp,
      isPrepaid: true,
      elapsedTime: formatElapsedTimer(elapsedSecs),
      minutesElapsed: minutes,
      badges:
        stage === 'cancelled'
          ? ['🚨 ORDER CANCELLED', 'DO NOT PREPARE']
          : stage === 'new'
            ? ['NEW', 'RUSH']
            : stage === 'preparing'
              ? ['PREPARING']
              : ['READY'],
      multiStationTag,
      items: stationItems,
      voidNote: allCancelled ? '! Order voided/cancelled · Stop preparation' : undefined,
      serverName: order.customerName,
    });
  });

  return list;
}
