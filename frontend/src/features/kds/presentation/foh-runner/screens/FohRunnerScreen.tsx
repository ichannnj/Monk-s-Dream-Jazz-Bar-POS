import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { BellRing, Layers, Utensils, ShoppingBag } from 'lucide-react-native';
import { supabase } from '../../../../shared/infrastructure/supabase';
import { useAuthStore } from '../../../../auth/application/useAuthStore';
import { toast } from '../../../../shared/toast/useToastStore';
import { Sidebar, NavTabId } from '../../../../shared/navigation/Sidebar';
import { useResponsive } from '../../../../shared/hooks/useResponsive';
import { PosDropdown, PosDropdownOption } from '../../../../shared/ui/PosDropdown';
import { SharedChatView } from '../../../../chat/presentation/SharedChatView';
import { useChatStore } from '../../../../chat';
import { SharedAlertsView } from '../../../../alerts/presentation/SharedAlertsView';
import { ConfirmationModal } from '../../../../shared/ui/ConfirmationModal';
import { StationHeader } from '../../common/components/StationHeader';
import { ChecksHistoryView } from '../../../../check-history';
import { ConfirmHandoffState } from '../types';
import { useRunnerTickets } from '../hooks/useRunnerTickets';
import { RunnerTicketCard } from '../components/RunnerTicketCard';

type RunnerQueueFilter = 'all' | 'ready' | 'dine_in' | 'off_premise';

export const FohRunnerScreen: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState<NavTabId>('board');
  const [queueFilter, setQueueFilter] = useState<RunnerQueueFilter>('all');
  const [confirmHandoff, setConfirmHandoff] = useState<ConfirmHandoffState | null>(null);

  // Heartbeat tracking to report runner station online status to PostgreSQL
  useEffect(() => {
    const sendHeartbeat = async (online: boolean) => {
      try {
        await (supabase.rpc as any)('report_station_heartbeat', {
          p_station_key: 'runner',
          p_user_id: (currentUser?.id || null) as any,
          p_is_online: online,
        });
      } catch (e) {
        console.warn('Failed to report runner heartbeat:', e);
      }
    };

    sendHeartbeat(true);
    const timer = setInterval(() => sendHeartbeat(true), 60000);
    return () => {
      clearInterval(timer);
      sendHeartbeat(false);
    };
  }, [currentUser?.id]);

  const { runnerTickets, fullyReadyCount, unreadAlertCount, executeHandoff } = useRunnerTickets();
  const unreadChatCount = useChatStore((state) =>
    state.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  );

  const handleLogout = () => {
    toast.info('Runner expediter station locked.', { title: 'Clocked Out' });
    logout();
  };

  const handleConfirmHandoff = () => {
    if (!confirmHandoff) return;
    executeHandoff(confirmHandoff);
    setConfirmHandoff(null);
  };

  const filteredRunnerTickets = useMemo(() => {
    return runnerTickets.filter((t) => {
      if (queueFilter === 'ready') return t.allDone;
      if (queueFilter === 'dine_in') return t.orderType === 'dine_in';
      if (queueFilter === 'off_premise') return t.orderType !== 'dine_in';
      return true;
    });
  }, [runnerTickets, queueFilter]);

  const queueFilterOptions: PosDropdownOption<RunnerQueueFilter>[] = [
    {
      value: 'all',
      label: 'All Active',
      badge: runnerTickets.length,
      icon: Layers,
    },
    {
      value: 'ready',
      label: 'Buzzout Ready',
      badge: fullyReadyCount,
      icon: BellRing,
      dotColor: '#16a34a',
    },
    {
      value: 'dine_in',
      label: 'Dine-In Tables',
      icon: Utensils,
    },
    {
      value: 'off_premise',
      label: 'Takeout & Delivery',
      icon: ShoppingBag,
    },
  ];

  return (
    <View style={[styles.screenContainer, isMobile && styles.screenContainerMobile]}>
      <Sidebar
        mode="kds"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        unreadChatCount={unreadChatCount}
        alertCount={unreadAlertCount}
        hiddenTabs={['tables', 'drawer']}
      />

      <View style={[styles.mainContent, isMobile && styles.mainContentMobile]}>
        {activeTab === 'chat' ? (
          <SharedChatView
            senderRole="FOH Runner"
            defaultChannel="foh"
            onBack={() => setActiveTab('board')}
          />
        ) : activeTab === 'alerts' ? (
          <SharedAlertsView onBack={() => setActiveTab('board')} />
        ) : activeTab === 'checks' ? (
          <ChecksHistoryView />
        ) : (
          <>
            <StationHeader
              title="Pass Staging & Assembly"
              stationType="runner"
              activeTicketsCount={runnerTickets.length}
              urgentTicketsCount={fullyReadyCount}
              onLogout={handleLogout}
              rightAccessory={
                <PosDropdown
                  options={queueFilterOptions}
                  value={queueFilter}
                  onChange={setQueueFilter}
                  sheetTitle="Filter Expediter Queue"
                  className="min-w-[165px]"
                />
              }
            />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {filteredRunnerTickets.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>Pass Staging Clear</Text>
                  <Text style={styles.emptySubtitle}>
                    Orders with prepared bar drinks or kitchen mains will trigger runner alerts
                    here.
                  </Text>
                </View>
              ) : (
                <View style={styles.grid}>
                  {filteredRunnerTickets.map((ticket) => (
                    <View key={ticket.id} className="w-full md:w-[48%] xl:w-[32%]">
                      <RunnerTicketCard
                        ticket={ticket}
                        onDeliverTarget={(t, target) => setConfirmHandoff({ ticket: t, target })}
                        onHandoff={(t) => setConfirmHandoff({ ticket: t })}
                      />
                    </View>
                  ))}
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
              ? `Confirm all active ready items for Round ${confirmHandoff?.ticket.roundNumber || 1} at ${confirmHandoff?.ticket.sourceTitle} have been delivered to guests.`
              : `Hand over order ${confirmHandoff?.ticket.sourceTitle} to ${confirmHandoff?.ticket.guestName || 'the courier/guest'}.`
        }
        confirmText={
          confirmHandoff?.target
            ? `Deliver ${confirmHandoff.target === 'bar' ? 'Drinks' : 'Food'}`
            : confirmHandoff?.ticket.orderType === 'dine_in'
              ? `Deliver Round ${confirmHandoff?.ticket.roundNumber || 1}`
              : 'Complete Hand-off'
        }
        variant={confirmHandoff?.ticket.allDone ? 'success' : 'primary'}
        onConfirm={handleConfirmHandoff}
        onCancel={() => setConfirmHandoff(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
  },
  screenContainerMobile: {
    flexDirection: 'column',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  mainContentMobile: {
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 12,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    maxWidth: 400,
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
});
