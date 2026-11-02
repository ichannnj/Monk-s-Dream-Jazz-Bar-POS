import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sun, Flame, Layers, LogOut } from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
import type { AdminRoute } from '../../domain/admin.types';

interface AdminHeaderProps {
  currentRoute: AdminRoute;
  operatingMode: 'CAFE' | 'EVENT';
  onToggleOperatingMode: () => void;
  onSwitchToFloor?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentRoute,
  operatingMode,
  onToggleOperatingMode,
  onSwitchToFloor,
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
        return 'Menu Catalog & Recipes';
      case 'inventory':
        return 'Inventory Hub (MAC)';
      case 'tables':
        return 'Table Floor Plan';
      case 'settings':
        return 'Venue Settings & Hardware';
      case 'staff':
        return 'Staff & Attendance';
      case 'sales':
        return 'Sales & Transactions';
      case 'attendance':
        return 'Attendance Records';
      default:
        return 'Admin Console';
    }
  };

  return (
    <View className="flex-row items-center justify-between border-b border-stone-200/80 bg-white px-8 py-3.5 shadow-xs">
      {/* Route Title & Online Status */}
      <View className="flex-row items-center space-x-3">
        <Text className="text-2xl font-bold tracking-tight text-stone-900">{getRouteTitle()}</Text>
        <View className="ml-3 flex-row items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
          <View className="h-2.5 w-2.5 rounded-full bg-emerald-500 mr-2" />
          <Text className="text-base font-semibold text-emerald-700">Online</Text>
        </View>
      </View>

      {/* Right Controls: Time, Mode Switcher, Floor POS Switcher, Profile, Lock */}
      <View className="flex-row items-center space-x-3">
        {/* Date Time */}
        <Text className="text-base font-medium text-stone-600 mr-2">{currentTimeStr}</Text>

        {/* Operating Mode Toggle (Cafe vs Event) */}
        <Pressable
          onPress={onToggleOperatingMode}
          className={`min-h-[48px] flex-row items-center rounded-xl px-4 py-2 active:opacity-85 ${
            operatingMode === 'EVENT' ? 'bg-amber-600' : 'bg-sky-600'
          }`}
        >
          {operatingMode === 'EVENT' ? (
            <Flame size={18} color="#ffffff" />
          ) : (
            <Sun size={18} color="#ffffff" />
          )}
          <Text className="ml-2 text-base font-bold text-white">
            {operatingMode === 'EVENT' ? 'Event Mode' : 'Cafe Mode'}
          </Text>
        </Pressable>

        {/* Switch to Floor Workspace POS */}
        {onSwitchToFloor && (
          <Pressable
            onPress={onSwitchToFloor}
            className="min-h-[48px] flex-row items-center rounded-xl border border-stone-300 bg-white px-4 py-2 active:bg-stone-50"
          >
            <Layers size={18} color="#44403c" />
            <Text className="ml-2 text-base font-bold text-stone-800">Floor POS</Text>
          </Pressable>
        )}

        {/* Dynamic Staff Profile Pill */}
        <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-1.5 min-h-[48px]">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-[#800020]/15 border border-[#800020]/30">
            <Text className="text-base font-black text-[#800020]">{staffInitials}</Text>
          </View>
          <View className="ml-2.5">
            <Text className="text-base font-bold text-stone-800 leading-tight">{staffName}</Text>
            <Text className="text-sm font-medium text-stone-500">{staffRole}</Text>
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
