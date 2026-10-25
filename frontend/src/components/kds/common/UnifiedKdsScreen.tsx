import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { useAuthStore } from '../../../features/auth/application/useAuthStore';
import { useOrderStore } from '../../../features/orders/application/useOrderStore';
import { toast } from '../../../features/shared/toast/useToastStore';
import { Sidebar, NavTabId } from '../../navigation/Sidebar';
import { BaristaKdsHeader } from '../barista/components/BaristaKdsHeader';
import { BaristaKanbanColumn } from '../barista/components/BaristaKanbanColumn';
import { BarTicket, StockInventoryItem } from '../barista/types';
import { OutOfStockModal, BarProductStock } from '../barista/modals/OutOfStockModal';
import { OutOfStockListModal } from '../barista/modals/OutOfStockListModal';
import { AdjustStockModal } from '../barista/modals/AdjustStockModal';
import { FohStatusModal } from '../barista/modals/FohStatusModal';
import { SharedChatView, SharedAlertsView } from '../../shared';
import { StationSettingsModal } from '../common/modals/StationSettingsModal';
import { supabase } from '../../../features/shared/infrastructure/supabase';

// Native Web Audio chime for KDS ticket arrivals
const playKdsChime = () => {
  try {
    const AudioCtx =
      typeof window !== 'undefined'
        ? window.AudioContext || (window as any).webkitAudioContext
        : null;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.12); // C6
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // AudioContext blocked or unsupported in headless environment
  }
};

export interface UnifiedKdsScreenProps {
  stationTarget: 'bar' | 'kitchen';
  stationName: string;
  stationSubtitle: string;
  defaultStaffName: string;
  defaultStaffRole: string;
  defaultStaffInitials: string;
  chatSenderRole: string;
  chatDefaultChannel: 'bar' | 'kitchen';
}

export const UnifiedKdsScreen: React.FC<UnifiedKdsScreenProps> = ({
  stationTarget,
  stationName,
  stationSubtitle,
  defaultStaffName,
  defaultStaffRole,
  defaultStaffInitials,
  chatSenderRole,
  chatDefaultChannel,
}) => {
  const { currentUser, logout, isOnline, setIsOnline } = useAuthStore();
  const {
    tables,
    takeoutOrders,
    onlineOrders,
    alerts,
    addAlert,
    updateOrderItemStatus,
    markRoundServed,
    markTakeoutServed,
    markOnlineServed,
  } = useOrderStore();

  const [inventory, setInventory] = useState<StockInventoryItem[]>([]);
  const [activeSidebarTab, setActiveSidebarTab] = useState<NavTabId>('board');
  const [audioChimes, setAudioChimes] = useState(true);
  const [stationFilter, setStationFilter] = useState(true);

  // Modals visibility
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isOutOfStockListModalOpen, setIsOutOfStockListModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [fohModalTicket, setFohModalTicket] = useState<BarTicket | null>(null);

  // Load real inventory items from DB
  useEffect(() => {
    let isMounted = true;
    async function loadDbInventory() {
      try {
        const { data } = await supabase
          .from('inventory_items')
          .select('id, name, category, unit, current_stock, min_alert_level')
          .order('name');
        if (isMounted && data) {
          setInventory(
            data.map((item: any) => ({
              id: item.id,
              name: item.name,
              category: (item.category || 'spirits').toLowerCase(),
              unit: item.unit,
              inStockCount: parseFloat(item.current_stock) || 0,
              lowStockThreshold: parseFloat(item.min_alert_level) || 0,
              is86: (parseFloat(item.current_stock) || 0) <= 0,
            }))
          );
        }
      } catch (err) {
        console.warn(`Failed to load inventory from DB for ${stationTarget}:`, err);
      }
    }
    loadDbInventory();
    return () => {
      isMounted = false;
    };
  }, [stationTarget]);

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

  // Derived products for availability manager
  const stationProducts: BarProductStock[] = useMemo(() => {
    return inventory.map((inv) => ({
      id: inv.id,
      name: inv.name,
      category: inv.category,
      is86: inv.is86,
      stockCount: inv.inStockCount,
    }));
  }, [inventory]);

  const outOfStockItems = useMemo(() => {
    return stationProducts.filter((p) => p.is86);
  }, [stationProducts]);

  // Tickets grouped by stage
  const newTickets = useMemo(() => allTickets.filter((t) => t.stage === 'new'), [allTickets]);
  const preparingTickets = useMemo(
    () => allTickets.filter((t) => t.stage === 'preparing'),
    [allTickets]
  );
  const readyTickets = useMemo(() => allTickets.filter((t) => t.stage === 'ready'), [allTickets]);

  const activeTicketsCount = newTickets.length + preparingTickets.length;
  const unreadAlertCount = alerts.filter((a) => !a.isRead).length;

  // Audio chime & notification on incoming new tickets
  const prevNewTicketIdsRef = useRef<Set<string>>(new Set());
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevNewTicketIdsRef.current = new Set(newTickets.map((t) => t.id));
      return;
    }

    const prevIds = prevNewTicketIdsRef.current;
    const incomingNewTickets = newTickets.filter((t) => !prevIds.has(t.id));

    if (incomingNewTickets.length > 0) {
      if (audioChimes) {
        playKdsChime();
      }
      incomingNewTickets.forEach((t) => {
        const roundText = t.roundNumber && t.roundNumber > 1 ? ` (Round ${t.roundNumber})` : '';
        toast.info(`🔔 New Order: ${t.orderNumber}${roundText} JUST IN`, {
          title: `New Ticket at ${stationName}`,
        });
      });
    }

    prevNewTicketIdsRef.current = new Set(newTickets.map((t) => t.id));
  }, [newTickets, audioChimes, stationName]);

  // Actions with robust error handling
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
    const prodName = product?.name || 'Selected Item';

    addAlert({
      title: willBeUnavailable ? `⚠️ Out of Stock: ${prodName}` : `✅ In Stock: ${prodName}`,
      description: willBeUnavailable
        ? `${prodName} is now out of stock (${reason}). Ordering prevented on all floor terminals.`
        : `${prodName} has been replenished and is now available on floor menu.`,
      type: 'auto_86',
      targetRef: prodName,
    });

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

  const handleSendSubstitutionRequest = (ticketId: string, suggestion: string) => {
    const ticket = allTickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    addAlert({
      title: `🍸 ${stationName} Substitution Needed: ${ticket.tableOrSource}`,
      description: `Ticket ${ticket.orderNumber}: ${suggestion}. Waiter alerted.`,
      type: 'station_ready',
      targetRef: ticket.tableOrSource,
    });

    toast.success(`Prompt sent to waiter for ${ticket.tableOrSource}`);
  };

  const handleForceUnblock = (_ticketId: string) => {
    toast.success('Order unblocked. Proceeding with preparation.');
  };

  const handleSelectSidebarTab = (tab: NavTabId) => {
    if (tab === 'settings') {
      setIsSettingsModalOpen(true);
    } else {
      setActiveSidebarTab(tab);
    }
  };

  const staffDisplayName = currentUser?.displayName || defaultStaffName;
  const staffDisplayRole = currentUser?.role?.toUpperCase() || defaultStaffRole;
  const staffInitials =
    staffDisplayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || defaultStaffInitials;

  return (
    <View style={styles.screenContainer}>
      {/* 1. App-Wide Navigation Sidebar (mode="kds") */}
      <Sidebar
        mode="kds"
        activeTab={activeSidebarTab}
        onTabChange={handleSelectSidebarTab}
        onLogout={() => {
          toast.info(`${stationName} locked.`, { title: 'Clocked Out' });
          logout();
        }}
        unreadChatCount={3}
        alertCount={unreadAlertCount}
      />

      {/* 2. Main Content Container */}
      <View style={styles.mainContent}>
        {activeSidebarTab === 'chat' ? (
          <SharedChatView
            senderName={staffDisplayName}
            senderRole={chatSenderRole}
            defaultChannel={chatDefaultChannel}
            onBack={() => setActiveSidebarTab('board')}
          />
        ) : activeSidebarTab === 'alerts' ? (
          <SharedAlertsView onBack={() => setActiveSidebarTab('board')} />
        ) : (
          <>
            {/* Top Header Banner */}
            <BaristaKdsHeader
              stationName={stationName}
              isOnline={isOnline}
              staffName={staffDisplayName}
              staffRole={staffDisplayRole}
              staffInitials={staffInitials}
              onStaffPress={() => setIsSettingsModalOpen(true)}
            />

            {/* Subheader & Action Toolbar */}
            <View style={styles.toolbarRow}>
              <View style={styles.toolbarTitleCol}>
                <Text style={styles.pageTitle}>Orders</Text>
                <Text style={styles.pageSubtitle}>
                  {stationSubtitle} · {activeTicketsCount} active tickets
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
                onDismissTicket={handleDismissReadyTicket}
                onToggleItem={handleToggleItem}
              />
            </View>
          </>
        )}
      </View>

      {/* Floating Chat Bubble at bottom-right */}
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
        products={stationProducts}
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
        barOnlyFilter={stationFilter}
        onToggleBarFilter={setStationFilter}
        onClockOut={() => {
          toast.info(`${stationName} locked.`, { title: 'Clocked Out' });
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
    backgroundColor: '#fbf9f6',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 24,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toolbarTitleCol: {
    gap: 2,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnAvailability: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAvailabilityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  btnOutOfStockCount: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnOutOfStockCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991b1b',
  },
  btnAdjustStock: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAdjustStockText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  kanbanBoard: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  floatingChatBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#832238',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#832238',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
  },
  floatingChatPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  floatingChatBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  floatingChatBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
