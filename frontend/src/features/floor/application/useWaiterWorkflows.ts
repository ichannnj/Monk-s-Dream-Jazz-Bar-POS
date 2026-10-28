import { useState, useMemo } from 'react';
import { useOrderStore } from '@/features/orders';
import { useAuthStore } from '@/features/auth';
import { TableItem, OrderLineItem } from '@/types/floor';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import {
  OrderEntryContext,
  CheckoutContext,
  ConfirmFloorActionContext,
} from '../domain/workflow.types';
import { useOrderEntryFlow } from './useOrderEntryFlow';

export interface UseWaiterWorkflowsOptions {
  autoStartStation?: 'bar' | 'kitchen';
}

export function useWaiterWorkflows(options?: UseWaiterWorkflowsOptions) {
  const {
    tables,
    takeoutOrders,
    onlineOrders,
    openTableTab,
    addItemsToTab,
    transferTableOrTab,
    settleTab,
    settleTableGroup,
    createTakeoutOrder,
    updateTakeoutStatus,
    createOnlineOrder,
    updateOnlineStatus,
  } = useOrderStore();
  const { currentUser } = useAuthStore();

  // Modal Visibility States
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  // Always derive fresh live selected table from store
  const liveSelectedTable = useMemo(() => {
    if (!selectedTable) return null;
    return tables.find((t) => t.id === selectedTable.id) || selectedTable;
  }, [selectedTable, tables]);

  const [tableToTransfer, setTableToTransfer] = useState<TableItem | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // New Workflow Modals
  const [isOpenTabModalOpen, setIsOpenTabModalOpen] = useState(false);
  const [isOpenDirectModalOpen, setIsOpenDirectModalOpen] = useState(false);
  const [isSplitTabDirect, setIsSplitTabDirect] = useState(false);
  const [isTakeoutModalOpen, setIsTakeoutModalOpen] = useState(false);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [isOrderEntryOpen, setIsOrderEntryOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Context States
  const [orderEntryContext, setOrderEntryContext] = useState<OrderEntryContext | null>(null);
  const [checkoutContext, setCheckoutContext] = useState<CheckoutContext | null>(null);
  const [confirmFloorAction, setConfirmFloorAction] = useState<ConfirmFloorActionContext | null>(
    null
  );

  const handleExecuteFloorAction = () => {
    if (!confirmFloorAction) return;
    try {
      if (confirmFloorAction.type === 'takeout_collected') {
        const o = takeoutOrders.find((x) => x.id === confirmFloorAction.id);
        updateTakeoutStatus(confirmFloorAction.id, 'completed');
        toast.info(
          `Takeout #${o?.ticketNumber || ''} handed to ${o?.customerName || 'guest'}. Order completed.`,
          { title: 'Takeout Handed Off' }
        );
      } else if (confirmFloorAction.type === 'online_courier') {
        const o = onlineOrders.find((x) => x.id === confirmFloorAction.id);
        updateOnlineStatus(confirmFloorAction.id, 'completed');
        const plat = o?.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
        toast.info(
          `${plat} #${o?.platformOrderRef || ''} handed to courier ${o?.riderName || ''}. Delivery on way.`,
          { title: 'Dispatched to Courier' }
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update order status. Please check connection.', {
        title: 'Action Error',
      });
    } finally {
      setConfirmFloorAction(null);
    }
  };

  // Card click handlers
  const handleTablePress = (table: TableItem) => {
    if (table.status === 'empty') {
      setSelectedTable(table);
      setIsSplitTabDirect(false);
      setIsOpenDirectModalOpen(true);
    } else {
      setSelectedTable(table);
      setIsActionModalOpen(true);
    }
  };

  const handleOpenOrderEntryFromModal = (
    table: TableItem,
    tabIndex: number,
    specificRound?: number
  ) => {
    const tab = table.tabs?.find((t) => t.tabIndex === tabIndex);
    const existingItems = tab?.items || [];
    const maxRound =
      existingItems.length > 0 ? Math.max(1, ...existingItems.map((i) => i.roundNumber || 1)) : 0;
    const nextRound = specificRound || maxRound + 1;

    setOrderEntryContext({
      type: 'dine_in',
      title: `Table ${table.code} • Tab: "${tab?.guestName || `Tab #${tabIndex}`}" • Round ${nextRound}`,
      tableId: table.id,
      tabIndex: tabIndex,
      roundNumber: nextRound,
      initialItems: [],
      previousTabItems: existingItems,
      hasExistingCorkage: tab?.hasCorkageFee || false,
    });
    setIsOrderEntryOpen(true);
  };

  const handleOpenNewSplitTab = (table: TableItem) => {
    setSelectedTable(table);
    setIsSplitTabDirect(true);
    setIsOpenDirectModalOpen(true);
  };

  const handleOpenCheckout = (table: TableItem, tabIndex: number) => {
    const tab = table.tabs?.find((t) => t.tabIndex === tabIndex);
    setCheckoutContext({
      table,
      activeTab: tab,
    });
    setIsCheckoutOpen(true);
  };

  // Modular Order Entry Flow Hook
  const {
    handleConfirmOpenTab,
    handleProceedTakeout,
    handleProceedOnline,
    handleOrderEntrySubmit: submitOrderEntry,
  } = useOrderEntryFlow({
    tables,
    takeoutOrdersCount: takeoutOrders.length,
    autoStartStation: options?.autoStartStation,
    openTableTab,
    addItemsToTab,
    createTakeoutOrder,
    createOnlineOrder,
    setSelectedTable,
    setOrderEntryContext,
    setIsOrderEntryOpen,
  });

  const handleOrderEntrySubmit = (
    items: OrderLineItem[],
    hasCorkage: boolean,
    corkageAmount: number
  ) => submitOrderEntry(orderEntryContext, items, hasCorkage, corkageAmount);

  // Table or Tab Transfer Dispatch
  const handleConfirmTransfer = (
    originId: string,
    targetId: string,
    mode: 'entire' | 'tab',
    tabIndex?: number,
    reason?: string
  ) => {
    try {
      const origin = tables.find((t) => t.id === originId);
      const target = tables.find((t) => t.id === targetId);
      transferTableOrTab(originId, targetId, mode, tabIndex, reason);
      setSelectedTable(null);
      setTableToTransfer(null);

      if (mode === 'entire') {
        toast.success(
          `Table ${origin?.code} transferred to Table ${target?.code} (All tabs moved)`,
          { title: 'Table Relocated' }
        );
      } else {
        const originTab = origin?.tabs?.find((t) => t.tabIndex === tabIndex);
        toast.success(
          `Tab "${originTab?.guestName || `Tab #${tabIndex}`}" moved from ${origin?.code} to ${target?.code}`,
          { title: 'Tab Relocated' }
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to transfer table/tab. Please try again.', {
        title: 'Transfer Error',
      });
    }
  };

  // Checkout Payment Confirmation
  const handleConfirmPayment = (
    mode: 'single_tab' | 'entire_table',
    tabIndex: number,
    method: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp'
  ) => {
    if (!checkoutContext) return;

    try {
      const tableCode = checkoutContext.table.code;
      const tabName = checkoutContext.activeTab?.guestName || `Tab #${tabIndex}`;
      const rawSubtotal =
        mode === 'single_tab' && checkoutContext.activeTab
          ? checkoutContext.activeTab.totalAmount
          : checkoutContext.table.totalAmount || 0;
      const totalWithTax = rawSubtotal * 1.1;

      const methodLabels: Record<string, string> = {
        cash: 'Cash',
        card: 'Credit / Debit Card',
        digital_wallet: 'Digital Wallet (QR)',
        platform_prepaid: 'Platform Prepaid',
        comp: 'House Comp (100%)',
      };
      const methodName = methodLabels[method] || method.toUpperCase();

      if (mode === 'entire_table') {
        settleTableGroup(
          checkoutContext.table.id,
          method,
          currentUser?.displayName,
          currentUser?.id
        );
        toast.success(
          `Table ${tableCode} settled in full via ${methodName} (${formatCurrency(totalWithTax)}) • Receipt dispatched to printer station`,
          { title: 'Table Bill Settled' }
        );
      } else {
        settleTab(
          checkoutContext.table.id,
          tabIndex,
          method,
          currentUser?.displayName,
          0,
          currentUser?.id
        );
        toast.success(
          `Tab "${tabName}" on Table ${tableCode} settled via ${methodName} (${formatCurrency(totalWithTax)}) • Receipt dispatched to printer station`,
          { title: 'Tab Payment Confirmed' }
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to process payment settlement. Please check printer.', {
        title: 'Settlement Error',
      });
    } finally {
      setCheckoutContext(null);
      setSelectedTable(null);
    }
  };

  return {
    tables,
    takeoutOrders,
    onlineOrders,
    selectedTable,
    setSelectedTable,
    liveSelectedTable,
    isActionModalOpen,
    setIsActionModalOpen,
    tableToTransfer,
    setTableToTransfer,
    isTransferModalOpen,
    setIsTransferModalOpen,
    isOpenTabModalOpen,
    setIsOpenTabModalOpen,
    isOpenDirectModalOpen,
    setIsOpenDirectModalOpen,
    isSplitTabDirect,
    isTakeoutModalOpen,
    setIsTakeoutModalOpen,
    isOnlineModalOpen,
    setIsOnlineModalOpen,
    isOrderEntryOpen,
    setIsOrderEntryOpen,
    orderEntryContext,
    setOrderEntryContext,
    isCheckoutOpen,
    setIsCheckoutOpen,
    checkoutContext,
    setCheckoutContext,
    confirmFloorAction,
    setConfirmFloorAction,
    handleExecuteFloorAction,
    handleTablePress,
    handleOpenOrderEntryFromModal,
    handleOpenNewSplitTab,
    handleOpenCheckout,
    handleConfirmOpenTab,
    handleProceedTakeout,
    handleProceedOnline,
    handleOrderEntrySubmit,
    handleConfirmTransfer,
    handleConfirmPayment,
    updateTakeoutStatus,
    updateOnlineStatus,
  };
}
