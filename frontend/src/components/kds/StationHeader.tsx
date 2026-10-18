import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Coffee, UtensilsCrossed, BellRing, LogOut, Sparkles, Flame } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';

const MONKS_DREAM_LOGO = require('../../../assets/Monks Dream Logo files-02.png');

interface StationHeaderProps {
  title: string;
  stationType: 'bar' | 'kitchen' | 'runner';
  activeTicketsCount: number;
  urgentTicketsCount?: number;
  onLogout?: () => void;
}

export const StationHeader: React.FC<StationHeaderProps> = ({
  title,
  stationType,
  activeTicketsCount,
  urgentTicketsCount = 0,
  onLogout,
}) => {
  const { currentUser, isOnline } = useAuthStore();

  const getStationConfig = () => {
    switch (stationType) {
      case 'bar':
        return {
          icon: Coffee,
          badgeColor: '#0284c7',
          badgeBg: '#e0f2fe',
          badgeText: 'BAR & CAFE STATION',
        };
      case 'kitchen':
        return {
          icon: UtensilsCrossed,
          badgeColor: '#d97706',
          badgeBg: '#fef3c7',
          badgeText: 'KITCHEN CHEF KDS',
        };
      case 'runner':
        return {
          icon: BellRing,
          badgeColor: '#832238',
          badgeBg: '#fde8ec',
          badgeText: 'FOH EXPEDITER BUZZOUT',
        };
    }
  };

  const config = getStationConfig();
  const IconComponent = config.icon;

  return (
    <View style={styles.container}>
      {/* Left: Official Logo + Station Identification */}
      <View style={styles.leftSection}>
        <View style={styles.logoBadge}>
          <ExpoImage
            source={MONKS_DREAM_LOGO}
            style={styles.logoImage}
            contentFit="contain"
            priority="high"
          />
        </View>

        <View style={styles.titleCol}>
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>MONK'S DREAM</Text>
            <View
              style={[
                styles.stationPill,
                { backgroundColor: config.badgeBg, borderColor: `${config.badgeColor}40` },
              ]}
            >
              <IconComponent size={12} color={config.badgeColor} />
              <Text style={[styles.stationPillText, { color: config.badgeColor }]}>
                {config.badgeText}
              </Text>
            </View>
          </View>
          <Text style={styles.subText}>
            {title} • Staff: {currentUser?.displayName || 'Active Station'}
          </Text>
        </View>
      </View>

      {/* Center: Live Queue Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>ACTIVE QUEUE</Text>
          <Text style={styles.metricValue}>{activeTicketsCount}</Text>
        </View>
        {urgentTicketsCount > 0 ? (
          <View style={[styles.metricCard, styles.metricCardUrgent]}>
            <View style={styles.urgentDot} />
            <Text style={styles.urgentLabel}>OVERDUE (&gt;10m)</Text>
            <Text style={styles.urgentValue}>{urgentTicketsCount}</Text>
          </View>
        ) : null}
      </View>

      {/* Right: Cloud Sync Status & Logout */}
      <View style={styles.rightSection}>
        <View style={[styles.syncPill, isOnline ? styles.syncPillOnline : styles.syncPillOffline]}>
          <View style={[styles.syncDot, { backgroundColor: isOnline ? '#10b981' : '#f43f5e' }]} />
          <Text style={[styles.syncText, { color: isOnline ? '#10b981' : '#f43f5e' }]}>
            {isOnline ? 'Realtime Connected' : 'Offline'}
          </Text>
        </View>

        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Switch Staff User"
        >
          <LogOut size={16} color="#832238" />
          <Text style={styles.logoutBtnText}>Switch User</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
    gap: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#2b0f16',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleCol: {
    justifyContent: 'center',
    gap: 3,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.5,
  },
  stationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  stationPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  subText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#f6f0ed',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#832238',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  metricCardUrgent: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dc2626',
    position: 'absolute',
    top: 6,
    right: 8,
  },
  urgentLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b91c1c',
  },
  urgentValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#dc2626',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  syncPillOnline: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  syncPillOffline: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  syncText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fde8ec',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fad4db',
  },
  logoutBtnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#832238',
  },
});
