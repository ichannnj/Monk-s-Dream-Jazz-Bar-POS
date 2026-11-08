import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { BellRing, Repeat, Clock, Coffee, Utensils, CheckCircle2 } from 'lucide-react-native';
import { RunnerTicket } from '../types';
import { RunnerTicketItemList } from './RunnerTicketItemList';
import { useLiveElapsedTimer } from '@/features/shared/utils/elapsedTime';
import { styles } from './RunnerTicketCard.styles';

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
  const liveTimer = useLiveElapsedTimer(ticket.createdAt, ticket.elapsedTime, 'runner');
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
          {ticket.orderType === 'takeout' && ticket.isPrepaid !== undefined ? (
            <View
              style={{
                alignSelf: 'flex-start',
                marginTop: 4,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: ticket.isPrepaid ? '#dcfce7' : '#fef3c7',
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: ticket.isPrepaid ? '#15803d' : '#b45309',
                }}
              >
                {ticket.isPrepaid ? 'PAID' : 'DUE AT COUNTER'}
              </Text>
            </View>
          ) : null}
        </View>
        <View
          style={[
            styles.timerPill,
            liveTimer.urgency === 'late' && { backgroundColor: '#fee2e2' },
            liveTimer.urgency === 'warning' && { backgroundColor: '#fef3c7' },
          ]}
        >
          <Clock
            size={16}
            color={
              liveTimer.urgency === 'late'
                ? '#b91c1c'
                : liveTimer.urgency === 'warning'
                  ? '#b45309'
                  : '#6b7280'
            }
          />
          <Text
            style={[
              styles.timerText,
              liveTimer.urgency === 'late' && { color: '#b91c1c' },
              liveTimer.urgency === 'warning' && { color: '#b45309' },
            ]}
          >
            {liveTimer.formattedTimer}
          </Text>
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
            ? `Deliver Round ${ticket.roundNumber || 1} to ${ticket.sourceTitle.split(' · ')[0] || 'Table'}`
            : 'Hand Off to Courier or Guest'
        }
      >
        <CheckCircle2 size={20} color="#ffffff" />
        <Text style={styles.handoffBtnText}>
          {ticket.orderType === 'dine_in'
            ? `Deliver Round ${ticket.roundNumber || 1} to ${ticket.sourceTitle.split(' · ')[0] || 'Table'}`
            : 'Hand Off to Courier / Guest'}
        </Text>
      </Pressable>
    </View>
  );
};
