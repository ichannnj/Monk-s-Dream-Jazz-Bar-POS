import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Bike, Clock, CheckCircle2, UserCheck } from 'lucide-react-native';
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
    <Pressable
      onPress={() => onPress(order)}
      style={({ pressed }) => [
        styles.cardContainer,
        isGrab ? styles.cardGrab : styles.cardFoodpanda,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Online delivery ${order.platform} ${order.platformOrderRef}`}
    >
      {/* Top Header: Platform + Elapsed Timer */}
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.platformBadge,
            isGrab ? styles.badgeGrabBg : styles.badgePandaBg,
          ]}
        >
          <Bike size={13} color="#ffffff" strokeWidth={2.3} />
          <Text style={styles.platformBadgeText}>
            {isGrab ? 'GrabFood' : 'Foodpanda'} #{order.platformOrderRef}
          </Text>
        </View>

        <View style={styles.timerRow}>
          <Clock size={12} color="#6b7280" />
          <Text style={styles.timerText}>{order.elapsedTime}</Text>
        </View>
      </View>

      {/* Rider & Customer Row */}
      <View style={styles.deliveryDetails}>
        <Text style={styles.riderText} numberOfLines={1}>
          🛵 {order.riderName}
        </Text>
        <Text style={styles.customerText} numberOfLines={1}>
          Customer: {order.customerName}
        </Text>
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

      {/* Footer: Prepaid Tag & Hand-Off Action */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.totalText}>${order.total.toFixed(2)}</Text>
          <Text style={styles.prepaidTag}>✓ PAID ONLINE ({isGrab ? 'GRAB' : 'PANDA'})</Text>
        </View>

        {isReady ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onHandToRider?.(order.id);
            }}
            style={styles.actionBtnHandOver}
          >
            <UserCheck size={14} color="#ffffff" strokeWidth={2.2} />
            <Text style={styles.actionBtnText}>Rider Pickup</Text>
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
  cardGrab: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  cardFoodpanda: {
    borderColor: '#fbcfe8',
    backgroundColor: '#fdf2f8',
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
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeGrabBg: {
    backgroundColor: '#059669',
  },
  badgePandaBg: {
    backgroundColor: '#db2777',
  },
  platformBadgeText: {
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
  deliveryDetails: {
    marginBottom: 8,
  },
  riderText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 2,
  },
  customerText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6b7280',
  },
  itemsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
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
  prepaidTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    marginTop: 1,
  },
  actionBtnHandOver: {
    backgroundColor: '#1f2937',
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
