import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Bike, CheckCircle2, UserCheck } from 'lucide-react-native';
import { OnlineDeliveryOrder } from '../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { useLiveElapsedTimer } from '@/features/shared/utils/elapsedTime';
import { useKeyedCooldown } from '@/features/shared/hooks/useAsyncAction';

interface OnlineDeliveryCardProps {
  order: OnlineDeliveryOrder;
  onPress: (order: OnlineDeliveryOrder) => void;
  onMarkReady?: (orderId: string) => void;
  onHandToRider?: (orderId: string) => void;
}

export const OnlineDeliveryCard: React.FC<OnlineDeliveryCardProps> = ({
  order,
  onPress,
  onMarkReady,
  onHandToRider,
}) => {
  const isGrab = order.platform === 'grabfood';
  const isReady = order.status === 'ready';
  const liveTimer = useLiveElapsedTimer(order.createdAt, order.elapsedTime, 'kitchen');
  const { lock } = useKeyedCooldown(500);

  const handleHandToRider = () => {
    if (!lock(`online:rider:${order.id}`)) return;
    onHandToRider?.(order.id);
  };

  const handleMarkReady = () => {
    if (!lock(`online:ready:${order.id}`)) return;
    onMarkReady?.(order.id);
  };

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
        accessibilityLabel={`Online delivery ${order.platform} ${order.platformOrderRef}`}
      >
        {/* 1. Top Row: Platform Order # & Rider + Quiet Status Badge */}
        <View className="flex-row items-start justify-between gap-2 mb-2.5">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5 mb-0.5">
              <Bike size={16} color="#810021" strokeWidth={2.2} />
              <Text className="text-base font-bold text-[#810021]">
                {isGrab ? 'Grab' : 'Panda'} #{order.platformOrderRef}
              </Text>
            </View>
            <Text className="text-pos-lg font-extrabold text-[#1A1617]" numberOfLines={1}>
              {order.customerName} · {order.riderName}
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

        {/* 2. Middle Row: Items Line + Amount & Paid Tag */}
        <View className="flex-row items-center justify-between border-t border-[#E2DED6]/80 pt-2.5 gap-3">
          <Text className="flex-1 text-base text-[#57534E]" numberOfLines={1}>
            {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
          </Text>
          <View className="items-end shrink-0">
            <Text className="text-pos-lg font-extrabold text-[#1A1617] tabular-nums">
              {formatCurrency(order.total)}
            </Text>
            <Text className="text-base font-bold text-emerald-700">Paid App</Text>
          </View>
        </View>
      </Pressable>

      {/* 3. Bottom Row: Direct Action (>= 48px) */}
      <View className="pt-2.5">
        {isReady ? (
          <Pressable
            onPress={handleHandToRider}
            className="min-h-[48px] w-full flex-row items-center justify-center gap-2 rounded-xl bg-[#810021] px-4 active:opacity-85"
            accessibilityRole="button"
            accessibilityLabel={`Hand over order ${order.platformOrderRef} to rider`}
          >
            <UserCheck size={18} color="#F7F5F2" strokeWidth={2.2} />
            <Text className="text-base font-semibold text-white">Rider Pickup</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleMarkReady}
            className="min-h-[48px] w-full flex-row items-center justify-center gap-2 rounded-xl bg-[#EFECE6] border border-[#E2DED6] px-4 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel={`Mark online order ${order.platformOrderRef} as ready`}
          >
            <CheckCircle2 size={18} color="#1A1617" strokeWidth={2.1} />
            <Text className="text-base font-semibold text-[#1A1617]">Mark Ready</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};
