import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useOrderStore } from '../../../../store/useOrderStore';
import { toast } from '../../../../store/useToastStore';
import { Sidebar, NavTabId } from '../../../navigation/Sidebar';
import { BaristaKdsHeader } from '../components/BaristaKdsHeader';
import { BaristaKanbanColumn } from '../components/BaristaKanbanColumn';
import { BarTicket, StockInventoryItem } from '../types';
import { OutOfStockModal, BarProductStock } from '../modals/OutOfStockModal';
import { OutOfStockListModal } from '../modals/OutOfStockListModal';
import { AdjustStockModal } from '../modals/AdjustStockModal';
import { FohStatusModal } from '../modals/FohStatusModal';
import { SharedChatView, SharedAlertsView } from '../../../shared';
import { StationSettingsModal } from '../../common/modals/StationSettingsModal';

// Initial baseline mock items matching the exact screenshot reference
const INITIAL_BAR_TICKETS: BarTicket[] = [
  // 1. New Column Tickets
  {
    id: 'kds-1047',
    orderNumber: '#1047',
    tableOrSource: 'Table A3',
    stage: 'new',
    elapsedTime: '00:20',
    minutesElapsed: 0,
    badges: ['NEW', 'RUSH'],
    items: [
      {
        id: 'i-1047-1',
        productId: 'm-sparkling-water',
        productName: 'Sparkling Water',
        unitPrice: 4.0,
        quantity: 2,
        stationTarget: 'bar',
        status: 'pending',
      },
    ],
    specialNote: '! Serve with lemon',
    serverName: 'Ana Reyes (Bar Staff)',
  },
  {
    id: 'kds-1042',
    orderNumber: '#1042',
    tableOrSource: 'Table B1',
    stage: 'new',
    elapsedTime: '03:10',
    minutesElapsed: 3,
    badges: ['NEW', 'JUST IN'],
    multiStationTag: 'Multi-Station · Cafe · New',
    items: [
      {
        id: 'i-1042-1',
        productId: 'm-craft-ipa',
        productName: 'Craft IPA',
        unitPrice: 8.5,
        quantity: 1,
        stationTarget: 'bar',
        status: 'pending',
        is86: true,
      },
    ],
    hasFohStatusAlert: true,
    fohStatusMessage:
      'Craft IPA was ordered at Table B1, but the item is out of stock. Waiter notified to offer substitution.',
    serverName: 'Jess Santos (FOH Waiter)',
  },
  {
    id: 'kds-1044',
    orderNumber: '#1044',
    tableOrSource: 'Table C2',
    stage: 'new',
    elapsedTime: '01:45',
    minutesElapsed: 1,
    badges: ['NEW'],
    items: [
      {
        id: 'i-1044-1',
        productId: 'm-flat-white',
        productName: 'Flat White (Oat Milk)',
        unitPrice: 5.0,
        quantity: 1,
        stationTarget: 'bar',
        status: 'pending',
      },
    ],
    serverName: 'Ella (Floor Waiter)',
  },
  {
    id: 'kds-1046',
    orderNumber: '#1046',
    tableOrSource: 'Takeout T-103',
    stage: 'new',
    elapsedTime: '02:10',
    minutesElapsed: 2,
    badges: ['NEW'],
    items: [
      {
        id: 'i-1046-1',
        productId: 'm-cold-brew',
        productName: 'Single Origin Cold Brew',
        unitPrice: 5.0,
        quantity: 2,
        stationTarget: 'bar',
        status: 'pending',
      },
    ],
    serverName: 'Coltrane (Cashier)',
  },

  // 2. Preparing Column Tickets
  {
    id: 'kds-1039',
    orderNumber: '#1039',
    tableOrSource: 'Table B2',
    stage: 'preparing',
    elapsedTime: '06:20',
    minutesElapsed: 6,
    badges: ['PREPARING'],
    multiStationTag: 'Multi-Station · Cafe · Preparing',
    items: [
      {
        id: 'i-1039-1',
        productId: 'm-craft-ipa',
        productName: 'Craft IPA',
        unitPrice: 8.5,
        quantity: 2,
        stationTarget: 'bar',
        status: 'preparing',
        is86: true,
      },
      {
        id: 'i-1039-2',
        productId: 'm-sparkling-water',
        productName: 'Sparkling Water',
        unitPrice: 4.0,
        quantity: 1,
        stationTarget: 'bar',
        status: 'preparing',
      },
    ],
    isReadyBlocked: true,
    fohStatusMessage:
      'Order blocked: 2× Craft IPA are out of stock. Waiting for table waiter to confirm substitution.',
    serverName: 'Jess Santos (FOH Waiter)',
  },
  {
    id: 'kds-1040',
    orderNumber: '#1040',
    tableOrSource: 'Table A1',
    stage: 'preparing',
    elapsedTime: '05:30',
    minutesElapsed: 5,
    badges: ['PREPARING', 'ITEM VOIDED'],
    items: [
      {
        id: 'i-1040-1',
        productId: 'm-house-red',
        productName: 'House Red Wine',
        unitPrice: 13.0,
        quantity: 3,
        stationTarget: 'bar',
        status: 'preparing',
      },
      {
        id: 'i-1040-2',
        productId: 'm-sparkling-water',
        productName: 'Sparkling Water',
        unitPrice: 4.0,
        quantity: 1,
        stationTarget: 'bar',
        status: 'served',
        isVoided: true,
      },
    ],
    voidNote: '! Sparkling Water voided · Do not prepare',
    serverName: 'Miles (Manager)',
  },

  // 3. Ready Column Tickets
  {
    id: 'kds-1038',
    orderNumber: '#1038',
    tableOrSource: 'Table B3',
    stage: 'ready',
    elapsedTime: '1m ago',
    minutesElapsed: 7,
    badges: ['READY'],
    multiStationTag: 'Multi-Station · Cafe · Preparing',
    items: [
      {
        id: 'i-1038-1',
        productId: 'm-margarita',
        productName: 'Margarita',
        unitPrice: 14.0,
        quantity: 1,
        stationTarget: 'bar',
        status: 'ready',
      },
      {
        id: 'i-1038-2',
        productId: 'm-espresso-martini',
        productName: 'Espresso Martini',
        unitPrice: 15.0,
        quantity: 1,
        stationTarget: 'bar',
        status: 'ready',
      },
    ],
    serverName: 'Jess Santos (FOH Waiter)',
  },
  {
    id: 'kds-1034',
    orderNumber: '#1034',
    tableOrSource: 'Table D1',
    stage: 'ready',
    elapsedTime: '2m ago',
    minutesElapsed: 9,
    badges: ['READY'],
    items: [
      {
        id: 'i-1034-1',
        productId: 'm-craft-ipa',
        productName: 'Craft IPA',
        unitPrice: 8.5,
        quantity: 1,
        stationTarget: 'bar',
        status: 'ready',
        is86: true,
      },
    ],
    serverName: 'Ella (Floor Waiter)',
  },
  {
    id: 'kds-1035',
    orderNumber: '#1035',
    tableOrSource: 'Table D2',
    stage: 'ready',
    elapsedTime: '3m ago',
    minutesElapsed: 11,
    badges: ['READY'],
    items: [
      {
        id: 'i-1035-1',
        productId: 'm-classic-negroni',
        productName: 'Monk’s Classic Negroni',
        unitPrice: 14.0,
        quantity: 2,
        stationTarget: 'bar',
        status: 'ready',
      },
    ],
    serverName: 'Ella (Floor Waiter)',
  },
];

// Baseline Beverage Stock Items
const INITIAL_INVENTORY: StockInventoryItem[] = [
  {
    id: 'inv-craft-ipa',
    name: 'Craft IPA (Draft Keg)',
    category: 'beer',
    unit: 'Kegs (50L)',
    inStockCount: 0,
    lowStockThreshold: 1,
    is86: true,
  },
  {
    id: 'inv-sparkling-water',
    name: 'Sparkling Mineral Water',
    category: 'water',
    unit: 'Bottles (750ml)',
    inStockCount: 24,
    lowStockThreshold: 6,
    is86: false,
  },
  {
    id: 'inv-house-red',
    name: 'Willamette Valley Pinot Noir',
    category: 'wine',
    unit: 'Bottles (750ml)',
    inStockCount: 8,
    lowStockThreshold: 3,
    is86: false,
  },
  {
    id: 'inv-margarita-tequila',
    name: 'Blanco Tequila (Margaritas)',
    category: 'spirits',
    unit: 'Bottles (1L)',
    inStockCount: 5,
    lowStockThreshold: 2,
    is86: false,
  },
  {
    id: 'inv-espresso-beans',
    name: 'Monk’s Roast Espresso Beans',
    category: 'coffee',
    unit: 'Bags (1kg)',
    inStockCount: 4,
    lowStockThreshold: 2,
    is86: false,
  },
  {
    id: 'inv-fresh-mint',
    name: 'Organic Fresh Mint & Citrus',
    category: 'garnishes',
    unit: 'Bunches',
    inStockCount: 14,
    lowStockThreshold: 4,
    is86: false,
  },
];

export const BaristaKdsScreen: React.FC = () => {
  const { logout, isOnline, setIsOnline } = useAuthStore();
  const { tables, takeoutOrders, onlineOrders, alerts, addAlert, updateOrderItemStatus } =
    useOrderStore();

  // Local state for tickets, modals, and station configuration
  const [tickets, setTickets] = useState<BarTicket[]>(INITIAL_BAR_TICKETS);
  const [inventory, setInventory] = useState<StockInventoryItem[]>(INITIAL_INVENTORY);
  const [activeSidebarTab, setActiveSidebarTab] = useState<NavTabId>('board');
  const [audioChimes, setAudioChimes] = useState(true);
  const [barOnlyFilter, setBarOnlyFilter] = useState(true);

  // Modals visibility
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isOutOfStockListModalOpen, setIsOutOfStockListModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [fohModalTicket, setFohModalTicket] = useState<BarTicket | null>(null);

  // Sync live orders added to the store into the KDS tickets
  useEffect(() => {
    const liveNewTickets: BarTicket[] = [];

    // 1. Dine-in tables (Grouped by Sub-Order Round)
    tables.forEach((table) => {
      (table.tabs || []).forEach((tab) => {
        const barItems = tab.items.filter((item) => item.stationTarget === 'bar');
        if (barItems.length > 0) {
          // Group items by round number
          const roundsMap = new Map<number, typeof barItems>();
          barItems.forEach((item) => {
            const r = item.roundNumber || 1;
            if (!roundsMap.has(r)) roundsMap.set(r, []);
            roundsMap.get(r)!.push(item);
          });

          roundsMap.forEach((roundItems, roundNum) => {
            if (roundItems.some((i) => i.status !== 'served')) {
              const ticketId = `tbl-${table.id}-${tab.id}-r${roundNum}`;
              const existing = tickets.find((t) => t.id === ticketId);
              const hasPrep = roundItems.some((i) => i.status === 'preparing');
              const allReady = roundItems.every(
                (i) => i.status === 'ready' || i.status === 'cancelled'
              );
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

              const otherStationItems = (tab.items || []).filter(
                (i) => (i.roundNumber || 1) === roundNum && i.stationTarget !== 'bar'
              );
              const multiStationTag =
                otherStationItems.length > 0
                  ? `Multi-Station · ${otherStationItems.length} food item(s) at Kitchen`
                  : undefined;

              if (!existing) {
                liveNewTickets.push({
                  id: ticketId,
                  orderNumber: `#${table.code.replace('Table ', 'T')}-${tab.tabIndex}${roundNum > 1 ? `-R${roundNum}` : ''}`,
                  tableOrSource: `${table.code} · Tab ${tab.tabIndex}`,
                  stage,
                  roundNumber: roundNum,
                  elapsedTime: table.elapsedTime || '1m',
                  minutesElapsed: parseInt(table.elapsedTime || '1', 10) || 1,
                  badges,
                  multiStationTag,
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
              } else if (hasCancelled && !existing.badges.includes('ITEM VOIDED')) {
                // Synchronize existing ticket with store void status
                setTickets((prev) =>
                  prev.map((t) =>
                    t.id === ticketId
                      ? {
                          ...t,
                          badges: Array.from(new Set([...t.badges, 'ITEM VOIDED'])),
                          voidNote: '! Item(s) voided · Do not prepare',
                          items: t.items.map((it) => {
                            const updated = roundItems.find((ri) => ri.id === it.id);
                            return updated
                              ? {
                                  ...it,
                                  status: updated.status,
                                  isVoided: updated.status === 'cancelled',
                                }
                              : it;
                          }),
                        }
                      : t
                  )
                );
              }
            }
          });
        }
      });
    });

    // 2. Takeout orders with Bar items
    takeoutOrders.forEach((order) => {
      const barItems = order.items.filter((i) => i.stationTarget === 'bar');
      if (barItems.length > 0 && order.status !== 'completed') {
        const ticketId = `takeout-${order.id}`;
        const existing = tickets.find((t) => t.id === ticketId);
        if (!existing) {
          liveNewTickets.push({
            id: ticketId,
            orderNumber: order.ticketNumber,
            tableOrSource: `Takeout · ${order.customerName}`,
            stage: order.status === 'ready' ? 'ready' : 'new',
            elapsedTime: order.elapsedTime || '1m',
            minutesElapsed: 1,
            badges: ['NEW', 'JUST IN'],
            items: barItems,
            serverName: order.customerName,
          });
        }
      }
    });

    // 3. Online delivery orders with Bar items
    onlineOrders.forEach((order) => {
      const barItems = order.items.filter((i) => i.stationTarget === 'bar');
      if (barItems.length > 0 && order.status !== 'completed') {
        const ticketId = `online-${order.id}`;
        const existing = tickets.find((t) => t.id === ticketId);
        if (!existing) {
          const platformLabel = order.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
          liveNewTickets.push({
            id: ticketId,
            orderNumber: order.platformOrderRef,
            tableOrSource: `${platformLabel} · ${order.riderName}`,
            stage: order.status === 'ready' ? 'ready' : 'new',
            elapsedTime: order.elapsedTime || '1m',
            minutesElapsed: 1,
            badges: ['NEW', 'RUSH'],

            items: barItems,
            serverName: order.customerName,
          });
        }
      }
    });

    if (liveNewTickets.length > 0) {
      setTickets((prev) => [...liveNewTickets, ...prev]);
    }
  }, [tables, takeoutOrders, onlineOrders, inventory, tickets]);

  // Derived products for availability manager
  const barProducts: BarProductStock[] = useMemo(() => {
    return inventory.map((inv) => ({
      id: inv.id,
      name: inv.name,
      category: inv.category,
      is86: inv.is86,
      stockCount: inv.inStockCount,
    }));
  }, [inventory]);

  const outOfStockItems = useMemo(() => {
    return barProducts.filter((p) => p.is86);
  }, [barProducts]);

  // Tickets grouped by stage
  const newTickets = useMemo(() => tickets.filter((t) => t.stage === 'new'), [tickets]);
  const preparingTickets = useMemo(() => tickets.filter((t) => t.stage === 'preparing'), [tickets]);
  const readyTickets = useMemo(() => tickets.filter((t) => t.stage === 'ready'), [tickets]);

  const activeTicketsCount = newTickets.length + preparingTickets.length;
  const unreadAlertCount = alerts.filter((a) => !a.isRead).length;

  // Actions
  const handleStartTicket = (ticket: BarTicket) => {
    ticket.items.forEach((item) => updateOrderItemStatus(item.id, 'preparing'));

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticket.id
          ? {
              ...t,
              stage: 'preparing',
              badges: ['PREPARING'],
              elapsedTime: '00:01',
              items: t.items.map((i) => ({ ...i, status: 'preparing' })),
            }
          : t
      )
    );
    toast.success(`Preparing ${ticket.orderNumber} (${ticket.tableOrSource})`);
  };

  const handleReadyTicket = (ticket: BarTicket) => {
    ticket.items.forEach((item) => updateOrderItemStatus(item.id, 'ready'));

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticket.id
          ? {
              ...t,
              stage: 'ready',
              badges: ['READY'],
              elapsedTime: 'Just now',
              items: t.items.map((i) => ({ ...i, status: 'ready' })),
            }
          : t
      )
    );
    toast.success(`Order Ready: ${ticket.orderNumber} for pickup`);
  };

  const handleRecallTicket = (ticket: BarTicket) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticket.id
          ? {
              ...t,
              stage: 'preparing',
              badges: ['PREPARING'],
              items: t.items.map((i) => ({ ...i, status: 'preparing' })),
            }
          : t
      )
    );
    toast.info(`Recalled ${ticket.orderNumber} to Preparing`);
  };

  const handleToggleItem = (ticketId: string, itemId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          items: t.items.map((i) => {
            if (i.id !== itemId) return i;
            const nextStatus = i.status === 'ready' ? 'preparing' : 'ready';
            return { ...i, status: nextStatus };
          }),
        };
      })
    );
  };

  // Toggle item availability
  const handleToggleAvailability = (
    productId: string,
    willBeUnavailable: boolean,
    reason = 'Depleted'
  ) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === productId
          ? {
              ...item,
              is86: willBeUnavailable,
              inStockCount: willBeUnavailable ? 0 : item.inStockCount || 10,
            }
          : item
      )
    );

    const product = inventory.find((p) => p.id === productId);
    const prodName = product ? product.name : 'Bar Item';

    addAlert({
      title: willBeUnavailable ? `⚠️ Out of Stock: ${prodName}` : `✅ In Stock: ${prodName}`,
      description: willBeUnavailable
        ? `${prodName} is now out of stock (${reason}). Ordering prevented on all floor terminals.`
        : `${prodName} has been replenished and is now available on floor menu.`,
      type: 'auto_86',
      targetRef: prodName,
    });

    setTickets((prev) =>
      prev.map((t) => ({
        ...t,
        items: t.items.map((i) => {
          if (
            i.productName.toLowerCase().includes(prodName.toLowerCase()) ||
            prodName.toLowerCase().includes(i.productName.toLowerCase())
          ) {
            return { ...i, is86: willBeUnavailable };
          }
          return i;
        }),
      }))
    );

    if (willBeUnavailable) {
      toast.warning(`${prodName} is now out of stock (${reason})`, { title: 'Item Out of Stock' });
    } else {
      toast.success(`${prodName} is back in stock!`, { title: 'Item Available' });
    }
  };

  // Stock inventory adjustment
  const handleUpdateStockCount = (id: string, delta: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextCount = Math.max(0, item.inStockCount + delta);
        const autoOutOfStock = nextCount === 0;

        if (autoOutOfStock && !item.is86) {
          handleToggleAvailability(item.id, true, 'Zero Stock Count');
        } else if (nextCount > 0 && item.is86) {
          handleToggleAvailability(item.id, false);
        }

        return {
          ...item,
          inStockCount: nextCount,
          is86: nextCount === 0,
        };
      })
    );
  };

  // Substitution request from FOH status modal
  const handleSendSubstitutionRequest = (ticketId: string, suggestion: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    addAlert({
      title: `🍸 Bar Substitution Needed: ${ticket.tableOrSource}`,
      description: `Ticket ${ticket.orderNumber}: ${suggestion}. Waiter ${ticket.serverName || 'Jess Santos'} alerted.`,
      type: 'station_ready',
      targetRef: ticket.tableOrSource,
    });

    toast.success(`Prompt sent to waiter for ${ticket.tableOrSource}`);
  };

  const handleForceUnblock = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              isReadyBlocked: false,
              hasFohStatusAlert: false,
            }
          : t
      )
    );
    toast.success('Order unblocked. Proceeding with drink preparation.');
  };

  const handleSelectSidebarTab = (tab: NavTabId) => {
    if (tab === 'settings') {
      setIsSettingsModalOpen(true);
    } else {
      setActiveSidebarTab(tab);
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* 1. Consistent App-Wide Navigation Sidebar (mode="kds") */}
      <Sidebar
        mode="kds"
        activeTab={activeSidebarTab}
        onTabChange={handleSelectSidebarTab}
        onLogout={() => {
          toast.info('Barista station locked.', { title: 'Clocked Out' });
          logout();
        }}
        unreadChatCount={3}
        alertCount={unreadAlertCount}
      />

      {/* 2. Main Content Container */}
      <View style={styles.mainContent}>
        {activeSidebarTab === 'chat' ? (
          <SharedChatView
            senderName="Ana Reyes"
            senderRole="Bar Staff"
            defaultChannel="bar"
            onBack={() => setActiveSidebarTab('board')}
          />
        ) : activeSidebarTab === 'alerts' ? (
          <SharedAlertsView onBack={() => setActiveSidebarTab('board')} />
        ) : (
          <>
            {/* Top Header Banner */}
            <BaristaKdsHeader
              stationName="Bar Station"
              isOnline={isOnline}
              staffName="Ana Reyes"
              staffRole="Bar Staff"
              staffInitials="AR"
              onStaffPress={() => setIsSettingsModalOpen(true)}
            />

            {/* Subheader & Action Toolbar */}
            <View style={styles.toolbarRow}>
              <View style={styles.toolbarTitleCol}>
                <Text style={styles.pageTitle}>Orders</Text>
                <Text style={styles.pageSubtitle}>
                  Bar items only · {activeTicketsCount} active tickets
                </Text>
              </View>

              <View style={styles.toolbarActions}>
                {/* Item Availability Button */}
                <Pressable
                  onPress={() => setIsAvailabilityModalOpen(true)}
                  style={({ pressed }) => [styles.btnAvailability, pressed && styles.btnPressed]}
                >
                  <Text style={styles.btnAvailabilityText}>Mark Out of Stock</Text>
                </Pressable>

                {/* Out of Stock (N) Button */}
                <Pressable
                  onPress={() => setIsOutOfStockListModalOpen(true)}
                  style={({ pressed }) => [styles.btnOutOfStockCount, pressed && styles.btnPressed]}
                >
                  <Text style={styles.btnOutOfStockCountText}>
                    Out of Stock ({outOfStockItems.length})
                  </Text>
                </Pressable>

                {/* Adjust Stock Button */}
                <Pressable
                  onPress={() => setIsStockModalOpen(true)}
                  style={({ pressed }) => [styles.btnAdjustStock, pressed && styles.btnPressed]}
                >
                  <Text style={styles.btnAdjustStockText}>Adjust Stock</Text>
                </Pressable>
              </View>
            </View>

            {/* 3. Three-Column Kanban Board */}
            <View style={styles.kanbanBoard}>
              {/* Column 1: New */}
              <BaristaKanbanColumn
                stage="new"
                title="New"
                count={newTickets.length}
                tickets={newTickets}
                overflowCount={newTickets.length > 2 ? newTickets.length - 1 : 0}
                onStartTicket={handleStartTicket}
                onViewFohStatus={(ticket) => setFohModalTicket(ticket)}
                onToggleItem={handleToggleItem}
              />

              {/* Column 2: Preparing */}
              <BaristaKanbanColumn
                stage="preparing"
                title="Preparing"
                count={preparingTickets.length}
                tickets={preparingTickets}
                overflowCount={preparingTickets.length > 2 ? preparingTickets.length - 1 : 1}
                onReadyTicket={handleReadyTicket}
                onReadyBlockedPress={(ticket) => setFohModalTicket(ticket)}
                onToggleItem={handleToggleItem}
              />

              {/* Column 3: Ready */}
              <BaristaKanbanColumn
                stage="ready"
                title="Ready"
                count={readyTickets.length}
                tickets={readyTickets}
                overflowCount={readyTickets.length > 2 ? 1 : 0}
                onRecallTicket={handleRecallTicket}
                onToggleItem={handleToggleItem}
              />
            </View>
          </>
        )}
      </View>

      {/* Floating Chat Bubble at bottom-right (badge 3) - shown when on board */}
      {activeSidebarTab === 'board' ? (
        <Pressable
          onPress={() => setActiveSidebarTab('chat')}
          style={({ pressed }) => [styles.floatingChatBtn, pressed && styles.floatingChatPressed]}
        >
          <MessageSquare size={22} color="#ffffff" strokeWidth={2.2} />
          <View style={styles.floatingChatBadge}>
            <Text style={styles.floatingChatBadgeText}>3</Text>
          </View>
        </Pressable>
      ) : null}

      {/* Modals & Drawers */}
      <OutOfStockModal
        visible={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        products={barProducts}
        onToggleAvailability={handleToggleAvailability}
      />

      <OutOfStockListModal
        visible={isOutOfStockListModalOpen}
        onClose={() => setIsOutOfStockListModalOpen(false)}
        outOfStockItems={outOfStockItems}
        onRestock={(id) => handleToggleAvailability(id, false)}
        onOpenAvailabilityManager={() => setIsAvailabilityModalOpen(true)}
      />

      <AdjustStockModal
        visible={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        inventory={inventory}
        onUpdateCount={handleUpdateStockCount}
      />

      <FohStatusModal
        visible={Boolean(fohModalTicket)}
        ticket={fohModalTicket}
        onClose={() => setFohModalTicket(null)}
        onSendSubstitutionRequest={handleSendSubstitutionRequest}
        onForceUnblock={handleForceUnblock}
      />

      <StationSettingsModal
        visible={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        isOnline={isOnline}
        onToggleOnline={setIsOnline}
        audioChimes={audioChimes}
        onToggleAudio={setAudioChimes}
        barOnlyFilter={barOnlyFilter}
        onToggleBarFilter={setBarOnlyFilter}
        onClockOut={() => {
          toast.info('Barista station locked.', { title: 'Clocked Out' });
          logout();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f7f1ec',
    padding: 16,
    position: 'relative',
  },
  mainContent: {
    flex: 1,
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  toolbarTitleCol: {
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 2,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnAvailability: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  btnAvailabilityText: {
    color: '#701a31',
    fontSize: 13,
    fontWeight: '800',
  },
  btnOutOfStockCount: {
    backgroundColor: '#fdf2f4',
    borderWidth: 1.5,
    borderColor: '#fbcfe8',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutOfStockCountText: {
    color: '#701a31',
    fontSize: 13,
    fontWeight: '800',
  },
  btnAdjustStock: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  btnAdjustStockText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  kanbanBoard: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
  },
  floatingChatBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#5c1d2e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingChatPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  floatingChatBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  floatingChatBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
});
