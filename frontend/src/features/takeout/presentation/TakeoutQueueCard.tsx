import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ShoppingBag, CheckCircle2, PackageCheck, CreditCard } from 'lucide-react-native';
import { TakeoutOrder } from '../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { useLiveElapsedTimer } from '@/features/shared/utils/elapsedTime';

interface TakeoutQueueCardProps {
  order: TakeoutOrder;
  onPress: (order: TakeoutOrder) => void;
  onPayTakeout?: (order: TakeoutOrder, collectAfterPay?: boolean) => void;
  onMarkReady?: (orderId: string) => void;
  onMarkCollected?: (orderId: string) => void;
}

export const TakeoutQueueCard: React.FC<TakeoutQueueCardProps> = ({
  order,
  onPress,
  onPayTakeout,
  onMarkReady,
  onMarkCollected,
}) => {
  const isReady = order.status === 'ready';
  const liveTimer = useLiveElapsedTimer(order.createdAt, order.elapsedTime, 'bar');

  return (
    <View
      className={`min-h-[188px] sm:min-h-[216px] justify-between rounded-2xl bg-white border p-4 ${
        isReady ? 'border-emerald-300' : 'border-amber-300'
      }`}
    >
      <Pressable
        onPress={() => onPress(order)}
        className="flex-1 justify-between active:opacity-85"
        accessibilityRole="button"
        accessibilityLabel={`Takeout ticket ${order.ticketNumber} for ${order.customerName}`}
      >
        {/* 1. Top Row: Ticket Code & Customer + Quiet Status Badge */}
        <View className="flex-row items-start justify-between gap-2 mb-2.5">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5 mb-0.5">
              <ShoppingBag size={16} color="#810021" strokeWidth={2.2} />
              <Text className="text-base font-bold text-[#810021]">
                Takeout #{order.ticketNumber}
              </Text>
            </View>
            <Text className="text-pos-lg font-extrabold text-[#1C1917]" numberOfLines={1}>
              {order.customerName}
            </Text>
          </View>

          <View
            className={`shrink-0 flex-row items-center gap-1.5 rounded-full border px-3 py-1 ${
              isReady ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <View
              className={`h-2 w-2 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
            <Text
              className={`text-base font-semibold ${
                isReady ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              {isReady ? 'Ready' : 'Prep'}
            </Text>
            <Text
              className={`text-base font-semibold tabular-nums ${
                isReady ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              · {liveTimer.formattedTimer}
            </Text>
          </View>
        </View>

        {/* 2. Middle Row: Items Line + Amount & Payment Flag */}
        <View className="flex-row items-center justify-between border-t border-[#E7E5E4]/80 pt-2.5 gap-3">
          <Text className="flex-1 text-base text-[#57534E]" numberOfLines={1}>
            {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
          </Text>
          <View className="items-end shrink-0">
            <Text className="text-pos-lg font-extrabold text-[#1C1917] tabular-nums">
              {formatCurrency(order.total)}
            </Text>
            <Text
              className={`text-base font-bold ${
                order.isPrepaid ? 'text-[#810021]' : 'text-[#57534E]'
              }`}
            >
              {order.isPrepaid ? 'Paid' : 'Due'}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* 3. Bottom Row: Direct Action (>= 48px) */}
      <View className="pt-2.5">
        {isReady ? (
          order.isPrepaid ? (
            <Pressable
              onPress={() => onMarkCollected?.(order.id)}
              className="min-h-[48px] w-full flex-row items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-300 px-4 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel={`Mark order ${order.ticketNumber} as collected`}
            >
              <PackageCheck size={18} color="#065F46" strokeWidth={2.2} />
              <Text className="text-base font-semibold text-emerald-900">Collected</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() =>
                onPayTakeout ? onPayTakeout(order, true) : onMarkCollected?.(order.id)
              }
              className="min-h-[48px] w-full flex-row items-center justify-center gap-2 rounded-xl bg-[#810021] px-4 active:opacity-85"
              accessibilityRole="button"
              accessibilityLabel={`Pay and collect order ${order.ticketNumber}`}
            >
              <CreditCard size={18} color="#F5F5F5" strokeWidth={2.2} />
              <Text className="text-base font-semibold text-white">Pay &amp; Collect</Text>
            </Pressable>
          )
        ) : !order.isPrepaid && onPayTakeout ? (
          <View className="flex-row gap-2.5">
            <Pressable
              onPress={() => onPayTakeout(order, false)}
              className="min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-white border border-[#E7E5E4] px-3 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel={`Collect payment now for order ${order.ticketNumber}`}
            >
              <CreditCard size={18} color="#810021" strokeWidth={2.1} />
              <Text className="text-base font-semibold text-[#810021]">Pay Now</Text>
            </Pressable>
            <Pressable
              onPress={() => onMarkReady?.(order.id)}
              className="min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] px-3 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel={`Mark order ${order.ticketNumber} as ready`}
            >
              <CheckCircle2 size={18} color="#1C1917" strokeWidth={2.1} />
              <Text className="text-base font-semibold text-[#1C1917]">Mark Ready</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => onMarkReady?.(order.id)}
            className="min-h-[48px] w-full flex-row items-center justify-center gap-2 rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] px-4 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel={`Mark order ${order.ticketNumber} as ready`}
          >
            <CheckCircle2 size={18} color="#1C1917" strokeWidth={2.1} />
            <Text className="text-base font-semibold text-[#1C1917]">Mark Ready</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};
