import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { BellRing, Repeat, Clock, Coffee, Utensils, CheckCircle2 } from 'lucide-react-native';
import { OrderLineItem } from '../../../../../types/floor';
import { RunnerTicket } from '../types';
import { RunnerTicketItemList } from './RunnerTicketItemList';
import { useLiveElapsedTimer } from '@/features/shared/utils/elapsedTime';
import { useKeyedCooldown } from '@/features/shared/hooks/useAsyncAction';

interface RunnerTicketCardProps {
  ticket: RunnerTicket;
  onDeliverTarget: (ticket: RunnerTicket, target: 'bar' | 'kitchen') => void;
  onDeliverItem?: (ticket: RunnerTicket, item: OrderLineItem) => void;
  onHandoff: (ticket: RunnerTicket) => void;
}

export const RunnerTicketCard: React.FC<RunnerTicketCardProps> = ({
  ticket,
  onDeliverTarget,
  onDeliverItem,
  onHandoff,
}) => {
  const { lock } = useKeyedCooldown(500);

  const handleDeliverTarget = (target: 'bar' | 'kitchen') => {
    if (!lock(`runner:target:${ticket.id}:${target}`)) return;
    onDeliverTarget(ticket, target);
  };

  const handleHandoff = () => {
    if (!lock(`runner:handoff:${ticket.id}`)) return;
    onHandoff(ticket);
  };
  const liveTimer = useLiveElapsedTimer(
    ticket.passReadyAt || ticket.createdAt,
    ticket.elapsedTime,
    'runner'
  );
  const progressPct =
    ticket.totalItemsCount > 0 ? (ticket.readyItemsCount / ticket.totalItemsCount) * 100 : 0;

  const readyBarCount = ticket.items.filter(
    (i) => i.stationTarget === 'bar' && i.status === 'ready'
  ).length;
  const readyKitchenCount = ticket.items.filter(
    (i) => i.stationTarget === 'kitchen' && i.status === 'ready'
  ).length;

  return (
    <View
      className={`rounded-2xl bg-white border p-4 gap-3.5 ${
        ticket.allDone ? 'border-emerald-300' : 'border-[#E2DED6]'
      }`}
    >
      {/* Buzzout Highlight Banner */}
      {ticket.allDone ? (
        <View className="flex-row items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
          <BellRing size={18} color="#065F46" />
          <Text className="text-base font-bold text-emerald-900">
            Full Order Ready for Delivery
          </Text>
        </View>
      ) : null}

      {/* Table Relocation Warning Banner */}
      {ticket.transferredFrom ? (
        <View className="flex-row items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
          <Repeat size={18} color="#B45309" />
          <Text className="text-base font-bold text-amber-900">
            Moved: {ticket.transferredFrom.tableCode} → {ticket.sourceTitle.split(' · ')[0]}
          </Text>
        </View>
      ) : null}

      {/* Header */}
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-pos-lg font-extrabold text-[#1A1617]" numberOfLines={1}>
            {ticket.sourceTitle}
          </Text>
          <Text className="text-base font-medium text-[#57534E]" numberOfLines={1}>
            {ticket.guestName}
          </Text>
          {ticket.orderType === 'takeout' && ticket.isPrepaid !== undefined ? (
            <View
              className={`self-start mt-1 px-2.5 py-0.5 rounded-lg border ${
                ticket.isPrepaid
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <Text
                className={`text-base font-bold ${
                  ticket.isPrepaid ? 'text-emerald-800' : 'text-amber-800'
                }`}
              >
                {ticket.isPrepaid ? 'Paid' : 'Due at Counter'}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1 shrink-0 ${
            liveTimer.urgency === 'late'
              ? 'bg-rose-50 border-rose-200'
              : liveTimer.urgency === 'warning'
                ? 'bg-amber-50 border-amber-200'
                : 'bg-[#EFECE6] border-[#E2DED6]'
          }`}
        >
          <Clock
            size={16}
            color={
              liveTimer.urgency === 'late'
                ? '#B91C1C'
                : liveTimer.urgency === 'warning'
                  ? '#B45309'
                  : '#57534E'
            }
          />
          <Text
            className={`text-base font-bold tabular-nums ${
              liveTimer.urgency === 'late'
                ? 'text-rose-800'
                : liveTimer.urgency === 'warning'
                  ? 'text-amber-800'
                  : 'text-[#1A1617]'
            }`}
          >
            {liveTimer.formattedTimer}
          </Text>
        </View>
      </View>

      {/* Assembly Progress Bar */}
      <View className="gap-1.5">
        <View className="h-2 bg-[#EFECE6] border border-[#E2DED6] rounded-full overflow-hidden">
          <View
            className={`h-full rounded-full ${ticket.allDone ? 'bg-emerald-500' : 'bg-[#810021]'}`}
            style={{ width: `${progressPct}%` }}
          />
        </View>
        <Text className="text-base font-semibold text-[#57534E] tabular-nums">
          {ticket.readyItemsCount}/{ticket.totalItemsCount} items ready
        </Text>
      </View>

      {/* Item Breakdown */}
      <RunnerTicketItemList
        items={ticket.items}
        onDeliverItem={onDeliverItem ? (item) => onDeliverItem(ticket, item) : undefined}
      />

      {/* Partial Station Delivery Actions */}
      {!ticket.allDone && (readyBarCount > 0 || readyKitchenCount > 0) ? (
        <View className="flex-row flex-wrap gap-2">
          {readyBarCount > 0 ? (
            <Pressable
              onPress={() => handleDeliverTarget('bar')}
              className="min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-[#EFECE6] border border-[#E2DED6] px-3 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel={`Deliver ready drinks for ${ticket.sourceTitle}`}
            >
              <Coffee size={18} color="#810021" />
              <Text className="text-base font-semibold text-[#1A1617]">
                Deliver Drinks ({readyBarCount})
              </Text>
            </Pressable>
          ) : null}

          {readyKitchenCount > 0 ? (
            <Pressable
              onPress={() => handleDeliverTarget('kitchen')}
              className="min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-[#EFECE6] border border-[#E2DED6] px-3 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel={`Deliver ready food for ${ticket.sourceTitle}`}
            >
              <Utensils size={18} color="#810021" />
              <Text className="text-base font-semibold text-[#1A1617]">
                Deliver Food ({readyKitchenCount})
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Full / Ready Handoff Action */}
      {ticket.readyOnlyCount > 0 ? (
        <Pressable
          onPress={handleHandoff}
          className={`min-h-[48px] w-full flex-row items-center justify-center gap-2 rounded-xl px-4 active:opacity-85 ${
            ticket.allDone ? 'bg-[#810021]' : 'bg-[#EFECE6] border border-[#E2DED6]'
          }`}
          accessibilityRole="button"
          accessibilityLabel={
            ticket.allDone
              ? ticket.orderType === 'dine_in'
                ? `Deliver round ${ticket.roundNumber || 1} to ${ticket.sourceTitle}`
                : `Complete hand-off for ${ticket.sourceTitle}`
              : `Deliver ${ticket.readyOnlyCount} ready items for ${ticket.sourceTitle}`
          }
        >
          <CheckCircle2 size={18} color={ticket.allDone ? '#F7F5F2' : '#1A1617'} />
          <Text
            className={`text-base font-semibold ${ticket.allDone ? 'text-white' : 'text-[#1A1617]'}`}
          >
            {ticket.allDone
              ? ticket.orderType === 'dine_in'
                ? `Deliver Round ${ticket.roundNumber || 1}`
                : 'Complete Hand-off'
              : `Deliver All Ready (${ticket.readyOnlyCount})`}
          </Text>
        </Pressable>
      ) : (
        <View className="min-h-[44px] w-full flex-row items-center justify-center rounded-xl bg-[#F7F5F2] border border-[#E2DED6] px-4">
          <Text className="text-base font-medium text-[#57534E]">Waiting on Station Prep...</Text>
        </View>
      )}
    </View>
  );
};
