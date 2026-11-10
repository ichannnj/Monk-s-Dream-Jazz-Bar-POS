import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import {
  Wine,
  Coffee,
  UtensilsCrossed,
  PackageCheck,
  RotateCcw,
  Clock,
  CheckCircle2,
  Activity,
  AlertTriangle,
  Sparkles,
  Calendar,
} from 'lucide-react-native';
import type { DashboardTelemetry, TimeframeFilter } from '../../domain/admin.types';
import { useLiveNow, getLiveStationTurnaround } from '@/features/shared/utils/elapsedTime';
import { ResetStationBaselineModal } from './stations/ResetStationBaselineModal';
import { adminApi } from '../../data/admin.api';
import { toast } from '@/features/shared/toast/useToastStore';

interface AdminStationsViewProps {
  telemetry?: DashboardTelemetry | null;
  onRefresh?: () => void;
  timeframe?: TimeframeFilter;
  onChangeTimeframe?: (tf: TimeframeFilter) => void;
  isShowingFullDay?: boolean;
  onToggleIgnoreReset?: () => void;
}

const TIMEFRAME_BUTTONS: { key: TimeframeFilter; label: string }[] = [
  { key: 'today', label: 'Today (Daily)' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

export const AdminStationsView: React.FC<AdminStationsViewProps> = ({
  telemetry,
  onRefresh,
  timeframe = 'today',
  onChangeTimeframe,
  isShowingFullDay = false,
  onToggleIgnoreReset,
}) => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [isClearingReset, setIsClearingReset] = useState(false);

  const hasActiveTickets = Boolean(
    telemetry?.stations?.some((s) => s.isOnline && (s.activeTicketTimestamps?.length || 0) > 0)
  );
  const nowMs = useLiveNow(hasActiveTickets);

  const stationMeta: Record<
    string,
    { role: string; icon: any; color: string; defaultTarget: string }
  > = {
    bar: {
      role: 'Bartender & Barista (Spirits, Cocktails & Cafe)',
      icon: Wine,
      color: 'bg-amber-600',
      defaultTarget: '08:00',
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
            nowMs,
            st.isOnline
          );
          return {
            id: st.stationKey,
            name: st.name,
            role: meta.role,
            icon: meta.icon,
            color: meta.color,
            activeTickets: st.activeTickets,
            avgTime: st.avgTicketTime || 'Idle',
            liveActiveTime: liveStats.liveActiveTime,
            targetTime: st.targetTicketTime || meta.defaultTarget,
            isOnline: st.isOnline,
            lateCount: liveStats.lateTickets,
            completedCount: st.completedTickets ?? 0,
            onTimeRate: st.onTimeRate ?? 100,
            stockoutCount: st.stockoutCount,
          };
        })
      : [
          {
            id: 'bar',
            name: 'Bar & Cafe Station',
            role: 'Bartender & Barista (Spirits, Cocktails & Cafe)',
            icon: Wine,
            color: 'bg-amber-600',
            activeTickets: 0,
            avgTime: 'Idle',
            liveActiveTime: 'Idle',
            targetTime: '08:00',
            isOnline: false,
            lateCount: 0,
            completedCount: 0,
            onTimeRate: 100,
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
            liveActiveTime: 'Idle',
            targetTime: '15:00',
            isOnline: false,
            lateCount: 0,
            completedCount: 0,
            onTimeRate: 100,
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
            liveActiveTime: 'Idle',
            targetTime: '03:00',
            isOnline: false,
            lateCount: 0,
            completedCount: 0,
            onTimeRate: 100,
            stockoutCount: 0,
          },
        ];

  const totalActiveTickets = stationData.reduce((sum, s) => sum + s.activeTickets, 0);

  const handleClearBaseline = async () => {
    setIsClearingReset(true);
    try {
      const res = await adminApi.clearStationMetricsReset();
      if (res.success) {
        toast.success('Shift baseline reset cleared. Showing full day metrics.', {
          title: 'Baseline Restored',
        });
        onRefresh?.();
      } else {
        toast.error(res.error || 'Failed to clear baseline reset.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to clear baseline reset.');
    } finally {
      setIsClearingReset(false);
    }
  };

  const formattedResetTime = telemetry?.stationMetricsResetAt
    ? new Date(telemetry.stationMetricsResetAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <ScrollView
      className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#f59e0b" />
      }
    >
      {/* 1. Header & Title */}
      <View className="mb-6 flex-col md:flex-row md:items-center justify-between gap-4">
        <View className="flex-1">
          <Text className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Live Stations
          </Text>
        </View>

        {/* Action: Reset Shift Baseline Button */}
        <View className="flex-row items-center space-x-2">
          <Pressable
            onPress={() => setShowResetModal(true)}
            className="flex-row items-center rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 shadow-xs active:bg-stone-100"
          >
            <RotateCcw size={16} color="#d97706" />
            <Text className="ml-2 text-sm font-bold text-stone-800">Reset Shift Baseline</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Filter Bar: Today, Yesterday, This Week, This Month */}
      <View className="mb-6 flex-row flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-xs">
        <View className="flex-row items-center space-x-1.5 flex-wrap gap-1.5">
          <View className="flex-row items-center mr-2 pl-1">
            <Calendar size={16} color="#78716c" />
            <Text className="ml-1.5 text-xs font-bold uppercase tracking-wider text-stone-500">
              Timeframe:
            </Text>
          </View>
          {TIMEFRAME_BUTTONS.map((tf) => {
            const isActive = timeframe === tf.key;
            return (
              <Pressable
                key={tf.key}
                onPress={() => onChangeTimeframe?.(tf.key)}
                className={`rounded-xl px-3.5 py-2 ${
                  isActive ? 'bg-amber-500 shadow-xs' : 'bg-stone-100 active:bg-stone-200'
                }`}
              >
                <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-stone-700'}`}>
                  {tf.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Live sync pill */}
        <View className="flex-row items-center space-x-2 pr-1">
          <View className="h-2 w-2 rounded-full bg-emerald-500" />
          <Text className="text-xs font-semibold text-stone-500">
            {timeframe === 'today'
              ? 'Live Auto-Sync Active'
              : `Showing: ${telemetry?.timeframeLabel || 'Selected Period'}`}
          </Text>
        </View>
      </View>

      {/* 2b. Shift Baseline Active Notice (if reset was triggered) */}
      {timeframe === 'today' && telemetry?.stationMetricsResetAt && (
        <View className="mb-6 flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 gap-2">
          <View className="flex-row items-center space-x-2.5">
            <Sparkles size={18} color="#d97706" />
            <View className="ml-2">
              <Text className="text-xs font-bold text-amber-900">
                Shift Baseline Active (Reset at {formattedResetTime})
              </Text>
              <Text className="text-xs text-amber-800">
                {isShowingFullDay
                  ? 'Currently previewing full 24-hour day totals.'
                  : 'Calculating turnaround times and completed orders fresh from shift reset.'}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center space-x-2">
            <Pressable
              onPress={onToggleIgnoreReset}
              className="rounded-lg bg-white border border-amber-300 px-3 py-1.5 active:bg-amber-100"
            >
              <Text className="text-xs font-bold text-amber-900">
                {isShowingFullDay ? 'Filter to Active Shift' : 'Show Full Day'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleClearBaseline}
              disabled={isClearingReset}
              className="rounded-lg bg-amber-200/60 border border-amber-300 px-2.5 py-1.5 active:bg-amber-300"
            >
              <Text className="text-xs font-semibold text-amber-950">Clear Baseline</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 3. Executive Overview Banner (Table Turnover & Aggregated SLA) */}
      <View className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Avg Table Turnover Time */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Avg Table Turnover
            </Text>
            <View className="h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Clock size={16} color="#2563eb" />
            </View>
          </View>
          <Text className="mt-2 text-2xl font-black text-stone-900">
            {telemetry?.tableTurnover?.avgFormatted || '0 min'}
          </Text>
          <Text className="mt-1 text-xs text-stone-500">
            {telemetry?.tableTurnover?.totalTablesTurned || 0} tables turned ·{' '}
            {telemetry?.tableTurnover?.activeOccupiedTables || 0} active now
          </Text>
        </View>

        {/* Card 2: Overall SLA Compliance % */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
              On-Time SLA
            </Text>
            <View className="h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 size={16} color="#16a34a" />
            </View>
          </View>
          <Text className="mt-2 text-2xl font-black text-emerald-700">
            {telemetry?.stationsOverview?.overallSlaPercent ?? 100}%
          </Text>
          <Text className="mt-1 text-xs text-stone-500">
            Target SLA compliance across all stations
          </Text>
        </View>

        {/* Card 3: Total Completed Orders */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Total Fulfilled
            </Text>
            <View className="h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
              <PackageCheck size={16} color="#9333ea" />
            </View>
          </View>
          <Text className="mt-2 text-2xl font-black text-stone-900">
            {telemetry?.stationsOverview?.totalCompletedTickets || 0}
          </Text>
          <Text className="mt-1 text-xs text-stone-500">
            Busiest: {telemetry?.stationsOverview?.busiestStation || 'Bar Counter'}
          </Text>
        </View>

        {/* Card 4: Active In-Flight Tickets */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Active Queue
            </Text>
            <View className="h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <Activity size={16} color="#d97706" />
            </View>
          </View>
          <Text className="mt-2 text-2xl font-black text-amber-600">{totalActiveTickets}</Text>
          <Text className="mt-1 text-xs text-stone-500">
            Fastest: {telemetry?.stationsOverview?.fastestStation || 'Barista Espresso'}
          </Text>
        </View>
      </View>

      {/* 4. The 4 Station Cards */}
      <View className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {stationData.map((st) => {
          const IconComp = st.icon;
          return (
            <View
              key={st.id}
              className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs"
            >
              {/* Station Header */}
              <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
                <View className="flex-row items-center space-x-3">
                  <View className={`h-11 w-11 items-center justify-center rounded-xl ${st.color}`}>
                    <IconComp size={22} color="#ffffff" />
                  </View>
                  <View className="ml-3">
                    <Text className="text-lg font-bold text-stone-900">{st.name}</Text>
                    <Text className="text-sm text-stone-500">{st.role}</Text>
                  </View>
                </View>

                {/* Online Heartbeat Indicator */}
                {st.isOnline ? (
                  <View className="flex-row items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                    <View className="h-2.5 w-2.5 rounded-full bg-emerald-500 mr-2" />
                    <Text className="text-xs font-semibold text-emerald-700">Online</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center rounded-full bg-stone-100 border border-stone-300 px-3 py-1.5">
                    <View className="h-2.5 w-2.5 rounded-full bg-stone-400 mr-2" />
                    <Text className="text-xs font-semibold text-stone-600">Offline</Text>
                  </View>
                )}
              </View>

              {/* Station Metrics Grid */}
              <View className="grid grid-cols-2 sm:grid-cols-4 rounded-xl bg-stone-50 p-4 mb-4 gap-3">
                <View>
                  <Text className="text-xs font-medium text-stone-500">Active Queue</Text>
                  <Text className="text-2xl font-black text-stone-900">{st.activeTickets}</Text>
                  {st.activeTickets > 0 && (
                    <Text
                      className={`text-[11px] font-semibold ${
                        st.isOnline ? 'text-amber-600' : 'text-stone-400'
                      }`}
                    >
                      {st.isOnline ? `Live: ${st.liveActiveTime}` : 'Queued (Offline)'}
                    </Text>
                  )}
                </View>

                <View>
                  <Text className="text-xs font-medium text-stone-500">Avg Turnaround</Text>
                  <Text className="text-2xl font-black text-stone-900">{st.avgTime}</Text>
                  <Text className="text-[11px] text-stone-500">
                    {st.completedCount > 0 ? `${st.completedCount} fulfilled` : 'No orders yet'}
                  </Text>
                </View>

                <View>
                  <Text className="text-xs font-medium text-stone-500">Target SLA</Text>
                  <Text className="text-2xl font-black text-stone-600">{st.targetTime}</Text>
                  <Text className="text-[11px] text-stone-500">Max threshold</Text>
                </View>

                <View>
                  <Text className="text-xs font-medium text-stone-500">Overdue / Late</Text>
                  <Text
                    className={`text-2xl font-black ${
                      st.lateCount > 0 ? 'text-rose-600' : 'text-stone-900'
                    }`}
                  >
                    {st.lateCount}
                  </Text>
                  <Text className="text-[11px] text-stone-500">{st.onTimeRate}% on-time</Text>
                </View>
              </View>

              {/* Low stock notice */}
              {st.stockoutCount > 0 ? (
                <View className="flex-row items-center rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5">
                  <AlertTriangle size={16} color="#d97706" />
                  <Text className="ml-2 text-xs font-semibold text-amber-900">
                    Low stock or out-of-stock items: {st.stockoutCount}
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center rounded-xl bg-emerald-50 border border-emerald-100 px-3.5 py-2.5">
                  <CheckCircle2 size={16} color="#16a34a" />
                  <Text className="ml-2 text-xs font-medium text-emerald-800">
                    All station ingredients at healthy levels
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Reset Baseline Modal */}
      <ResetStationBaselineModal
        visible={showResetModal}
        onClose={() => setShowResetModal(false)}
        onSuccess={() => {
          onRefresh?.();
        }}
      />
    </ScrollView>
  );
};
