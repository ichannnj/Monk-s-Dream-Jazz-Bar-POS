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
    <View className="flex-row items-center justify-between border-b border-stone-200/80 bg-white px-8 py-4 shadow-xs">
      {/* Route Title & Online Status */}
      <View className="flex-row items-center space-x-3">
        <Text className="text-2xl font-bold tracking-tight text-stone-900">{getRouteTitle()}</Text>
        <View className="ml-3 flex-row items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5">
          <View className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />
          <Text className="text-xs font-semibold text-emerald-700">Online</Text>
        </View>
      </View>

      {/* Right Controls: Time, Mode Switcher, Floor POS Switcher, Profile, Lock */}
      <View className="flex-row items-center space-x-4">
        {/* Date Time */}
        <Text className="text-sm font-medium text-stone-500 mr-2">{currentTimeStr}</Text>

        {/* Operating Mode Toggle (Cafe vs Event) */}
        <Pressable
          onPress={onToggleOperatingMode}
          className={`min-h-[40px] flex-row items-center rounded-xl px-3 py-1.5 active:opacity-85 ${
            operatingMode === 'EVENT' ? 'bg-amber-600' : 'bg-sky-600'
          }`}
        >
          {operatingMode === 'EVENT' ? (
            <Flame size={16} color="#ffffff" />
          ) : (
            <Sun size={16} color="#ffffff" />
          )}
          <Text className="ml-1.5 text-xs font-bold text-white">
            {operatingMode === 'EVENT' ? 'Event Mode' : 'Cafe Mode'}
          </Text>
        </Pressable>

        {/* Switch to Floor Workspace POS */}
        {onSwitchToFloor && (
          <Pressable
            onPress={onSwitchToFloor}
            className="min-h-[40px] flex-row items-center rounded-xl border border-stone-300 bg-white px-3 py-1.5 active:bg-stone-50"
          >
            <Layers size={16} color="#44403c" />
            <Text className="ml-1.5 text-xs font-semibold text-stone-800">Floor POS</Text>
          </Pressable>
        )}

        {/* Dana Cruz Profile Pill */}
        <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-1.5">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-rose-100 border border-rose-200">
            <Text className="text-xs font-bold text-rose-800">DC</Text>
          </View>
          <View className="ml-2.5">
            <Text className="text-sm font-bold text-stone-800">Dana Cruz</Text>
            <Text className="text-xs text-stone-500">Admin / Manager</Text>
          </View>
        </View>

        {/* Logout / Lock Button */}
        <Pressable
          onPress={logout}
          className="min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 active:bg-red-50"
        >
          <LogOut size={16} color="#dc2626" />
        </Pressable>
      </View>
    </View>
  );
};
