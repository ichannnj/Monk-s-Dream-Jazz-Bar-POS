import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Wine, Coffee, UtensilsCrossed, PackageCheck } from 'lucide-react-native';
import type { DashboardTelemetry } from '../../domain/admin.types';
import { useLiveNow, getLiveStationTurnaround } from '@/features/shared/utils/elapsedTime';

interface AdminStationsViewProps {
  telemetry?: DashboardTelemetry | null;
  onRefresh?: () => void;
}

export const AdminStationsView: React.FC<AdminStationsViewProps> = ({ telemetry }) => {
  const hasActiveTickets = Boolean(
    telemetry?.stations?.some((s) => (s.activeTicketTimestamps?.length || 0) > 0)
  );
  const nowMs = useLiveNow(hasActiveTickets);
  const stationMeta: Record<
    string,
    { role: string; icon: any; color: string; defaultTarget: string }
  > = {
    bar: {
      role: 'Bartender & Cocktail Mixology',
      icon: Wine,
      color: 'bg-amber-600',
      defaultTarget: '10:00',
    },
    cafe: {
      role: 'Espresso Bar & Teas',
      icon: Coffee,
      color: 'bg-stone-700',
      defaultTarget: '06:00',
    },
    kitchen: {
      role: 'Main Line Chef & Appetizers',
      icon: UtensilsCrossed,
      color: 'bg-rose-700',
      defaultTarget: '15:00',
    },
    runner: {
      role: 'Tablet Buzzout & Tray Dispatch',
      icon: PackageCheck,
      color: 'bg-emerald-700',
      defaultTarget: '03:00',
    },
  };

  const stationData =
    (telemetry?.stations || []).length > 0
      ? telemetry!.stations.map((st) => {
        const meta = stationMeta[st.stationKey] || {
          role: 'Station Workstation',
          icon: UtensilsCrossed,
          color: 'bg-stone-600',
          defaultTarget: '10:00',
        };
        const liveStats = getLiveStationTurnaround(
          st.stationKey,
          st.activeTicketTimestamps,
          st.avgTicketTime,
          st.lateTickets,
          nowMs
        );
        return {
          id: st.stationKey,
          name: st.name,
          role: meta.role,
          icon: meta.icon,
          color: meta.color,
          activeTickets: st.activeTickets,
          avgTime: liveStats.avgTicketTime,
          targetTime: st.targetTicketTime || meta.defaultTarget,
          isOnline: st.isOnline,
          lateCount: liveStats.lateTickets,
          stockoutCount: st.stockoutCount,
        };
      })
      : [
        {
          id: 'bar',
          name: 'Bar Counter',
          role: 'Bartender & Cocktail Mixology',
          icon: Wine,
          color: 'bg-amber-600',
          activeTickets: 0,
          avgTime: 'Idle',
          targetTime: '10:00',
          isOnline: false,
          lateCount: 0,
          stockoutCount: 0,
        },
        {
          id: 'cafe',
          name: 'Barista Espresso',
          role: 'Espresso Bar & Teas',
          icon: Coffee,
          color: 'bg-stone-700',
          activeTickets: 0,
          avgTime: 'Idle',
          targetTime: '06:00',
          isOnline: false,
          lateCount: 0,
          stockoutCount: 0,
        },
        {
          id: 'kitchen',
          name: 'Kitchen Hot Line',
          role: 'Main Line Chef & Appetizers',
          icon: UtensilsCrossed,
          color: 'bg-rose-700',
          activeTickets: 0,
          avgTime: 'Idle',
          targetTime: '15:00',
          isOnline: false,
          lateCount: 0,
          stockoutCount: 0,
        },
        {
          id: 'runner',
          name: 'FOH Expediter',
          role: 'Tablet Buzzout & Tray Dispatch',
          icon: PackageCheck,
          color: 'bg-emerald-700',
          activeTickets: 0,
          avgTime: 'Idle',
          targetTime: '03:00',
          isOnline: false,
          lateCount: 0,
          stockoutCount: 0,
        },
      ];

  return (
    <ScrollView
      className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-6">
        <Text className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
          Live Stations Operations & Turnaround Hub
        </Text>
        <Text className="mt-1 text-base text-stone-500">
          Real-time monitoring across Bar, Cafe, Kitchen Line, and Expediter Runner tablets.
        </Text>
      </View>

      <View className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {stationData.map((st) => {
          const IconComp = st.icon;
          return (
            <View
              key={st.id}
              className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs"
            >
              <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
                <View className="flex-row items-center space-x-3">
                  <View className={`h-11 w-11 items-center justify-center rounded-xl ${st.color}`}>
                    <IconComp size={22} color="#ffffff" />
                  </View>
                  <View className="ml-3">
                    <Text className="text-lg font-bold text-stone-900">{st.name}</Text>
                    <Text className="text-base text-stone-500">{st.role}</Text>
                  </View>
                </View>

                {st.isOnline ? (
                  <View className="flex-row items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                    <View className="h-2.5 w-2.5 rounded-full bg-emerald-500 mr-2" />
                    <Text className="text-base font-semibold text-emerald-700">Online</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center rounded-full bg-stone-100 border border-stone-300 px-3 py-1.5">
                    <View className="h-2.5 w-2.5 rounded-full bg-stone-400 mr-2" />
                    <Text className="text-base font-semibold text-stone-600">Offline</Text>
                  </View>
                )}
              </View>

              <View className="grid grid-cols-2 sm:flex sm:flex-row sm:items-center justify-between rounded-xl bg-stone-50 p-4 mb-4 gap-3 sm:gap-2">
                <View>
                  <Text className="text-base text-stone-500">Active Queue</Text>
                  <Text className="text-2xl font-black text-stone-900">{st.activeTickets}</Text>
                </View>

                <View>
                  <Text className="text-base text-stone-500">Avg Turnaround</Text>
                  <Text className="text-2xl font-black text-stone-900">{st.avgTime}</Text>
                </View>

                <View>
                  <Text className="text-base text-stone-500">Target Time</Text>
                  <Text className="text-2xl font-black text-stone-500">{st.targetTime}</Text>
                </View>

                <View>
                  <Text className="text-base text-stone-500">Overdue / Late</Text>
                  <Text
                    className={`text-2xl font-black ${st.lateCount > 0 ? 'text-rose-600' : 'text-stone-900'
                      }`}
                  >
                    {st.lateCount}
                  </Text>
                </View>
              </View>

              {st.stockoutCount > 0 ? (
                <View className="flex-row items-center rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5">
                  <Text className="text-base font-semibold text-amber-900">
                    Low stock or out-of-stock items: {st.stockoutCount}
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center rounded-xl bg-emerald-50 border border-emerald-100 px-3.5 py-2.5">
                  <Text className="text-base font-medium text-emerald-800">
                    All station ingredients at healthy levels
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};
