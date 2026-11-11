import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
    <View style={localStyles.container}>
      <Pressable
        onPress={onOpenCart}
        style={({ pressed }) => [localStyles.basketButton, pressed && { opacity: 0.9 }]}
        accessibilityRole="button"
        accessibilityLabel="Open order basket"
      >
        <View style={localStyles.basketLeft}>
          <ShoppingBag size={18} color="#ffffff" />
          <Text style={localStyles.basketText}>Basket ({totalCartQty})</Text>
        </View>
        <Text style={localStyles.basketPrice}>{formatCurrency(grandTotal)}</Text>
      </Pressable>

      {totalCartQty > 0 ? (
        <Pressable
          onPress={onOpenConfirm}
          style={({ pressed }) => [localStyles.sendButton, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
          accessibilityLabel="Send Order"
        >
          <Text style={localStyles.sendButtonText}>Send</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e7e5e4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  basketButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#1c1917',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  basketLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  basketText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  basketPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fcd34d',
  },
  sendButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#810021',
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
