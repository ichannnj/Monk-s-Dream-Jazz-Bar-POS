import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sun, Flame, Layers, LogOut, Clock, Menu } from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
import {
  getStaffFirstName,
  getStaffInitials,
  getStaffRoleLabel,
} from '@/features/shared/utils/staffHelpers';
import { useNetworkLatency } from '@/features/shared/hooks/useNetworkLatency';
import type { AdminRoute } from '../../domain/admin.types';

interface AdminHeaderProps {
  currentRoute: AdminRoute;
  operatingMode: 'CAFE' | 'EVENT';
  onToggleOperatingMode: () => void;
  onSwitchToFloor?: () => void;
  onOpenDrawer?: () => void;
  onNavigateProfile?: () => void;
  onRouteChange?: (route: AdminRoute) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  operatingMode,
  onToggleOperatingMode,
  onSwitchToFloor,
  onOpenDrawer,
  onNavigateProfile,
}) => {
  const { logout, currentUser } = useAuthStore();
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const { isSlow, isOffline } = useNetworkLatency(15000);

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
      // Format e.g. "Wed, Nov 11 - 4:06 AM"
      const formatted = now.toLocaleDateString('en-US', options).replace(/,([^,]*)$/, ' -$1');
      setCurrentTimeStr(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const staffFullName = currentUser?.displayName || 'Dana Cruz';
  const staffFirstName = useMemo(() => getStaffFirstName(staffFullName), [staffFullName]);
  const staffInitials = useMemo(() => getStaffInitials(staffFullName), [staffFullName]);
  const staffRole = useMemo(
    () => getStaffRoleLabel(currentUser?.role || 'admin'),
    [currentUser?.role]
  );

  return (
    <View className="w-full relative flex-row items-center justify-center border-b border-stone-200/80 bg-white px-3 sm:px-6 py-2.5 sm:py-3 shadow-xs min-h-[64px]">
      {/* Mobile Drawer Trigger (Positioned absolute so it doesn't offset the centered cluster) */}
      {onOpenDrawer && (
        <View className="absolute left-3 sm:left-6 lg:hidden z-10">
          <Pressable
            onPress={onOpenDrawer}
            className="h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 active:bg-stone-100"
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
          >
            <Menu size={20} color="#1c1917" />
          </Pressable>
        </View>
      )}

      {/* Centered Controls Cluster */}
      <View className="flex-row items-center justify-center gap-2 sm:gap-3 flex-wrap">
        {/* Non-blocking Slow Connection / Offline Indicator */}
        {isSlow && (
          <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-300">
            <View className="h-2 w-2 rounded-full bg-[#800020] animate-pulse" />
            <Text className="text-xs font-semibold text-stone-700">
              {isOffline ? 'Offline' : 'Slow connection'}
            </Text>
          </View>
        )}

        {/* Date Time Indicator */}
        {currentTimeStr ? (
          <View className="hidden xl:flex flex-row items-center gap-2 rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2 h-11">
            <Clock size={15} color="#78716c" />
            <Text className="text-xs font-semibold text-stone-700">{currentTimeStr}</Text>
          </View>
        ) : null}

        {/* Operating Mode Toggle */}
        <Pressable
          onPress={onToggleOperatingMode}
          className={`h-11 px-3.5 flex-row items-center justify-center rounded-xl border transition-all active:scale-[0.98] ${
            operatingMode === 'EVENT'
              ? 'bg-[#800020] border-[#800020]'
              : 'bg-stone-50 border-stone-200'
          }`}
          accessibilityLabel={`Switch operating mode. Current: ${operatingMode}`}
        >
          {operatingMode === 'EVENT' ? (
            <Flame size={17} color="#ffffff" />
          ) : (
            <Sun size={17} color="#1c1917" />
          )}
          <Text
            className={`ml-2 text-sm font-bold whitespace-nowrap ${
              operatingMode === 'EVENT' ? 'text-white' : 'text-stone-900'
            }`}
          >
            {operatingMode === 'EVENT' ? 'Event' : 'Cafe'}
          </Text>
        </Pressable>

        {/* Switch to Floor Workspace POS */}
        {onSwitchToFloor && (
          <Pressable
            onPress={onSwitchToFloor}
            className="h-11 px-3.5 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50 transition-all active:scale-[0.98]"
            accessibilityLabel="Switch to Floor POS"
          >
            <Layers size={17} color="#1c1917" />
            <Text className="hidden sm:inline ml-2 text-sm font-bold text-stone-900 whitespace-nowrap">
              Floor POS
            </Text>
          </Pressable>
        )}

        {/* Staff Profile Pill */}
        <Pressable
          onPress={onNavigateProfile}
          className="h-11 flex-row items-center rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-2.5 active:bg-stone-100 transition-all active:scale-[0.98]"
          accessibilityLabel="Open Admin Profile"
        >
          <View className="h-7 w-7 items-center justify-center rounded-full bg-[#800020] flex-shrink-0">
            <Text className="text-[11px] font-bold text-white tracking-wider">{staffInitials}</Text>
          </View>
          <View className="hidden md:flex ml-2 justify-center max-w-[120px]">
            <Text className="text-xs font-bold text-stone-900 leading-tight" numberOfLines={1}>
              {staffFirstName}
            </Text>
            <Text className="text-[10px] font-semibold text-[#800020] uppercase" numberOfLines={1}>
              {staffRole}
            </Text>
          </View>
        </Pressable>

        {/* Logout Button */}
        <Pressable
          onPress={logout}
          className="h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 active:bg-rose-50 transition-all active:scale-[0.98]"
          accessibilityRole="button"
          accessibilityLabel="Log out of admin console"
        >
          <LogOut size={17} color="#800020" />
        </Pressable>
      </View>
    </View>
  );
};
