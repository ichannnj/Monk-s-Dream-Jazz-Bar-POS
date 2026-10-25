import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BellRing, Repeat, Clock, Coffee, Utensils, CheckCircle2 } from 'lucide-react-native';
import { RunnerTicket } from '../types';
import { RunnerTicketItemList } from './RunnerTicketItemList';

interface RunnerTicketCardProps {
  ticket: RunnerTicket;
  onDeliverTarget: (ticket: RunnerTicket, target: 'bar' | 'kitchen') => void;
  onHandoff: (ticket: RunnerTicket) => void;
}

export const RunnerTicketCard: React.FC<RunnerTicketCardProps> = ({
  ticket,
  onDeliverTarget,
  onHandoff,
}) => {
  const progressPct =
    ticket.totalItemsCount > 0 ? (ticket.readyItemsCount / ticket.totalItemsCount) * 100 : 0;

  const hasReadyBar = ticket.items.some((i) => i.stationTarget === 'bar' && i.status === 'ready');
  const hasPendingKitchen = ticket.items.some(
    (i) =>
      i.stationTarget === 'kitchen' &&
      i.status !== 'ready' &&
      i.status !== 'served' &&
      i.status !== 'cancelled'
  );

  const hasReadyKitchen = ticket.items.some(
    (i) => i.stationTarget === 'kitchen' && i.status === 'ready'
  );
  const hasPendingBar = ticket.items.some(
    (i) =>
      i.stationTarget === 'bar' &&
      i.status !== 'ready' &&
      i.status !== 'served' &&
      i.status !== 'cancelled'
  );

  return (
    <View style={[styles.ticketCard, ticket.allDone && styles.ticketCardReady]}>
      {/* Buzzout Highlight Banner */}
      {ticket.allDone ? (
        <View style={styles.buzzoutBanner}>
          <BellRing size={20} color="#ffffff" />
          <Text style={styles.buzzoutBannerText}>🔔 BUZZOUT: FULL ORDER READY FOR DELIVERY</Text>
        </View>
      ) : null}

      {/* Table Relocation Warning Banner */}
      {ticket.transferredFrom ? (
        <View style={styles.relocatedBanner}>
          <Repeat size={18} color="#b45309" />
          <Text style={styles.relocatedBannerText}>
            MOVED: {ticket.transferredFrom.tableCode} ➔ {ticket.sourceTitle.split(' · ')[0]}
          </Text>
        </View>
      ) : null}

      {/* Header */}
      <View style={styles.ticketHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.sourceText}>{ticket.sourceTitle}</Text>
          <Text style={styles.guestText}>{ticket.guestName}</Text>
        </View>
        <View style={styles.timerPill}>
          <Clock size={16} color="#6b7280" />
          <Text style={styles.timerText}>{ticket.elapsedTime}</Text>
        </View>
      </View>

      {/* Assembly Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPct}%` },
              ticket.allDone && { backgroundColor: '#15803d' },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {ticket.readyItemsCount} of {ticket.totalItemsCount} items ready (
          {Math.round(progressPct)}%)
        </Text>
      </View>

      {/* Items List */}
      <RunnerTicketItemList items={ticket.items} />

      {/* Partial Dispatch Actions */}
      {!ticket.allDone ? (
        <View style={styles.partialActionsRow}>
          {hasReadyBar && hasPendingKitchen ? (
            <Pressable
              onPress={() => onDeliverTarget(ticket, 'bar')}
              style={[styles.btnPartialAction, styles.btnDeliverDrinks]}
              accessibilityRole="button"
              accessibilityLabel={`Deliver drinks for ${ticket.sourceTitle}`}
            >
              <Coffee size={18} color="#0284c7" />
              <Text style={[styles.btnPartialText, styles.btnDeliverDrinksText]}>
                Deliver Drinks
              </Text>
            </Pressable>
          ) : null}

          {hasReadyKitchen && hasPendingBar ? (
            <Pressable
              onPress={() => onDeliverTarget(ticket, 'kitchen')}
              style={[styles.btnPartialAction, styles.btnDeliverFood]}
              accessibilityRole="button"
              accessibilityLabel={`Deliver food for ${ticket.sourceTitle}`}
            >
              <Utensils size={18} color="#d97706" />
              <Text style={[styles.btnPartialText, styles.btnDeliverFoodText]}>Deliver Food</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Handoff Button */}
      <Pressable
        onPress={() => onHandoff(ticket)}
        style={({ pressed }) => [
          styles.handoffBtn,
          ticket.allDone && styles.handoffBtnReady,
          pressed && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          ticket.orderType === 'dine_in'
            ? `Deliver Round ${ticket.roundNumber || 1} to Table`
            : 'Hand Off to Courier or Guest'
        }
      >
        <CheckCircle2 size={20} color="#ffffff" />
        <Text style={styles.handoffBtnText}>
          {ticket.orderType === 'dine_in'
            ? `Deliver Round ${ticket.roundNumber || 1} to Table`
            : 'Hand Off to Courier / Guest'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  ticketCardReady: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    shadowColor: '#22c55e',
    shadowOpacity: 0.15,
  },
  buzzoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buzzoutBannerText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  relocatedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  relocatedBannerText: {
    color: '#b45309',
    fontWeight: '800',
    fontSize: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    gap: 2,
  },
  sourceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  guestText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  progressContainer: {
    gap: 6,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },

  partialActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  btnPartialAction: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  btnPartialText: {
    fontSize: 16,
    fontWeight: '700',
  },
  btnDeliverDrinks: {
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
  },
  btnDeliverDrinksText: {
    color: '#0284c7',
  },
  btnDeliverFood: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  btnDeliverFoodText: {
    color: '#d97706',
  },
  handoffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#4b5563',
  },
  handoffBtnReady: {
    backgroundColor: '#16a34a',
  },
  handoffBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
