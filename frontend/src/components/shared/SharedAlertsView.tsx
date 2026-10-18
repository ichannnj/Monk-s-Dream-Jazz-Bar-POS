import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Repeat,
  Radio,
  Clock,
  Sparkles,
  ArrowLeft,
} from 'lucide-react-native';
import { useOrderStore } from '../../store/useOrderStore';
import { toast } from '../../store/useToastStore';

export interface SharedAlertsViewProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
}

export const SharedAlertsView: React.FC<SharedAlertsViewProps> = ({
  title = 'Floor Buzzout Alerts & Notifications',
  subtitle = 'Live station ready chimes, Out-of-Stock inventory alerts, and table re-routes',
  onBack,
  backLabel = 'Back to Board',
}) => {
  const { alerts, markAlertRead } = useOrderStore();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.backBtn}>
              <ArrowLeft size={16} color="#0284c7" strokeWidth={2.4} />
              <Text style={styles.backBtnText}>{backLabel}</Text>
            </Pressable>
          ) : null}

          <View style={styles.badge}>
            <Bell size={18} color="#ffffff" strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.liveIndicator}>
          <Radio size={14} color="#15803d" />
          <Text style={styles.liveText}>WebSocket Live Feed</Text>
        </View>
      </View>

      {/* Alerts Feed */}
      <ScrollView
        style={styles.alertsScroll}
        contentContainerStyle={styles.alertsScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Sparkles size={28} color="#9ca3af" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySub}>
              Station ready and out-of-stock alerts will appear here in real time.
            </Text>
          </View>
        ) : (
          alerts.map((alert) => {
            const isReady = alert.type === 'station_ready';
            const is86 = alert.type === 'auto_86';

            return (
              <View
                key={alert.id}
                style={[styles.alertCard, !alert.isRead && styles.alertCardUnread]}
              >
                <View style={styles.alertCardLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      isReady
                        ? styles.iconCircleGreen
                        : is86
                          ? styles.iconCircleRed
                          : styles.iconCircleWine,
                    ]}
                  >
                    {isReady ? (
                      <CheckCircle2 size={18} color="#15803d" />
                    ) : is86 ? (
                      <AlertTriangle size={18} color="#dc2626" />
                    ) : (
                      <Repeat size={18} color="#832238" />
                    )}
                  </View>

                  <View style={styles.alertTextCol}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertDesc}>{alert.description}</Text>
                    <View style={styles.metaRow}>
                      <Clock size={11} color="#9ca3af" />
                      <Text style={styles.alertTime}>{alert.time}</Text>
                      {alert.targetRef ? (
                        <View style={styles.refPill}>
                          <Text style={styles.refPillText}>Target: {alert.targetRef}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                {!alert.isRead ? (
                  <Pressable
                    onPress={() => {
                      markAlertRead(alert.id);
                      toast.info(`Dismissed: ${alert.title}`, {
                        title: 'Alert Acknowledged',
                        duration: 2000,
                      });
                    }}
                    style={styles.ackBtn}
                  >
                    <Text style={styles.ackBtnText}>Dismiss</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#6b7280',
    marginTop: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  alertsScroll: {
    flex: 1,
  },
  alertsScrollContent: {
    gap: 12,
    paddingBottom: 24,
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptySub: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  alertCardUnread: {
    borderColor: '#fed7aa',
    backgroundColor: '#fffbeb',
  },
  alertCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleGreen: {
    backgroundColor: '#dcfce7',
  },
  iconCircleRed: {
    backgroundColor: '#fee2e2',
  },
  iconCircleWine: {
    backgroundColor: '#fce7f3',
  },
  alertTextCol: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  alertDesc: {
    fontSize: 12.5,
    color: '#4b5563',
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  alertTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  refPill: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  refPillText: {
    fontSize: 10,
    color: '#4b5563',
    fontWeight: '600',
  },
  ackBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  ackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
});
