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
      <View className="flex-row items-center justify-between mb-3 flex-wrap gap-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold text-stone-900">Attention</Text>
          {alerts.length > 0 && (
            <View className="h-5 w-5 items-center justify-center rounded-full bg-[#FAF8F5] border border-stone-200">
              <Text className="text-xs font-bold text-[#800020]">{alerts.length}</Text>
            </View>
          )}
        </View>

        {alerts.length > 0 && (
          <Pressable
            onPress={onClearAlerts}
            className="px-3 py-1 items-center justify-center rounded-lg bg-stone-50 active:bg-stone-100 border border-stone-200"
          >
            <Text className="text-xs font-medium text-stone-700">Clear</Text>
          </Pressable>
        )}
      </View>

      {alerts.length === 0 ? (
        <View className="py-4 items-center">
          <Text className="text-xs font-medium text-stone-500 text-center">
            All stations and inventory items are healthy.
          </Text>
        </View>
      ) : (
        <View className="space-y-2.5">
          {alerts.map((alert) => {
            return (
              <View
                key={alert.id}
                className="flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-stone-200/80 bg-[#FAF8F5] p-3 gap-2"
              >
                <View className="flex-row items-center flex-1 min-w-0 gap-2.5">
                  <View className="rounded-md px-2 py-0.5 border border-stone-200 bg-white shrink-0">
                    <Text className="text-[11px] font-bold text-stone-800">{alert.badgeLabel}</Text>
                  </View>

                  <View className="flex-1 min-w-0">
                    <Text className="text-xs font-bold text-stone-900" numberOfLines={1}>
                      {alert.title}
                    </Text>
                    <Text className="text-xs text-stone-500 mt-0.5" numberOfLines={1}>
                      {alert.description}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => onNavigateRoute(alert.targetRoute)}
                  className="px-2.5 py-1 items-center justify-center rounded-lg bg-white border border-stone-200 active:bg-stone-50 shrink-0 self-end sm:self-center"
                >
                  <Text className="text-xs font-bold text-[#800020]">View</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};
