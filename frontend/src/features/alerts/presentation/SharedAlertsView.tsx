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
import { useOrderStore } from '../../orders/application/useOrderStore';
import { toast } from '../../shared/toast/useToastStore';

export interface SharedAlertsViewProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
}

export const SharedAlertsView: React.FC<SharedAlertsViewProps> = ({
  title = 'Alerts',
  onBack,
  backLabel = 'Back',
}) => {
  const { alerts, markAlertRead } = useOrderStore();
  const unreadAlerts = alerts.filter((a) => !a.isRead);

  const handleDismissAll = () => {
    unreadAlerts.forEach((a) => markAlertRead(a.id));
    toast.info('All active alerts dismissed', { title: 'Alerts Cleared' });
  };

  return (
    <View style={styles.container}>
      {/* Minimalist Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel={backLabel}
            >
              <ArrowLeft size={16} color="#1c1917" strokeWidth={2.4} />
              <Text style={styles.backBtnText}>{backLabel}</Text>
            </Pressable>
          ) : null}

          <View style={styles.badge}>
            <Bell size={18} color="#ffffff" strokeWidth={2.4} />
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {unreadAlerts.length > 0 && (
              <View style={styles.unreadCountPill}>
                <Text style={styles.unreadCountText}>{unreadAlerts.length}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.headerRight}>
          {unreadAlerts.length > 0 && (
            <Pressable
              onPress={handleDismissAll}
              style={styles.dismissAllBtn}
              accessibilityRole="button"
              accessibilityLabel="Dismiss all alerts"
            >
              <Text style={styles.dismissAllText}>Dismiss All</Text>
            </Pressable>
          )}

          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
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
            <Sparkles size={28} color="#78716c" />
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptySub}>
              Station chimes and inventory notifications will appear here.
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
                  <View style={styles.iconCircle}>
                    {isReady ? (
                      <CheckCircle2 size={18} color="#810021" />
                    ) : is86 ? (
                      <AlertTriangle size={18} color="#810021" />
                    ) : (
                      <Repeat size={18} color="#1c1917" />
                    )}
                  </View>

                  <View style={styles.alertTextCol}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    {alert.description ? (
                      <Text style={styles.alertDesc} numberOfLines={2}>
                        {alert.description}
                      </Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      <Clock size={11} color="#78716c" />
                      <Text style={styles.alertTime}>{alert.time}</Text>
                      {alert.targetRef ? (
                        <View style={styles.refPill}>
                          <Text style={styles.refPillText}>{alert.targetRef}</Text>
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
                        duration: 1500,
                      });
                    }}
                    style={styles.ackBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Dismiss ${alert.title}`}
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
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadCountPill: {
    backgroundColor: '#810021',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadCountText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dismissAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  dismissAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#810021',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1c1917',
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#810021',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1c1917',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1c1917',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716c',
  },
  alertsScroll: {
    flex: 1,
  },
  alertsScrollContent: {
    gap: 10,
    paddingBottom: 24,
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1917',
  },
  emptySub: {
    fontSize: 13,
    color: '#78716c',
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    gap: 12,
  },
  alertCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#810021',
  },
  alertCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTextCol: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1c1917',
  },
  alertDesc: {
    fontSize: 12.5,
    color: '#57534e',
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
    color: '#78716c',
  },
  refPill: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 4,
  },
  refPillText: {
    fontSize: 10,
    color: '#57534e',
    fontWeight: '600',
  },
  ackBtn: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  ackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1c1917',
  },
});
