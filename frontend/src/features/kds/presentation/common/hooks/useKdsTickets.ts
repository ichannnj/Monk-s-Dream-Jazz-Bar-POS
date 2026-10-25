import { useMemo } from 'react';
import { useOrderStore } from '../../../../orders/application/useOrderStore';
import { toast } from '../../../../shared/toast/useToastStore';
import { BarTicket, StockInventoryItem } from '../../barista/types';

interface UseKdsTicketsProps {
  stationTarget: 'bar' | 'kitchen';
  inventory: StockInventoryItem[];
}

export function useKdsTickets({ stationTarget, inventory }: UseKdsTicketsProps) {
  const {
    tables,
    takeoutOrders,
    onlineOrders,
    updateOrderItemStatus,
    markRoundServed,
    markTakeoutServed,
    markOnlineServed,
  } = useOrderStore();

  // Pure reactive tickets selector derived from Zustand store (Single Source of Truth)
  const allTickets: BarTicket[] = useMemo(() => {
    const list: BarTicket[] = [];

    // 1. Dine-in tables (Grouped by Sub-Order Round)
    tables.forEach((table) => {
      (table.tabs || []).forEach((tab) => {
        const stationItems = (tab.items || []).filter(
          (item) => item.stationTarget === stationTarget
        );
        if (stationItems.length === 0) return;

        // Group items strictly by round number
        const roundsMap = new Map<number, typeof stationItems>();
        stationItems.forEach((item) => {
          const r = item.roundNumber || 1;
          if (!roundsMap.has(r)) roundsMap.set(r, []);
          roundsMap.get(r)!.push(item);
        });

        const sortedRoundNums = Array.from(roundsMap.keys()).sort((a, b) => a - b);
        sortedRoundNums.forEach((roundNum) => {
          const roundItems = roundsMap.get(roundNum)!;
          // Prune round if all active items are served or voided
          const activeRoundItems = roundItems.filter((i) => i.status !== 'cancelled');
          if (activeRoundItems.length === 0) return;
          const allServed = activeRoundItems.every((i) => i.status === 'served');
          if (allServed) return; // Immediately removed from active board!

          const ticketId = `tbl-${table.id}-tab${tab.tabIndex}-r${roundNum}-${stationTarget}`;
          const allReady = activeRoundItems.every((i) => i.status === 'ready');
          const hasPrep = activeRoundItems.some((i) => i.status === 'preparing');
          const hasCancelled = roundItems.some((i) => i.status === 'cancelled');

          let stage: BarTicket['stage'] = 'new';
          if (allReady) stage = 'ready';
          else if (hasPrep) stage = 'preparing';

          const badges: string[] = [];
          if (roundNum > 1) badges.push(`ROUND ${roundNum}`);
          if (stage === 'new') badges.push('NEW', 'JUST IN');
          else if (stage === 'preparing') badges.push('PREPARING');
          else badges.push('READY');
          if (hasCancelled) badges.push('ITEM VOIDED');
          if (tab.transferredFrom) {
            badges.push(`MOVED: ${tab.transferredFrom.tableCode} ➔ ${table.code}`);
          }

          const otherStationItems = (tab.items || []).filter(
            (i) => (i.roundNumber || 1) === roundNum && i.stationTarget !== stationTarget
          );
          const otherLabel =
            stationTarget === 'bar' ? 'food item(s) at Kitchen' : 'drink(s) at Bar';
          const multiStationTag =
            otherStationItems.length > 0
              ? `Multi-Station · ${otherStationItems.length} ${otherLabel}`
              : undefined;

          const minutes = parseInt(table.elapsedTime || '1', 10) || 1;
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
            elapsedTime: table.elapsedTime || '1m',
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
            voidNote: hasCancelled ? '! Item(s) voided · Do not prepare' : undefined,
            serverName: tab.guestName,
          });
        });
      });
    });

    // 2. Takeout orders
    takeoutOrders.forEach((order) => {
      if (order.status === 'completed') return;
      const stationItems = (order.items || []).filter((i) => i.stationTarget === stationTarget);
      const activeItems = stationItems.filter((i) => i.status !== 'cancelled');
      if (activeItems.length === 0) return;
      if (activeItems.every((i) => i.status === 'served')) return;

      const allReady = activeItems.every((i) => i.status === 'ready');
      const hasPrep = activeItems.some((i) => i.status === 'preparing');
      let stage: BarTicket['stage'] = 'new';
      if (order.status === 'ready' || allReady) stage = 'ready';
      else if (hasPrep || order.status === 'preparing') stage = 'preparing';

      const minutes = parseInt(order.elapsedTime || '1', 10) || 1;

      list.push({
        id: `takeout-${order.id}`,
        takeoutId: order.id,
        orderNumber: order.ticketNumber,
        tableOrSource: `Takeout · ${order.customerName}`,
        stage,
        elapsedTime: order.elapsedTime || '1m',
        minutesElapsed: minutes,
        badges:
          stage === 'new' ? ['NEW', 'JUST IN'] : stage === 'preparing' ? ['PREPARING'] : ['READY'],
        items: stationItems,
        serverName: order.customerName,
      });
    });

    // 3. Online delivery orders
    onlineOrders.forEach((order) => {
      if (order.status === 'completed') return;
      const stationItems = (order.items || []).filter((i) => i.stationTarget === stationTarget);
      const activeItems = stationItems.filter((i) => i.status !== 'cancelled');
      if (activeItems.length === 0) return;
      if (activeItems.every((i) => i.status === 'served')) return;

      const platformLabel = order.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
      const allReady = activeItems.every((i) => i.status === 'ready');
      const hasPrep = activeItems.some((i) => i.status === 'preparing');
      let stage: BarTicket['stage'] = 'new';
      if (order.status === 'ready' || allReady) stage = 'ready';
      else if (hasPrep || order.status === 'preparing') stage = 'preparing';

      const minutes = parseInt(order.elapsedTime || '1', 10) || 1;

      list.push({
        id: `online-${order.id}`,
        onlineId: order.id,
        orderNumber: order.platformOrderRef,
        tableOrSource: `${platformLabel} · ${order.riderName}`,
        stage,
        elapsedTime: order.elapsedTime || '1m',
        minutesElapsed: minutes,
        badges:
          stage === 'new' ? ['NEW', 'RUSH'] : stage === 'preparing' ? ['PREPARING'] : ['READY'],
        items: stationItems,
        serverName: order.customerName,
      });
    });

    // Strict FIFO / FCFS Sorting: Oldest tickets (longest elapsed time) first
    return list.sort((a, b) => (b.minutesElapsed || 0) - (a.minutesElapsed || 0));
  }, [tables, takeoutOrders, onlineOrders, inventory, stationTarget]);

  // Tickets grouped by stage
  const newTickets = useMemo(() => allTickets.filter((t) => t.stage === 'new'), [allTickets]);
  const preparingTickets = useMemo(
    () => allTickets.filter((t) => t.stage === 'preparing'),
    [allTickets]
  );
  const readyTickets = useMemo(() => allTickets.filter((t) => t.stage === 'ready'), [allTickets]);

  const activeTicketsCount = newTickets.length + preparingTickets.length;

  // Ticket actions
  const handleStartTicket = (ticket: BarTicket) => {
    try {
      ticket.items
        .filter((i) => i.status === 'pending')
        .forEach((item) => updateOrderItemStatus(item.id, 'preparing'));
      toast.success(`Preparing ${ticket.orderNumber} (${ticket.tableOrSource})`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update ticket status.', {
        title: 'KDS Action Error',
      });
    }
  };

  const handleReadyTicket = (ticket: BarTicket) => {
    try {
      ticket.items
        .filter((i) => i.status === 'preparing' || i.status === 'pending')
        .forEach((item) => updateOrderItemStatus(item.id, 'ready'));
      toast.success(`Order Ready: ${ticket.orderNumber} for pickup`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to mark ticket ready.', {
        title: 'KDS Action Error',
      });
    }
  };

  const handleDismissReadyTicket = (ticket: BarTicket) => {
    try {
      if (ticket.tableId && ticket.tabIndex !== undefined) {
        markRoundServed(ticket.tableId, ticket.tabIndex, ticket.roundNumber || 1, stationTarget);
      } else if (ticket.takeoutId) {
        markTakeoutServed(ticket.takeoutId);
      } else if (ticket.onlineId) {
        markOnlineServed(ticket.onlineId);
      } else if (ticket.id.startsWith('takeout-')) {
        const orderId = ticket.id.replace('takeout-', '');
        markTakeoutServed(orderId);
      } else if (ticket.id.startsWith('online-')) {
        const orderId = ticket.id.replace('online-', '');
        markOnlineServed(orderId);
      } else {
        ticket.items.forEach((item) => updateOrderItemStatus(item.id, 'served'));
      }
      toast.success(`Picked up: ${ticket.orderNumber}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dismiss ticket.', {
        title: 'KDS Action Error',
      });
    }
  };

  const handleRecallTicket = (ticket: BarTicket) => {
    try {
      ticket.items
        .filter((i) => i.status !== 'cancelled')
        .forEach((item) => updateOrderItemStatus(item.id, 'preparing'));
      toast.info(`Recalled ${ticket.orderNumber} to Preparing`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to recall ticket.', {
        title: 'KDS Action Error',
      });
    }
  };

  const handleToggleItem = (_ticketId: string, itemId: string) => {
    try {
      const item = allTickets.flatMap((t) => t.items).find((i) => i.id === itemId);
      if (!item) return;
      const nextStatus = item.status === 'ready' ? 'preparing' : 'ready';
      updateOrderItemStatus(itemId, nextStatus);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to toggle item status.', {
        title: 'KDS Item Error',
      });
    }
  };

  return {
    allTickets,
    newTickets,
    preparingTickets,
    readyTickets,
    activeTicketsCount,
    handleStartTicket,
    handleReadyTicket,
    handleDismissReadyTicket,
    handleRecallTicket,
    handleToggleItem,
  };
}
