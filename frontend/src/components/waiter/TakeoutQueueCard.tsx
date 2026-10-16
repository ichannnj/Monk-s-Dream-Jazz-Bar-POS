import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ShoppingBag, Clock, CheckCircle2, PackageCheck } from 'lucide-react-native';
import { TakeoutOrder } from '../../mockData';

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
    <Pressable
      onPress={() => onPress(order)}
      style={({ pressed }) => [
        styles.cardContainer,
        isReady ? styles.cardReady : styles.cardPreparing,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Takeout ticket ${order.ticketNumber} for ${order.customerName}`}
    >
      {/* Top Header */}
      <View style={styles.cardHeader}>
        <View style={styles.ticketBadge}>
          <ShoppingBag size={13} color="#ffffff" strokeWidth={2.3} />
          <Text style={styles.ticketText}>Takeout #{order.ticketNumber}</Text>
        </View>

        <View style={styles.timerRow}>
          <Clock size={12} color="#6b7280" />
          <Text style={styles.timerText}>{order.elapsedTime}</Text>
        </View>
      </View>

      {/* Guest Name & Packaging */}
      <View style={styles.guestSection}>
        <Text style={styles.guestNameText} numberOfLines={1}>
          {order.customerName}
        </Text>
        <View style={styles.packagingBadge}>
          <Text style={styles.packagingBadgeText}>To-Go Cups & Boxes</Text>
        </View>
      </View>

      {/* Items Preview */}
      <View style={styles.itemsBox}>
        {order.items.slice(0, 2).map((item, idx) => (
          <Text key={idx} style={styles.itemLine} numberOfLines={1}>
            • {item.quantity}x {item.productName}
          </Text>
        ))}
        {order.items.length > 2 ? (
          <Text style={styles.moreItemsText}>
            +{order.items.length - 2} more items...
          </Text>
        ) : null}
      </View>

      {/* Footer: Price, Prepaid Flag & Quick Action */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.totalText}>${order.total.toFixed(2)}</Text>
          <Text
            style={[
              styles.prepaidText,
              order.isPrepaid ? styles.prepaidGreen : styles.prepaidAmber,
            ]}
          >
            {order.isPrepaid ? '● PAID AT COUNTER' : '○ PAY ON PICKUP'}
          </Text>
        </View>

        {isReady ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onMarkCollected?.(order.id);
            }}
            style={styles.actionBtnCollect}
          >
            <PackageCheck size={14} color="#ffffff" strokeWidth={2.2} />
            <Text style={styles.actionBtnText}>Collected</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onMarkReady?.(order.id);
            }}
            style={styles.actionBtnReady}
          >
            <CheckCircle2 size={13} color="#92400e" strokeWidth={2.2} />
            <Text style={styles.actionBtnReadyText}>Mark Ready</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardPreparing: {
    borderColor: '#fef08a',
    backgroundColor: '#fffbeb',
  },
  cardReady: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#15803d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ticketText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  guestSection: {
    marginBottom: 8,
  },
  guestNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a1e',
    marginBottom: 3,
  },
  packagingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(21, 128, 61, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  packagingBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803d',
  },
  itemsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  itemLine: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 2,
  },
  moreItemsText: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 8,
  },
  totalText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1a1a1e',
  },
  prepaidText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  prepaidGreen: {
    color: '#16a34a',
  },
  prepaidAmber: {
    color: '#d97706',
  },
  actionBtnCollect: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  actionBtnReady: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnReadyText: {
    color: '#92400e',
    fontSize: 11.5,
    fontWeight: '700',
  },
});
