import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  LayoutGrid,
  Activity,
  MessageSquare,
  Utensils,
  Package,
  Users,
  Receipt,
  Clock,
  Music,
} from 'lucide-react-native';
import type { AdminRoute } from '../../domain/admin.types';

interface AdminSidebarProps {
  currentRoute: AdminRoute;
  onRouteChange: (route: AdminRoute) => void;
  unreadChatCount?: number;
}

interface NavItem {
  id: AdminRoute;
  label: string;
  icon: React.FC<{ size: number; color: string }>;
  badgeCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentRoute,
  onRouteChange,
  unreadChatCount = 3,
}) => {
  const operationsItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'stations', label: 'Live Stations', icon: Activity },
    { id: 'chats', label: 'Team Chats', icon: MessageSquare, badgeCount: unreadChatCount },
  ];

  const manageItems: NavItem[] = [
    { id: 'menu', label: 'Menu', icon: Utensils },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'staff', label: 'Staff', icon: Users },
  ];

  const reportItems: NavItem[] = [
    { id: 'sales', label: 'Sales & Transactions', icon: Receipt },
    { id: 'attendance', label: 'Attendance', icon: Clock },
  ];

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <View className="mb-7">
      <Text className="mb-3 px-3 text-xs font-bold tracking-widest text-white/60 uppercase">
        {title}
      </Text>
      <View className="space-y-1.5">
        {items.map((item) => {
          const isActive = currentRoute === item.id;
          const IconComponent = item.icon;
          return (
            <Pressable
              key={item.id}
              onPress={() => onRouteChange(item.id)}
              className={`min-h-[48px] flex-row items-center justify-between rounded-xl px-3.5 py-3 transition-all ${
                isActive ? 'bg-white/20 shadow-sm' : 'hover:bg-white/10 active:bg-white/15'
              }`}
            >
              <View className="flex-row items-center space-x-3">
                <IconComponent size={20} color={isActive ? '#ffffff' : '#f5d5dc'} />
                <Text
                  className={`ml-3 text-base ${
                    isActive ? 'font-bold text-white' : 'font-medium text-white/85'
                  }`}
                >
                  {item.label}
                </Text>
              </View>

              {item.badgeCount && item.badgeCount > 0 ? (
                <View className="rounded-full bg-rose-600 px-2 py-0.5">
                  <Text className="text-xs font-bold text-white">{item.badgeCount}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View
      className="w-64 flex-col justify-between border-r border-white/10 p-5 shadow-2xl"
      style={{ backgroundColor: '#4A1020E0' }}
    >
      <View>
        {/* Brand Header */}
        <View className="mb-8 flex-row items-center px-1 pt-1">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/20 p-2 border border-white/25">
            <Music size={22} color="#ffffff" />
          </View>
          <View className="ml-3">
            <Text className="font-serif text-lg font-bold tracking-tight text-white">
              Monk's Dream
            </Text>
            <Text className="text-xs font-medium tracking-wide text-white/70">Admin Console</Text>
          </View>
        </View>

        {/* Navigation Sections */}
        {renderNavGroup('Operations', operationsItems)}
        {renderNavGroup('Manage', manageItems)}
        {renderNavGroup('Reports', reportItems)}
      </View>

      {/* Dana Cruz / User Profile Footer */}
      <View className="border-t border-white/15 pt-5 pb-1">
        <View className="flex-row items-center px-2 py-1">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-black/30 border border-white/25">
            <Text className="text-sm font-bold text-white">DC</Text>
          </View>
          <View className="ml-3">
            <Text className="text-base font-semibold text-white">Dana Cruz</Text>
            <Text className="text-xs text-white/70">Admin / Manager</Text>
          </View>
        </View>
      </View>
    </View>
  );
};
