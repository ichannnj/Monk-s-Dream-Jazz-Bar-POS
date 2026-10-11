import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { CartItem } from '../../../store/useCartStore';
import { Minus, Plus, Trash2, Send, Split, CreditCard } from 'lucide-react-native';

interface ActiveTabCartProps {
  tableNumber: number | null;
  items: CartItem[];
  subtotal: number;
  corkageTotal: number;
  total: number;
  onUpdateQty: (cartItemId: string, delta: number) => void;
  onClear: () => void;
  onSendOrder: () => void;
  onSplitTab?: () => void;
  onPayBill?: () => void;
}

export const ActiveTabCart: React.FC<ActiveTabCartProps> = ({
  tableNumber,
  items,
  subtotal,
  corkageTotal,
  total,
  onUpdateQty,
  onClear,
  onSendOrder,
  onSplitTab,
  onPayBill,
}) => {
  const formatPHP = (cents: number) => `₱${(cents / 100).toFixed(2)}`;

  return (
    <View className="flex-1 bg-jazz-900/90 border-l border-jazz-850 p-3.5 flex-col justify-between">
      {/* Top Header */}
      <View>
        <View className="flex-row items-center justify-between pb-2 border-b border-jazz-800">
          <View>
            <Text className="text-white font-extrabold text-sm">
              Table {tableNumber || '—'}
            </Text>
            <Text className="text-[10px] text-jazz-gold font-semibold">
              Live Tab (Waiter/Cashier)
            </Text>
          </View>

          {items.length > 0 && (
            <TouchableOpacity
              onPress={onClear}
              className="flex-row items-center px-2 py-1 rounded bg-rose-950/40 border border-rose-900"
            >
              <Trash2 size={11} color="#f43f5e" />
              <Text className="text-rose-400 text-[10px] font-bold ml-1">
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Item List */}
        <ScrollView className="h-64 mt-2" showsVerticalScrollIndicator={false}>
          {items.length === 0 ? (
            <View className="items-center justify-center h-48">
              <Text className="text-gray-500 text-xs text-center font-medium">
                No items added yet. Select cocktails, food, or coffee.
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <View
                key={item.cartItemId}
                className="mb-2 p-2 rounded-xl bg-jazz-950/80 border border-jazz-800"
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-1.5">
                    <Text className="text-white text-xs font-bold" numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.isCorkageItem && (
                      <Text className="text-[9px] text-purple-400 font-semibold">
                        +20% Corkage Fee Added
                      </Text>
                    )}
                    <Text className="text-jazz-gold text-xs font-bold mt-0.5">
                      {formatPHP(item.price)}
                    </Text>
                  </View>

                  <View className="flex-row items-center space-x-1 bg-jazz-900 p-0.5 rounded-lg border border-jazz-800">
                    <TouchableOpacity
                      onPress={() => onUpdateQty(item.cartItemId, -1)}
                      className="w-5 h-5 rounded items-center justify-center bg-jazz-800"
                    >
                      <Minus size={10} color="#e5e7eb" />
                    </TouchableOpacity>
                    <Text className="text-white text-xs font-bold px-1.5">
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() => onUpdateQty(item.cartItemId, 1)}
                      className="w-5 h-5 rounded items-center justify-center bg-jazz-800"
                    >
                      <Plus size={10} color="#e5e7eb" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Bill Computation & Cashier Controls */}
      <View className="pt-2 border-t border-jazz-800">
        <View className="flex-row justify-between mb-1">
          <Text className="text-gray-400 text-xs">Subtotal</Text>
          <Text className="text-gray-200 text-xs font-medium">
            {formatPHP(subtotal)}
          </Text>
        </View>

        {corkageTotal > 0 && (
          <View className="flex-row justify-between mb-1">
            <Text className="text-purple-400 text-xs font-medium">
              Corkage (20%)
            </Text>
            <Text className="text-purple-400 text-xs font-semibold">
              {formatPHP(corkageTotal)}
            </Text>
          </View>
        )}

        <View className="flex-row justify-between mb-2.5 pt-1.5 border-t border-jazz-850">
          <Text className="text-white font-black text-sm">Total</Text>
          <Text className="text-jazz-gold font-black text-base">
            {formatPHP(total)}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onSendOrder}
          disabled={items.length === 0}
          className={`w-full py-2.5 rounded-xl flex-row items-center justify-center space-x-1.5 mb-2 ${
            items.length > 0
              ? 'bg-jazz-gold shadow-md shadow-jazz-gold/20'
              : 'bg-jazz-800 opacity-60'
          }`}
        >
          <Send size={14} color="#07090e" />
          <Text className="text-jazz-950 font-black text-xs uppercase tracking-wider">
            Send To Stations
          </Text>
        </TouchableOpacity>

        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={onSplitTab}
            className="flex-1 py-2 bg-jazz-850 border border-jazz-750 rounded-xl flex-row items-center justify-center space-x-1"
          >
            <Split size={12} color="#f59e0b" />
            <Text className="text-xs font-bold text-gray-200">Split Tab</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onPayBill}
            className="flex-1 py-2 bg-jazz-850 border border-jazz-750 rounded-xl flex-row items-center justify-center space-x-1"
          >
            <CreditCard size={12} color="#10b981" />
            <Text className="text-xs font-bold text-gray-200">Cashier Pay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
