import { useMemo } from 'react';
import { useOrderStore } from '../../../../orders/application/useOrderStore';
import { toast } from '../../../../shared/toast/useToastStore';
import { RunnerTicket, ConfirmHandoffState } from '../types';

export function useRunnerTickets() {
  const {
    tables,
    takeoutOrders,
    onlineOrders,
    updateOrderItemStatus,
    markRoundServed,
    markTakeoutServed,
    markOnlineServed,
    alerts,
  } = useOrderStore();

  // Compile full ticket status across both Bar and Kitchen segmented by Sub-Order Round
  const runnerTickets: RunnerTicket[] = useMemo(() => {
    const list: RunnerTicket[] = [];

    // 1. Tables (Per Sub-Order Round)
    tables.forEach((table) => {
      (table.tabs || []).forEach((tab) => {
        const activeItems = (tab.items || []).filter((i) => i.status !== 'cancelled');
        if (activeItems.length === 0) return;

        // Group active items by round number
        const roundsMap = new Map<number, typeof activeItems>();
        activeItems.forEach((item) => {
          const r = item.roundNumber || 1;
          if (!roundsMap.has(r)) roundsMap.set(r, []);
          roundsMap.get(r)!.push(item);
        });

        roundsMap.forEach((roundItems, roundNum) => {
          // If all items in this round are served, skip (it's already delivered!)
          const allServed = roundItems.every((i) => i.status === 'served');
          if (allServed) return;

          const readyCount = roundItems.filter((i) => i.status === 'ready').length;
          const totalCount = roundItems.length;
          const allDone = readyCount === totalCount && totalCount > 0;
          const minutes = parseInt(table.elapsedTime || '1', 10) || 1;

          list.push({
            id: `tbl-${table.id}-${tab.id || tab.tabIndex}-r${roundNum}`,
            orderNumber: `#${table.code.replace('Table ', 'T')}-${tab.tabIndex}${roundNum > 1 ? `-R${roundNum}` : ''}`,
            sourceTitle: `${table.code} · Tab ${tab.tabIndex}${roundNum > 1 ? ` (Round ${roundNum})` : ''}`,
            guestName: tab.guestName,
            orderType: 'dine_in',
            roundNumber: roundNum,
            tableId: table.id,
            tabIndex: tab.tabIndex,
            elapsedTime: table.elapsedTime || '1m',
            minutesElapsed: minutes,
            items: roundItems,
            allDone,
            readyItemsCount: readyCount,
            totalItemsCount: totalCount,
            transferredFrom: tab.transferredFrom,
          });
        });
      });
    });

    // 2. Takeout
    takeoutOrders.forEach((order) => {
      if (order.status !== 'completed') {
        const activeItems = (order.items || []).filter((i) => i.status !== 'cancelled');
        if (activeItems.length === 0) return;
        if (activeItems.every((i) => i.status === 'served')) return;

        const readyCount = activeItems.filter((i) => i.status === 'ready').length;
        const totalCount = activeItems.length;
        const allDone = order.status === 'ready' || (readyCount === totalCount && totalCount > 0);
        const minutes = parseInt(order.elapsedTime || '1', 10) || 1;

        list.push({
          id: `takeout-${order.id}`,
          orderNumber: order.ticketNumber,
          sourceTitle: `Takeout ${order.ticketNumber}`,
          guestName: order.customerName,
          orderType: 'takeout',
          elapsedTime: order.elapsedTime || '1m',
          minutesElapsed: minutes,
          items: order.items,
          allDone,
          readyItemsCount: readyCount,
          totalItemsCount: totalCount,
        });
      }
    });

    // 3. Online Delivery
    onlineOrders.forEach((order) => {
      if (order.status !== 'completed') {
        const activeItems = (order.items || []).filter((i) => i.status !== 'cancelled');
        if (activeItems.length === 0) return;
        if (activeItems.every((i) => i.status === 'served')) return;

        const readyCount = activeItems.filter((i) => i.status === 'ready').length;
        const totalCount = activeItems.length;
        const allDone = order.status === 'ready' || (readyCount === totalCount && totalCount > 0);
        const platformLabel = order.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
        const minutes = parseInt(order.elapsedTime || '1', 10) || 1;

        list.push({
          id: `online-${order.id}`,
          orderNumber: order.platformOrderRef,
          sourceTitle: `${platformLabel} ${order.platformOrderRef}`,
          guestName: `${order.customerName} · Rider: ${order.riderName}`,
          orderType: 'online_delivery',
          elapsedTime: order.elapsedTime || '1m',
          minutesElapsed: minutes,
          items: order.items,
          allDone,
          readyItemsCount: readyCount,
          totalItemsCount: totalCount,
        });
      }
    });

    // Strict FIFO / FCFS sorting: Fully ready orders at the top, then sorted by oldest elapsed time
    return list.sort((a, b) => {
      if (a.allDone && !b.allDone) return -1;
      if (!a.allDone && b.allDone) return 1;
      return (b.minutesElapsed || 0) - (a.minutesElapsed || 0);
    });
  }, [tables, takeoutOrders, onlineOrders]);

  const fullyReadyCount = runnerTickets.filter((t) => t.allDone).length;

  const executeHandoff = (confirmHandoff: ConfirmHandoffState) => {
    const { ticket, target } = confirmHandoff;

    try {
      if (target) {
        if (
          ticket.orderType === 'dine_in' &&
          ticket.tableId &&
          ticket.tabIndex &&
          ticket.roundNumber
        ) {
          markRoundServed(ticket.tableId, ticket.tabIndex, ticket.roundNumber, target);
        } else {
          ticket.items
            .filter((i) => i.stationTarget === target && i.status === 'ready')
            .forEach((item) => {
              updateOrderItemStatus(item.id, 'served');
            });
        }
        toast.success(
          `Dispatched ${target === 'bar' ? 'Drinks' : 'Food'} for ${ticket.sourceTitle}`
        );
      } else {
        if (
          ticket.orderType === 'dine_in' &&
          ticket.tableId &&
          ticket.tabIndex &&
          ticket.roundNumber
        ) {
          markRoundServed(ticket.tableId, ticket.tabIndex, ticket.roundNumber);
        } else {
          ticket.items.forEach((item) => {
            if (item.status !== 'cancelled') {
              updateOrderItemStatus(item.id, 'served');
            }
          });
          if (ticket.orderType === 'takeout') {
            const orderId = ticket.id.replace('takeout-', '');
            markTakeoutServed(orderId);
          } else if (ticket.orderType === 'online_delivery') {
            const orderId = ticket.id.replace('online-', '');
            markOnlineServed(orderId);
          }
        }
        toast.success(`Handoff complete for ${ticket.sourceTitle}`);
      }
    } catch (err: any) {
      toast.error(
        err?.message || 'Failed to update order status. Please check network connection.',
        {
          title: 'Handoff Error',
        }
      );
    }
  };

  const unreadAlertCount = alerts.filter((a) => !a.isRead).length;

  return {
    runnerTickets,
    fullyReadyCount,
    unreadAlertCount,
    executeHandoff,
  };
}
