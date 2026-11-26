import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text } from 'react-native';
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

  const { runnerTickets, fullyReadyCount, deliverSingleItem, executeHandoff } = useRunnerTickets();

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
    <View className="flex-1 bg-[#EFECE6]">
      <FohCommandBar
        currentFilter={queueFilter}
        onFilterChange={setQueueFilter}
        counts={counts}
        isMobile={isMobile}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {filteredTickets.length === 0 ? (
          <View className="bg-white border border-[#E2DED6] rounded-2xl py-14 px-6 items-center justify-center my-2">
            <Text className="text-pos-lg font-bold text-[#1A1617] text-center mb-1">
              Pass Staging Clear
            </Text>
            <Text className="text-base text-[#57534E] text-center max-w-md">
              {queueFilter === 'ready'
                ? 'No fully prepared orders currently awaiting delivery to tables.'
                : 'All drinks and dishes are served. Staging pass is completely clear.'}
            </Text>
          </View>
        ) : (
          <View className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredTickets.map((ticket) => (
              <RunnerTicketCard
                key={ticket.id}
                ticket={ticket}
                onDeliverTarget={(t, target) => setConfirmHandoff({ ticket: t, target })}
                onDeliverItem={deliverSingleItem}
                onHandoff={(t) => setConfirmHandoff({ ticket: t })}
              />
            ))}
          </View>
        )}
      </ScrollView>

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
