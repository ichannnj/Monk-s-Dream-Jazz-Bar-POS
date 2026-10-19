import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ShoppingBag, CheckCircle2, PackageCheck } from 'lucide-react-native';
import { TakeoutOrder } from '../../mockData';
import { formatCurrency } from '@monks/shared';

interface TakeoutQueueCardProps {
  order: TakeoutOrder;
  onPress: (order: TakeoutOrder) => void;
  onMarkReady?: (orderId: string) => void;
  onMarkCollected?: (orderId: string) => void;
}

export const TakeoutQueueCard: React.FC<TakeoutQueueCardProps> = ({
  order,
  onPress,
  onMarkReady,
  onMarkCollected,
}) => {
  const isReady = order.status === 'ready';

  return (
    <View style={[styles.cardContainer, isReady ? styles.cardReady : styles.cardPreparing]}>
      <Pressable
        onPress={() => onPress(order)}
        style={({ pressed }) => [styles.mainPressableArea, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Takeout ticket ${order.ticketNumber} for ${order.customerName}`}
      >
        {/* 1. Top Row: Ticket Code & Customer + Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.codeCol}>
            <View style={styles.ticketBadgeRow}>
              <ShoppingBag size={13} color="#15803d" strokeWidth={2.4} />
              <Text style={styles.ticketCodeText}>Takeout #{order.ticketNumber}</Text>
            </View>
            <Text style={styles.customerNameText} numberOfLines={1}>
              {order.customerName}
            </Text>
          </View>

          <View
            style={[styles.statusBadge, isReady ? styles.statusBadgeReady : styles.statusBadgePrep]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: isReady ? '#16a34a' : '#d97706' }]}
            />
            <Text style={[styles.statusText, { color: isReady ? '#15803d' : '#b45309' }]}>
              {isReady ? 'READY' : 'PREP'}
            </Text>
            <Text style={[styles.timeText, { color: isReady ? '#15803d' : '#b45309' }]}>
              · {order.elapsedTime}
            </Text>
          </View>
        </View>

        {/* 2. Middle Row: Items Line + Amount & Payment Flag */}
        <View style={styles.midRow}>
          <Text style={styles.itemsSummaryText} numberOfLines={1}>
            {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
          </Text>
          <View style={styles.amountCol}>
            <Text style={styles.amountText}>{formatCurrency(order.total)}</Text>
            <Text style={[styles.paidText, { color: order.isPrepaid ? '#15803d' : '#b45309' }]}>
              {order.isPrepaid ? 'PAID' : 'DUE'}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* 3. Bottom Row: Direct Action */}
      <View style={styles.actionRow}>
        {isReady ? (
          <Pressable
            onPress={() => onMarkCollected?.(order.id)}
            style={styles.actionBtnCollect}
            accessibilityRole="button"
            accessibilityLabel={`Mark order ${order.ticketNumber} as collected`}
          >
            <PackageCheck size={16} color="#ffffff" strokeWidth={2.3} />
            <Text style={styles.actionBtnText}>Collected</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => onMarkReady?.(order.id)}
            style={styles.actionBtnReady}
            accessibilityRole="button"
            accessibilityLabel={`Mark order ${order.ticketNumber} as ready`}
          >
            <CheckCircle2 size={16} color="#92400e" strokeWidth={2.3} />
            <Text style={styles.actionBtnReadyText}>Mark Ready</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: 'space-between',
    minHeight: 220,
  },
  mainPressableArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardPreparing: {
    borderColor: '#fde68a',
    backgroundColor: '#fffdfa',
  },
  cardReady: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f6fdf8',
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  codeCol: {
    flex: 1,
    marginRight: 6,
  },
  ticketBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  ticketCodeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803d',
  },
  customerNameText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 11,
  },
  statusBadgePrep: {
    backgroundColor: '#fef7e6',
  },
  statusBadgeReady: {
    backgroundColor: '#e8f9ee',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  itemsSummaryText: {
    flex: 1,
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  paidText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  actionRow: {
    paddingTop: 6,
  },
  actionBtnCollect: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  actionBtnReady: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  actionBtnReadyText: {
    color: '#92400e',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
