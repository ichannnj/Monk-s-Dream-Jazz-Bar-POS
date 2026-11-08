import React from 'react';
import { View, Text } from 'react-native';
import { BarTicket } from '../types';
import { useLiveElapsedTimer } from '@/features/shared/utils/elapsedTime';
import { styles } from './BaristaTicketCard.styles';
import { BaristaTicketHeader } from './BaristaTicketHeader';
import { BaristaTicketItemRow } from './BaristaTicketItemRow';
import { BaristaTicketActions } from './BaristaTicketActions';

interface BaristaTicketCardProps {
  ticket: BarTicket;
  onStart?: (ticket: BarTicket) => void;
  onReady?: (ticket: BarTicket) => void;
  onRecall?: (ticket: BarTicket) => void;
  onDismiss?: (ticket: BarTicket) => void;
  onViewFohStatus?: (ticket: BarTicket) => void;
  onReadyBlockedPress?: (ticket: BarTicket) => void;
  onToggleItem?: (ticketId: string, itemId: string) => void;
}

export const BaristaTicketCard: React.FC<BaristaTicketCardProps> = ({
  ticket,
  onStart,
  onReady,
  onRecall,
  onDismiss,
  onViewFohStatus,
  onReadyBlockedPress,
  onToggleItem,
}) => {
  const { stage, elapsedTime, items, specialNote, voidNote } = ticket;

  const stationCategory = ticket.items[0]?.stationTarget === 'kitchen' ? 'kitchen' : 'bar';
  const liveTimer = useLiveElapsedTimer(ticket.createdAt, elapsedTime, stationCategory);

  const getTimePillStyle = () => {
    if (stage === 'ready') {
      return { bg: '#dcfce7', text: '#15803d' };
    }
    if (liveTimer.urgency === 'late') {
      return { bg: '#fee2e2', text: '#b91c1c' };
    }
    if (liveTimer.urgency === 'warning' || stage === 'preparing') {
      return { bg: '#fef3c7', text: '#b45309' };
    }
    return { bg: '#f3f4f6', text: '#374151' };
  };

  const timePill = getTimePillStyle();

  return (
    <View
      style={[
        styles.cardContainer,
        Boolean(ticket.transferredFrom) && styles.cardContainerRelocated,
      ]}
    >
      <BaristaTicketHeader
        ticket={ticket}
        timePill={timePill}
        formattedTimer={liveTimer.formattedTimer}
      />

      {/* Item Lines */}
      <View style={styles.itemsContainer}>
        {items.map((item) => (
          <BaristaTicketItemRow
            key={item.id}
            item={item}
            ticketId={ticket.id}
            onToggleItem={onToggleItem}
          />
        ))}
      </View>

      {/* Special Request Note Box */}
      {specialNote ? (
        <View style={styles.specialNoteBox}>
          <Text style={styles.noteExclamation}>!</Text>
          <Text style={styles.specialNoteText}>{specialNote.replace(/^!\s*/, '')}</Text>
        </View>
      ) : null}

      {/* Voided Notice Box */}
      {voidNote ? (
        <View style={styles.voidNoteBox}>
          <Text style={styles.voidExclamation}>!</Text>
          <Text style={styles.voidNoteText}>{voidNote.replace(/^!\s*/, '')}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <BaristaTicketActions
        ticket={ticket}
        onStart={onStart}
        onReady={onReady}
        onRecall={onRecall}
        onDismiss={onDismiss}
        onViewFohStatus={onViewFohStatus}
        onReadyBlockedPress={onReadyBlockedPress}
      />
    </View>
  );
};
