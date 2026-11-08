import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sun, Flame, Layers, LogOut, Clock, Menu } from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
import {
  getStaffFirstName,
  getStaffInitials,
  getStaffRoleLabel,
} from '@/features/shared/utils/staffHelpers';
import type { AdminRoute } from '../../domain/admin.types';
import { getAdminNavConfig } from './adminNavigation.config';

interface AdminHeaderProps {
  currentRoute: AdminRoute;
  operatingMode: 'CAFE' | 'EVENT';
  onToggleOperatingMode: () => void;
  onSwitchToFloor?: () => void;
  onOpenDrawer?: () => void;
  onNavigateProfile?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentRoute,
  operatingMode,
  onToggleOperatingMode,
  onSwitchToFloor,
  onOpenDrawer,
  onNavigateProfile,
}) => {
  const { logout, currentUser } = useAuthStore();
  const [currentTimeStr, setCurrentTimeStr] = useState('');

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

  const staffFullName = currentUser?.displayName || 'Dana Cruz';
  const staffFirstName = useMemo(() => getStaffFirstName(staffFullName), [staffFullName]);
  const staffInitials = useMemo(() => getStaffInitials(staffFullName), [staffFullName]);
  const staffRole = useMemo(
    () => getStaffRoleLabel(currentUser?.role || 'admin'),
    [currentUser?.role]
  );

  const routeConfig = useMemo(() => getAdminNavConfig(currentRoute), [currentRoute]);

  return (
    <View className="w-full flex-row items-center justify-between border-b border-stone-200/90 bg-white px-3 sm:px-6 py-2.5 sm:py-3 shadow-xs">
      {/* Left: Mobile Drawer Trigger + Page Context */}
      <View className="flex-row items-center gap-2.5 sm:gap-3 flex-1 min-w-0 pr-2">
        {onOpenDrawer && (
          <Pressable
            onPress={onOpenDrawer}
            className="lg:hidden h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 active:bg-stone-100"
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
          >
            <Menu size={20} color="#292524" />
          </Pressable>
        )}

        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2">
            <Text
              className="text-lg sm:text-xl font-bold tracking-tight text-stone-900"
              numberOfLines={1}
            >
              {routeConfig?.label || 'Admin Console'}
            </Text>
          </View>
          <Text
            className="hidden sm:flex text-xs text-stone-500 font-normal truncate"
            numberOfLines={1}
          >
            {routeConfig?.description || "Monk's Dream Jazz Bar & Cafe"}
          </Text>
        </View>
      </View>

      {/* Right: Actions, Mode, Profile, Logout */}
      <View className="flex-row items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Date Time Indicator (Desktop only) */}
        {currentTimeStr ? (
          <View className="hidden xl:flex flex-row items-center gap-2 rounded-xl bg-stone-100 border border-stone-200/80 px-3.5 py-2 h-11">
            <Clock size={15} color="#57534e" />
            <Text className="text-xs font-semibold text-stone-700">{currentTimeStr}</Text>
          </View>
        ) : null}

        {/* Operating Mode Toggle */}
        <Pressable
          onPress={onToggleOperatingMode}
          className={`h-11 px-3 sm:px-3.5 flex-row items-center justify-center rounded-xl border transition-all active:scale-[0.98] ${
            operatingMode === 'EVENT'
              ? 'bg-amber-600 border-amber-700/40'
              : 'bg-stone-100 border-stone-300'
          }`}
          accessibilityLabel={`Switch operating mode. Current: ${operatingMode}`}
        >
          {operatingMode === 'EVENT' ? (
            <Flame size={17} color="#ffffff" />
          ) : (
            <Sun size={17} color="#57534e" />
          )}
          <Text
            className={`ml-2 text-base font-bold whitespace-nowrap ${
              operatingMode === 'EVENT' ? 'text-white' : 'text-stone-800'
            }`}
          >
            {operatingMode === 'EVENT' ? 'Event' : 'Cafe'}
          </Text>
        </Pressable>

        {/* Switch to Floor Workspace POS */}
        {onSwitchToFloor && (
          <Pressable
            onPress={onSwitchToFloor}
            className="h-11 px-3 sm:px-3.5 flex-row items-center justify-center rounded-xl border border-stone-300 bg-white active:bg-stone-50 transition-all active:scale-[0.98]"
            accessibilityLabel="Switch to Floor POS"
          >
            <Layers size={17} color="#44403c" />
            <Text className="hidden sm:inline ml-2 text-base font-bold text-stone-800 whitespace-nowrap">
              Floor POS
            </Text>
          </Pressable>
        )}

        {/* Staff Profile Pill */}
        <Pressable
          onPress={onNavigateProfile}
          className="h-11 flex-row items-center rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-2 sm:px-2.5 active:bg-stone-100 transition-all active:scale-[0.98]"
          accessibilityLabel="Open Admin Profile"
        >
          <View className="h-8 w-8 items-center justify-center rounded-full bg-[#6e1d2c] flex-shrink-0">
            <Text className="text-xs font-bold text-white tracking-wider">{staffInitials}</Text>
          </View>
          <View className="hidden md:flex ml-2 justify-center max-w-[120px]">
            <Text className="text-base font-bold text-stone-900 leading-tight" numberOfLines={1}>
              {staffFirstName}
            </Text>
            <Text className="text-xs font-semibold text-[#6e1d2c] uppercase" numberOfLines={1}>
              {staffRole}
            </Text>
          </View>
        </Pressable>

        {/* Logout Button */}
        <Pressable
          onPress={logout}
          className="h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 active:bg-rose-50 hover:border-rose-200 transition-all active:scale-[0.98]"
          accessibilityRole="button"
          accessibilityLabel="Log out of admin console"
        >
          <LogOut size={17} color="#dc2626" />
        </Pressable>
      </View>
    </View>
  );
};
