import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { BarTicket } from '../types';

interface BaristaTicketCardProps {
  ticket: BarTicket;
  onStart?: (ticket: BarTicket) => void;
  onReady?: (ticket: BarTicket) => void;
  onRecall?: (ticket: BarTicket) => void;
  onViewFohStatus?: (ticket: BarTicket) => void;
  onReadyBlockedPress?: (ticket: BarTicket) => void;
  onToggleItem?: (ticketId: string, itemId: string) => void;
}

export const BaristaTicketCard: React.FC<BaristaTicketCardProps> = ({
  ticket,
  onStart,
  onReady,
  onRecall,
  onViewFohStatus,
  onReadyBlockedPress,
  onToggleItem,
}) => {
  const {
    orderNumber,
    tableOrSource,
    stage,
    elapsedTime,
    badges,
    multiStationTag,
    items,
    specialNote,
    voidNote,
    isReadyBlocked,
    hasFohStatusAlert,
  } = ticket;

  const getTimePillStyle = () => {
    switch (stage) {
      case 'ready':
        return {
          bg: '#dcfce7',
          text: '#15803d',
        };
      case 'preparing':
        return {
          bg: '#fef3c7',
          text: '#b45309',
        };
      case 'new':
      default:
        return {
          bg: '#f3f4f6',
          text: '#374151',
        };
    }
  };

  const timePill = getTimePillStyle();

  return (
    <View style={styles.cardContainer}>
      {/* Top Header: Order Number + Table Name & Elapsed Time Pill */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.orderNumber}>{orderNumber}</Text>
          <Text style={styles.tableText}>{tableOrSource}</Text>
        </View>
        <View style={[styles.timePill, { backgroundColor: timePill.bg }]}>
          <Text style={[styles.timePillText, { color: timePill.text }]}>{elapsedTime}</Text>
        </View>
      </View>

      {/* Badges Row */}
      <View style={styles.badgeRow}>
        {badges.map((badge, idx) => {
          if (badge === 'NEW') {
            return (
              <View key={idx} style={styles.badgeNew}>
                <View style={styles.badgeNewDot} />
                <Text style={styles.badgeNewText}>NEW</Text>
              </View>
            );
          }
          if (badge === 'RUSH') {
            return (
              <View key={idx} style={styles.badgeRush}>
                <Text style={styles.badgeRushText}>RUSH</Text>
              </View>
            );
          }
          if (badge === 'JUST IN') {
            return (
              <View key={idx} style={styles.badgeJustIn}>
                <Text style={styles.badgeJustInText}>JUST IN</Text>
              </View>
            );
          }
          if (badge === 'PREPARING') {
            return (
              <View key={idx} style={styles.badgePrep}>
                <View style={styles.badgePrepDot} />
                <Text style={styles.badgePrepText}>PREPARING</Text>
              </View>
            );
          }
          if (badge === 'ITEM VOIDED') {
            return (
              <View key={idx} style={styles.badgeVoided}>
                <Text style={styles.badgeVoidedText}>ITEM VOIDED</Text>
              </View>
            );
          }
          if (badge === 'READY') {
            return (
              <View key={idx} style={styles.badgeReady}>
                <View style={styles.badgeReadyDot} />
                <Text style={styles.badgeReadyText}>READY</Text>
              </View>
            );
          }
          if (badge.startsWith('ROUND')) {
            return (
              <View key={idx} style={styles.badgeRound}>
                <Text style={styles.badgeRoundText}>{badge}</Text>
              </View>
            );
          }
          return null;
        })}
      </View>

      {/* Multi-Station Awareness Tag */}
      {multiStationTag ? (
        <View style={styles.multiStationRow}>
          <View style={styles.multiStationPill}>
            <Text style={styles.multiStationText}>{multiStationTag}</Text>
          </View>
        </View>
      ) : null}

      {/* Item Lines */}
      <View style={styles.itemsContainer}>
        {items.map((item) => {
          const isVoid = item.isVoided;
          const is86 = item.is86;

          return (
            <Pressable
              key={item.id}
              onPress={() => onToggleItem?.(ticket.id, item.id)}
              style={styles.itemRow}
            >
              <Text style={[styles.itemQty, isVoid ? styles.itemVoidText : null]}>
                {item.quantity}×
              </Text>
              <Text
                style={[
                  styles.itemName,
                  isVoid ? styles.itemVoidText : null,
                  isVoid ? styles.itemStrikethrough : null,
                ]}
              >
                {item.productName}
                {is86 ? <Text style={styles.outOfStockSuffix}> · Out of Stock</Text> : null}
              </Text>
            </Pressable>
          );
        })}
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

      {/* Action Footer depending on stage */}
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
            <Text style={styles.waitingPickupText}>Waiting for pickup</Text>
            <Pressable
              onPress={() => onRecall?.(ticket)}
              style={({ pressed }) => [styles.recallButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.recallButtonText}>Recall</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eee8e3',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  tableText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  timePill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  badgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  badgeNewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6b7280',
  },
  badgeNewText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4b5563',
    letterSpacing: 0.4,
  },
  badgeRush: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeRushText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991b1b',
    letterSpacing: 0.4,
  },
  badgeJustIn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeJustInText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991b1b',
    letterSpacing: 0.4,
  },
  badgePrep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  badgePrepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d97706',
  },
  badgePrepText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
    letterSpacing: 0.4,
  },
  badgeVoided: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeVoidedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#dc2626',
    letterSpacing: 0.4,
  },
  badgeReady: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  badgeReadyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  badgeReadyText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.4,
  },
  badgeRound: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeRoundText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
    letterSpacing: 0.4,
  },
  multiStationRow: {
    marginBottom: 10,
  },
  multiStationPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#fbf4f6',
    borderWidth: 1,
    borderColor: '#f5e4e8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  multiStationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#701a31',
  },
  itemsContainer: {
    marginTop: 2,
    marginBottom: 8,
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemQty: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  itemVoidText: {
    color: '#9ca3af',
  },
  itemStrikethrough: {
    textDecorationLine: 'line-through',
  },
  outOfStockSuffix: {
    color: '#701a31',
    fontWeight: '800',
  },
  specialNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdf2f4',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 6,
    marginBottom: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#fce7eb',
  },
  noteExclamation: {
    fontSize: 12,
    fontWeight: '900',
    color: '#701a31',
  },
  specialNoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  voidNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 6,
    marginBottom: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  voidExclamation: {
    fontSize: 12,
    fontWeight: '900',
    color: '#e11d48',
  },
  voidNoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9f1239',
    flex: 1,
  },
  footerContainer: {
    marginTop: 8,
  },
  primaryWineButton: {
    backgroundColor: '#6b1a2f',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryWineButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  readyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fohStatusButton: {
    backgroundColor: '#fdf2f4',
    borderWidth: 1.5,
    borderColor: '#fbcfe8',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fohStatusButtonText: {
    color: '#701a31',
    fontSize: 14,
    fontWeight: '800',
  },
  blockedButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedButtonText: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '800',
  },
  readyFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  waitingPickupText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  recallButton: {
    backgroundColor: '#6b1a2f',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  recallButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
