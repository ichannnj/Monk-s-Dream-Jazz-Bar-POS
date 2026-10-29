import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../../../auth/application/useAuthStore';
import { toast } from '../../../../shared/toast/useToastStore';
import { Sidebar, NavTabId } from '../../../../shared/navigation/Sidebar';
import { SharedChatView } from '../../../../chat/presentation/SharedChatView';
import { useChatStore } from '../../../../chat';
import { SharedAlertsView } from '../../../../alerts/presentation/SharedAlertsView';
import { ConfirmationModal } from '../../../../shared/ui/ConfirmationModal';
import { StationHeader } from '../../common/components/StationHeader';
import { RunnerTicket, ConfirmHandoffState } from '../types';
import { useRunnerTickets } from '../hooks/useRunnerTickets';
import { RunnerTicketCard } from '../components/RunnerTicketCard';

export const FohRunnerScreen: React.FC = () => {
  const { logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<NavTabId>('board');
  const [confirmHandoff, setConfirmHandoff] = useState<ConfirmHandoffState | null>(null);

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

  return (
    <View style={styles.screenContainer}>
      <Sidebar
        mode="kds"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        unreadChatCount={unreadChatCount}
        alertCount={unreadAlertCount}
      />

      <View style={styles.mainContent}>
        {activeTab === 'chat' ? (
          <SharedChatView
            senderRole="FOH Runner"
            defaultChannel="foh"
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
                  {runnerTickets.map((ticket) => (
                    <RunnerTicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onDeliverTarget={(t, target) => setConfirmHandoff({ ticket: t, target })}
                      onHandoff={(t) => setConfirmHandoff({ ticket: t })}
                    />
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
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
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
