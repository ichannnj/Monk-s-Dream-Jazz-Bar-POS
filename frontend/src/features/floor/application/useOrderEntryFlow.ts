import { TableItem, OrderLineItem } from '@/types/floor';
import { toast } from '@/features/shared/toast/useToastStore';
import { OrderEntryContext } from '../domain/workflow.types';

interface UseOrderEntryFlowProps {
  tables: TableItem[];
  takeoutOrdersCount: number;
  openTableTab: (tableId: string, guestName: string, guestCount: number) => { tabIndex: number };
  addItemsToTab: (
    tableId: string,
    tabIndex: number,
    items: OrderLineItem[],
    hasCorkage?: boolean,
    corkageAmount?: number
  ) => void;
  createTakeoutOrder: (
    customerName: string,
    items: OrderLineItem[],
    isPrepaid: boolean,
    notes?: string
  ) => { ticketNumber: string; customerName: string };
  createOnlineOrder: (
    platform: 'grabfood' | 'foodpanda',
    platformRef: string,
    riderName: string,
    customerName: string,
    items: OrderLineItem[]
  ) => { platformOrderRef: string; riderName: string };
  setSelectedTable: (table: TableItem | null) => void;
  setOrderEntryContext: (ctx: OrderEntryContext | null) => void;
  setIsOrderEntryOpen: (open: boolean) => void;
}

export function useOrderEntryFlow({
  tables,
  takeoutOrdersCount,
  openTableTab,
  addItemsToTab,
  createTakeoutOrder,
  createOnlineOrder,
  setSelectedTable,
  setOrderEntryContext,
  setIsOrderEntryOpen,
}: UseOrderEntryFlowProps) {
  // Quick Action Flow: Open Tab
  const handleConfirmOpenTab = (tableId: string, guestName: string, guestCount: number) => {
    try {
      const { tabIndex } = openTableTab(tableId, guestName, guestCount);
      const targetTable = tables.find((t) => t.id === tableId);

      toast.success(
        `Tab opened for "${guestName}" (${guestCount} guests) at Table ${targetTable?.code}`,
        { title: 'Dine-In Tab Created' }
      );

      if (targetTable) {
        setSelectedTable(targetTable);
      }

      setOrderEntryContext({
        type: 'dine_in',
        title: `Table ${targetTable?.code || ''} • Tab: "${guestName}" • Round 1`,
        tableId: tableId,
        tabIndex: tabIndex,
        roundNumber: 1,
        initialItems: [],
        previousTabItems: [],
        hasExistingCorkage: false,
      });
      setIsOrderEntryOpen(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to open table tab. Please try again.', {
        title: 'Table Error',
      });
    }
  };

  // Quick Action Flow: New Takeout
  const handleProceedTakeout = (customerName: string, isPrepaid: boolean, notes: string) => {
    try {
      const nextTicket = `T-${107 + takeoutOrdersCount}`;
      toast.info(`Configuring Takeout #${nextTicket} for "${customerName}"`, {
        title: 'Takeout Intake',
      });

      setOrderEntryContext({
        type: 'takeout',
        title: `Takeout #${nextTicket} • "${customerName}"`,
        takeoutCustomer: customerName,
        takeoutPrepaid: isPrepaid,
        takeoutNotes: notes,
        initialItems: [],
      });
      setIsOrderEntryOpen(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to initialize takeout order.', {
        title: 'Takeout Error',
      });
    }
  };

  // Quick Action Flow: Online Delivery
  const handleProceedOnline = (
    platform: 'grabfood' | 'foodpanda',
    platformRef: string,
    riderName: string,
    customerName: string
  ) => {
    try {
      const platformLabel = platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
      toast.info(`Entering ${platformLabel} #${platformRef} (${customerName})`, {
        title: 'Online Delivery Intake',
      });

      setOrderEntryContext({
        type: 'online',
        title: `${platformLabel} #${platformRef} • "${customerName}"`,
        onlinePlatform: platform,
        onlineRef: platformRef,
        onlineRider: riderName,
        onlineCustomer: customerName,
        initialItems: [],
      });
      setIsOrderEntryOpen(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to initialize online delivery order.', {
        title: 'Delivery Error',
      });
    }
  };

  // Order Entry Submission Dispatch
  const handleOrderEntrySubmit = (
    orderEntryContext: OrderEntryContext | null,
    items: OrderLineItem[],
    hasCorkage: boolean,
    corkageAmount: number
  ) => {
    if (!orderEntryContext) return;

    try {
      if (orderEntryContext.type === 'dine_in' && orderEntryContext.tableId) {
        const targetTable = tables.find((t) => t.id === orderEntryContext.tableId);
        const roundNum = orderEntryContext.roundNumber || 1;
        const itemsWithRound = items.map((item) => ({
          ...item,
          roundNumber: item.roundNumber || roundNum,
        }));
        addItemsToTab(
          orderEntryContext.tableId,
          orderEntryContext.tabIndex || 1,
          itemsWithRound,
          hasCorkage,
          corkageAmount
        );
        toast.success(
          `${items.length} item(s) dispatched to Bar & Kitchen for Table ${targetTable?.code || ''} • Round ${roundNum} (Chit printed)`,
          { title: `Round ${roundNum} Sent to Stations` }
        );
      } else if (orderEntryContext.type === 'takeout') {
        const newOrder = createTakeoutOrder(
          orderEntryContext.takeoutCustomer || 'Walk-in Guest',
          items,
          orderEntryContext.takeoutPrepaid ?? true,
          orderEntryContext.takeoutNotes
        );
        toast.success(
          `Takeout #${newOrder.ticketNumber} created for ${newOrder.customerName} (${items.length} items)`,
          { title: 'Takeout Order Queued' }
        );
      } else if (orderEntryContext.type === 'online') {
        const platformLabel =
          orderEntryContext.onlinePlatform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
        const newOrder = createOnlineOrder(
          orderEntryContext.onlinePlatform || 'grabfood',
          orderEntryContext.onlineRef || 'GF-8842',
          orderEntryContext.onlineRider || 'Rider Assigned',
          orderEntryContext.onlineCustomer || 'Customer',
          items
        );
        toast.success(
          `${platformLabel} #${newOrder.platformOrderRef} logged (${items.length} items) • Rider: ${newOrder.riderName}`,
          { title: 'Online Delivery Queued' }
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch order. Check station connectivity.', {
        title: 'Dispatch Error',
      });
    } finally {
      setOrderEntryContext(null);
    }
  };

  return {
    handleConfirmOpenTab,
    handleProceedTakeout,
    handleProceedOnline,
    handleOrderEntrySubmit,
  };
}
