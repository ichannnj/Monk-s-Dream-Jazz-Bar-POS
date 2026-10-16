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
} from 'lucide-react-native';
import { useOrderStore } from '../../store/useOrderStore';

export const FloorAlertsView: React.FC = () => {
  const { alerts, markAlertRead } = useOrderStore();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Bell size={18} color="#ffffff" strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.title}>Floor Buzzout Alerts & Notifications</Text>
            <Text style={styles.subtitle}>
              Live station ready chimes, Auto-86 inventory alerts, and table re-routes
            </Text>
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
              Station ready and auto-86 alerts will appear here in real time.
            </Text>
          </View>
        ) : (
          alerts.map((alert) => {
            const isReady = alert.type === 'station_ready';
            const is86 = alert.type === 'auto_86';
            const isTransfer = alert.type === 'transfer';

            return (
              <View
                key={alert.id}
                style={[
                  styles.alertCard,
                  !alert.isRead && styles.alertCardUnread,
                ]}
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
                          <Text style={styles.refPillText}>
                            Target: {alert.targetRef}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                {!alert.isRead ? (
                  <Pressable
                    onPress={() => markAlertRead(alert.id)}
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
    borderRadius: 10,
  },
  liveText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803d',
  },
  alertsScroll: {
    flex: 1,
  },
  alertsScrollContent: {
    gap: 12,
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  alertCardUnread: {
    borderColor: '#0284c7',
    backgroundColor: '#f8fafc',
  },
  alertCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    flex: 1,
    marginRight: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleGreen: {
    backgroundColor: '#ecfdf5',
  },
  iconCircleRed: {
    backgroundColor: '#fef2f2',
  },
  iconCircleWine: {
    backgroundColor: '#fceeed',
  },
  alertTextCol: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1a1a1e',
    marginBottom: 3,
  },
  alertDesc: {
    fontSize: 12.5,
    color: '#4b5563',
    lineHeight: 17,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertTime: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  refPill: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  refPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#374151',
  },
  ackBtn: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
});
