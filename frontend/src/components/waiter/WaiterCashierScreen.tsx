import React, { useState, useMemo } from 'react';
import { View, ScrollView, useWindowDimensions, Text } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useOrderStore } from '../../store/useOrderStore';
import {
  TableItem,
  ChannelCategory,
  TakeoutOrder,
  OnlineDeliveryOrder,
  OrderLineItem,
  CustomerTab,
} from '../../mockData';
import { formatCurrency } from '@monks/shared';
import { toast } from '../../store/useToastStore';
import { Sidebar, NavTabId } from '../navigation/Sidebar';
import { UnifiedCommandBar, StatusFilter } from './UnifiedCommandBar';
import { FloorGridView } from './FloorGridView';
import { useFloorFilters } from './useFloorFilters';
import { styles } from './WaiterCashierScreen.styles';
import { WaiterModalsCluster } from './WaiterModalsCluster';
import { ChecksHistoryView } from './ChecksHistoryView';
import { CashDrawerModalView } from './CashDrawerModalView';
import { FloorAlertsView } from './FloorAlertsView';
import { FloorChatView } from './FloorChatView';
import { ShiftSettingsModal } from './ShiftSettingsModal';

export const WaiterCashierScreen: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const { width: windowWidth } = useWindowDimensions();

  const handleLogout = () => {
    toast.info('Terminal locked. Staff session ended.', { title: 'Clocked Out' });
    logout();
  };

  // Zustand state
  const {
    tables,
    takeoutOrders,
    onlineOrders,
    alerts,
    chatMessages,
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

  // Navigation state (Sidebar)
  const [activeNavTab, setActiveNavTab] = useState<NavTabId>('tables');

  // Channel & Status Filter state
  const [selectedChannel, setSelectedChannel] = useState<ChannelCategory>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');

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
  const [isTakeoutModalOpen, setIsTakeoutModalOpen] = useState(false);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [isOrderEntryOpen, setIsOrderEntryOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Order Entry Context
  const [orderEntryContext, setOrderEntryContext] = useState<{
    type: 'dine_in' | 'takeout' | 'online';
    title: string;
    tableId?: string;
    tabIndex?: number;
    roundNumber?: number;
    initialItems?: OrderLineItem[];
    previousTabItems?: OrderLineItem[];
    hasExistingCorkage?: boolean;
    takeoutCustomer?: string;
    takeoutPrepaid?: boolean;
    takeoutNotes?: string;
    onlinePlatform?: 'grabfood' | 'foodpanda';
    onlineRef?: string;
    onlineRider?: string;
    onlineCustomer?: string;
  } | null>(null);

  // Checkout Context
  const [checkoutContext, setCheckoutContext] = useState<{
    table: TableItem;
    activeTab?: CustomerTab | null;
  } | null>(null);

  // Unread badge counts
  const unreadAlerts = useMemo(() => alerts.filter((a) => !a.isRead).length, [alerts]);

  // Floor filtering & category counts via custom hook
  const {
    channelCounts,
    statusCounts,
    filteredTables,
    filteredTakeoutOrders,
    filteredOnlineOrders,
  } = useFloorFilters(tables, takeoutOrders, onlineOrders, selectedChannel, selectedStatus);

  // Card click handlers
  const handleTablePress = (table: TableItem) => {
    if (table.status === 'empty') {
      // If table is empty, directly open tab creation
      setSelectedTable(table);
      setIsOpenTabModalOpen(true);
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
    setIsOpenTabModalOpen(true);
  };

  const handleOpenCheckout = (table: TableItem, tabIndex: number) => {
    const tab = table.tabs?.find((t) => t.tabIndex === tabIndex);
    setCheckoutContext({
      table,
      activeTab: tab,
    });
    setIsCheckoutOpen(true);
  };

  // Quick Action Flow: Open Tab
  const handleConfirmOpenTab = (tableId: string, guestName: string, guestCount: number) => {
    const { tabIndex } = openTableTab(tableId, guestName, guestCount);
    const targetTable = tables.find((t) => t.id === tableId);

    toast.success(
      `Tab opened for "${guestName}" (${guestCount} guests) at Table ${targetTable?.code}`,
      { title: 'Dine-In Tab Created' }
    );

    if (targetTable) {
      setSelectedTable(targetTable);
    }

    // Immediately open order entry catalog for this newly opened tab!
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
  };

  // Quick Action Flow: New Takeout
  const handleProceedTakeout = (customerName: string, isPrepaid: boolean, notes: string) => {
    const nextTicket = `T-${107 + takeoutOrders.length}`;
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
  };

  // Quick Action Flow: Online Delivery
  const handleProceedOnline = (
    platform: 'grabfood' | 'foodpanda',
    platformRef: string,
    riderName: string,
    customerName: string
  ) => {
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
  };

  // Order Entry Submission Dispatch
  const handleOrderEntrySubmit = (
    items: OrderLineItem[],
    hasCorkage: boolean,
    corkageAmount: number
  ) => {
    if (!orderEntryContext) return;

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

    setOrderEntryContext(null);
  };

  // Table or Tab Transfer Dispatch
  const handleConfirmTransfer = (
    originId: string,
    targetId: string,
    mode: 'entire' | 'tab',
    tabIndex?: number,
    reason?: string
  ) => {
    const origin = tables.find((t) => t.id === originId);
    const target = tables.find((t) => t.id === targetId);
    transferTableOrTab(originId, targetId, mode, tabIndex, reason);

    if (mode === 'entire') {
      toast.success(`Table ${origin?.code} transferred to Table ${target?.code} (All tabs moved)`, {
        title: 'Table Relocated',
      });
    } else {
      const originTab = origin?.tabs?.find((t) => t.tabIndex === tabIndex);
      toast.success(
        `Tab "${originTab?.guestName || `Tab #${tabIndex}`}" moved from ${origin?.code} to ${target?.code}`,
        { title: 'Tab Relocated' }
      );
    }
  };

  // Checkout Payment Confirmation
  const handleConfirmPayment = (
    mode: 'single_tab' | 'entire_table',
    tabIndex: number,
    method: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    tenderedAmount?: number
  ) => {
    if (!checkoutContext) return;

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
      settleTableGroup(checkoutContext.table.id, method);
      toast.success(
        `Table ${tableCode} settled in full via ${methodName} (${formatCurrency(totalWithTax)}) • Receipt dispatched to printer station`,
        { title: 'Table Bill Settled' }
      );
    } else {
      settleTab(checkoutContext.table.id, tabIndex, method);
      toast.success(
        `Tab "${tabName}" on Table ${tableCode} settled via ${methodName} (${formatCurrency(totalWithTax)}) • Receipt dispatched to printer station`,
        { title: 'Tab Payment Confirmed' }
      );
    }

    setCheckoutContext(null);
  };

  const [gridWidth, setGridWidth] = useState<number>(0);

  // Tablet-optimized dynamic grid column distribution:
  // - 5 columns on desktop/wide display (>= 1440px)
  // - 4 columns on large landscape tablets / iPad Pro 12.9" (>= 1140px)
  // - 3 columns on standard 10" landscape tablets / iPad (>= 740px)
  // - 2 columns on compact tablets / portrait screens (< 740px)
  const numColumns = useMemo(() => {
    if (windowWidth >= 1440) return 5;
    if (windowWidth >= 1140) return 4;
    if (windowWidth >= 740) return 3;
    return 2;
  }, [windowWidth]);

  const gridGap = 16;
  const cardWidth = useMemo(() => {
    if (gridWidth > 0) {
      // Exact integer pixel distribution with gap subtracted
      return Math.floor((gridWidth - (numColumns - 1) * gridGap) / numColumns);
    }
    // Reliable initial fallback percentage before first layout measurement
    const fallbackPercent = ((100 - (numColumns - 1) * 1.6) / numColumns).toFixed(2);
    return `${fallbackPercent}%` as any;
  }, [gridWidth, numColumns]);

  return (
    <View style={styles.screenContainer}>
      {/* 1. Dedicated Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeNavTab}
        onTabChange={setActiveNavTab}
        onLogout={handleLogout}
        alertCount={unreadAlerts}
        unreadChatCount={0}
      />

      {/* 2. Main Viewport */}
      <View style={styles.mainContent}>
        {activeNavTab === 'tables' ? (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Unified Sleek Top Command Bar */}
            <UnifiedCommandBar
              selectedChannel={selectedChannel}
              onChannelChange={setSelectedChannel}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              channelCounts={channelCounts}
              statusCounts={statusCounts}
              onOpenTableTab={() => setIsOpenTabModalOpen(true)}
              onNewTakeout={() => setIsTakeoutModalOpen(true)}
              onInputOnlineOrder={() => setIsOnlineModalOpen(true)}
              staffName={currentUser?.displayName || 'Jess Santos'}
              staffInitials={
                currentUser?.displayName
                  ? currentUser.displayName
                      .split(' ')
                      .map((s) => s[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'JS'
              }
            />

            {/* Combined Responsive Grid: Tables, Takeout Queue & Online Orders */}
            <FloorGridView
              cardWidth={cardWidth}
              filteredTables={filteredTables}
              filteredTakeoutOrders={filteredTakeoutOrders}
              filteredOnlineOrders={filteredOnlineOrders}
              onResetFilters={() => {
                setSelectedChannel('all');
                setSelectedStatus('all');
              }}
              onTablePress={handleTablePress}
              onTakeoutPress={(o) => {
                setOrderEntryContext({
                  type: 'takeout',
                  title: `Takeout #${o.ticketNumber} • "${o.customerName}"`,
                  takeoutCustomer: o.customerName,
                  takeoutPrepaid: o.isPrepaid,
                  initialItems: o.items,
                });
                setIsOrderEntryOpen(true);
              }}
              onTakeoutReady={(id) => {
                const o = takeoutOrders.find((x) => x.id === id);
                updateTakeoutStatus(id, 'ready');
                toast.success(
                  `Takeout #${o?.ticketNumber || ''} (${o?.customerName || ''}) is READY for pickup!`,
                  { title: 'Takeout Ready' }
                );
              }}
              onTakeoutCollected={(id) => {
                const o = takeoutOrders.find((x) => x.id === id);
                updateTakeoutStatus(id, 'completed');
                toast.info(
                  `Takeout #${o?.ticketNumber || ''} handed to ${o?.customerName || 'guest'}. Order completed.`,
                  { title: 'Takeout Handed Off' }
                );
              }}
              onOnlinePress={(o) => {
                setOrderEntryContext({
                  type: 'online',
                  title: `${o.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda'} #${o.platformOrderRef} • "${o.customerName}"`,
                  onlinePlatform: o.platform,
                  onlineRef: o.platformOrderRef,
                  onlineRider: o.riderName,
                  onlineCustomer: o.customerName,
                  initialItems: o.items,
                });
                setIsOrderEntryOpen(true);
              }}
              onOnlineReady={(id) => {
                const o = onlineOrders.find((x) => x.id === id);
                updateOnlineStatus(id, 'ready');
                const plat = o?.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
                toast.success(
                  `${plat} #${o?.platformOrderRef || ''} bagged & READY for driver pickup!`,
                  { title: 'Delivery Ready' }
                );
              }}
              onOnlineHandToRider={(id) => {
                const o = onlineOrders.find((x) => x.id === id);
                updateOnlineStatus(id, 'completed');
                const plat = o?.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
                toast.info(
                  `${plat} #${o?.platformOrderRef || ''} handed to courier ${o?.riderName || ''}. Delivery on way.`,
                  { title: 'Dispatched to Courier' }
                );
              }}
              onLayoutGrid={(w) => setGridWidth(w)}
            />
          </ScrollView>
        ) : activeNavTab === 'checks' ? (
          <ChecksHistoryView />
        ) : activeNavTab === 'drawer' ? (
          <CashDrawerModalView />
        ) : activeNavTab === 'alerts' ? (
          <FloorAlertsView />
        ) : activeNavTab === 'chat' ? (
          <FloorChatView />
        ) : (
          <ShiftSettingsModal onLogout={handleLogout} />
        )}
      </View>

      {/* Modal Hub Cluster */}
      <WaiterModalsCluster
        tables={tables}
        takeoutOrdersCount={takeoutOrders.length}
        selectedTable={liveSelectedTable}
        isActionModalOpen={isActionModalOpen}
        onCloseActionModal={() => setIsActionModalOpen(false)}
        onOpenOrderEntryFromModal={handleOpenOrderEntryFromModal}
        onOpenNewSplitTab={handleOpenNewSplitTab}
        onCheckoutFromModal={handleOpenCheckout}
        onTransferTableFromModal={(t) => {
          setTableToTransfer(t);
          setIsTransferModalOpen(true);
        }}
        tableToTransfer={tableToTransfer}
        isTransferModalOpen={isTransferModalOpen}
        onCloseTransferModal={() => setIsTransferModalOpen(false)}
        onConfirmTransfer={handleConfirmTransfer}
        isOpenTabModalOpen={isOpenTabModalOpen}
        onCloseOpenTabModal={() => setIsOpenTabModalOpen(false)}
        onConfirmOpenTab={handleConfirmOpenTab}
        isTakeoutModalOpen={isTakeoutModalOpen}
        onCloseTakeoutModal={() => setIsTakeoutModalOpen(false)}
        onProceedTakeout={handleProceedTakeout}
        isOnlineModalOpen={isOnlineModalOpen}
        onCloseOnlineModal={() => setIsOnlineModalOpen(false)}
        onProceedOnline={handleProceedOnline}
        isOrderEntryOpen={isOrderEntryOpen}
        orderEntryContext={orderEntryContext}
        onCloseOrderEntry={() => {
          setIsOrderEntryOpen(false);
          setOrderEntryContext(null);
        }}
        onSendOrder={handleOrderEntrySubmit}
        isCheckoutOpen={isCheckoutOpen}
        checkoutContext={checkoutContext}
        onCloseCheckout={() => {
          setIsCheckoutOpen(false);
          setCheckoutContext(null);
        }}
        onConfirmPayment={handleConfirmPayment}
      />
    </View>
  );
};
