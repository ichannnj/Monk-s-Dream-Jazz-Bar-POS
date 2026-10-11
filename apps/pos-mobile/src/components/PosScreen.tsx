import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useCartStore } from '../store/useCartStore';
import { INITIAL_MENU, INITIAL_TABLES, MenuItem, TableItem } from '../mockData';
import {
  Plus,
  Minus,
  Trash2,
  Send,
  Split,
  CreditCard,
  Banknote,
  Search,
  Sparkles,
  Percent,
} from 'lucide-react-native';

export const PosScreen: React.FC = () => {
  const {
    items: cartItems,
    selectedTableNumber,
    selectTable,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getCorkageTotal,
    getTotal,
  } = useCartStore();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tables, setTables] = useState<TableItem[]>(INITIAL_TABLES);
  const [orderSentBanner, setOrderSentBanner] = useState<string | null>(null);

  const categories = ['All', 'Cocktails', 'Coffee', 'Food', 'Corkage'];

  const filteredMenu = INITIAL_MENU.filter((item) => {
    const matchesCategory =
      activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSendOrder = () => {
    if (cartItems.length === 0) return;
    const orderSummary = `Order sent for Table ${selectedTableNumber}! Tickets dispatched to ${Array.from(
      new Set(cartItems.flatMap((i) => i.stations))
    ).join(', ')}`;
    
    // Update table status to occupied/preparing
    setTables((prev) =>
      prev.map((t) =>
        t.tableNumber === selectedTableNumber
          ? { ...t, status: 'PREPARING', totalCentavos: (t.totalCentavos || 0) + getTotal() }
          : t
      )
    );

    setOrderSentBanner(orderSummary);
    clearCart();
    setTimeout(() => setOrderSentBanner(null), 4000);
  };

  const formatPHP = (centavos: number) => {
    return `₱${(centavos / 100).toFixed(2)}`;
  };

  const getTableStatusBadge = (status: TableItem['status']) => {
    switch (status) {
      case 'EMPTY':
        return { text: 'Available', bg: 'bg-emerald-950/60', border: 'border-emerald-800', textCol: 'text-emerald-400' };
      case 'OCCUPIED':
        return { text: 'Occupied', bg: 'bg-blue-950/60', border: 'border-blue-800', textCol: 'text-blue-400' };
      case 'PREPARING':
        return { text: 'Cooking', bg: 'bg-amber-950/60', border: 'border-amber-800', textCol: 'text-amber-400' };
      case 'READY':
        return { text: 'Ready', bg: 'bg-green-950/60', border: 'border-green-600', textCol: 'text-green-300' };
      case 'SERVED':
        return { text: 'Served', bg: 'bg-indigo-950/60', border: 'border-indigo-800', textCol: 'text-indigo-400' };
      case 'BILL_REQUESTED':
        return { text: 'Bill Req', bg: 'bg-rose-950/60', border: 'border-rose-800', textCol: 'text-rose-400' };
      default:
        return { text: 'Open', bg: 'bg-gray-800', border: 'border-gray-700', textCol: 'text-gray-300' };
    }
  };

  return (
    <View className="flex-1 flex-row bg-jazz-950">
      {/* LEFT: Floor Layout & Table Selector */}
      <View className="w-64 border-r border-jazz-850 bg-jazz-900/60 p-3">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-black text-jazz-gold tracking-wide uppercase">
            Floor Plan & Tables
          </Text>
          <Text className="text-[11px] text-gray-500 font-medium">14 Seating Areas</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Main Jazz Floor
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {tables
              .filter((t) => t.section === 'main_floor')
              .map((table) => {
                const isSelected = selectedTableNumber === table.tableNumber;
                const badge = getTableStatusBadge(table.status);
                return (
                  <TouchableOpacity
                    key={table.id}
                    onPress={() => selectTable(table.tableNumber)}
                    className={`w-[70px] p-2 rounded-xl border ${
                      isSelected
                        ? 'bg-jazz-gold/20 border-jazz-gold shadow-md'
                        : `${badge.bg} ${badge.border}`
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-jazz-gold' : 'text-gray-200'
                      }`}
                    >
                      T-{table.tableNumber}
                    </Text>
                    <Text className={`text-[10px] ${badge.textCol} font-medium`}>
                      {badge.text}
                    </Text>
                    {table.totalCentavos ? (
                      <Text className="text-[9px] text-gray-400 mt-0.5">
                        {formatPHP(table.totalCentavos)}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
          </View>

          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Mezzanine & Lounge
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {tables
              .filter((t) => t.section === 'mezzanine')
              .map((table) => {
                const isSelected = selectedTableNumber === table.tableNumber;
                const badge = getTableStatusBadge(table.status);
                return (
                  <TouchableOpacity
                    key={table.id}
                    onPress={() => selectTable(table.tableNumber)}
                    className={`w-[70px] p-2 rounded-xl border ${
                      isSelected
                        ? 'bg-jazz-gold/20 border-jazz-gold shadow-md'
                        : `${badge.bg} ${badge.border}`
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-jazz-gold' : 'text-gray-200'
                      }`}
                    >
                      T-{table.tableNumber}
                    </Text>
                    <Text className={`text-[10px] ${badge.textCol} font-medium`}>
                      {badge.text}
                    </Text>
                    {table.totalCentavos ? (
                      <Text className="text-[9px] text-gray-400 mt-0.5">
                        {formatPHP(table.totalCentavos)}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
          </View>

          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Bar Counter
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-2">
            {tables
              .filter((t) => t.section === 'bar_counter')
              .map((table) => {
                const isSelected = selectedTableNumber === table.tableNumber;
                const badge = getTableStatusBadge(table.status);
                return (
                  <TouchableOpacity
                    key={table.id}
                    onPress={() => selectTable(table.tableNumber)}
                    className={`w-[70px] p-2 rounded-xl border ${
                      isSelected
                        ? 'bg-jazz-gold/20 border-jazz-gold'
                        : `${badge.bg} ${badge.border}`
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-jazz-gold' : 'text-gray-200'
                      }`}
                    >
                      B-{table.tableNumber - 10}
                    </Text>
                    <Text className={`text-[10px] ${badge.textCol} font-medium`}>
                      {badge.text}
                    </Text>
                    {table.totalCentavos ? (
                      <Text className="text-[9px] text-gray-400 mt-0.5">
                        {formatPHP(table.totalCentavos)}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
          </View>
        </ScrollView>
      </View>

      {/* CENTER: Menu Catalogue */}
      <View className="flex-1 p-4 bg-jazz-950">
        {orderSentBanner && (
          <View className="mb-3 p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl flex-row items-center justify-between">
            <View className="flex-row items-center space-x-2">
              <Sparkles size={18} color="#34d399" />
              <Text className="text-emerald-200 font-semibold text-xs">
                {orderSentBanner}
              </Text>
            </View>
          </View>
        )}

        {/* Search & Categories */}
        <View className="flex-row items-center justify-between mb-4 gap-3">
          <View className="flex-1 flex-row items-center bg-jazz-900 border border-jazz-800 rounded-xl px-3 py-2">
            <Search size={16} color="#9ca3af" />
            <TextInput
              placeholder="Search cocktails, bourbon, coffee, dishes..."
              placeholderTextColor="#6b7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 text-white text-xs"
            />
          </View>

          {/* Categories Tab Pill Bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
            <View className="flex-row space-x-2">
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  className={`px-3 py-2 rounded-xl border ${
                    activeCategory === cat
                      ? 'bg-jazz-gold border-jazz-gold shadow-sm'
                      : 'bg-jazz-900 border-jazz-800'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      activeCategory === cat ? 'text-jazz-950' : 'text-gray-400'
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Menu Grid */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap -mx-1.5">
            {filteredMenu.map((item) => (
              <View key={item.id} className="w-1/2 md:w-1/3 p-1.5">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    addItem({
                      menuItemId: item.id,
                      name: item.name,
                      price: item.price,
                      stations: item.stations,
                      isCorkageItem: item.isCorkage,
                    })
                  }
                  className="bg-jazz-900/90 border border-jazz-800 hover:border-jazz-700 p-3 rounded-2xl flex-col justify-between h-36"
                >
                  <View>
                    <View className="flex-row items-center justify-between mb-1">
                      <View className="flex-row items-center space-x-1">
                        {item.stations.map((st) => (
                          <View
                            key={st}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              st === 'bar'
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                                : st === 'cafe'
                                ? 'bg-blue-950/80 text-blue-400 border border-blue-800'
                                : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                            }`}
                          >
                            <Text
                              className={`text-[9px] font-bold ${
                                st === 'bar'
                                  ? 'text-amber-400'
                                  : st === 'cafe'
                                  ? 'text-blue-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {st}
                            </Text>
                          </View>
                        ))}
                        {item.isCorkage && (
                          <View className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800 flex-row items-center">
                            <Percent size={9} color="#c084fc" />
                            <Text className="text-[9px] font-bold text-purple-300 ml-0.5">
                              Corkage 20%
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <Text
                      numberOfLines={2}
                      className="text-white font-bold text-xs leading-4 mt-1"
                    >
                      {item.name}
                    </Text>
                    <Text
                      numberOfLines={2}
                      className="text-gray-400 text-[11px] leading-3.5 mt-1"
                    >
                      {item.description}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-jazz-850">
                    <Text className="text-jazz-gold font-extrabold text-sm">
                      {formatPHP(item.price)}
                    </Text>
                    <View className="w-7 h-7 rounded-lg bg-jazz-800 items-center justify-center">
                      <Plus size={14} color="#f59e0b" />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* RIGHT: Active Tab / Cart / Payment Desk */}
      <View className="w-80 border-l border-jazz-850 bg-jazz-900/90 flex-col justify-between p-4">
        {/* Cart Header */}
        <View>
          <View className="flex-row items-center justify-between pb-3 border-b border-jazz-800">
            <View>
              <Text className="text-white font-extrabold text-base">
                Table {selectedTableNumber || '—'}
              </Text>
              <Text className="text-xs text-jazz-gold font-medium">
                Live Order Tab
              </Text>
            </View>
            {cartItems.length > 0 && (
              <TouchableOpacity
                onPress={clearCart}
                className="flex-row items-center px-2 py-1 rounded bg-rose-950/40 border border-rose-900"
              >
                <Trash2 size={12} color="#f43f5e" />
                <Text className="text-rose-400 text-[10px] font-bold ml-1">
                  Clear
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cart Item List */}
          <ScrollView
            className="h-72 mt-3"
            showsVerticalScrollIndicator={false}
          >
            {cartItems.length === 0 ? (
              <View className="items-center justify-center h-52">
                <Text className="text-gray-500 text-xs text-center font-medium">
                  Tap dishes or drinks to build table order
                </Text>
              </View>
            ) : (
              cartItems.map((item) => (
                <View
                  key={item.cartItemId}
                  className="mb-2 p-2.5 rounded-xl bg-jazz-950/70 border border-jazz-800"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <Text className="text-white text-xs font-bold" numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.isCorkageItem && (
                        <Text className="text-[10px] text-purple-400 font-semibold">
                          +20% Corkage Applied
                        </Text>
                      )}
                      <Text className="text-jazz-gold text-xs font-semibold mt-0.5">
                        {formatPHP(item.price)}
                      </Text>
                    </View>

                    {/* Quantity Selector */}
                    <View className="flex-row items-center space-x-1.5 bg-jazz-900 p-1 rounded-lg border border-jazz-800">
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.cartItemId, -1)}
                        className="w-5 h-5 rounded items-center justify-center bg-jazz-800"
                      >
                        <Minus size={10} color="#e5e7eb" />
                      </TouchableOpacity>
                      <Text className="text-white text-xs font-bold px-1.5">
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.cartItemId, 1)}
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

        {/* Summary & Dispatch Action */}
        <View className="pt-3 border-t border-jazz-800">
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-400 text-xs">Subtotal</Text>
            <Text className="text-gray-200 text-xs font-medium">
              {formatPHP(getSubtotal())}
            </Text>
          </View>

          {getCorkageTotal() > 0 && (
            <View className="flex-row justify-between mb-1">
              <Text className="text-purple-400 text-xs font-medium">
                Corkage Fee (20%)
              </Text>
              <Text className="text-purple-400 text-xs font-semibold">
                {formatPHP(getCorkageTotal())}
              </Text>
            </View>
          )}

          <View className="flex-row justify-between mb-3 pt-2 border-t border-jazz-850">
            <Text className="text-white font-extrabold text-sm">Total Due</Text>
            <Text className="text-jazz-gold font-black text-base">
              {formatPHP(getTotal())}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="space-y-2">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSendOrder}
              disabled={cartItems.length === 0}
              className={`w-full py-3 rounded-xl flex-row items-center justify-center space-x-2 ${
                cartItems.length > 0
                  ? 'bg-jazz-gold shadow-lg shadow-jazz-gold/20'
                  : 'bg-jazz-800 opacity-60'
              }`}
            >
              <Send size={16} color="#07090e" />
              <Text className="text-jazz-950 font-black text-xs uppercase tracking-wider">
                Send to Station KDS
              </Text>
            </TouchableOpacity>

            <View className="flex-row space-x-2 mt-2">
              <TouchableOpacity className="flex-1 py-2 bg-jazz-850 border border-jazz-750 rounded-xl flex-row items-center justify-center space-x-1.5">
                <Split size={14} color="#f59e0b" />
                <Text className="text-xs font-bold text-gray-200">
                  Split Tab
                </Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-1 py-2 bg-jazz-850 border border-jazz-750 rounded-xl flex-row items-center justify-center space-x-1.5">
                <CreditCard size={14} color="#10b981" />
                <Text className="text-xs font-bold text-gray-200">
                  Pay Bill
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};
