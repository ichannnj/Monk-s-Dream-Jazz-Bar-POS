import React from 'react';
import { View, Text, Pressable, ScrollView, Modal, Platform } from 'react-native';
import { X, LogOut, Layers, Flame, Sun } from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
import type { AdminRoute } from '../../domain/admin.types';
import { ADMIN_NAV_GROUPS, ADMIN_NAVIGATION_ITEMS } from './adminNavigation.config';

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

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 flex-row bg-black/60">
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityLabel="Close navigation drawer"
        />

        <View
          className="w-80 max-w-[85%] h-full flex-col justify-between border-l border-[#3a0b17] shadow-2xl"
          style={{ backgroundColor: '#210c14' }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-white/10">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#6e1d2c] border border-amber-500/30">
                <Text className="text-base font-bold text-amber-300">MD</Text>
              </View>
              <View>
                <Text className="text-base font-bold text-white tracking-wider">MONK'S DREAM</Text>
                <Text className="text-xs font-semibold text-amber-400/80 uppercase tracking-widest">
                  Admin Navigation
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-xl bg-white/10 active:bg-white/20"
              accessibilityRole="button"
              accessibilityLabel="Close navigation"
            >
              <X size={20} color="#ffffff" />
            </Pressable>
          </View>

          {/* Quick Actions Strip */}
          <View className="p-3 border-b border-white/10 space-y-2">
            <Pressable
              onPress={() => {
                onClose();
                onToggleOperatingMode();
              }}
              className={`min-h-[48px] flex-row items-center justify-between px-4 py-2.5 rounded-xl border ${
                operatingMode === 'EVENT'
                  ? 'bg-amber-600/30 border-amber-500/40 text-amber-200'
                  : 'bg-stone-800/80 border-stone-700 text-stone-200'
              }`}
            >
              <View className="flex-row items-center gap-2.5">
                {operatingMode === 'EVENT' ? (
                  <Flame size={18} color="#fbbf24" />
                ) : (
                  <Sun size={18} color="#94a3b8" />
                )}
                <Text className="text-base font-bold text-white">
                  {operatingMode === 'EVENT' ? 'Event Mode' : 'Cafe Mode'}
                </Text>
              </View>
              <Text className="text-xs font-semibold text-amber-300">Switch</Text>
            </Pressable>

            {onSwitchToFloor && (
              <Pressable
                onPress={() => {
                  onClose();
                  onSwitchToFloor();
                }}
                className="min-h-[48px] flex-row items-center justify-between px-4 py-2.5 rounded-xl bg-white/10 active:bg-white/20 border border-white/10"
              >
                <View className="flex-row items-center gap-2.5">
                  <Layers size={18} color="#ffffff" />
                  <Text className="text-base font-bold text-white">Floor POS</Text>
                </View>
                <Text className="text-xs font-semibold text-stone-300">Launch</Text>
              </Pressable>
            )}
          </View>

          {/* Nav Links */}
          <ScrollView className="flex-1 px-3 py-3" showsVerticalScrollIndicator={false}>
            {ADMIN_NAV_GROUPS.map((group) => {
              const items = ADMIN_NAVIGATION_ITEMS.filter((item) => item.group === group.key);
              if (items.length === 0) return null;

              return (
                <View key={group.key} className="mb-4">
                  <Text className="mb-1.5 px-3 text-xs font-bold tracking-widest text-stone-400 uppercase">
                    {group.title}
                  </Text>
                  <View className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = currentRoute === item.id;
                      const Icon = item.icon;
                      const badge = item.badgeKey === 'unreadChats' ? unreadChatCount : undefined;

                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            onRouteChange(item.id);
                            onClose();
                          }}
                          className={`min-h-[48px] flex-row items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                            isActive ? 'bg-[#6e1d2c] text-white shadow-xs' : 'active:bg-white/10'
                          }`}
                        >
                          <View className="flex-row items-center gap-3">
                            <Icon size={19} color={isActive ? '#ffffff' : '#a8a29e'} />
                            <Text
                              className={`text-base font-semibold ${
                                isActive ? 'text-white font-bold' : 'text-stone-300'
                              }`}
                            >
                              {item.label}
                            </Text>
                          </View>

                          {badge && badge > 0 ? (
                            <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1.5">
                              <Text className="text-xs font-bold text-white">{badge}</Text>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer User Info & Logout */}
          <View className="p-3 border-t border-white/10 flex-row items-center justify-between gap-2">
            <Pressable
              onPress={() => {
                onRouteChange('profile');
                onClose();
              }}
              className="flex-1 flex-row items-center gap-2.5 p-2 rounded-xl active:bg-white/10"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-[#6e1d2c] border border-amber-400/30">
                <Text className="text-xs font-black text-amber-200">{staffInitials}</Text>
              </View>
              <View className="flex-1 justify-center">
                <Text className="text-base font-bold text-white leading-tight" numberOfLines={1}>
                  {staffName}
                </Text>
                <Text className="text-xs font-semibold text-stone-400" numberOfLines={1}>
                  {staffRole}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                onClose();
                logout();
              }}
              className="h-11 w-11 items-center justify-center rounded-xl bg-rose-950/60 border border-rose-800/40 active:bg-rose-900"
              accessibilityLabel="Log out"
            >
              <LogOut size={18} color="#f87171" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
