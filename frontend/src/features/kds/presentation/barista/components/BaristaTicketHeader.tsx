import React from 'react';
import { View, Text } from 'react-native';
import { BarTicket } from '../types';
import { styles } from './BaristaTicketCard.styles';

export interface BaristaTicketHeaderProps {
  ticket: BarTicket;
  timePill: { bg: string; text: string };
  formattedTimer: string;
}

export const BaristaTicketHeader: React.FC<BaristaTicketHeaderProps> = ({
  ticket,
  timePill,
  formattedTimer,
}) => {
  const { orderNumber, tableOrSource, badges, multiStationTag } = ticket;

  return (
    <View>
      {/* Relocation Alert Banner */}
      {ticket.transferredFrom ? (
        <View style={styles.relocationAlertBanner}>
          <View style={styles.relocationAlertHeader}>
            <Text style={styles.relocationAlertTitle}>
              🚨 TABLE RELOCATED: DELIVER TO{' '}
              {ticket.tableOrSource.split(' · ')[0] || ticket.tableOrSource}
            </Text>
          </View>
          <Text style={styles.relocationAlertSubtitle}>
            Originally ordered at {ticket.transferredFrom.tableCode}
            {ticket.transferredFrom.transferredAt
              ? ` • Moved at ${ticket.transferredFrom.transferredAt}`
              : ''}
          </Text>
        </View>
      ) : null}

      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.orderNumber}>{orderNumber}</Text>
          {ticket.roundNumber && ticket.roundNumber > 1 ? (
            <View style={styles.cleanRoundPill}>
              <Text style={styles.cleanRoundPillText}>Round {ticket.roundNumber}</Text>
            </View>
          ) : null}
          <Text style={styles.tableText}>{tableOrSource}</Text>
        </View>
        <View style={[styles.timePill, { backgroundColor: timePill.bg }]}>
          <Text style={[styles.timePillText, { color: timePill.text }]}>{formattedTimer}</Text>
        </View>
      </View>

      {/* Badges Row */}
      <View style={styles.badgeRow}>
        {ticket.takeoutId && ticket.isPrepaid !== undefined ? (
          <View
            style={[
              styles.badgeReady,
              {
                backgroundColor: ticket.isPrepaid ? '#dcfce7' : '#fef3c7',
              },
            ]}
          >
            <Text
              style={[styles.badgeReadyText, { color: ticket.isPrepaid ? '#15803d' : '#b45309' }]}
            >
              {ticket.isPrepaid ? 'PAID' : 'DUE AT PICKUP'}
            </Text>
          </View>
        ) : null}
        {badges
          .filter((badge) => !badge.startsWith('ROUND') && badge !== 'JUST IN')
          .map((badge, idx) => {
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
            if (badge.startsWith('MOVED:')) {
              return (
                <View key={idx} style={styles.badgeMoved}>
                  <Text style={styles.badgeMovedText}>🔁 {badge}</Text>
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
    </View>
  );
};
