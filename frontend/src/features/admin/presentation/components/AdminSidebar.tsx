import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  LayoutGrid,
  Activity,
  MessageSquare,
  Utensils,
  Package,
  Users,
  Receipt,
  Clock,
  CalendarDays,
  Music,
  Settings,
  Shield,
} from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
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
  const { currentUser } = useAuthStore();
  const staffName = currentUser?.displayName || 'Dana Cruz';
  const staffInitials =
    staffName
      .split(' ')
      .filter(Boolean)
      .map((p: string) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'DC';
  const staffRole = currentUser?.role
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : 'Admin / Manager';

  const operationsItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'stations', label: 'Live Stations', icon: Activity },
    { id: 'chats', label: 'Team Chats', icon: MessageSquare, badgeCount: unreadChatCount },
  ];

  const manageItems: NavItem[] = [
    { id: 'menu', label: 'Menu Catalog', icon: Utensils },
    { id: 'inventory', label: 'Inventory Hub', icon: Package },
    { id: 'events', label: 'Event Logistics', icon: CalendarDays },
    { id: 'tables', label: 'Table Layout', icon: LayoutGrid },
    { id: 'staff', label: 'Staff Roster', icon: Users },
  ];

  const reportItems: NavItem[] = [
    { id: 'sales', label: 'Sales & Transactions', icon: Receipt },
    { id: 'attendance', label: 'Attendance & Payroll', icon: Clock },
    { id: 'settings', label: 'Venue Settings', icon: Settings },
    { id: 'profile', label: 'My Profile & Security', icon: Shield },
  ];

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <View className="mb-4">
      <Text className="mb-1.5 px-3 text-[11px] font-bold tracking-widest text-white/60 uppercase">
        {title}
      </Text>
      <View className="space-y-1">
        {items.map((item) => {
          const isActive = currentRoute === item.id;
          const IconComponent = item.icon;
          return (
            <Pressable
              key={item.id}
              onPress={() => onRouteChange(item.id)}
              className={`min-h-[42px] flex-row items-center justify-between rounded-xl px-3 py-2 transition-all ${
                isActive ? 'bg-white/20 shadow-sm' : 'hover:bg-white/10 active:bg-white/15'
              }`}
            >
              <View className="flex-row items-center space-x-3 flex-1 min-w-0">
                <IconComponent size={18} color={isActive ? '#ffffff' : '#f5d5dc'} />
                <Text
                  numberOfLines={1}
                  className={`ml-2.5 text-sm ${
                    isActive ? 'font-bold text-white' : 'font-medium text-white/85'
                  }`}
                >
                  {item.label}
                </Text>
              </View>

              {item.badgeCount && item.badgeCount > 0 ? (
                <View className="rounded-full bg-rose-600 px-2 py-0.5 ml-2">
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
      className="hidden lg:flex w-64 flex-col justify-between border-r border-white/10 p-5 shadow-2xl h-full"
      style={{ backgroundColor: '#4A1020E0' }}
    >
      {/* Brand Header */}
      <View className="mb-5 flex-row items-center px-1 pt-1 flex-shrink-0">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/20 p-2 border border-white/25">
          <Music size={22} color="#ffffff" />
        </View>
        <View className="ml-3 flex-1 min-w-0">
          <Text
            className="font-serif text-lg font-bold tracking-tight text-white"
            numberOfLines={1}
          >
            Monk's Dream
          </Text>
          <Text className="text-xs font-medium tracking-wide text-white/70" numberOfLines={1}>
            Admin Console
          </Text>
        </View>
      </View>

      {/* Navigation Sections with ScrollView to prevent overlap on smaller heights */}
      <ScrollView
        className="flex-1 -mr-2 pr-2"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        {renderNavGroup('Operations', operationsItems)}
        {renderNavGroup('Manage', manageItems)}
        {renderNavGroup('Reports', reportItems)}
      </ScrollView>

      {/* Dynamic Staff Profile Footer - strictly pinned and fixed */}
      <Pressable
        onPress={() => onRouteChange('profile')}
        className="border-t border-white/15 pt-3 pb-1 mt-2 flex-shrink-0 active:opacity-85"
        accessibilityLabel="Navigate to My Profile & Security"
      >
        <View className="flex-row items-center px-1 py-1">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-black/30 border border-white/25 flex-shrink-0">
            <Text className="text-sm font-black text-white">{staffInitials}</Text>
          </View>
          <View className="ml-3 flex-1 min-w-0">
            <Text numberOfLines={1} className="text-sm font-bold text-white">
              {staffName}
            </Text>
            <Text numberOfLines={1} className="text-xs font-medium text-white/70">
              {staffRole}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
};
