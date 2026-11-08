import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { BarTicket } from '../types';
import { styles } from './BaristaTicketCard.styles';

export interface BaristaTicketActionsProps {
  ticket: BarTicket;
  onStart?: (ticket: BarTicket) => void;
  onReady?: (ticket: BarTicket) => void;
  onRecall?: (ticket: BarTicket) => void;
  onDismiss?: (ticket: BarTicket) => void;
  onViewFohStatus?: (ticket: BarTicket) => void;
  onReadyBlockedPress?: (ticket: BarTicket) => void;
}

export const BaristaTicketActions: React.FC<BaristaTicketActionsProps> = ({
  ticket,
  onStart,
  onReady,
  onRecall,
  onDismiss,
  onViewFohStatus,
  onReadyBlockedPress,
}) => {
  const { stage, isReadyBlocked, hasFohStatusAlert } = ticket;

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
          <Pressable
            onPress={() => onStart?.(ticket)}
            style={({ pressed }) => [styles.primaryWineButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryWineButtonText}>Start</Text>
          </Pressable>
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
          <Pressable
            onPress={() => onReady?.(ticket)}
            style={({ pressed }) => [styles.primaryWineButton, pressed && styles.buttonPressed]}
          >
            <View style={styles.readyButtonContent}>
              <Check size={16} color="#ffffff" strokeWidth={3} />
              <Text style={styles.primaryWineButtonText}>Ready</Text>
            </View>
          </Pressable>
        )
      ) : null}

      {stage === 'ready' ? (
        <View style={styles.readyFooterRow}>
          <Pressable
            onPress={() => onRecall?.(ticket)}
            style={({ pressed }) => [styles.recallButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.recallButtonText}>Recall</Text>
          </Pressable>
          <Pressable
            onPress={() => onDismiss?.(ticket)}
            style={({ pressed }) => [styles.dismissButton, pressed && styles.buttonPressed]}
          >
            <Check size={14} color="#ffffff" strokeWidth={3} />
            <Text style={styles.dismissButtonText}>Picked Up</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};
