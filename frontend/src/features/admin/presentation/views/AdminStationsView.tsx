import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import {
  Wine,
  PackageCheck,
  RotateCcw,
  Clock,
  CheckCircle2,
  Activity,
  AlertTriangle,
  Sparkles,
  Calendar,
  UtensilsCrossed,
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
  { key: 'today', label: 'Today' },
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
      role: 'Bartender & Barista',
      icon: Wine,
      color: 'bg-[#800020]',
      defaultTarget: '08:00',
    },
    kitchen: {
      role: 'Hot Food Line',
      icon: UtensilsCrossed,
      color: 'bg-stone-900',
      defaultTarget: '15:00',
    },
    runner: {
      role: 'FOH Expediter',
      icon: PackageCheck,
      color: 'bg-stone-800',
      defaultTarget: '03:00',
    },
  };

  const stationData =
    (telemetry?.stations || []).length > 0
      ? telemetry!.stations.map((st) => {
          const meta = stationMeta[st.stationKey] || {
            role: 'Station Workstation',
            icon: UtensilsCrossed,
            color: 'bg-stone-800',
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
            role: 'Bartender & Barista',
            icon: Wine,
            color: 'bg-[#800020]',
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
            role: 'Kitchen Chef',
            icon: UtensilsCrossed,
            color: 'bg-stone-900',
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
            name: 'Expediter Pass',
            role: 'FOH Expediter',
            icon: PackageCheck,
            color: 'bg-stone-800',
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
      className="flex-1 bg-[#FAF8F5] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header & Title (Single-line, Minimal) */}
      <View className="mb-5 flex-row items-center justify-between gap-3">
        <Text className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
          Live Stations
        </Text>

        <Pressable
          onPress={() => setShowResetModal(true)}
          className="flex-row items-center rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-xs active:bg-stone-50"
        >
          <RotateCcw size={14} color="#800020" />
          <Text className="ml-1.5 text-xs font-bold text-stone-800">Reset Shift</Text>
        </Pressable>
      </View>

      {/* 2. Filter Bar: Today, Yesterday, This Week, This Month */}
      <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white p-2.5 shadow-xs">
        <View className="flex-row items-center space-x-1 flex-wrap gap-1">
          <View className="flex-row items-center mr-1.5 pl-1">
            <Calendar size={14} color="#78716c" />
            <Text className="ml-1 text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Period:
            </Text>
          </View>
          {TIMEFRAME_BUTTONS.map((tf) => {
            const isActive = timeframe === tf.key;
            return (
              <Pressable
                key={tf.key}
                onPress={() => onChangeTimeframe?.(tf.key)}
                className={`rounded-xl px-3 py-1.5 ${
                  isActive ? 'bg-[#800020]' : 'bg-[#FAF8F5] active:bg-stone-100'
                }`}
              >
                <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-stone-700'}`}>
                  {tf.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row items-center space-x-2 pr-1">
          <View className="h-1.5 w-1.5 rounded-full bg-[#800020]" />
          <Text className="text-xs font-semibold text-stone-500">
            {timeframe === 'today' ? 'Live Sync' : telemetry?.timeframeLabel || 'Selected Period'}
          </Text>
        </View>
      </View>

      {/* 2b. Shift Baseline Active Notice (if reset was triggered) */}
      {timeframe === 'today' && telemetry?.stationMetricsResetAt && (
        <View className="mb-5 flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-stone-200/80 bg-white p-3.5 gap-2">
          <View className="flex-row items-center space-x-2">
            <Sparkles size={16} color="#800020" />
            <View className="ml-2">
              <Text className="text-xs font-bold text-stone-900">
                Shift Baseline Active ({formattedResetTime})
              </Text>
            </View>
          </View>
          <View className="flex-row items-center space-x-2">
            <Pressable
              onPress={onToggleIgnoreReset}
              className="rounded-lg bg-[#FAF8F5] border border-stone-200 px-3 py-1 active:bg-stone-100"
            >
              <Text className="text-xs font-bold text-stone-800">
                {isShowingFullDay ? 'Active Shift' : 'Full Day'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleClearBaseline}
              disabled={isClearingReset}
              className="rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 active:bg-stone-200"
            >
              <Text className="text-xs font-semibold text-stone-700">Clear</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 3. Executive Overview Banner (Table Turnover & Aggregated SLA in 3-Color Scheme) */}
      <View className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Avg Table Turnover Time */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Avg Turnover
            </Text>
            <Clock size={15} color="#78716c" />
          </View>
          <Text className="mt-2 text-xl font-black text-stone-900">
            {telemetry?.tableTurnover?.avgFormatted || '0 min'}
          </Text>
          <Text className="mt-1 text-xs text-stone-500">
            {telemetry?.tableTurnover?.totalTablesTurned || 0} turned
          </Text>
        </View>

        {/* Card 2: Overall SLA Compliance % */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
              On-Time SLA
            </Text>
            <CheckCircle2 size={15} color="#800020" />
          </View>
          <Text className="mt-2 text-xl font-black text-stone-900">
            {telemetry?.stationsOverview?.overallSlaPercent ?? 100}%
          </Text>
          <Text className="mt-1 text-xs text-stone-500">Target SLA compliance</Text>
        </View>

        {/* Card 3: Total Completed Orders */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Total Fulfilled
            </Text>
            <PackageCheck size={15} color="#78716c" />
          </View>
          <Text className="mt-2 text-xl font-black text-stone-900">
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
            <Activity size={15} color="#800020" />
          </View>
          <Text className="mt-2 text-xl font-black text-[#800020]">{totalActiveTickets}</Text>
          <Text className="mt-1 text-xs text-stone-500">In-flight tickets</Text>
        </View>
      </View>

      {/* 4. Station Cards */}
      <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stationData.map((st) => {
          const IconComp = st.icon;
          return (
            <View
              key={st.id}
              className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs"
            >
              {/* Station Header */}
              <View className="flex-row items-center justify-between mb-3 flex-wrap gap-2">
                <View className="flex-row items-center space-x-2.5">
                  <View className={`h-9 w-9 items-center justify-center rounded-xl ${st.color}`}>
                    <IconComp size={18} color="#ffffff" />
                  </View>
                  <View className="ml-2.5">
                    <Text className="text-base font-bold text-stone-900">{st.name}</Text>
                    <Text className="text-xs text-stone-500">{st.role}</Text>
                  </View>
                </View>

                {/* Online Heartbeat Indicator */}
                <View className="flex-row items-center rounded-full bg-[#FAF8F5] border border-stone-200 px-2.5 py-1">
                  <View
                    className={`h-2 w-2 rounded-full mr-1.5 ${
                      st.isOnline ? 'bg-[#800020]' : 'bg-stone-400'
                    }`}
                  />
                  <Text className="text-xs font-semibold text-stone-700">
                    {st.isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>

              {/* Station Metrics Grid */}
              <View className="grid grid-cols-2 sm:grid-cols-4 rounded-xl bg-[#FAF8F5] p-3 mb-3 gap-2.5">
                <View>
                  <Text className="text-[11px] font-medium text-stone-500">Active Queue</Text>
                  <Text className="text-xl font-black text-stone-900">{st.activeTickets}</Text>
                  {st.activeTickets > 0 && (
                    <Text
                      className={`text-[10px] font-semibold ${
                        st.isOnline ? 'text-[#800020]' : 'text-stone-400'
                      }`}
                    >
                      {st.isOnline ? `Live: ${st.liveActiveTime}` : 'Queued'}
                    </Text>
                  )}
                </View>

                <View>
                  <Text className="text-[11px] font-medium text-stone-500">Avg Time</Text>
                  <Text className="text-xl font-black text-stone-900">{st.avgTime}</Text>
                  <Text className="text-[10px] text-stone-500">
                    {st.completedCount > 0 ? `${st.completedCount} done` : 'No orders'}
                  </Text>
                </View>

                <View>
                  <Text className="text-[11px] font-medium text-stone-500">Target SLA</Text>
                  <Text className="text-xl font-black text-stone-600">{st.targetTime}</Text>
                  <Text className="text-[10px] text-stone-500">Target</Text>
                </View>

                <View>
                  <Text className="text-[11px] font-medium text-stone-500">Overdue</Text>
                  <Text
                    className={`text-xl font-black ${
                      st.lateCount > 0 ? 'text-[#800020]' : 'text-stone-900'
                    }`}
                  >
                    {st.lateCount}
                  </Text>
                  <Text className="text-[10px] text-stone-500">{st.onTimeRate}% on-time</Text>
                </View>
              </View>

              {/* Stock Notice */}
              {st.stockoutCount > 0 ? (
                <View className="flex-row items-center rounded-xl bg-[#FAF8F5] border border-stone-200 px-3 py-2">
                  <AlertTriangle size={14} color="#800020" />
                  <Text className="ml-2 text-xs font-semibold text-[#800020]">
                    Out of stock: {st.stockoutCount} items
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center rounded-xl bg-[#FAF8F5] border border-stone-200 px-3 py-2">
                  <CheckCircle2 size={14} color="#78716c" />
                  <Text className="ml-2 text-xs font-medium text-stone-600">All items healthy</Text>
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
