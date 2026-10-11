import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore, ActiveRoleView } from '../store/useAuthStore';
import {
  Flame,
  LayoutGrid,
  ShieldAlert,
  Coffee,
  UtensilsCrossed,
  Wine,
  MessageSquare,
  Wifi,
  WifiOff,
} from 'lucide-react-native';

export const Header: React.FC = () => {
  const {
    currentUser,
    activeRoleView,
    setActiveRoleView,
    isOnline,
  } = useAuthStore();

  const roleViews: { id: ActiveRoleView; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'waiter_cashier',
      label: 'Waiter / Cashier',
      icon: <LayoutGrid size={15} color={activeRoleView === 'waiter_cashier' ? '#07090e' : '#9ca3af'} />,
      color: 'bg-jazz-gold',
    },
    {
      id: 'admin',
      label: 'Admin',
      icon: <ShieldAlert size={15} color={activeRoleView === 'admin' ? '#07090e' : '#9ca3af'} />,
      color: 'bg-purple-500',
    },
    {
      id: 'barista',
      label: 'Barista (Coffee)',
      icon: <Coffee size={15} color={activeRoleView === 'barista' ? '#07090e' : '#9ca3af'} />,
      color: 'bg-blue-400',
    },
    {
      id: 'kitchen',
      label: 'Kitchen (Food)',
      icon: <UtensilsCrossed size={15} color={activeRoleView === 'kitchen' ? '#07090e' : '#9ca3af'} />,
      color: 'bg-emerald-400',
    },
    {
      id: 'bartender',
      label: 'Bartender (Liquor)',
      icon: <Wine size={15} color={activeRoleView === 'bartender' ? '#07090e' : '#9ca3af'} />,
      color: 'bg-amber-400',
    },
    {
      id: 'chat',
      label: 'Team Chat',
      icon: <MessageSquare size={15} color={activeRoleView === 'chat' ? '#07090e' : '#9ca3af'} />,
      color: 'bg-indigo-400',
    },
  ];

  return (
    <View className="bg-jazz-950 border-b border-jazz-800 px-4 py-2.5 flex-row items-center justify-between">
      {/* Brand & Badge */}
      <View className="flex-row items-center space-x-3">
        <View className="w-9 h-9 rounded-xl bg-jazz-gold/10 border border-jazz-gold/30 items-center justify-center">
          <Flame size={20} color="#f59e0b" />
        </View>
        <View>
          <View className="flex-row items-center space-x-2">
            <Text className="text-white font-extrabold text-sm tracking-wide">
              MONK'S DREAM
            </Text>
            <View className="px-1.5 py-0.5 rounded bg-jazz-gold/20 border border-jazz-gold/40">
              <Text className="text-[9px] font-bold text-jazz-gold tracking-wider uppercase">
                JAZZ BAR POS
              </Text>
            </View>
          </View>
          <Text className="text-[11px] text-gray-400">
            {currentUser?.displayName} ({currentUser?.role})
          </Text>
        </View>
      </View>

      {/* Role & Station Navigation Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0 mx-2">
        <View className="flex-row items-center space-x-1.5 bg-jazz-900/80 p-1 rounded-xl border border-jazz-800">
          {roleViews.map((tab) => {
            const isActive = activeRoleView === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveRoleView(tab.id)}
                className={`flex-row items-center px-2.5 py-1.5 rounded-lg space-x-1.5 ${
                  isActive ? 'bg-jazz-gold shadow-sm' : 'bg-transparent'
                }`}
              >
                {tab.icon}
                <Text
                  className={`text-xs font-bold ${
                    isActive ? 'text-jazz-950' : 'text-gray-400'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* LAN Hub Status & Logout */}
      <View className="flex-row items-center space-x-2">
        <View
          className={`flex-row items-center px-2.5 py-1 rounded-full ${
            isOnline ? 'bg-emerald-950/70 border border-emerald-800' : 'bg-rose-950 border border-rose-800'
          }`}
        >
          {isOnline ? (
            <Wifi size={12} color="#10b981" />
          ) : (
            <WifiOff size={12} color="#f43f5e" />
          )}
          <Text
            className={`text-[11px] font-semibold ml-1.5 ${
              isOnline ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isOnline ? 'Hub LAN OK' : 'Offline Buffer'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={useAuthStore.getState().logout}
          className="flex-row items-center px-2 py-1 rounded-lg bg-jazz-850 border border-jazz-750"
        >
          <Text className="text-[10px] font-bold text-gray-300">Switch User</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
