import React, { useMemo, useState } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useOrderStore } from '../../../../store/useOrderStore';
import { toast } from '../../../../store/useToastStore';
import { Sidebar, NavTabId } from '../../../navigation/Sidebar';
import { StationHeader } from '../../common/components/StationHeader';
import { StationTicketCard } from '../../common/components/StationTicketCard';
import { KdsTicket } from '../../types';
import { SEED_MENU_ITEMS } from '../../../../mock/menu.mock';
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

  // Lookup map for product allergens
  const allergenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    SEED_MENU_ITEMS.forEach((item) => {
      if (item.allergens && item.allergens.length > 0) {
        map.set(item.id, item.allergens);
        map.set(item.name.toLowerCase(), item.allergens);
      }
    });
    return map;
  }, []);

  // Extract all active tickets containing Kitchen items
  const kitchenTickets: KdsTicket[] = useMemo(() => {
    const tickets: KdsTicket[] = [];

    // 1. Dine-In Tables
    tables.forEach((table) => {
      (table.tabs || []).forEach((tab) => {
        const kitchenItems = tab.items.filter((item) => item.stationTarget === 'kitchen');
        if (kitchenItems.length > 0 && kitchenItems.some((i) => i.status !== 'served')) {
          const allergensFound: string[] = [];
          kitchenItems.forEach((item) => {
            const allergens =
              allergenMap.get(item.productId) || allergenMap.get(item.productName.toLowerCase());
            if (allergens) allergensFound.push(...allergens);
          });
          const uniqueAllergens = Array.from(new Set(allergensFound));

          tickets.push({
            ticketId: `kitchen-tbl-${table.id}-${tab.id}`,
            orderNumber: `#${table.code.replace('Table ', 'T')}-${tab.tabIndex}`,
            orderType: 'dine_in',
            sourceTitle: `${table.code} · Tab ${tab.tabIndex}`,
            guestName: tab.guestName,
            elapsedTime: table.elapsedTime || '3m',
            minutesElapsed: parseInt(table.elapsedTime || '3', 10) || 3,
            items: kitchenItems,
            transferAlert:
              uniqueAllergens.length > 0
                ? `⚠️ ALLERGENS: ${uniqueAllergens.join(', ')}`
                : undefined,
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
      updateOrderItemStatus(item.id, 'ready');
    });
    toast.success(`Chef plated & ready: ${ticket.sourceTitle}`);
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
