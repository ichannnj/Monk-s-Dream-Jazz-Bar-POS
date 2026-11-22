import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  LayoutGrid,
  Kanban,
  MessageSquare,
  Receipt,
  Coins,
  Bell,
  Settings,
  LogOut,
  Printer,
  LayoutDashboard,
  ConciergeBell,
  MoreHorizontal,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { useResponsive } from '../hooks/useResponsive';

const MONKS_DREAM_LOGO = require('../../../../assets/images/logo-white-bg.jpeg');

export type NavTabId =
  'tables' | 'foh' | 'board' | 'chat' | 'checks' | 'drawer' | 'printer' | 'alerts' | 'settings';

export interface SidebarProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  onLogout?: () => void;
  onSwitchToAdmin?: () => void;
  unreadChatCount?: number;
  alertCount?: number;
  fohBadgeCount?: number;
  fohHasDot?: boolean;
  mode?: 'pos' | 'kds';
  hiddenTabs?: NavTabId[];
}

interface NavItemConfig {
  id: NavTabId;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  badge?: number;
  hasDot?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  onSwitchToAdmin,
  unreadChatCount = 0,
  alertCount = 0,
  fohBadgeCount = 0,
  fohHasDot = false,
  mode = 'pos',
  hiddenTabs = [],
}) => {
  const { isMobile } = useResponsive();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const navItems: NavItemConfig[] = useMemo(() => {
    const posNavItems: NavItemConfig[] = [
      { id: 'tables', label: 'Tables', Icon: LayoutGrid },
      {
        id: 'foh',
        label: 'FOH',
        Icon: ConciergeBell,
        badge: fohBadgeCount,
        hasDot: fohHasDot,
      },
      { id: 'checks', label: 'Checks', Icon: Receipt },
      { id: 'chat', label: 'Chat', Icon: MessageSquare, badge: unreadChatCount },
      { id: 'drawer', label: 'Drawer', Icon: Coins },
      { id: 'printer', label: 'Printer', Icon: Printer },
      { id: 'alerts', label: 'Alerts', Icon: Bell, hasDot: alertCount > 0 },
    ];

    const kdsNavItems: NavItemConfig[] = [
      { id: 'board', label: 'Board', Icon: Kanban },
      { id: 'tables', label: 'Tables', Icon: LayoutGrid },
      { id: 'checks', label: 'Checks', Icon: Receipt },
      { id: 'chat', label: 'Chat', Icon: MessageSquare, badge: unreadChatCount },
      { id: 'drawer', label: 'Drawer', Icon: Coins },
      { id: 'alerts', label: 'Alerts', Icon: Bell, hasDot: alertCount > 0 },
    ];

    const raw = mode === 'kds' ? kdsNavItems : posNavItems;
    return raw.filter((item) => !hiddenTabs.includes(item.id));
  }, [mode, hiddenTabs, fohBadgeCount, fohHasDot, unreadChatCount, alertCount]);

  // Mobile (< 768px): Bottom Tab Bar (4 primary tabs + "More" sheet)
  if (isMobile) {
    const primaryTabs = navItems.slice(0, 4);
    const overflowTabs: NavItemConfig[] = [
      ...navItems.slice(4),
      { id: 'settings', label: 'Station Settings', Icon: Settings },
    ];

    const isOverflowActive = overflowTabs.some((t) => t.id === activeTab);
    const overflowHasAttention = overflowTabs.some(
      (t) => (typeof t.badge === 'number' && t.badge > 0) || t.hasDot
    );

    return (
      <>
        <View className="w-full bg-white border-t border-[#E7E5E4] px-2 pt-1.5 pb-2 flex-row items-center justify-around">
          {primaryTabs.map((item) => {
            const isActive = activeTab === item.id;
            const { Icon } = item;
            const badgeCount = typeof item.badge === 'number' && item.badge > 0 ? item.badge : 0;

            return (
              <Pressable
                key={item.id}
                onPress={() => onTabChange(item.id)}
                className={`flex-1 min-h-[52px] rounded-xl items-center justify-center py-1 px-1 active:opacity-80 ${
                  isActive ? 'bg-[#810021]/10' : ''
                }`}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={item.label}
              >
                <View className="relative items-center justify-center">
                  <Icon
                    size={22}
                    color={isActive ? '#810021' : '#57534E'}
                    strokeWidth={isActive ? 2.3 : 1.9}
                  />
                  {badgeCount > 0 ? (
                    <View className="absolute -top-1.5 -right-3 min-w-[20px] h-5 rounded-full bg-[#810021] px-1.5 items-center justify-center">
                      <Text className="text-xs font-bold text-white tabular-nums">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </Text>
                    </View>
                  ) : item.hasDot ? (
                    <View className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-[#810021] border border-white" />
                  ) : null}
                </View>
                <Text
                  className={`text-base mt-0.5 ${
                    isActive ? 'font-bold text-[#810021]' : 'font-medium text-[#57534E]'
                  }`}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}

          {/* 5th Tab: More */}
          <Pressable
            onPress={() => setMoreSheetOpen(true)}
            className={`flex-1 min-h-[52px] rounded-xl items-center justify-center py-1 px-1 active:opacity-80 ${
              isOverflowActive ? 'bg-[#810021]/10' : ''
            }`}
            accessibilityRole="button"
            accessibilityLabel="More workspace sections"
          >
            <View className="relative items-center justify-center">
              <MoreHorizontal
                size={22}
                color={isOverflowActive ? '#810021' : '#57534E'}
                strokeWidth={2}
              />
              {overflowHasAttention ? (
                <View className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-[#810021] border border-white" />
              ) : null}
            </View>
            <Text
              className={`text-base mt-0.5 ${
                isOverflowActive ? 'font-bold text-[#810021]' : 'font-medium text-[#57534E]'
              }`}
              numberOfLines={1}
            >
              More
            </Text>
          </Pressable>
        </View>

        {/* More Bottom Sheet Modal */}
        <Modal
          visible={moreSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setMoreSheetOpen(false)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <Pressable
              className="flex-1"
              onPress={() => setMoreSheetOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            />
            <View className="bg-white rounded-t-3xl border-t border-[#E7E5E4] px-4 pt-4 pb-6 max-h-[82%]">
              <View className="flex-row items-center justify-between pb-3 mb-2 border-b border-[#E7E5E4]">
                <View className="flex-row items-center gap-2.5">
                  <View className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] items-center justify-center p-1">
                    <ExpoImage
                      source={MONKS_DREAM_LOGO}
                      className="w-8 h-8 rounded-lg"
                      contentFit="contain"
                    />
                  </View>
                  <Text className="text-pos-lg font-extrabold text-[#1C1917]">Workspace</Text>
                </View>

                <Pressable
                  onPress={() => setMoreSheetOpen(false)}
                  className="min-h-[48px] min-w-[48px] rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] items-center justify-center active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Close workspace menu"
                >
                  <X size={20} color="#1C1917" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-2 py-1">
                  {overflowTabs.map((item) => {
                    const isActive = activeTab === item.id;
                    const { Icon } = item;
                    const badgeCount =
                      typeof item.badge === 'number' && item.badge > 0 ? item.badge : 0;

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          onTabChange(item.id);
                          setMoreSheetOpen(false);
                        }}
                        className={`min-h-[52px] rounded-xl px-4 py-3 flex-row items-center justify-between border active:opacity-85 ${
                          isActive
                            ? 'bg-[#810021]/10 border-[#810021]/25'
                            : 'bg-[#FAF8F5] border-[#E7E5E4]'
                        }`}
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                      >
                        <View className="flex-row items-center gap-3">
                          <Icon
                            size={20}
                            color={isActive ? '#810021' : '#1C1917'}
                            strokeWidth={2}
                          />
                          <Text
                            className={`text-base ${
                              isActive ? 'font-bold text-[#810021]' : 'font-semibold text-[#1C1917]'
                            }`}
                          >
                            {item.label}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-2">
                          {badgeCount > 0 ? (
                            <View className="rounded-full bg-[#810021] px-2.5 py-0.5">
                              <Text className="text-base font-bold text-white tabular-nums">
                                {badgeCount}
                              </Text>
                            </View>
                          ) : item.hasDot ? (
                            <View className="w-2.5 h-2.5 rounded-full bg-[#810021]" />
                          ) : null}
                          <ChevronRight size={18} color="#78716C" />
                        </View>
                      </Pressable>
                    );
                  })}

                  {(onSwitchToAdmin || onLogout) && (
                    <View className="border-t border-[#E7E5E4] mt-2 pt-3 gap-2">
                      {onSwitchToAdmin ? (
                        <Pressable
                          onPress={() => {
                            setMoreSheetOpen(false);
                            onSwitchToAdmin();
                          }}
                          className="min-h-[52px] rounded-xl px-4 py-3 flex-row items-center justify-between bg-[#810021] active:opacity-90"
                          accessibilityRole="button"
                          accessibilityLabel="Back to Admin Dashboard"
                        >
                          <View className="flex-row items-center gap-3">
                            <LayoutDashboard size={20} color="#F5F5F5" strokeWidth={2} />
                            <Text className="text-base font-bold text-white">
                              Admin Back-Office
                            </Text>
                          </View>
                          <ChevronRight size={18} color="#F5F5F5" />
                        </Pressable>
                      ) : null}

                      {onLogout ? (
                        <Pressable
                          onPress={() => {
                            setMoreSheetOpen(false);
                            onLogout();
                          }}
                          className="min-h-[52px] rounded-xl px-4 py-3 flex-row items-center justify-between bg-white border border-[#E7E5E4] active:bg-[#FAF8F5]"
                          accessibilityRole="button"
                          accessibilityLabel="Switch Staff or Lock Terminal"
                        >
                          <View className="flex-row items-center gap-3">
                            <LogOut size={20} color="#810021" strokeWidth={2} />
                            <Text className="text-base font-semibold text-[#810021]">
                              Switch Staff / Lock
                            </Text>
                          </View>
                          <ChevronRight size={18} color="#810021" />
                        </Pressable>
                      ) : null}
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // Tablet & Desktop (>= 768px): Classic Dark Burgundy Rail (#431621, 78px)
  return (
    <View className="w-[78px] bg-[#431621] rounded-3xl py-4 px-2 items-center justify-between">
      {/* Top: Brand Emblem */}
      <View className="items-center mb-3">
        <View className="w-[50px] h-[50px] rounded-2xl bg-white/15 border border-white/20 items-center justify-center p-1">
          <ExpoImage
            source={MONKS_DREAM_LOGO}
            className="w-[38px] h-[38px] rounded-lg"
            contentFit="contain"
            priority="high"
          />
        </View>
      </View>

      {/* Middle: Navigation Rail Items */}
      <View className="w-full gap-2 items-center flex-1 justify-center">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const { Icon } = item;
          const badgeCount = typeof item.badge === 'number' && item.badge > 0 ? item.badge : 0;

          return (
            <Pressable
              key={item.id}
              onPress={() => onTabChange(item.id)}
              className={`w-[62px] min-h-[52px] py-2 px-1 rounded-2xl items-center justify-center active:opacity-80 ${
                isActive ? 'bg-[#5d1f2e]' : ''
              }`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
            >
              <View className="relative items-center justify-center">
                <Icon
                  size={22}
                  color={isActive ? '#F5F5F5' : '#d8b4bc'}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                {badgeCount > 0 ? (
                  <View className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-rose-600 px-1 items-center justify-center border border-[#431621]">
                    <Text className="text-xs font-bold text-white tabular-nums">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </Text>
                  </View>
                ) : item.hasDot ? (
                  <View className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-rose-500 border border-[#431621]" />
                ) : null}
              </View>
              <Text
                className={`text-xs mt-1 text-center ${
                  isActive ? 'font-bold text-white' : 'font-semibold text-[#d8b4bc]'
                }`}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Bottom: Admin Switch, Settings & Lock/Logout */}
      <View className="items-center gap-2.5 mt-2 w-full">
        {onSwitchToAdmin ? (
          <Pressable
            onPress={onSwitchToAdmin}
            className="min-h-[48px] min-w-[48px] w-12 h-12 rounded-2xl bg-[#800020] border border-white/25 items-center justify-center active:opacity-85"
            accessibilityRole="button"
            accessibilityLabel="Back to Admin Dashboard"
          >
            <LayoutDashboard size={20} color="#F5F5F5" />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => onTabChange('settings')}
          className={`min-h-[48px] min-w-[48px] w-12 h-12 rounded-2xl items-center justify-center border active:opacity-85 ${
            activeTab === 'settings' ? 'bg-[#5d1f2e] border-white' : 'bg-white/10 border-white/15'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Station Settings"
        >
          <Settings size={20} color={activeTab === 'settings' ? '#F5F5F5' : '#d8b4bc'} />
        </Pressable>

        {onLogout ? (
          <Pressable
            onPress={onLogout}
            className="min-h-[48px] min-w-[48px] w-12 h-12 rounded-xl items-center justify-center active:opacity-85"
            accessibilityRole="button"
            accessibilityLabel="Switch Staff User"
          >
            <LogOut size={20} color="#d8b4bc" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};
