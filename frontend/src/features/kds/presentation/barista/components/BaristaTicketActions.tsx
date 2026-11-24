import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { BarTicket } from '../types';
import { styles } from './BaristaTicketCard.styles';
import { useKeyedCooldown } from '@/features/shared/hooks/useAsyncAction';

export interface BaristaTicketActionsProps {
  ticket: BarTicket;
  onStart?: (ticket: BarTicket) => void;
  onReady?: (ticket: BarTicket) => void;
  onRecall?: (ticket: BarTicket) => void;
  onDismiss?: (ticket: BarTicket) => void;
  onViewFohStatus?: (ticket: BarTicket) => void;
  onReadyBlockedPress?: (ticket: BarTicket) => void;
  onVoidTicket?: (ticket: BarTicket) => void;
}

export const BaristaTicketActions: React.FC<BaristaTicketActionsProps> = ({
  ticket,
  onStart,
  onReady,
  onRecall,
  onDismiss,
  onViewFohStatus,
  onReadyBlockedPress,
  onVoidTicket,
}) => {
  const { stage, isReadyBlocked, hasFohStatusAlert } = ticket;
  const { lock } = useKeyedCooldown(500);

  const handleStart = () => {
    if (!lock(`barista:start:${ticket.id}`)) return;
    onStart?.(ticket);
  };

  const handleReady = () => {
    if (!lock(`barista:ready:${ticket.id}`)) return;
    onReady?.(ticket);
  };

  const handleRecall = () => {
    if (!lock(`barista:recall:${ticket.id}`)) return;
    onRecall?.(ticket);
  };

  const handleDismiss = () => {
    if (!lock(`barista:dismiss:${ticket.id}`)) return;
    onDismiss?.(ticket);
  };

  if (stage === 'cancelled') {
    return (
      <View style={styles.footerContainer}>
        <Pressable
          onPress={() => onDismiss?.(ticket)}
          style={({ pressed }) => [styles.dismissCancelledButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.dismissCancelledButtonText}>Dismiss Cancelled Alert</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.footerContainer}>
      {stage === 'new' ? (
        hasFohStatusAlert ? (
          <Pressable
            onPress={() => onViewFohStatus?.(ticket)}
            style={({ pressed }) => [styles.fohStatusButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.fohStatusButtonText}>View FOH Status</Text>
          </Pressable>
        ) : (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {onVoidTicket ? (
              <Pressable
                onPress={() => onVoidTicket(ticket)}
                style={({ pressed }) => [
                  styles.cancelTicketButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.cancelTicketButtonText}>Void</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.primaryWineButton,
                { flex: 1 },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryWineButtonText}>Start</Text>
            </Pressable>
          </View>
        )
      ) : null}

      {stage === 'preparing' ? (
        isReadyBlocked ? (
          <Pressable
            onPress={() => onReadyBlockedPress?.(ticket)}
            style={({ pressed }) => [styles.blockedButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.blockedButtonText}>Ready Blocked</Text>
          </Pressable>
        ) : (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {onVoidTicket ? (
              <Pressable
                onPress={() => onVoidTicket(ticket)}
                style={({ pressed }) => [
                  styles.cancelTicketButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.cancelTicketButtonText}>Void</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleReady}
              style={({ pressed }) => [
                styles.primaryWineButton,
                { flex: 1 },
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.readyButtonContent}>
                <Check size={16} color="#F7F5F2" strokeWidth={3} />
                <Text style={styles.primaryWineButtonText}>Ready</Text>
              </View>
            </Pressable>
          </View>
        )
      ) : null}

      {stage === 'ready' ? (
        <View style={styles.readyFooterRow}>
          <Pressable
            onPress={handleRecall}
            style={({ pressed }) => [styles.recallButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.recallButtonText}>Recall</Text>
          </Pressable>
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [styles.dismissButton, pressed && styles.buttonPressed]}
          >
            <Check size={14} color="#F7F5F2" strokeWidth={3} />
            <Text style={styles.dismissButtonText}>Picked Up</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};
