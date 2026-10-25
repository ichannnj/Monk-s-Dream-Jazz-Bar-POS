import React, { useMemo, useState } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import {
  BellRing,
  CheckCircle,
  Clock,
  Sparkles,
  Utensils,
  ShoppingBag,
  Bike,
  Coffee,
  CheckCircle2,
  Repeat,
} from 'lucide-react-native';
import { useAuthStore } from '../../../../features/auth/application/useAuthStore';
import { useOrderStore } from '../../../../features/orders/application/useOrderStore';
import { toast } from '../../../../features/shared/toast/useToastStore';
import { Sidebar, NavTabId } from '../../../navigation/Sidebar';
import { SharedChatView, SharedAlertsView, ConfirmationModal } from '../../../shared';
import { StationHeader } from '../../common/components/StationHeader';
import { OrderLineItem } from '../../../../types/floor';

interface RunnerTicket {
  id: string;
  orderNumber: string;
  sourceTitle: string; // e.g. "Table 4 · Tab 1 · Round 2"
  guestName: string;
  orderType: 'dine_in' | 'takeout' | 'online_delivery';
  elapsedTime: string;
  minutesElapsed: number;
  items: OrderLineItem[];
  allDone: boolean;
  readyItemsCount: number;
  totalItemsCount: number;
  roundNumber?: number;
  tableId?: string;
  tabIndex?: number;
  transferredFrom?: {
    tableCode: string;
    transferredAt?: string;
  };
}

export const FohRunnerScreen: React.FC = () => {
  const { logout } = useAuthStore();
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
  const [activeTab, setActiveTab] = useState<NavTabId>('board');
  const [confirmHandoff, setConfirmHandoff] = useState<{
    ticket: RunnerTicket;
    target?: 'bar' | 'kitchen';
  } | null>(null);

  const handleLogout = () => {
    toast.info('Runner expediter station locked.', { title: 'Clocked Out' });
    logout();
  };

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

  const handleExecuteHandoff = () => {
    if (!confirmHandoff) return;
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
    } finally {
      setConfirmHandoff(null);
    }
  };

  const unreadAlertCount = alerts.filter((a) => !a.isRead).length;

  return (
    <View style={styles.screenContainer}>
      <Sidebar
        mode="kds"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        unreadChatCount={3}
        alertCount={unreadAlertCount}
      />

      <View style={styles.mainContent}>
        {activeTab === 'chat' ? (
          <SharedChatView
            senderName="FOH Expediter"
            senderRole="FOH Runner"
            defaultChannel="all"
            onBack={() => setActiveTab('board')}
          />
        ) : activeTab === 'alerts' ? (
          <SharedAlertsView onBack={() => setActiveTab('board')} />
        ) : (
          <>
            <StationHeader
              title="Pass Staging & Multi-Station Assembly"
              stationType="runner"
              activeTicketsCount={runnerTickets.length}
              urgentTicketsCount={fullyReadyCount}
              onLogout={handleLogout}
            />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {runnerTickets.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>Pass Staging Clear</Text>
                  <Text style={styles.emptySubtitle}>
                    Orders with prepared bar drinks or kitchen mains will trigger runner alerts
                    here.
                  </Text>
                </View>
              ) : (
                <View style={styles.grid}>
                  {runnerTickets.map((ticket) => {
                    const progressPct =
                      ticket.totalItemsCount > 0
                        ? (ticket.readyItemsCount / ticket.totalItemsCount) * 100
                        : 0;

                    return (
                      <View
                        key={ticket.id}
                        style={[styles.ticketCard, ticket.allDone && styles.ticketCardReady]}
                      >
                        {/* Buzzout Highlight Banner */}
                        {ticket.allDone ? (
                          <View style={styles.buzzoutBanner}>
                            <BellRing size={16} color="#ffffff" />
                            <Text style={styles.buzzoutBannerText}>
                              🔔 BUZZOUT: FULL ORDER READY FOR DELIVERY
                            </Text>
                          </View>
                        ) : null}

                        {/* Table Relocation Warning Banner */}
                        {ticket.transferredFrom ? (
                          <View style={styles.relocatedBanner}>
                            <Repeat size={14} color="#b45309" />
                            <Text style={styles.relocatedBannerText}>
                              MOVED: {ticket.transferredFrom.tableCode} ➔{' '}
                              {ticket.sourceTitle.split(' · ')[0]}
                            </Text>
                          </View>
                        ) : null}

                        {/* Header */}
                        <View style={styles.ticketHeader}>
                          <View style={styles.headerLeft}>
                            <Text style={styles.sourceText}>{ticket.sourceTitle}</Text>
                            <Text style={styles.guestText}>{ticket.guestName}</Text>
                          </View>
                          <View style={styles.timerPill}>
                            <Clock size={12} color="#6b7280" />
                            <Text style={styles.timerText}>{ticket.elapsedTime}</Text>
                          </View>
                        </View>

                        {/* Assembly Progress Bar */}
                        <View style={styles.progressContainer}>
                          <View style={styles.progressBarBg}>
                            <View
                              style={[
                                styles.progressBarFill,
                                { width: `${progressPct}%` },
                                ticket.allDone && { backgroundColor: '#15803d' },
                              ]}
                            />
                          </View>
                          <Text style={styles.progressText}>
                            {ticket.readyItemsCount} of {ticket.totalItemsCount} items ready (
                            {Math.round(progressPct)}%)
                          </Text>
                        </View>

                        {/* Items List */}
                        <View style={styles.itemsList}>
                          {ticket.items.map((item) => {
                            const isReady = item.status === 'ready' || item.status === 'served';
                            const isBar = item.stationTarget === 'bar';

                            return (
                              <View key={item.id} style={styles.itemRow}>
                                <View style={styles.itemLeft}>
                                  <View
                                    style={[
                                      styles.stationBadge,
                                      { backgroundColor: isBar ? '#e0f2fe' : '#fef3c7' },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.stationBadgeText,
                                        { color: isBar ? '#0284c7' : '#d97706' },
                                      ]}
                                    >
                                      {isBar ? 'BAR' : 'KITCHEN'}
                                    </Text>
                                  </View>
                                  <Text style={[styles.itemName, isReady && styles.itemNameReady]}>
                                    {item.quantity}x {item.productName}
                                  </Text>
                                </View>

                                <View
                                  style={[styles.statusChip, isReady && styles.statusChipReady]}
                                >
                                  <Text
                                    style={[
                                      styles.statusChipText,
                                      isReady && styles.statusChipTextReady,
                                    ]}
                                  >
                                    {isReady ? 'DONE' : 'PREP'}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>

                        {/* Partial Dispatch Actions */}
                        {!ticket.allDone ? (
                          <View
                            style={{ flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 8 }}
                          >
                            {ticket.items.some(
                              (i) => i.stationTarget === 'bar' && i.status === 'ready'
                            ) &&
                            ticket.items.some(
                              (i) =>
                                i.stationTarget === 'kitchen' &&
                                i.status !== 'ready' &&
                                i.status !== 'served' &&
                                i.status !== 'cancelled'
                            ) ? (
                              <Pressable
                                onPress={() => setConfirmHandoff({ ticket, target: 'bar' })}
                                style={{
                                  flex: 1,
                                  paddingVertical: 8,
                                  paddingHorizontal: 8,
                                  borderRadius: 8,
                                  backgroundColor: '#e0f2fe',
                                  borderWidth: 1,
                                  borderColor: '#bae6fd',
                                  alignItems: 'center',
                                  flexDirection: 'row',
                                  justifyContent: 'center',
                                  gap: 4,
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={`Deliver drinks for ${ticket.sourceTitle}`}
                              >
                                <Coffee size={13} color="#0284c7" />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7' }}>
                                  Deliver Drinks
                                </Text>
                              </Pressable>
                            ) : null}

                            {ticket.items.some(
                              (i) => i.stationTarget === 'kitchen' && i.status === 'ready'
                            ) &&
                            ticket.items.some(
                              (i) =>
                                i.stationTarget === 'bar' &&
                                i.status !== 'ready' &&
                                i.status !== 'served' &&
                                i.status !== 'cancelled'
                            ) ? (
                              <Pressable
                                onPress={() => setConfirmHandoff({ ticket, target: 'kitchen' })}
                                style={{
                                  flex: 1,
                                  paddingVertical: 8,
                                  paddingHorizontal: 8,
                                  borderRadius: 8,
                                  backgroundColor: '#fef3c7',
                                  borderWidth: 1,
                                  borderColor: '#fde68a',
                                  alignItems: 'center',
                                  flexDirection: 'row',
                                  justifyContent: 'center',
                                  gap: 4,
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={`Deliver food for ${ticket.sourceTitle}`}
                              >
                                <Utensils size={13} color="#d97706" />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#d97706' }}>
                                  Deliver Food
                                </Text>
                              </Pressable>
                            ) : null}
                          </View>
                        ) : null}

                        {/* Handoff Button */}
                        <Pressable
                          onPress={() => setConfirmHandoff({ ticket })}
                          style={({ pressed }) => [
                            styles.handoffBtn,
                            ticket.allDone && styles.handoffBtnReady,
                            pressed && styles.btnPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={
                            ticket.orderType === 'dine_in'
                              ? `Deliver Round ${ticket.roundNumber || 1} to Table`
                              : 'Hand Off to Courier or Guest'
                          }
                        >
                          <CheckCircle2 size={18} color="#ffffff" />
                          <Text style={styles.handoffBtnText}>
                            {ticket.orderType === 'dine_in'
                              ? `Deliver Round ${ticket.roundNumber || 1} to Table`
                              : 'Hand Off to Courier / Guest'}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </>
        )}
      </View>

      {/* Confirmation Modal for Deliveries & Handoffs */}
      <ConfirmationModal
        visible={!!confirmHandoff}
        title={
          confirmHandoff?.target
            ? `Deliver ${confirmHandoff.target === 'bar' ? 'Drinks' : 'Food'} to Table?`
            : confirmHandoff?.ticket.orderType === 'dine_in'
              ? `Deliver Round ${confirmHandoff?.ticket.roundNumber || 1} to Table?`
              : 'Confirm Hand-off?'
        }
        message={
          confirmHandoff?.target
            ? `Mark ready ${confirmHandoff.target === 'bar' ? 'drinks' : 'food items'} for ${confirmHandoff?.ticket.sourceTitle} as delivered to guest.`
            : confirmHandoff?.ticket.orderType === 'dine_in'
              ? `Mark all items in Round ${confirmHandoff?.ticket.roundNumber || 1} for ${confirmHandoff?.ticket.sourceTitle} as delivered to guest.`
              : `Confirm hand-off of ${confirmHandoff?.ticket.orderNumber} (${confirmHandoff?.ticket.sourceTitle}) to courier/guest.`
        }
        confirmText={
          confirmHandoff?.ticket.orderType === 'dine_in' ? 'Confirm Delivery' : 'Confirm Hand-off'
        }
        cancelText="Cancel"
        variant="success"
        onConfirm={handleExecuteHandoff}
        onCancel={() => setConfirmHandoff(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f6f0ed',
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#eee8e3',
    padding: 16,
    width: 350,
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
  },
  ticketCardReady: {
    borderColor: '#16a34a',
    backgroundColor: '#fbfdfc',
  },
  buzzoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#15803d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  buzzoutBannerText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  relocatedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    marginBottom: 12,
  },
  relocatedBannerText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#b45309',
    letterSpacing: 0.3,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  sourceText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },
  guestText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4b5563',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#f5f0ec',
    borderRadius: 8,
  },
  timerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4b5563',
    fontVariant: ['tabular-nums'],
  },
  progressContainer: {
    marginBottom: 12,
    gap: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f3ece7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#d97706',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  itemsList: {
    gap: 8,
    marginBottom: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f6f3',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  stationBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
  },
  itemNameReady: {
    color: '#15803d',
    fontWeight: '800',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#fef3c7',
  },
  statusChipReady: {
    backgroundColor: '#dcfce7',
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },
  statusChipTextReady: {
    color: '#15803d',
  },
  handoffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#832238',
    paddingVertical: 11,
    borderRadius: 14,
  },
  handoffBtnReady: {
    backgroundColor: '#15803d',
  },
  handoffBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#eee8e3',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
});
