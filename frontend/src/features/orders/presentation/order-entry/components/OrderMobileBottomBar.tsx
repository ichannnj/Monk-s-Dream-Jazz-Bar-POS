import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';

export interface OrderMobileBottomBarProps {
  totalCartQty: number;
  grandTotal: number;
  onOpenCart: () => void;
  onOpenConfirm: () => void;
}

export const OrderMobileBottomBar: React.FC<OrderMobileBottomBarProps> = ({
  totalCartQty,
  grandTotal,
  onOpenCart,
  onOpenConfirm,
}) => {
  return (
    <View className="bg-white border-t border-stone-200 px-4 py-3 flex-row items-center justify-between gap-3">
      <Pressable
        onPress={onOpenCart}
        className="flex-1 min-h-[48px] rounded-xl bg-stone-900 px-4 py-2.5 flex-row items-center justify-between active:opacity-90"
        accessibilityRole="button"
        accessibilityLabel="Open order basket"
      >
        <View className="flex-row items-center gap-2">
          <ShoppingBag size={18} color="#ffffff" />
          <Text className="text-base font-bold text-white">Basket ({totalCartQty})</Text>
        </View>
        <Text className="text-base font-extrabold text-amber-300">
          {formatCurrency(grandTotal)}
        </Text>
      </Pressable>

      {totalCartQty > 0 ? (
        <Pressable
          onPress={onOpenConfirm}
          className="min-h-[48px] rounded-xl bg-[#800020] px-5 items-center justify-center active:opacity-90"
          accessibilityRole="button"
          accessibilityLabel="Send Order"
        >
          <Text className="text-base font-extrabold text-white">Send</Text>
        </Pressable>
      ) : null}
    </View>
  );
};
