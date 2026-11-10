import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { useResponsive } from '@/features/shared';
import { ConfirmationModal } from '@/features/shared/ui/ConfirmationModal';
import { useRunnerTickets } from '@/features/kds/presentation/foh-runner/hooks/useRunnerTickets';
import { RunnerTicketCard } from '@/features/kds/presentation/foh-runner/components/RunnerTicketCard';
import { ConfirmHandoffState } from '@/features/kds/presentation/foh-runner/types';
import { FohCommandBar, FohQueueFilter } from './FohCommandBar';

export const FohWorkspaceView: React.FC = () => {
  const { isMobile } = useResponsive();
  const [queueFilter, setQueueFilter] = useState<FohQueueFilter>('all');
  const [confirmHandoff, setConfirmHandoff] = useState<ConfirmHandoffState | null>(null);

  const { runnerTickets, fullyReadyCount, executeHandoff } = useRunnerTickets();

  const handleConfirmHandoff = () => {
    if (!confirmHandoff) return;
    executeHandoff(confirmHandoff);
    setConfirmHandoff(null);
  };

  const counts = useMemo(() => {
    let dineIn = 0;
    let offPremise = 0;
    runnerTickets.forEach((t) => {
      if (t.orderType === 'dine_in') {
        dineIn++;
      } else {
        offPremise++;
      }
    });

    return {
      all: runnerTickets.length,
      ready: fullyReadyCount,
      dineIn,
      offPremise,
    };
  }, [runnerTickets, fullyReadyCount]);

  const filteredTickets = useMemo(() => {
    return runnerTickets.filter((t) => {
      if (queueFilter === 'ready') return t.allDone;
      if (queueFilter === 'dine_in') return t.orderType === 'dine_in';
      if (queueFilter === 'off_premise') return t.orderType !== 'dine_in';
      return true;
    });
  }, [runnerTickets, queueFilter]);

  return (
    <View style={styles.container}>
      {/* Top FOH Command Bar */}
      <FohCommandBar
        currentFilter={queueFilter}
        onFilterChange={setQueueFilter}
        counts={counts}
        isMobile={isMobile}
      />

      {/* Pass Tickets Scroll View */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filteredTickets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Pass Staging Clear</Text>
            <Text style={styles.emptySubtitle}>
              {queueFilter === 'ready'
                ? 'No fully prepared orders currently awaiting delivery to tables.'
                : 'All drinks and dishes are served. Staging pass is completely clear!'}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredTickets.map((ticket) => (
              <View
                key={ticket.id}
                className="w-full md:w-[48%] xl:w-[32%]"
                style={styles.cardWrapper}
              >
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
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 420,
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardWrapper: {
    marginBottom: 4,
  },
});
