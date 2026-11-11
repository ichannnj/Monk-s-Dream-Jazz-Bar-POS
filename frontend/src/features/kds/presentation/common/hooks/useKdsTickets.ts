import { useMemo, useState, useEffect } from 'react';
import { useOrderStore } from '../../../../orders/application/useOrderStore';
import { useAuthStore } from '@/features/auth/application/useAuthStore';
import { toast } from '../../../../shared/toast/useToastStore';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';
import { BarTicket, StockInventoryItem } from '../../barista/types';
import {
  mapDineInTableTickets,
  mapTakeoutTickets,
  mapOnlineDeliveryTickets,
} from './kdsTicketMapper';

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
    updateTakeoutStatus,
    updateOnlineStatus,
    markRoundServed,
    markTakeoutServed,
    markOnlineServed,
    voidOrderItem,
  } = useOrderStore();
  const currentUser = useAuthStore((s) => s.currentUser);

  const [dismissedTicketIds, setDismissedTicketIds] = useState<Set<string>>(new Set());

  const allTickets: BarTicket[] = useMemo(() => {
    const dineInTickets = mapDineInTableTickets(
      tables,
      stationTarget,
      inventory,
      dismissedTicketIds
    );
    const takeoutTicketList = mapTakeoutTickets(takeoutOrders, stationTarget, dismissedTicketIds);
    const onlineTicketList = mapOnlineDeliveryTickets(
      onlineOrders,
      stationTarget,
      dismissedTicketIds
    );

    const combined = [...dineInTickets, ...takeoutTicketList, ...onlineTicketList];
    return combined.sort((a, b) => (b.minutesElapsed || 0) - (a.minutesElapsed || 0));
  }, [tables, takeoutOrders, onlineOrders, inventory, stationTarget, dismissedTicketIds]);

  const cancelledTickets = useMemo(
    () => allTickets.filter((t) => t.stage === 'cancelled'),
    [allTickets]
  );

  // Auto-dismiss cancelled tickets after 30 seconds
  useEffect(() => {
    if (cancelledTickets.length === 0) return;
    const timers = cancelledTickets.map((t) => {
      return setTimeout(() => {
        setDismissedTicketIds((prev) => new Set([...prev, t.id]));
      }, 30000);
    });
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [cancelledTickets]);

  const newTickets = useMemo(
    () => [...cancelledTickets, ...allTickets.filter((t) => t.stage === 'new')],
    [allTickets, cancelledTickets]
  );
  const preparingTickets = useMemo(
    () => allTickets.filter((t) => t.stage === 'preparing'),
    [allTickets]
  );
  const readyTickets = useMemo(() => allTickets.filter((t) => t.stage === 'ready'), [allTickets]);
  const activeTicketsCount = newTickets.length + preparingTickets.length;

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

      if (ticket.takeoutId) {
        const order = takeoutOrders.find((o) => o.id === ticket.takeoutId);
        const otherIncomplete = (order?.items || []).some(
          (i) =>
            i.stationTarget !== stationTarget &&
            i.status !== 'ready' &&
            i.status !== 'served' &&
            i.status !== 'cancelled'
        );
        if (!otherIncomplete) {
          updateTakeoutStatus(ticket.takeoutId, 'ready');
        }
      } else if (ticket.onlineId) {
        const order = onlineOrders.find((o) => o.id === ticket.onlineId);
        const otherIncomplete = (order?.items || []).some(
          (i) =>
            i.stationTarget !== stationTarget &&
            i.status !== 'ready' &&
            i.status !== 'served' &&
            i.status !== 'cancelled'
        );
        if (!otherIncomplete) {
          updateOnlineStatus(ticket.onlineId, 'ready');
        }
      }

      realtimeGateway.broadcastPosSync('kds_ticket_ready');
      toast.success(`Order Ready: ${ticket.orderNumber} (Inventory updated)`);
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
      } else if (ticket.takeoutId || ticket.id.startsWith('takeout-')) {
        const orderId = ticket.takeoutId || ticket.id.replace('takeout-', '');
        const order = takeoutOrders.find((o) => o.id === orderId);
        const otherUnserved = (order?.items || []).some(
          (i) =>
            i.stationTarget !== stationTarget && i.status !== 'served' && i.status !== 'cancelled'
        );
        if (otherUnserved) {
          ticket.items.forEach((item) => updateOrderItemStatus(item.id, 'served'));
        } else {
          markTakeoutServed(orderId);
        }
      } else if (ticket.onlineId || ticket.id.startsWith('online-')) {
        const orderId = ticket.onlineId || ticket.id.replace('online-', '');
        const order = onlineOrders.find((o) => o.id === orderId);
        const otherUnserved = (order?.items || []).some(
          (i) =>
            i.stationTarget !== stationTarget && i.status !== 'served' && i.status !== 'cancelled'
        );
        if (otherUnserved) {
          ticket.items.forEach((item) => updateOrderItemStatus(item.id, 'served'));
        } else {
          markOnlineServed(orderId);
        }
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

  const handleDismissTicket = (ticket: BarTicket) => {
    setDismissedTicketIds((prev) => new Set([...prev, ticket.id]));
  };

  const handleVoidItem = async (
    itemId: string,
    reason: string,
    tableId?: string,
    tabIndex?: number
  ) => {
    const staffId = currentUser?.id || '11111111-1111-1111-1111-111111111111';
    const success = await voidOrderItem(itemId, staffId, reason, tableId, tabIndex);
    return success;
  };

  const handleVoidTicket = async (ticket: BarTicket, reason: string) => {
    const staffId = currentUser?.id || '11111111-1111-1111-1111-111111111111';
    const activeItems = ticket.items.filter((i) => i.status !== 'cancelled');
    for (const item of activeItems) {
      await voidOrderItem(item.id, staffId, reason, ticket.tableId, ticket.tabIndex);
    }
    toast.success(`Cancelled order ${ticket.orderNumber}`);
    return true;
  };

  return {
    allTickets,
    newTickets,
    preparingTickets,
    readyTickets,
    cancelledTickets,
    activeTicketsCount,
    handleStartTicket,
    handleReadyTicket,
    handleDismissReadyTicket,
    handleDismissTicket,
    handleRecallTicket,
    handleToggleItem,
    handleVoidItem,
    handleVoidTicket,
  };
}
