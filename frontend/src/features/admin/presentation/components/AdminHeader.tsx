import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sun, Flame, Layers, LogOut, Clock } from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
import {
  getStaffFirstName,
  getStaffInitials,
  getStaffRoleLabel,
} from '@/features/shared/utils/staffHelpers';
import type { AdminRoute } from '../../domain/admin.types';

interface AdminHeaderProps {
  currentRoute: AdminRoute;
  operatingMode: 'CAFE' | 'EVENT';
  onToggleOperatingMode: () => void;
  onSwitchToFloor?: () => void;
  onOpenDrawer?: () => void;
  onNavigateProfile?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentRoute: _currentRoute,
  operatingMode,
  onToggleOperatingMode,
  onSwitchToFloor,
  onOpenDrawer: _onOpenDrawer,
  onNavigateProfile,
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
      // Format e.g. "Thu, Nov 5 - 4:18 PM"
      const formatted = now.toLocaleDateString('en-US', options).replace(/,([^,]*)$/, ' -$1');
      setCurrentTimeStr(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const { currentUser } = useAuthStore();
  const staffFullName = currentUser?.displayName || 'Dana Cruz';
  const staffFirstName = useMemo(() => getStaffFirstName(staffFullName), [staffFullName]);
  const staffInitials = useMemo(() => getStaffInitials(staffFullName), [staffFullName]);
  const staffRole = useMemo(
    () => getStaffRoleLabel(currentUser?.role || 'admin'),
    [currentUser?.role]
  );

  return (
    <View className="w-full flex-row items-center justify-center border-b border-stone-200/90 bg-white/95 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 shadow-xs backdrop-blur-md">
      {/* Centered Controls Container */}
      <View className="flex-row items-center justify-center gap-2 sm:gap-3 max-w-full">
        {/* Date Time Indicator */}
        <View className="hidden md:flex flex-row items-center gap-2 rounded-xl bg-stone-100/80 border border-stone-200/90 px-3.5 py-2 h-11">
          <Clock size={15} color="#57534e" />
          <Text className="text-xs lg:text-sm font-semibold text-stone-700 tracking-tight">
            {currentTimeStr}
          </Text>
        </View>

        {/* Operating Mode Toggle (Cafe vs Event) */}
        <Pressable
          onPress={onToggleOperatingMode}
          className={`h-11 px-3.5 sm:px-4 flex-row items-center justify-center rounded-xl shadow-xs border transition-all active:scale-[0.98] ${
            operatingMode === 'EVENT'
              ? 'bg-amber-600 border-amber-700/30'
              : 'bg-sky-600 border-sky-700/30'
          }`}
          accessibilityLabel={`Switch to ${operatingMode === 'EVENT' ? 'Cafe' : 'Event'} Mode`}
        >
          {operatingMode === 'EVENT' ? (
            <Flame size={17} color="#ffffff" />
          ) : (
            <Sun size={17} color="#ffffff" />
          )}
          <Text className="ml-2 text-xs sm:text-sm font-bold text-white whitespace-nowrap">
            {operatingMode === 'EVENT' ? 'Event Mode' : 'Cafe Mode'}
          </Text>
        </Pressable>

        {/* Switch to Floor Workspace POS */}
        {onSwitchToFloor && (
          <Pressable
            onPress={onSwitchToFloor}
            className="h-11 px-3.5 sm:px-4 flex-row items-center justify-center rounded-xl border border-stone-300 bg-white active:bg-stone-50 hover:bg-stone-50/80 shadow-xs transition-all active:scale-[0.98]"
            accessibilityLabel="Switch to Floor POS"
          >
            <Layers size={17} color="#44403c" />
            <Text className="ml-2 text-xs sm:text-sm font-bold text-stone-800 whitespace-nowrap">
              Floor POS
            </Text>
          </Pressable>
        )}

        {/* Dynamic Staff Profile Pill */}
        <Pressable
          onPress={onNavigateProfile}
          className="h-11 flex-row items-center rounded-xl border border-rose-200/80 bg-rose-50/50 hover:bg-rose-50 px-2.5 sm:px-3 active:bg-rose-100/60 shadow-xs transition-all active:scale-[0.98]"
          accessibilityLabel="Open Admin Profile"
        >
          {/* Avatar Icon */}
          <View className="h-8 w-8 items-center justify-center rounded-full bg-[#800020] shadow-xs flex-shrink-0">
            <Text className="text-[11px] font-black text-white tracking-wider">
              {staffInitials}
            </Text>
          </View>
          <View className="ml-2 sm:ml-2.5 justify-center">
            <Text
              className="text-xs sm:text-sm font-bold text-stone-900 leading-tight"
              numberOfLines={1}
            >
              {staffFirstName}
            </Text>
            <Text
              className="text-[10px] font-semibold text-[#800020] uppercase tracking-wider"
              numberOfLines={1}
            >
              {staffRole}
            </Text>
          </View>
        </Pressable>

        {/* Logout / Lock Button */}
        <Pressable
          onPress={logout}
          className="h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-50/80 hover:bg-red-50 hover:border-red-200 active:bg-red-100/60 transition-all shadow-xs active:scale-[0.98]"
          accessibilityRole="button"
          accessibilityLabel="Log out of admin console"
        >
          <LogOut size={17} color="#dc2626" />
        </Pressable>
      </View>
    </View>
  );
};
