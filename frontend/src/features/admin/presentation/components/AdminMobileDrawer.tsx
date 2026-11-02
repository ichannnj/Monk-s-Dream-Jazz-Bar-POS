import React from 'react';
import { View, Text, Pressable, ScrollView, Modal, Platform } from 'react-native';
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
  Settings,
  X,
  LogOut,
  Layers,
  Flame,
  Sun,
} from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
import type { AdminRoute } from '../../domain/admin.types';

interface AdminMobileDrawerProps {
  visible: boolean;
  onClose: () => void;
  currentRoute: AdminRoute;
  onRouteChange: (route: AdminRoute) => void;
  unreadChatCount?: number;
  operatingMode: 'CAFE' | 'EVENT';
  onToggleOperatingMode: () => void;
  onSwitchToFloor?: () => void;
}

interface NavItem {
  id: AdminRoute;
  label: string;
  icon: React.FC<{ size: number; color: string }>;
  badgeCount?: number;
}

export const AdminMobileDrawer: React.FC<AdminMobileDrawerProps> = ({
  visible,
  onClose,
  currentRoute,
  onRouteChange,
  unreadChatCount = 3,
  operatingMode,
  onToggleOperatingMode,
  onSwitchToFloor,
}) => {
  const { currentUser, logout } = useAuthStore();
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
    { id: 'tables', label: 'Table Layout', icon: LayoutGrid },
    { id: 'staff', label: 'Staff Roster', icon: Users },
  ];

  const reportItems: NavItem[] = [
    { id: 'sales', label: 'Sales & Transactions', icon: Receipt },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'settings', label: 'Venue Settings', icon: Settings },
  ];

  const handleSelectRoute = (route: AdminRoute) => {
    onRouteChange(route);
    onClose();
  };

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <View className="mb-6">
      <Text className="mb-2.5 px-3 text-base font-bold tracking-widest text-white/60 uppercase">
        {title}
      </Text>
      <View className="space-y-1.5">
        {items.map((item) => {
          const isActive = currentRoute === item.id;
          const IconComponent = item.icon;
          return (
            <Pressable
              key={item.id}
              onPress={() => handleSelectRoute(item.id)}
              className={`min-h-[48px] flex-row items-center justify-between rounded-xl px-3.5 py-3 transition-all ${
                isActive ? 'bg-white/20 shadow-sm' : 'active:bg-white/10'
              }`}
            >
              <View className="flex-row items-center space-x-3">
                <IconComponent size={22} color={isActive ? '#ffffff' : '#f5d5dc'} />
                <Text
                  className={`ml-3 text-base ${
                    isActive ? 'font-bold text-white' : 'font-medium text-white/90'
                  }`}
                >
                  {item.label}
                </Text>
              </View>

              {item.badgeCount && item.badgeCount > 0 ? (
                <View className="rounded-full bg-rose-600 px-2.5 py-0.5">
                  <Text className="text-base font-bold text-white">{item.badgeCount}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 flex-row bg-black/60">
        {/* Drawer Card */}
        <View
          className="w-[85%] max-w-[340px] h-full flex-col justify-between border-r border-white/15 p-5 shadow-2xl z-20"
          style={{ backgroundColor: '#4A1020' }}
        >
          {/* Header & Navigation */}
          <View className="flex-1">
            {/* Top Bar inside Drawer: Brand + Close button */}
            <View className="mb-6 flex-row items-center justify-between pt-1">
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/20 p-2 border border-white/25">
                  <Music size={22} color="#ffffff" />
                </View>
                <View className="ml-3">
                  <Text className="font-serif text-lg font-bold tracking-tight text-white">
                    Monk's Dream
                  </Text>
                  <Text className="text-base font-medium text-white/70">Admin Console</Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-white/10 active:bg-white/20"
                accessibilityLabel="Close Drawer"
              >
                <X size={22} color="#ffffff" />
              </Pressable>
            </View>

            {/* Staff Card */}
            <View className="mb-5 flex-row items-center rounded-xl bg-white/10 p-3 border border-white/15">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-black/30 border border-white/25">
                <Text className="text-base font-black text-white">{staffInitials}</Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-white">{staffName}</Text>
                <Text className="text-base font-medium text-white/75">{staffRole}</Text>
              </View>
            </View>

            {/* Scrollable Nav Items */}
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {renderNavGroup('Operations', operationsItems)}
              {renderNavGroup('Manage', manageItems)}
              {renderNavGroup('Reports', reportItems)}
            </ScrollView>
          </View>

          {/* Bottom Actions Footer */}
          <View className="border-t border-white/15 pt-4 space-y-2.5">
            {/* Operating Mode Switcher */}
            <Pressable
              onPress={onToggleOperatingMode}
              className={`min-h-[48px] flex-row items-center justify-center rounded-xl px-4 py-2.5 active:opacity-85 ${
                operatingMode === 'EVENT' ? 'bg-amber-600' : 'bg-sky-600'
              }`}
            >
              {operatingMode === 'EVENT' ? (
                <Flame size={20} color="#ffffff" />
              ) : (
                <Sun size={20} color="#ffffff" />
              )}
              <Text className="ml-2 text-base font-bold text-white">
                {operatingMode === 'EVENT' ? 'Switch to Cafe Mode' : 'Switch to Event Mode'}
              </Text>
            </Pressable>

            {/* Switch to Floor Workspace POS */}
            {onSwitchToFloor && (
              <Pressable
                onPress={() => {
                  onClose();
                  onSwitchToFloor();
                }}
                className="min-h-[48px] flex-row items-center justify-center rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 active:bg-white/20"
              >
                <Layers size={20} color="#ffffff" />
                <Text className="ml-2 text-base font-bold text-white">Switch to Floor POS</Text>
              </Pressable>
            )}

            {/* Log Out */}
            <Pressable
              onPress={() => {
                onClose();
                logout();
              }}
              className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-red-600/30 border border-red-400/40 px-4 py-2.5 active:bg-red-600/40"
            >
              <LogOut size={20} color="#fca5a5" />
              <Text className="ml-2 text-base font-bold text-red-200">Log Out</Text>
            </Pressable>
          </View>
        </View>

        {/* Backdrop Press Dismiss */}
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityLabel="Dismiss menu backdrop"
        />
      </View>
    </Modal>
  );
};
