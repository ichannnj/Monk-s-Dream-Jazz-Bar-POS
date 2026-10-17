import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Text } from 'react-native';
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
import { toast } from '../../store/useToastStore';
import { Sidebar, NavTabId } from '../navigation/Sidebar';
import { UnifiedCommandBar, StatusFilter } from './UnifiedCommandBar';
import { TableCard } from './TableCard';
import { TakeoutQueueCard } from './TakeoutQueueCard';
import { OnlineDeliveryCard } from './OnlineDeliveryCard';
import { TableActionModal } from './TableActionModal';
import { TableTransferModal } from './TableTransferModal';
import { OpenTableTabModal } from './OpenTableTabModal';
import { NewTakeoutModal } from './NewTakeoutModal';
import { OnlineDeliveryModal } from './OnlineDeliveryModal';
import { OrderEntryModal } from './OrderEntryModal';
import { BillSettlementModal } from './BillSettlementModal';
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
    initialItems?: OrderLineItem[];
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
  const unreadAlerts = useMemo(
    () => alerts.filter((a) => !a.isRead).length,
    [alerts]
  );

  // Channel Counts
  const channelCounts = useMemo(() => {
    return {
      all: tables.length + takeoutOrders.length + onlineOrders.length,
      cafe: tables.filter((t) => t.area === 'cafe').length,
      bar: tables.filter((t) => t.area === 'bar').length,
      takeout: takeoutOrders.filter((t) => t.status !== 'completed').length,
      online: onlineOrders.filter((o) => o.status !== 'completed').length,
    };
  }, [tables, takeoutOrders, onlineOrders]);

  // Status Counts for active channel
  const statusCounts = useMemo(() => {
    let relevantTables = tables;
    if (selectedChannel === 'cafe') {
      relevantTables = tables.filter((t) => t.area === 'cafe');
    } else if (selectedChannel === 'bar') {
      relevantTables = tables.filter((t) => t.area === 'bar');
    }

    return {
      all: relevantTables.length,
      empty: relevantTables.filter((t) => t.status === 'empty').length,
      occupied: relevantTables.filter((t) => t.status === 'occupied').length,
      preparing: relevantTables.filter((t) => t.status === 'preparing').length,
      ready: relevantTables.filter((t) => t.status === 'ready').length,
      served: relevantTables.filter((t) => t.status === 'served').length,
    };
  }, [tables, selectedChannel]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    if (selectedChannel === 'takeout' || selectedChannel === 'online') {
      return [];
    }
    return tables.filter((table) => {
      if (selectedChannel !== 'all' && table.area !== selectedChannel) {
        return false;
      }
      if (selectedStatus !== 'all' && table.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [tables, selectedChannel, selectedStatus]);

  // Filtered Takeout Orders
  const filteredTakeoutOrders = useMemo(() => {
    if (selectedChannel === 'cafe' || selectedChannel === 'bar') {
      return [];
    }
    return takeoutOrders.filter((o) => {
      if (o.status === 'completed') return false;
      if (selectedStatus === 'preparing' && o.status !== 'preparing') return false;
      if (selectedStatus === 'ready' && o.status !== 'ready') return false;
      if (selectedStatus === 'empty' || selectedStatus === 'occupied' || selectedStatus === 'served')
        return false;
      return true;
    });
  }, [takeoutOrders, selectedChannel, selectedStatus]);

  // Filtered Online Orders
  const filteredOnlineOrders = useMemo(() => {
    if (selectedChannel === 'cafe' || selectedChannel === 'bar') {
      return [];
    }
    return onlineOrders.filter((o) => {
      if (o.status === 'completed') return false;
      if (selectedStatus === 'preparing' && o.status !== 'preparing') return false;
      if (selectedStatus === 'ready' && o.status !== 'ready') return false;
      if (selectedStatus === 'empty' || selectedStatus === 'occupied' || selectedStatus === 'served')
        return false;
      return true;
    });
  }, [onlineOrders, selectedChannel, selectedStatus]);

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

  const handleOpenOrderEntryFromModal = (table: TableItem, tabIndex: number) => {
    const tab = table.tabs?.find((t) => t.tabIndex === tabIndex);
    setOrderEntryContext({
      type: 'dine_in',
      title: `Table ${table.code} • Tab: "${tab?.guestName || `Tab #${tabIndex}`}"`,
      tableId: table.id,
      tabIndex: tabIndex,
      initialItems: tab?.items || [],
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
  const handleConfirmOpenTab = (
    tableId: string,
    guestName: string,
    guestCount: number
  ) => {
    openTableTab(tableId, guestName, guestCount);
    const targetTable = tables.find((t) => t.id === tableId);
    const nextTabIndex =
      targetTable && targetTable.activeTabs.length > 0
        ? Math.max(...targetTable.activeTabs) + 1
        : 1;

    toast.success(
      `Tab opened for "${guestName}" (${guestCount} guests) at Table ${targetTable?.code}`,
      { title: 'Dine-In Tab Created' }
    );

    // Immediately open order entry catalog for this newly opened tab!
    setOrderEntryContext({
      type: 'dine_in',
      title: `Table ${targetTable?.code || ''} • Tab: "${guestName}"`,
      tableId: tableId,
      tabIndex: nextTabIndex,
      initialItems: [],
      hasExistingCorkage: false,
    });
    setIsOrderEntryOpen(true);
  };

  // Quick Action Flow: New Takeout
  const handleProceedTakeout = (
    customerName: string,
    isPrepaid: boolean,
    notes: string
  ) => {
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
      addItemsToTab(
        orderEntryContext.tableId,
        orderEntryContext.tabIndex || 1,
        items,
        hasCorkage,
        corkageAmount
      );
      toast.success(
        `${items.length} item(s) dispatched to Bar & Kitchen for Table ${targetTable?.code || ''} (Chit printed)`,
        { title: 'Order Sent to Stations' }
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
        `Table ${tableCode} settled in full via ${methodName} ($${totalWithTax.toFixed(2)}) • Receipt printed`,
        { title: 'Table Bill Settled' }
      );
    } else {
      settleTab(checkoutContext.table.id, tabIndex, method);
      toast.success(
        `Tab "${tabName}" on Table ${tableCode} settled via ${methodName} ($${totalWithTax.toFixed(2)}) • Receipt printed`,
        { title: 'Tab Payment Confirmed' }
      );
    }

    setCheckoutContext(null);
  };

  // Responsive tablet grid column width (3 spacious cards on 10" tablets, 4 on 12"+, 5 on wide desktops)
  const cardWidth =
    windowWidth >= 1440
      ? '18.8%'
      : windowWidth >= 1180
      ? '23.8%'
      : windowWidth >= 740
      ? '31.8%'
      : '48.5%';

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
            <View style={styles.tablesGrid}>
              {/* Dine-In Physical Tables */}
              {filteredTables.map((table) => (
                <View key={table.id} style={[styles.cardCol, { width: cardWidth }]}>
                  <TableCard table={table} onPress={handleTablePress} />
                </View>
              ))}

              {/* Walk-In Takeout Queue Cards */}
              {filteredTakeoutOrders.map((toOrder) => (
                <View key={toOrder.id} style={[styles.cardCol, { width: cardWidth }]}>
                  <TakeoutQueueCard
                    order={toOrder}
                    onPress={(o) => {
                      setOrderEntryContext({
                        type: 'takeout',
                        title: `Takeout #${o.ticketNumber} • "${o.customerName}"`,
                        takeoutCustomer: o.customerName,
                        takeoutPrepaid: o.isPrepaid,
                        initialItems: o.items,
                      });
                      setIsOrderEntryOpen(true);
                    }}
                    onMarkReady={(id) => {
                      const o = takeoutOrders.find((x) => x.id === id);
                      updateTakeoutStatus(id, 'ready');
                      toast.success(
                        `Takeout #${o?.ticketNumber || ''} (${o?.customerName || ''}) is READY for pickup!`,
                        { title: 'Takeout Ready' }
                      );
                    }}
                    onMarkCollected={(id) => {
                      const o = takeoutOrders.find((x) => x.id === id);
                      updateTakeoutStatus(id, 'completed');
                      toast.info(
                        `Takeout #${o?.ticketNumber || ''} handed to ${o?.customerName || 'guest'}. Order completed.`,
                        { title: 'Takeout Handed Off' }
                      );
                    }}
                  />
                </View>
              ))}

              {/* Online Delivery Queue Cards (GrabFood & Foodpanda) */}
              {filteredOnlineOrders.map((olOrder) => (
                <View key={olOrder.id} style={[styles.cardCol, { width: cardWidth }]}>
                  <OnlineDeliveryCard
                    order={olOrder}
                    onPress={(o) => {
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
                    onMarkReady={(id) => {
                      const o = onlineOrders.find((x) => x.id === id);
                      updateOnlineStatus(id, 'ready');
                      const plat = o?.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
                      toast.success(
                        `${plat} #${o?.platformOrderRef || ''} bagged & READY for driver pickup!`,
                        { title: 'Delivery Ready' }
                      );
                    }}
                    onHandToRider={(id) => {
                      const o = onlineOrders.find((x) => x.id === id);
                      updateOnlineStatus(id, 'completed');
                      const plat = o?.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
                      toast.info(
                        `${plat} #${o?.platformOrderRef || ''} handed to courier ${o?.riderName || ''}. Delivery on way.`,
                        { title: 'Dispatched to Courier' }
                      );
                    }}
                  />
                </View>
              ))}
            </View>
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

      {/* MODAL 1: Table Action Modal */}
      <TableActionModal
        visible={isActionModalOpen}
        table={selectedTable}
        onClose={() => setIsActionModalOpen(false)}
        onTransferTable={(t) => {
          setTableToTransfer(t);
          setIsTransferModalOpen(true);
        }}
        onOpenOrderEntry={handleOpenOrderEntryFromModal}
        onOpenNewTab={handleOpenNewSplitTab}
        onCheckout={handleOpenCheckout}
      />

      {/* MODAL 2: Table & Tab Transfer Modal */}
      <TableTransferModal
        visible={isTransferModalOpen}
        originTable={tableToTransfer}
        allTables={tables}
        onClose={() => setIsTransferModalOpen(false)}
        onConfirmTransfer={handleConfirmTransfer}
      />

      {/* MODAL 3: Open Table Tab Modal */}
      <OpenTableTabModal
        visible={isOpenTabModalOpen}
        tables={tables}
        preselectedTable={selectedTable}
        onClose={() => setIsOpenTabModalOpen(false)}
        onConfirmOpenTab={handleConfirmOpenTab}
      />

      {/* MODAL 4: New Walk-In Takeout Modal */}
      <NewTakeoutModal
        visible={isTakeoutModalOpen}
        nextTicketNumber={`T-${107 + takeoutOrders.length}`}
        onClose={() => setIsTakeoutModalOpen(false)}
        onProceedToOrder={handleProceedTakeout}
      />

      {/* MODAL 5: Online Delivery Intake Modal */}
      <OnlineDeliveryModal
        visible={isOnlineModalOpen}
        onClose={() => setIsOnlineModalOpen(false)}
        onProceedToOrder={handleProceedOnline}
      />

      {/* MODAL 6: Fullscreen Menu Catalog & Order Entry Modal */}
      <OrderEntryModal
        visible={isOrderEntryOpen}
        title={orderEntryContext?.title || 'Order Entry'}
        initialItems={orderEntryContext?.initialItems || []}
        hasExistingCorkage={orderEntryContext?.hasExistingCorkage || false}
        onClose={() => {
          setIsOrderEntryOpen(false);
          setOrderEntryContext(null);
        }}
        onSendOrder={handleOrderEntrySubmit}
      />

      {/* MODAL 7: Bill Settlement & Checkout Modal */}
      <BillSettlementModal
        visible={isCheckoutOpen}
        table={checkoutContext?.table || null}
        activeTab={checkoutContext?.activeTab}
        onClose={() => {
          setIsCheckoutOpen(false);
          setCheckoutContext(null);
        }}
        onConfirmPayment={handleConfirmPayment}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f6f0ed',
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 18,
    gap: 18,
  },
  mainContent: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardCol: {
    minWidth: 175,
  },
});
