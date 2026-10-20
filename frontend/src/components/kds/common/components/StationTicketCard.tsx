import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Clock, CheckCircle2, Flame, Utensils, ShoppingBag, Bike } from 'lucide-react-native';
import { KdsTicket } from '../../types';

export { KdsTicket };

interface StationTicketCardProps {
  ticket: KdsTicket;
  stationType: 'bar' | 'kitchen';
  onAcceptAll?: (ticket: KdsTicket) => void;
  onDoneAll?: (ticket: KdsTicket) => void;
  onUpdateItemStatus?: (itemId: string, status: 'pending' | 'preparing' | 'ready') => void;
}

export const StationTicketCard: React.FC<StationTicketCardProps> = ({
  ticket,
  onAcceptAll,
  onDoneAll,
  onUpdateItemStatus,
}) => {
  const { sourceTitle, guestName, orderType, elapsedTime, items, transferAlert } = ticket;

  // Ticket timer urgency color
  const timerUrgency = useMemo(() => {
    const mins = ticket.minutesElapsed || 0;
    if (mins >= 10) {
      return {
        bg: '#fee2e2',
        border: '#fca5a5',
        text: '#dc2626',
        badge: 'OVERDUE',
      };
    }
    if (mins >= 5) {
      return {
        bg: '#fef3c7',
        border: '#fde68a',
        text: '#d97706',
        badge: 'RUSH',
      };
    }
    return {
      bg: '#ecfdf5',
      border: '#a7f3d0',
      text: '#15803d',
      badge: 'NORMAL',
    };
  }, [ticket.minutesElapsed]);

  // Overall status of items
  const allReady =
    items.length > 0 && items.every((i) => i.status === 'ready' || i.status === 'served');
  const allPreparingOrDone = items.every((i) => i.status !== 'pending');

  const getOrderTypeBadge = () => {
    switch (orderType) {
      case 'dine_in':
        return {
          Icon: Utensils,
          color: '#832238',
          bg: '#fde8ec',
          label: 'Dine-In',
        };
      case 'takeout':
        return {
          Icon: ShoppingBag,
          color: '#0284c7',
          bg: '#e0f2fe',
          label: 'Takeout',
        };
      case 'online_delivery':
        return {
          Icon: Bike,
          color: '#15803d',
          bg: '#e8f9ee',
          label: 'Delivery',
        };
    }
  };

  const typeConfig = getOrderTypeBadge();
  const TypeIcon = typeConfig.Icon;

  return (
    <View
      style={[
        styles.cardContainer,
        Boolean(transferAlert) && styles.cardContainerRelocated,
        allReady && styles.cardReady,
        ticket.minutesElapsed >= 10 && styles.cardOverdue,
      ]}
    >
      {/* 1. Header: Source, Type Badge & Elapsed Timer */}
      <View style={styles.header}>
        <View style={styles.sourceCol}>
          <View style={styles.typeBadgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeConfig.bg }]}>
              <TypeIcon size={12} color={typeConfig.color} />
              <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
                {typeConfig.label}
              </Text>
            </View>
            <Text style={styles.orderNumberText}>{ticket.orderNumber}</Text>

            {/* Clean Round Badge */}
            {ticket.roundNumber && ticket.roundNumber > 1 ? (
              <View
                style={{
                  backgroundColor: '#eff6ff',
                  borderWidth: 1,
                  borderColor: '#bfdbfe',
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#1d4ed8' }}>
                  Round {ticket.roundNumber}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.sourceTitleText}>{sourceTitle}</Text>
          <Text style={styles.guestNameText}>Guest: {guestName}</Text>
          {ticket.multiStationTag ? (
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#0284c7', marginTop: 2 }}>
              {ticket.multiStationTag}
            </Text>
          ) : null}
        </View>

        {/* Timer Chip */}
        <View
          style={[
            styles.timerChip,
            { backgroundColor: timerUrgency.bg, borderColor: timerUrgency.border },
          ]}
        >
          <Clock size={12} color={timerUrgency.text} />
          <Text style={[styles.timerText, { color: timerUrgency.text }]}>{elapsedTime}</Text>
        </View>
      </View>

      {/* 2. Transfer Re-Routing Banner (If applicable) */}
      {transferAlert ? (
        <View style={styles.transferAlertBanner}>
          <Text style={styles.transferAlertTitle}>
            🚨 TABLE RELOCATED: DELIVER TO {sourceTitle}
          </Text>
          <Text style={styles.transferAlertText}>Originally ordered at {transferAlert}</Text>
        </View>
      ) : null}

      {/* Void Alert Banner (If items cancelled) */}
      {items.some((i) => i.status === 'cancelled') ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#fee2e2',
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 8,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: '#fca5a5',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#b91c1c' }}>
            🚨 VOIDED ITEMS ON TICKET — DO NOT PREPARE
          </Text>
        </View>
      ) : null}

      {/* 3. Items Checklist */}
      <View style={styles.itemsList}>
        {items.map((item) => {
          const isCancelled = item.status === 'cancelled';
          const isItemReady = item.status === 'ready' || item.status === 'served';
          const isItemPrep = item.status === 'preparing';

          return (
            <View key={item.id} style={[styles.itemRow, isCancelled && { opacity: 0.6 }]}>
              {/* Item Details */}
              <View style={styles.itemDetailsCol}>
                <View style={styles.itemNameRow}>
                  <View
                    style={[styles.quantityBadge, isCancelled && { backgroundColor: '#fee2e2' }]}
                  >
                    <Text style={[styles.quantityText, isCancelled && { color: '#b91c1c' }]}>
                      {item.quantity}x
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.productNameText,
                      isItemReady && styles.productNameReady,
                      isCancelled && { textDecorationLine: 'line-through', color: '#9ca3af' },
                    ]}
                  >
                    {item.productName}
                  </Text>
                  {isCancelled ? (
                    <View
                      style={{
                        backgroundColor: '#fef2f2',
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        borderRadius: 4,
                        borderWidth: 1,
                        borderColor: '#fecaca',
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#b91c1c' }}>
                        CANCELLED
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Modifiers */}
                {item.modifiers && item.modifiers.length > 0 ? (
                  <View style={styles.modifiersRow}>
                    {item.modifiers.map((mod, idx) => (
                      <View key={idx} style={styles.modChip}>
                        <Text style={styles.modChipText}>+ {mod}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Notes */}
                {item.notes ? (
                  <Text
                    style={[
                      styles.notesText,
                      isCancelled && { textDecorationLine: 'line-through', color: '#9ca3af' },
                    ]}
                  >
                    📝 {item.notes}
                  </Text>
                ) : null}
              </View>

              {/* Individual Item Status Toggle */}
              {!isCancelled ? (
                <Pressable
                  onPress={() => {
                    if (onUpdateItemStatus) {
                      if (item.status === 'pending') {
                        onUpdateItemStatus(item.id, 'preparing');
                      } else if (item.status === 'preparing') {
                        onUpdateItemStatus(item.id, 'ready');
                      } else {
                        onUpdateItemStatus(item.id, 'preparing');
                      }
                    }
                  }}
                  style={({ pressed }) => [
                    styles.itemStatusBtn,
                    isItemReady && styles.itemStatusBtnReady,
                    isItemPrep && styles.itemStatusBtnPrep,
                    pressed && styles.btnPressed,
                  ]}
                >
                  {isItemReady ? (
                    <CheckCircle2 size={16} color="#ffffff" />
                  ) : (
                    <Text
                      style={[styles.itemStatusBtnText, isItemPrep && styles.itemStatusBtnTextPrep]}
                    >
                      {isItemPrep ? 'PREP' : 'START'}
                    </Text>
                  )}
                </Pressable>
              ) : (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: '#fee2e2',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#b91c1c' }}>VOID</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* 4. Batch Actions Footer */}
      <View style={styles.footer}>
        {!allPreparingOrDone ? (
          <Pressable
            onPress={() => onAcceptAll && onAcceptAll(ticket)}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.acceptBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.acceptBtnText}>Accept All</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => onDoneAll && onDoneAll(ticket)}
          disabled={allReady}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.doneBtn,
            allReady && styles.doneBtnDisabled,
            pressed && styles.btnPressed,
          ]}
        >
          <CheckCircle2 size={16} color="#ffffff" />
          <Text style={styles.doneBtnText}>{allReady ? 'Order Ready' : 'Mark Station Ready'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#eee8e3',
    padding: 16,
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
    width: 320,
  },
  cardContainerRelocated: {
    borderColor: '#f59e0b',
    borderWidth: 2.5,
    backgroundColor: '#fffdfa',
  },
  cardReady: {
    borderColor: '#86efac',
    backgroundColor: '#fbfdfc',
  },
  cardOverdue: {
    borderColor: '#fca5a5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3ece7',
    marginBottom: 10,
  },
  sourceCol: {
    flex: 1,
    gap: 2,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  orderNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
  },
  sourceTitleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  guestNameText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4b5563',
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  transferAlertBanner: {
    flexDirection: 'column',
    gap: 4,
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderLeftWidth: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  transferAlertTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#92400e',
    letterSpacing: 0.2,
  },
  transferAlertText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#b45309',
  },
  itemsList: {
    gap: 10,
    marginBottom: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f6f3',
    gap: 8,
  },
  itemDetailsCol: {
    flex: 1,
    gap: 4,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quantityBadge: {
    backgroundColor: '#f4ede7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#832238',
  },
  productNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  productNameReady: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  modifiersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingLeft: 22,
  },
  modChip: {
    backgroundColor: '#f3ece7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  modChipText: {
    fontSize: 10.5,
    color: '#6b7280',
    fontWeight: '600',
  },
  notesText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#d97706',
    fontWeight: '600',
    paddingLeft: 22,
  },
  itemStatusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f3ece7',
    borderWidth: 1,
    borderColor: '#e8dfd8',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  itemStatusBtnPrep: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  itemStatusBtnReady: {
    backgroundColor: '#15803d',
    borderColor: '#16a34a',
  },
  itemStatusBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#4b5563',
  },
  itemStatusBtnTextPrep: {
    color: '#b45309',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3ece7',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  acceptBtn: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  acceptBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#b45309',
  },
  doneBtn: {
    backgroundColor: '#832238',
  },
  doneBtnDisabled: {
    backgroundColor: '#15803d',
    opacity: 0.8,
  },
  doneBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
});
