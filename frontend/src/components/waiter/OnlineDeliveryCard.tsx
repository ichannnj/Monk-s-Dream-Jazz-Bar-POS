import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Bike, CheckCircle2, UserCheck } from 'lucide-react-native';
import { OnlineDeliveryOrder } from '../../mockData';

interface OnlineDeliveryCardProps {
  order: OnlineDeliveryOrder;
  onPress: (order: OnlineDeliveryOrder) => void;
  onMarkReady?: (orderId: string) => void;
  onHandToRider?: (orderId: string) => void;
}

export const OnlineDeliveryCard: React.FC<OnlineDeliveryCardProps> = ({
  order,
  onPress,
  onMarkReady,
  onHandToRider,
}) => {
  const isGrab = order.platform === 'grabfood';
  const isReady = order.status === 'ready';

  return (
    <View
      style={[
        styles.cardContainer,
        isGrab ? styles.cardGrab : styles.cardFoodpanda,
      ]}
    >
      <Pressable
        onPress={() => onPress(order)}
        style={({ pressed }) => [
          styles.mainPressableArea,
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Online delivery ${order.platform} ${order.platformOrderRef}`}
      >
        {/* 1. Top Row: Platform Order # & Rider + Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.codeCol}>
            <View style={styles.platformBadgeRow}>
              <Bike size={13} color={isGrab ? '#059669' : '#db2777'} strokeWidth={2.4} />
              <Text
                style={[
                  styles.platformCodeText,
                  { color: isGrab ? '#059669' : '#db2777' },
                ]}
              >
                {isGrab ? 'Grab' : 'Panda'} #{order.platformOrderRef}
              </Text>
            </View>
            <Text style={styles.customerNameText} numberOfLines={1}>
              {order.customerName} · {order.riderName}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isReady ? styles.statusBadgeReady : styles.statusBadgePrep,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isReady ? '#16a34a' : '#d97706' },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isReady ? '#15803d' : '#b45309' },
              ]}
            >
              {isReady ? 'READY' : 'PREP'}
            </Text>
            <Text
              style={[
                styles.timeText,
                { color: isReady ? '#15803d' : '#b45309' },
              ]}
            >
              · {order.elapsedTime}
            </Text>
          </View>
        </View>

        {/* 2. Middle Row: Items Line + Amount & Paid Tag */}
        <View style={styles.midRow}>
          <Text style={styles.itemsSummaryText} numberOfLines={1}>
            {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
          </Text>
          <View style={styles.amountCol}>
            <Text style={styles.amountText}>${order.total.toFixed(2)}</Text>
            <Text style={styles.paidText}>PAID APP</Text>
          </View>
        </View>
      </Pressable>

      {/* 3. Bottom Row: Direct Action */}
      <View style={styles.actionRow}>
        {isReady ? (
          <Pressable
            onPress={() => onHandToRider?.(order.id)}
            style={styles.actionBtnHandOver}
            accessibilityRole="button"
            accessibilityLabel={`Hand over order ${order.platformOrderRef} to rider`}
          >
            <UserCheck size={16} color="#ffffff" strokeWidth={2.3} />
            <Text style={styles.actionBtnText}>Rider Pickup</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => onMarkReady?.(order.id)}
            style={styles.actionBtnReady}
            accessibilityRole="button"
            accessibilityLabel={`Mark online order ${order.platformOrderRef} as ready`}
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
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
    minHeight: 156,
  },
  mainPressableArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardGrab: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f6fdf8',
  },
  cardFoodpanda: {
    borderColor: '#fbcfe8',
    backgroundColor: '#fdf2f8',
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
  platformBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  platformCodeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  customerNameText: {
    fontSize: 16,
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
    color: '#059669',
    marginTop: 1,
  },
  actionRow: {
    paddingTop: 6,
  },
  actionBtnHandOver: {
    backgroundColor: '#1f2937',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
  actionBtnReady: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  actionBtnReadyText: {
    color: '#92400e',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
