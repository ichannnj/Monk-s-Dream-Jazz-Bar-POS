import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LayoutGrid, Activity, MessageSquare, Menu } from 'lucide-react-native';
import type { AdminRoute } from '../../domain/admin.types';

interface AdminBottomNavProps {
  currentRoute: AdminRoute;
  onRouteChange: (route: AdminRoute) => void;
  onOpenDrawer: () => void;
  unreadChatCount?: number;
}

export const AdminBottomNav: React.FC<AdminBottomNavProps> = ({
  currentRoute,
  onRouteChange,
  onOpenDrawer,
  unreadChatCount = 3,
}) => {
  const isMoreActive = !['dashboard', 'stations', 'chats'].includes(currentRoute);

  const tabs = [
    {
      id: 'dashboard' as AdminRoute,
      label: 'Dashboard',
      icon: LayoutGrid,
      isActive: currentRoute === 'dashboard',
      onPress: () => onRouteChange('dashboard'),
    },
    {
      id: 'stations' as AdminRoute,
      label: 'Stations',
      icon: Activity,
      isActive: currentRoute === 'stations',
      onPress: () => onRouteChange('stations'),
    },
    {
      id: 'chats' as AdminRoute,
      label: 'Chats',
      icon: MessageSquare,
      badgeCount: unreadChatCount,
      isActive: currentRoute === 'chats',
      onPress: () => onRouteChange('chats'),
    },
    {
      id: 'more' as const,
      label: 'Menu',
      icon: Menu,
      isActive: isMoreActive,
      onPress: onOpenDrawer,
    },
  ];

  return (
    <View
      className="flex-row items-center justify-around border-t border-stone-200 bg-white px-2 py-1 shadow-lg"
      style={{
        paddingBottom: 6,
      }}
    >
      {tabs.map((tab) => {
        const IconComp = tab.icon;
        const active = tab.isActive;

        return (
          <Pressable
            key={tab.label}
            onPress={tab.onPress}
            className={`flex-1 min-h-[48px] items-center justify-center py-1.5 rounded-xl transition-all ${
              active ? 'bg-[#6e1d2c]/10' : 'active:bg-stone-100'
            }`}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
          >
            <View className="relative items-center justify-center">
              <IconComp size={22} color={active ? '#6e1d2c' : '#78716c'} />
              {tab.badgeCount && tab.badgeCount > 0 ? (
                <View className="absolute -top-1.5 -right-3 h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 border border-white">
                  <Text className="text-base font-extrabold text-white leading-none">
                    {tab.badgeCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              className={`mt-1 text-base leading-none ${
                active ? 'font-bold text-[#6e1d2c]' : 'font-medium text-stone-600'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
