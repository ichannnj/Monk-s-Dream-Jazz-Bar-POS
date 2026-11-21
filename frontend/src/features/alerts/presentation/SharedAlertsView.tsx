import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { CheckCircle2, AlertTriangle, Repeat, Clock, Sparkles } from 'lucide-react-native';
import { useOrderStore } from '../../orders/application/useOrderStore';
import { toast } from '../../shared/toast/useToastStore';
import { FloorSectionHeader } from '../../shared';

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
    <View className="flex-1 bg-[#FAF8F5]">
      <FloorSectionHeader
        title={title}
        badge={
          unreadAlerts.length > 0
            ? { label: `${unreadAlerts.length} Unread`, tone: 'wine' }
            : { label: 'Live', tone: 'neutral' }
        }
        onBack={onBack}
        backLabel={backLabel}
        rightSlot={
          unreadAlerts.length > 0 ? (
            <Pressable
              onPress={handleDismissAll}
              className="min-h-[48px] px-4 rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] items-center justify-center active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Dismiss all alerts"
            >
              <Text className="text-base font-semibold text-[#810021]">Dismiss All</Text>
            </Pressable>
          ) : null
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {alerts.length === 0 ? (
          <View className="bg-white rounded-2xl border border-[#E7E5E4] p-8 items-center justify-center gap-2 mt-2">
            <Sparkles size={28} color="#78716C" />
            <Text className="text-pos-lg font-bold text-[#1C1917]">All caught up</Text>
            <Text className="text-base text-[#57534E] text-center max-w-md">
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
                className={`bg-white rounded-2xl p-4 flex-row flex-wrap sm:flex-nowrap justify-between items-center border gap-3 ${
                  !alert.isRead ? 'border-[#810021]/30' : 'border-[#E7E5E4]'
                }`}
              >
                <View className="flex-row items-start gap-3 flex-1 min-w-[220px]">
                  <View className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#E7E5E4] items-center justify-center shrink-0 mt-0.5">
                    {isReady ? (
                      <CheckCircle2 size={18} color="#810021" />
                    ) : is86 ? (
                      <AlertTriangle size={18} color="#810021" />
                    ) : (
                      <Repeat size={18} color="#1C1917" />
                    )}
                  </View>

                  <View className="flex-1 gap-1">
                    <Text className="text-base font-bold text-[#1C1917]">{alert.title}</Text>
                    {alert.description ? (
                      <Text className="text-base text-[#57534E]" numberOfLines={2}>
                        {alert.description}
                      </Text>
                    ) : null}
                    <View className="flex-row flex-wrap items-center gap-2 mt-1">
                      <Clock size={14} color="#78716C" />
                      <Text className="text-base text-[#78716C] tabular-nums">{alert.time}</Text>
                      {alert.targetRef ? (
                        <View className="bg-[#FAF8F5] border border-[#E7E5E4] px-2.5 py-0.5 rounded-lg">
                          <Text className="text-base font-semibold text-[#57534E]">
                            {alert.targetRef}
                          </Text>
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
                    className="min-h-[48px] px-4 rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] items-center justify-center active:opacity-80 shrink-0"
                    accessibilityRole="button"
                    accessibilityLabel={`Dismiss ${alert.title}`}
                  >
                    <Text className="text-base font-semibold text-[#1C1917]">Dismiss</Text>
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
