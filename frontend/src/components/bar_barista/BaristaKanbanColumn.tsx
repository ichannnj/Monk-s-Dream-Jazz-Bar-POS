import React, { useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { BarTicket, KdsStage } from './types';
import { BaristaTicketCard } from './BaristaTicketCard';

interface BaristaKanbanColumnProps {
  stage: KdsStage;
  title: string;
  count: number;
  tickets: BarTicket[];
  overflowCount?: number;
  onStartTicket?: (ticket: BarTicket) => void;
  onReadyTicket?: (ticket: BarTicket) => void;
  onRecallTicket?: (ticket: BarTicket) => void;
  onViewFohStatus?: (ticket: BarTicket) => void;
  onReadyBlockedPress?: (ticket: BarTicket) => void;
  onToggleItem?: (ticketId: string, itemId: string) => void;
}

export const BaristaKanbanColumn: React.FC<BaristaKanbanColumnProps> = ({
  stage,
  title,
  count,
  tickets,
  overflowCount = 0,
  onStartTicket,
  onReadyTicket,
  onRecallTicket,
  onViewFohStatus,
  onReadyBlockedPress,
  onToggleItem,
}) => {
  const scrollRef = useRef<ScrollView>(null);

  const getHeaderColors = () => {
    switch (stage) {
      case 'ready':
        return {
          textColor: '#15803d',
        };
      case 'preparing':
        return {
          textColor: '#b45309',
        };
      case 'new':
      default:
        return {
          textColor: '#701a31',
        };
    }
  };

  const colors = getHeaderColors();

  const handleScrollMore = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <View style={styles.columnContainer}>
      {/* Column Header */}
      <View style={styles.columnHeader}>
        <Text style={[styles.columnTitle, { color: colors.textColor }]}>{title}</Text>
        <Text style={[styles.columnCount, { color: colors.textColor }]}>{count}</Text>
      </View>

      {/* Tickets Scroll View */}
      <View style={styles.ticketsWrapper}>
        <ScrollView
          ref={scrollRef}
          style={styles.ticketsScroll}
          contentContainerStyle={styles.ticketsContent}
          showsVerticalScrollIndicator={false}
        >
          {tickets.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No tickets in {title.toLowerCase()}</Text>
            </View>
          ) : (
            tickets.map((ticket) => (
              <BaristaTicketCard
                key={ticket.id}
                ticket={ticket}
                onStart={onStartTicket}
                onReady={onReadyTicket}
                onRecall={onRecallTicket}
                onViewFohStatus={onViewFohStatus}
                onReadyBlockedPress={onReadyBlockedPress}
                onToggleItem={onToggleItem}
              />
            ))
          )}
        </ScrollView>

        {/* Bottom Overflow indicator e.g. "↓ 3 more" */}
        {overflowCount > 0 ? (
          <View style={styles.overflowPillWrapper}>
            <Pressable
              onPress={handleScrollMore}
              style={({ pressed }) => [styles.overflowPill, pressed && styles.overflowPillPressed]}
            >
              <ChevronDown size={14} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.overflowPillText}>{overflowCount} more</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  columnContainer: {
    flex: 1,
    minWidth: 290,
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee8e3',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f1ec',
    marginBottom: 10,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  columnCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  ticketsWrapper: {
    flex: 1,
    position: 'relative',
  },
  ticketsScroll: {
    flex: 1,
  },
  ticketsContent: {
    paddingBottom: 36,
  },
  emptyState: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  overflowPillWrapper: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  overflowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6b1a2f',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  overflowPillPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  overflowPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
