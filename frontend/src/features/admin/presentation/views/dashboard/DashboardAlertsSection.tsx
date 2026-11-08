import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { AttentionAlert, AdminRoute } from '../../../domain/admin.types';

interface DashboardAlertsSectionProps {
  alerts: AttentionAlert[];
  onClearAlerts: () => void;
  onNavigateRoute: (route: AdminRoute) => void;
}

export const DashboardAlertsSection: React.FC<DashboardAlertsSectionProps> = ({
  alerts,
  onClearAlerts,
  onNavigateRoute,
}) => {
  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs mb-8 overflow-hidden">
      <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-xl font-bold text-stone-900">Needs Attention</Text>
          {alerts.length > 0 && (
            <View className="h-7 w-7 items-center justify-center rounded-full bg-rose-100 border border-rose-200">
              <Text className="text-base font-bold text-rose-700">{alerts.length}</Text>
            </View>
          )}
        </View>

        {alerts.length > 0 && (
          <Pressable
            onPress={onClearAlerts}
            className="min-h-[48px] px-4 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 active:bg-stone-100"
          >
            <Text className="text-base font-semibold text-stone-700">Clear All Alerts</Text>
          </Pressable>
        )}
      </View>

      {alerts.length === 0 ? (
        <View className="py-6 items-center">
          <Text className="text-base font-medium text-stone-500 text-center">
            All station alerts and inventory items are at healthy levels.
          </Text>
        </View>
      ) : (
        <View className="space-y-3">
          {alerts.map((alert) => {
            const isVoid = alert.type === 'void';
            const isStock = alert.type === 'low_stock';
            return (
              <View
                key={alert.id}
                className="flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-stone-100 bg-stone-50/60 p-4 gap-3"
              >
                <View className="flex-row items-start flex-1 min-w-0 gap-3">
                  <View
                    className={`rounded-lg px-3 py-1.5 border shrink-0 ${
                      isVoid
                        ? 'bg-rose-50 border-rose-200'
                        : isStock
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-stone-100 border-stone-300'
                    }`}
                  >
                    <Text
                      className={`text-base font-bold ${
                        isVoid ? 'text-rose-700' : isStock ? 'text-amber-800' : 'text-stone-700'
                      }`}
                    >
                      {alert.badgeLabel}
                    </Text>
                  </View>

                  <View className="flex-1 min-w-0">
                    <Text className="text-base font-bold text-stone-900">{alert.title}</Text>
                    <Text className="text-base text-stone-500 mt-0.5">{alert.description}</Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => onNavigateRoute(alert.targetRoute)}
                  className="min-h-[48px] px-4 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200 shrink-0 self-end sm:self-center"
                >
                  <Text className="text-base font-bold text-[#800020]">View Details</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};
