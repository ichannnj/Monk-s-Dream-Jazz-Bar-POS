import React, { useMemo, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Layers, RotateCcw, Slash, X, Check, Utensils } from 'lucide-react-native';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useOrderStore } from '../../../../store/useOrderStore';
import { toast } from '../../../../store/useToastStore';
import { Sidebar, NavTabId } from '../../../navigation/Sidebar';
import { StationHeader } from '../../common/components/StationHeader';
import { StationTicketCard } from '../../common/components/StationTicketCard';
import { KdsTicket } from '../../types';
import { supabase } from '../../../../services/supabase';
import { SharedChatView, SharedAlertsView } from '../../../shared';
import { StationSettingsModal } from '../../common/modals/StationSettingsModal';

export const KitchenKdsScreen: React.FC = () => {
  const { logout, isOnline, setIsOnline } = useAuthStore();
  const { tables, takeoutOrders, onlineOrders, updateOrderItemStatus, alerts } = useOrderStore();

  const [activeTab, setActiveTab] = useState<NavTabId>('board');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [audioChimes, setAudioChimes] = useState(true);
  const [foodOnlyFilter, setFoodOnlyFilter] = useState(true);

  const handleLogout = () => {
    toast.info('Kitchen station locked.', { title: 'Clocked Out' });
    logout();
  };

  const [recallTray, setRecallTray] = useState<KdsTicket[]>([]);
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [isAllDayOpen, setIsAllDayOpen] = useState(false);
  const [is86ModalOpen, setIs86ModalOpen] = useState(false);
  const [menuList, setMenuList] = useState<any[]>([]);

  // Load menu items from DB
  React.useEffect(() => {
    let isMounted = true;
    async function loadMenu() {
      try {
        const { data } = await supabase.from('products').select('*').order('name');
        if (isMounted && data) {
          setMenuList(data);
        }
      } catch (err) {
        console.warn('Failed to load menu products in KitchenKdsScreen:', err);
      }
    }
    loadMenu();
    return () => {
      isMounted = false;
    };
  }, []);

  // Lookup map for product allergens
  const allergenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    menuList.forEach((item) => {
      if (item.allergens && item.allergens.length > 0) {
        map.set(item.id, item.allergens);
        map.set(item.name.toLowerCase(), item.allergens);
      }
    });
    return map;
  }, [menuList]);

  // Extract all active tickets containing Kitchen items (isolated by Sub-Order Rounds)
  const kitchenTickets: KdsTicket[] = useMemo(() => {
    const tickets: KdsTicket[] = [];

    // 1. Dine-In Tables (Grouped by Sub-Order Round)
    tables.forEach((table) => {
      (table.tabs || []).forEach((tab) => {
        const kitchenItems = (tab.items || []).filter((item) => item.stationTarget === 'kitchen');
        if (kitchenItems.length > 0) {
          // Group items by round number
          const roundsMap = new Map<number, typeof kitchenItems>();
          kitchenItems.forEach((item) => {
            const r = item.roundNumber || 1;
            if (!roundsMap.has(r)) roundsMap.set(r, []);
            roundsMap.get(r)!.push(item);
          });

          roundsMap.forEach((roundItems, roundNum) => {
            // Only show round ticket if it contains items not yet served
            if (roundItems.some((i) => i.status !== 'served')) {
              const allergensFound: string[] = [];
              roundItems.forEach((item) => {
                const allergens =
                  allergenMap.get(item.productId) ||
                  allergenMap.get(item.productName.toLowerCase());
                if (allergens) allergensFound.push(...allergens);
              });
              const uniqueAllergens = Array.from(new Set(allergensFound));

              const otherStationItems = (tab.items || []).filter(
                (i) => (i.roundNumber || 1) === roundNum && i.stationTarget !== 'kitchen'
              );
              const multiStationTag =
                otherStationItems.length > 0
                  ? `Multi-Station · ${otherStationItems.length} drink(s) at Bar`
                  : undefined;

              tickets.push({
                ticketId: `kitchen-tbl-${table.id}-${tab.id}-r${roundNum}`,
                orderNumber: `#${table.code.replace('Table ', 'T')}-${tab.tabIndex}${roundNum > 1 ? `-R${roundNum}` : ''}`,
                orderType: 'dine_in',
                sourceTitle: `${table.code} · Tab ${tab.tabIndex}`,
                guestName: tab.guestName,
                roundNumber: roundNum,
                badges: roundNum > 1 ? [`ROUND ${roundNum}`] : [],
                multiStationTag,
                elapsedTime: table.elapsedTime || '3m',
                minutesElapsed: parseInt(table.elapsedTime || '3', 10) || 3,
                items: roundItems,
                transferAlert:
                  uniqueAllergens.length > 0
                    ? `⚠️ ALLERGENS: ${uniqueAllergens.join(', ')}`
                    : undefined,
              });
            }
          });
        }
      });
    });

    // 2. Takeout Orders
    takeoutOrders.forEach((order) => {
      if (order.status !== 'completed') {
        const kitchenItems = order.items.filter((item) => item.stationTarget === 'kitchen');
        if (kitchenItems.length > 0) {
          tickets.push({
            ticketId: `kitchen-takeout-${order.id}`,
            orderNumber: order.ticketNumber,
            orderType: 'takeout',
            sourceTitle: `Takeout ${order.ticketNumber}`,
            guestName: order.customerName,
            elapsedTime: order.elapsedTime,
            minutesElapsed: parseInt(order.elapsedTime || '5', 10) || 5,
            items: kitchenItems,
          });
        }
      }
    });

    // 3. Online Orders
    onlineOrders.forEach((order) => {
      if (order.status !== 'completed') {
        const kitchenItems = order.items.filter((item) => item.stationTarget === 'kitchen');
        if (kitchenItems.length > 0) {
          const platformLabel = order.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
          tickets.push({
            ticketId: `kitchen-online-${order.id}`,
            orderNumber: order.platformOrderRef,
            orderType: 'online_delivery',
            sourceTitle: `${platformLabel} ${order.platformOrderRef}`,
            guestName: `${order.customerName} (Rider: ${order.riderName})`,
            elapsedTime: order.elapsedTime,
            minutesElapsed: parseInt(order.elapsedTime || '7', 10) || 7,
            items: kitchenItems,
          });
        }
      }
    });

    return tickets.sort((a, b) => b.minutesElapsed - a.minutesElapsed);
  }, [tables, takeoutOrders, onlineOrders, allergenMap]);

  // All-Day Summary calculation: pending & preparing quantities across all active kitchen cards
  const allDaySummary = useMemo(() => {
    const map = new Map<string, number>();
    kitchenTickets.forEach((t) => {
      t.items.forEach((item) => {
        if (item.status === 'pending' || item.status === 'preparing') {
          map.set(item.productName, (map.get(item.productName) || 0) + item.quantity);
        }
      });
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [kitchenTickets]);

  const urgentCount = kitchenTickets.filter((t) => t.minutesElapsed >= 10).length;
  const unreadAlertCount = alerts.filter((a) => !a.isRead).length;

  const handleAcceptAll = (ticket: KdsTicket) => {
    ticket.items.forEach((item) => {
      if (item.status === 'pending') {
        updateOrderItemStatus(item.id, 'preparing');
      }
    });
    toast.success(`Chef cooking ${ticket.sourceTitle}`);
  };

  const handleDoneAll = (ticket: KdsTicket) => {
    ticket.items.forEach((item) => {
      if (item.status !== 'cancelled') {
        updateOrderItemStatus(item.id, 'ready');
      }
    });
    setRecallTray((prev) =>
      [ticket, ...prev.filter((t) => t.ticketId !== ticket.ticketId)].slice(0, 10)
    );
    toast.success(`Chef plated & ready: ${ticket.sourceTitle}`);
  };

  const handleRecallTicket = (ticket: KdsTicket) => {
    ticket.items.forEach((item) => {
      if (item.status !== 'cancelled') {
        updateOrderItemStatus(item.id, 'preparing');
      }
    });
    setRecallTray((prev) => prev.filter((t) => t.ticketId !== ticket.ticketId));
    toast.info(`Ticket recalled: ${ticket.sourceTitle}`);
  };

  const handleToggle86 = (itemId: string) => {
    setMenuList((prev) => prev.map((i) => (i.id === itemId ? { ...i, auto86: !i.auto86 } : i)));
    const item = menuList.find((i) => i.id === itemId);
    toast.info(`${item?.name} marked ${!item?.auto86 ? '86 (Out of Stock)' : 'Available'}`);
  };

  const handleTabChange = (tab: NavTabId) => {
    if (tab === 'settings') {
      setIsSettingsOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* 1. App-Wide Consistent Navigation Sidebar (mode="kds") */}
      <Sidebar
        mode="kds"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        unreadChatCount={3}
        alertCount={unreadAlertCount}
      />

      {/* 2. Main Content */}
      <View style={styles.mainContent}>
        {activeTab === 'chat' ? (
          <SharedChatView
            senderName="Chef Station"
            senderRole="Kitchen Line"
            defaultChannel="kitchen"
            onBack={() => setActiveTab('board')}
          />
        ) : activeTab === 'alerts' ? (
          <SharedAlertsView onBack={() => setActiveTab('board')} />
        ) : (
          <>
            <StationHeader
              title="Mains, Pasta & Small Plates Line"
              stationType="kitchen"
              activeTicketsCount={kitchenTickets.length}
              urgentTicketsCount={urgentCount}
              onLogout={handleLogout}
            />

            {/* Kitchen Operational Toolbar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 8,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#eee8e3',
              }}
            >
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {/* All-Day Summary Toggle */}
                <Pressable
                  onPress={() => setIsAllDayOpen(!isAllDayOpen)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: isAllDayOpen ? '#832238' : '#f8fafc',
                    borderWidth: 1,
                    borderColor: isAllDayOpen ? '#832238' : '#e2e8f0',
                  }}
                >
                  <Layers size={13} color={isAllDayOpen ? '#ffffff' : '#64748b'} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isAllDayOpen ? '#ffffff' : '#334155',
                    }}
                  >
                    All-Day Summary ({allDaySummary.reduce((a, b) => a + b.count, 0)})
                  </Text>
                </Pressable>

                {/* Recall Buffer Button */}
                <Pressable
                  onPress={() => setIsRecallOpen(!isRecallOpen)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: isRecallOpen ? '#0284c7' : '#f8fafc',
                    borderWidth: 1,
                    borderColor: isRecallOpen ? '#0284c7' : '#e2e8f0',
                  }}
                >
                  <RotateCcw size={13} color={isRecallOpen ? '#ffffff' : '#64748b'} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isRecallOpen ? '#ffffff' : '#334155',
                    }}
                  >
                    Recall Ticket ({recallTray.length})
                  </Text>
                </Pressable>
              </View>

              {/* Station 86ing Button */}
              <Pressable
                onPress={() => setIs86ModalOpen(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: '#fef2f2',
                  borderWidth: 1,
                  borderColor: '#fecaca',
                }}
              >
                <Slash size={13} color="#b91c1c" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#b91c1c' }}>86 Item</Text>
              </Pressable>
            </View>

            {/* All-Day Summary Bar */}
            {isAllDayOpen ? (
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#eee8e3',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Total Pending & In-Prep Items Across All Tickets:
                </Text>
                {allDaySummary.length === 0 ? (
                  <Text style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                    No active items pending on the kitchen line.
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {allDaySummary.map((item, idx) => (
                      <View
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: '#fef3c7',
                          borderWidth: 1,
                          borderColor: '#fde68a',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#92400e' }}>
                          {item.count}x
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#78350f' }}>
                          {item.name}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : null}

            {/* Recall Buffer Drawer */}
            {isRecallOpen ? (
              <View
                style={{
                  backgroundColor: '#f0f9ff',
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#bae6fd',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0369a1' }}>
                    Recently Plated Tickets (Tap to Undo / Reopen):
                  </Text>
                  <Pressable onPress={() => setIsRecallOpen(false)}>
                    <X size={14} color="#0369a1" />
                  </Pressable>
                </View>

                {recallTray.length === 0 ? (
                  <Text style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                    No completed tickets in the recall buffer yet.
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {recallTray.map((t) => (
                      <View
                        key={t.ticketId}
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: 10,
                          padding: 10,
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          width: 180,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#1e293b' }}>
                          {t.orderNumber}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>{t.sourceTitle}</Text>
                        <Text style={{ fontSize: 10, color: '#94a3b8', marginVertical: 4 }}>
                          {t.items.length} items plated
                        </Text>
                        <Pressable
                          onPress={() => handleRecallTicket(t)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            backgroundColor: '#0284c7',
                            paddingVertical: 5,
                            borderRadius: 6,
                            marginTop: 4,
                          }}
                        >
                          <RotateCcw size={11} color="#ffffff" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                            Recall to Line
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ticketsScrollContent}
            >
              {kitchenTickets.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>Kitchen Hot Line All Clear</Text>
                  <Text style={styles.emptySubtitle}>
                    Incoming kitchen orders will appear dynamically across stations.
                  </Text>
                </View>
              ) : (
                kitchenTickets.map((ticket) => (
                  <StationTicketCard
                    key={ticket.ticketId}
                    ticket={ticket}
                    stationType="kitchen"
                    onAcceptAll={handleAcceptAll}
                    onDoneAll={handleDoneAll}
                    onUpdateItemStatus={(itemId, status) => updateOrderItemStatus(itemId, status)}
                  />
                ))
              )}
            </ScrollView>
          </>
        )}
      </View>

      {/* 86 Item Modal */}
      {is86ModalOpen ? (
        <Modal
          visible={is86ModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIs86ModalOpen(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                width: '90%',
                maxWidth: 480,
                maxHeight: '80%',
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 20,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Slash size={18} color="#b91c1c" />
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>
                    86 Menu Items (Kitchen)
                  </Text>
                </View>
                <Pressable onPress={() => setIs86ModalOpen(false)}>
                  <X size={20} color="#6b7280" />
                </Pressable>
              </View>

              <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                Items marked 86 will immediately grey out on all floor waiter tablets.
              </Text>

              <ScrollView style={{ maxHeight: 360 }}>
                {menuList
                  .filter((item) => item.stationTarget === 'kitchen')
                  .map((item) => (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: '#f1f5f9',
                      }}
                    >
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>
                          ${item.price.toFixed(2)} · {item.category}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleToggle86(item.id)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: item.auto86 ? '#fee2e2' : '#f0fdf4',
                          borderWidth: 1,
                          borderColor: item.auto86 ? '#fca5a5' : '#86efac',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: item.auto86 ? '#b91c1c' : '#15803d',
                          }}
                        >
                          {item.auto86 ? '86’d (OUT)' : 'AVAILABLE'}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}

      <StationSettingsModal
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isOnline={isOnline}
        onToggleOnline={setIsOnline}
        audioChimes={audioChimes}
        onToggleAudio={setAudioChimes}
        barOnlyFilter={foodOnlyFilter}
        onToggleBarFilter={setFoodOnlyFilter}
        onClockOut={handleLogout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f6f0ed',
    padding: 16,
  },
  mainContent: {
    flex: 1,
  },
  ticketsScrollContent: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 20,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minWidth: 400,
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
