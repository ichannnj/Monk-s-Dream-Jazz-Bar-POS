import { useMemo } from 'react';
import { useOrderStore } from '../../../../orders/application/useOrderStore';
import { toast } from '../../../../shared/toast/useToastStore';
import { RunnerTicket, ConfirmHandoffState } from '../types';
import type { OrderLineItem } from '@/types/floor';
import { getElapsedSeconds, formatElapsedTimer } from '@/features/shared/utils/elapsedTime';

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
        // Exclude Door Charge from FOH Pass Runner delivery tickets
        const activeItems = (tab.items || []).filter(
          (i) =>
            i.status !== 'cancelled' &&
            i.categorySlug !== 'door_charge' &&
            !i.productName.toLowerCase().includes('door charge')
        );
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

          const readyOnlyCount = roundItems.filter((i) => i.status === 'ready').length;
          const servedItemsCount = roundItems.filter((i) => i.status === 'served').length;
          const readyCount = readyOnlyCount + servedItemsCount;
          const totalCount = roundItems.length;
          const allDone = readyCount === totalCount && totalCount > 0;
          const roundCreatedAt =
            roundItems.find((i) => i.createdAt)?.createdAt ||
            tab.openedAtIso ||
            table.occupiedSinceIso;

          const passReadyAt = allDone
            ? roundItems
                .map((i) => i.readyAt || i.stateChangedAt)
                .filter(Boolean)
                .sort()
                .reverse()[0]
            : undefined;

          const elapsedSecs = getElapsedSeconds(passReadyAt || roundCreatedAt, table.elapsedTime);
          const minutes = Math.max(1, Math.floor(elapsedSecs / 60));

          list.push({
            id: `tbl-${table.id}-${tab.id || tab.tabIndex}-r${roundNum}`,
            orderNumber: `#${table.code.replace('Table ', 'T')}-${tab.tabIndex}${roundNum > 1 ? `-R${roundNum}` : ''}`,
            sourceTitle: `${table.code} · Tab ${tab.tabIndex}${roundNum > 1 ? ` (Round ${roundNum})` : ''}`,
            guestName: tab.guestName,
            orderType: 'dine_in',
            roundNumber: roundNum,
            tableId: table.id,
            tabIndex: tab.tabIndex,
            createdAt: roundCreatedAt,
            passReadyAt,
            elapsedTime: formatElapsedTimer(elapsedSecs),
            minutesElapsed: minutes,
            items: roundItems,
            allDone,
            readyItemsCount: readyCount,
            readyOnlyCount,
            servedItemsCount,
            totalItemsCount: totalCount,
            transferredFrom: tab.transferredFrom,
          });
        });
      });
    });

    // 2. Takeout
    takeoutOrders.forEach((order) => {
      if (order.status !== 'completed') {
        const activeItems = (order.items || []).filter(
          (i) =>
            i.status !== 'cancelled' &&
            i.categorySlug !== 'door_charge' &&
            !i.productName.toLowerCase().includes('door charge')
        );
        if (activeItems.length === 0) return;
        if (activeItems.every((i) => i.status === 'served')) return;

        const readyOnlyCount = activeItems.filter((i) => i.status === 'ready').length;
        const servedItemsCount = activeItems.filter((i) => i.status === 'served').length;
        const readyCount = readyOnlyCount + servedItemsCount;
        const totalCount = activeItems.length;
        const allDone = readyCount === totalCount && totalCount > 0;
        const orderCreatedAt = order.createdAt || activeItems.find((i) => i.createdAt)?.createdAt;
        const passReadyAt = allDone
          ? activeItems
              .map((i) => i.readyAt || i.stateChangedAt)
              .filter(Boolean)
              .sort()
              .reverse()[0]
          : undefined;

        const elapsedSecs = getElapsedSeconds(passReadyAt || orderCreatedAt, order.elapsedTime);
        const minutes = Math.max(1, Math.floor(elapsedSecs / 60));

        list.push({
          id: `takeout-${order.id}`,
          takeoutId: order.id,
          orderNumber: order.ticketNumber,
          sourceTitle: `Takeout ${order.ticketNumber}`,
          guestName: order.customerName,
          orderType: 'takeout',
          createdAt: orderCreatedAt,
          passReadyAt,
          isPrepaid: order.isPrepaid,
          elapsedTime: formatElapsedTimer(elapsedSecs),
          minutesElapsed: minutes,
          items: activeItems,
          allDone,
          readyItemsCount: readyCount,
          readyOnlyCount,
          servedItemsCount,
          totalItemsCount: totalCount,
        });
      }
    });

    // 3. Online Delivery
    onlineOrders.forEach((order) => {
      if (order.status !== 'completed') {
        const activeItems = (order.items || []).filter(
          (i) =>
            i.status !== 'cancelled' &&
            i.categorySlug !== 'door_charge' &&
            !i.productName.toLowerCase().includes('door charge')
        );
        if (activeItems.length === 0) return;
        if (activeItems.every((i) => i.status === 'served')) return;

        const readyOnlyCount = activeItems.filter((i) => i.status === 'ready').length;
        const servedItemsCount = activeItems.filter((i) => i.status === 'served').length;
        const readyCount = readyOnlyCount + servedItemsCount;
        const totalCount = activeItems.length;
        const allDone = readyCount === totalCount && totalCount > 0;
        const platformLabel = order.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
        const orderCreatedAt = order.createdAt || activeItems.find((i) => i.createdAt)?.createdAt;
        const passReadyAt = allDone
          ? activeItems
              .map((i) => i.readyAt || i.stateChangedAt)
              .filter(Boolean)
              .sort()
              .reverse()[0]
          : undefined;

        const elapsedSecs = getElapsedSeconds(passReadyAt || orderCreatedAt, order.elapsedTime);
        const minutes = Math.max(1, Math.floor(elapsedSecs / 60));

        list.push({
          id: `online-${order.id}`,
          onlineId: order.id,
          orderNumber: order.platformOrderRef,
          sourceTitle: `${platformLabel} ${order.platformOrderRef}`,
          guestName: `${order.customerName} · Rider: ${order.riderName}`,
          orderType: 'online_delivery',
          createdAt: orderCreatedAt,
          passReadyAt,
          isPrepaid: true,
          elapsedTime: formatElapsedTimer(elapsedSecs),
          minutesElapsed: minutes,
          items: activeItems,
          allDone,
          readyItemsCount: readyCount,
          readyOnlyCount,
          servedItemsCount,
          totalItemsCount: totalCount,
        });
      }
    });

    // Strict FIFO sorting: Fully ready orders at the top, then sorted by oldest creation time
    return list.sort((a, b) => {
      if (a.allDone && !b.allDone) return -1;
      if (!a.allDone && b.allDone) return 1;

      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA > 0 && timeB > 0 && timeA !== timeB) {
        return timeA - timeB; // Oldest first
      }

      const elapsedDiff = (b.minutesElapsed || 0) - (a.minutesElapsed || 0);
      if (elapsedDiff !== 0) return elapsedDiff;

      return a.id.localeCompare(b.id);
    });
  }, [tables, takeoutOrders, onlineOrders]);

  const fullyReadyCount = runnerTickets.filter((t) => t.allDone).length;

  const deliverSingleItem = (ticket: RunnerTicket, item: OrderLineItem) => {
    if (item.status !== 'ready') return;
    try {
      const remainingUnserved = ticket.items.filter(
        (i) => i.id !== item.id && i.status !== 'cancelled' && i.status !== 'served'
      );

      if (ticket.orderType === 'takeout' && remainingUnserved.length === 0) {
        const orderId = ticket.takeoutId || ticket.id.replace('takeout-', '');
        const toOrder = takeoutOrders.find((o) => o.id === orderId);
        markTakeoutServed(orderId);
        if (toOrder && !toOrder.isPrepaid) {
          toast.info(
            `Bagged ${ticket.sourceTitle}. Payment is DUE AT COUNTER — settle at Floor POS before handoff!`,
            { title: 'Payment Required at Counter' }
          );
          return;
        }
      } else if (ticket.orderType === 'online_delivery' && remainingUnserved.length === 0) {
        const orderId = ticket.onlineId || ticket.id.replace('online-', '');
        markOnlineServed(orderId);
      } else {
        updateOrderItemStatus(item.id, 'served');
      }

      toast.success(`Delivered ${item.quantity}× ${item.productName} (${ticket.sourceTitle})`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to mark item as delivered.', {
        title: 'Delivery Error',
      });
    }
  };

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
          markRoundServed(ticket.tableId, ticket.tabIndex, ticket.roundNumber, target, true);
        } else {
          ticket.items
            .filter((i) => i.stationTarget === target && i.status === 'ready')
            .forEach((item) => {
              updateOrderItemStatus(item.id, 'served');
            });
        }
        toast.success(
          `Dispatched ready ${target === 'bar' ? 'Drinks' : 'Food'} for ${ticket.sourceTitle}`
        );
      } else {
        if (
          ticket.orderType === 'dine_in' &&
          ticket.tableId &&
          ticket.tabIndex &&
          ticket.roundNumber
        ) {
          markRoundServed(ticket.tableId, ticket.tabIndex, ticket.roundNumber, undefined, true);
        } else if (ticket.orderType === 'takeout') {
          const orderId = ticket.takeoutId || ticket.id.replace('takeout-', '');
          const toOrder = takeoutOrders.find((o) => o.id === orderId);
          if (ticket.allDone) {
            markTakeoutServed(orderId);
            if (toOrder && !toOrder.isPrepaid) {
              toast.info(
                `Bagged ${ticket.sourceTitle}. Payment is DUE AT COUNTER — settle at Floor POS before handoff!`,
                { title: 'Payment Required at Counter' }
              );
              return;
            }
          } else {
            ticket.items
              .filter((i) => i.status === 'ready')
              .forEach((item) => updateOrderItemStatus(item.id, 'served'));
          }
        } else if (ticket.orderType === 'online_delivery') {
          const orderId = ticket.onlineId || ticket.id.replace('online-', '');
          if (ticket.allDone) {
            markOnlineServed(orderId);
          } else {
            ticket.items
              .filter((i) => i.status === 'ready')
              .forEach((item) => updateOrderItemStatus(item.id, 'served'));
          }
        } else {
          ticket.items.forEach((item) => {
            if (item.status === 'ready') {
              updateOrderItemStatus(item.id, 'served');
            }
          });
        }
        toast.success(
          ticket.allDone
            ? `Handoff complete for ${ticket.sourceTitle}`
            : `Delivered ready items for ${ticket.sourceTitle}`
        );
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
    deliverSingleItem,
    executeHandoff,
  };
}
