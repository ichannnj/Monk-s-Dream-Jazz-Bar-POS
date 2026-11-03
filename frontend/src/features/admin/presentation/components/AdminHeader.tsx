import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sun, Flame, Layers, LogOut, Menu } from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
import type { AdminRoute } from '../../domain/admin.types';

interface AdminHeaderProps {
  currentRoute: AdminRoute;
  operatingMode: 'CAFE' | 'EVENT';
  onToggleOperatingMode: () => void;
  onSwitchToFloor?: () => void;
  onOpenDrawer?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentRoute,
  operatingMode,
  onToggleOperatingMode,
  onSwitchToFloor,
  onOpenDrawer,
}) => {
  const { logout } = useAuthStore();
  const [currentTimeStr, setCurrentTimeStr] = useState('Tue, Oct 6 - 3:00 PM');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };
      // Format e.g. "Tue, Oct 6 - 3:00 PM"
      const formatted = now.toLocaleDateString('en-US', options).replace(/,([^,]*)$/, ' -$1');
      setCurrentTimeStr(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const getRouteTitle = () => {
    switch (currentRoute) {
      case 'dashboard':
        return 'Dashboard';
      case 'stations':
        return 'Live Stations';
      case 'chats':
        return 'Team Chats';
      case 'menu':
        return 'Menu Catalog';
      case 'inventory':
        return 'Inventory Hub';
      case 'tables':
        return 'Table Floor Plan';
      case 'settings':
        return 'Venue Settings';
      case 'staff':
        return 'Staff & Attendance';
      case 'sales':
        return 'Sales & Reports';
      case 'attendance':
        return 'Attendance';
      default:
        return 'Admin Console';
    }
  };

  return (
    <View className="w-full flex-row items-center justify-between border-b border-stone-200/80 bg-white px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 shadow-xs gap-2">
      {/* Route Title & Mobile Hamburger & Online Status */}
      <View className="flex-row items-center gap-2 sm:gap-3 flex-1 min-w-0">
        {onOpenDrawer && (
          <Pressable
            onPress={onOpenDrawer}
            className="min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200 lg:hidden"
            accessibilityLabel="Open Navigation Menu"
          >
            <Menu size={22} color="#44403c" />
          </Pressable>
        )}

        <Text
          className="text-lg sm:text-2xl font-bold tracking-tight text-stone-900 shrink"
          numberOfLines={1}
        >
          {getRouteTitle()}
        </Text>

        {/* Compact Online Dot on Mobile, Pill on Tablet/Desktop */}
        <View className="shrink-0 flex-row items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 sm:px-3 py-1">
          <View className="h-2.5 w-2.5 rounded-full bg-emerald-500 sm:mr-1.5" />
          <Text className="hidden sm:flex text-base font-semibold text-emerald-700">Online</Text>
        </View>
      </View>

      {/* Right Controls: Mode Switcher, Floor POS Switcher, Time, Profile, Logout */}
      <View className="flex-row items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Date Time (Extra Large Desktop Only) */}
        <Text className="hidden xl:flex text-base font-medium text-stone-600 mr-1">
          {currentTimeStr}
        </Text>

        {/* Operating Mode Toggle (Cafe vs Event) */}
        <Pressable
          onPress={onToggleOperatingMode}
          className={`min-h-[48px] min-w-[48px] flex-row items-center justify-center rounded-xl px-3 sm:px-4 active:opacity-85 ${
            operatingMode === 'EVENT' ? 'bg-amber-600' : 'bg-sky-600'
          }`}
          accessibilityLabel={`Switch to ${operatingMode === 'EVENT' ? 'Cafe' : 'Event'} Mode`}
        >
          {operatingMode === 'EVENT' ? (
            <Flame size={20} color="#ffffff" />
          ) : (
            <Sun size={20} color="#ffffff" />
          )}
          <Text className="hidden md:flex ml-2 text-base font-bold text-white">
            {operatingMode === 'EVENT' ? 'Event Mode' : 'Cafe Mode'}
          </Text>
        </Pressable>

        {/* Switch to Floor Workspace POS */}
        {onSwitchToFloor && (
          <Pressable
            onPress={onSwitchToFloor}
            className="min-h-[48px] min-w-[48px] flex-row items-center justify-center rounded-xl border border-stone-300 bg-white px-3 sm:px-4 active:bg-stone-50"
            accessibilityLabel="Switch to Floor POS"
          >
            <Layers size={20} color="#44403c" />
            <Text className="hidden md:flex ml-2 text-base font-bold text-stone-800">
              Floor POS
            </Text>
          </Pressable>
        )}

        {/* Dynamic Staff Profile Pill (Extra Large Desktop Only) */}
        <View className="hidden xl:flex flex-row items-center rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-1.5 min-h-[48px]">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-[#800020]/15 border border-[#800020]/30">
            <Text className="text-base font-black text-[#800020]">{staffInitials}</Text>
          </View>
          <View className="ml-2.5">
            <Text className="text-base font-bold text-stone-800 leading-tight">{staffName}</Text>
            <Text className="text-base font-medium text-stone-500">{staffRole}</Text>
          </View>
        </View>

        {/* Logout / Lock Button */}
        <Pressable
          onPress={logout}
          className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-stone-200 bg-stone-50 px-3 active:bg-red-50"
          accessibilityRole="button"
          accessibilityLabel="Log out of admin console"
        >
          <LogOut size={20} color="#dc2626" />
        </Pressable>
      </View>
    </View>
  );
};
