import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
} from 'lucide-react-native';
import { useResponsive } from '../hooks/useResponsive';
import { PosDropdown, PosDropdownOption } from '../ui/PosDropdown';

const MONKS_DREAM_LOGO = require('../../../../assets/Monks Dream Logo files-02.png');

export type NavTabId =
  'tables' | 'board' | 'chat' | 'checks' | 'drawer' | 'printer' | 'alerts' | 'settings';

export interface SidebarProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  onLogout?: () => void;
  onSwitchToAdmin?: () => void;
  unreadChatCount?: number;
  alertCount?: number;
  mode?: 'pos' | 'kds';
  hiddenTabs?: NavTabId[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  onSwitchToAdmin,
  unreadChatCount = 0,
  alertCount = 0,
  mode = 'pos',
  hiddenTabs = [],
}) => {
  const { isMobile } = useResponsive();

  const posNavItems = [
    {
      id: 'tables' as NavTabId,
      label: 'Tables',
      Icon: LayoutGrid,
    },
    {
      id: 'chat' as NavTabId,
      label: 'Chat',
      Icon: MessageSquare,
      badge: unreadChatCount,
    },
    {
      id: 'checks' as NavTabId,
      label: 'Checks',
      Icon: Receipt,
    },
    {
      id: 'drawer' as NavTabId,
      label: 'Drawer',
      Icon: Coins,
    },
    {
      id: 'printer' as NavTabId,
      label: 'Printer',
      Icon: Printer,
    },
    {
      id: 'alerts' as NavTabId,
      label: 'Alerts',
      Icon: Bell,
      hasDot: alertCount > 0,
    },
  ];

  const kdsNavItems = [
    {
      id: 'board' as NavTabId,
      label: 'Board',
      Icon: Kanban,
    },
    {
      id: 'tables' as NavTabId,
      label: 'Tables',
      Icon: LayoutGrid,
    },
    {
      id: 'checks' as NavTabId,
      label: 'Checks',
      Icon: Receipt,
    },
    {
      id: 'drawer' as NavTabId,
      label: 'Drawer',
      Icon: Coins,
    },
    {
      id: 'chat' as NavTabId,
      label: 'Chat',
      Icon: MessageSquare,
      badge: unreadChatCount,
    },
    {
      id: 'alerts' as NavTabId,
      label: 'Alerts',
      Icon: Bell,
      hasDot: alertCount > 0,
    },
  ];

  const rawNavItems = mode === 'kds' ? kdsNavItems : posNavItems;
  const navItems = rawNavItems.filter((item) => !hiddenTabs.includes(item.id));

  const dropdownOptions: PosDropdownOption<NavTabId>[] = [
    ...navItems.map((item) => ({
      value: item.id,
      label: item.label,
      icon: item.Icon,
      badge: typeof item.badge === 'number' && item.badge > 0 ? item.badge : undefined,
      hasDot: item.hasDot,
    })),
    {
      value: 'settings' as NavTabId,
      label: 'Station Settings',
      icon: Settings,
    },
  ];

  if (isMobile) {
    return (
      <View className="w-full bg-[#431621] rounded-2xl px-3 py-2 mb-2.5 flex-row items-center justify-between gap-2 shadow-sm">
        <View className="flex-row items-center gap-2.5 flex-1">
          <View className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 items-center justify-center p-1">
            <ExpoImage
              source={MONKS_DREAM_LOGO}
              style={{ width: 32, height: 32 }}
              contentFit="contain"
              priority="high"
            />
          </View>

          <PosDropdown
            options={dropdownOptions}
            value={activeTab}
            onChange={onTabChange}
            variant="burgundy-nav"
            sheetTitle="Navigate Workspace"
            className="flex-1"
          />
        </View>

        <View className="flex-row items-center gap-1.5">
          {unreadChatCount > 0 && activeTab !== 'chat' ? (
            <Pressable
              onPress={() => onTabChange('chat')}
              className="min-h-[48px] min-w-[48px] rounded-xl bg-rose-600 px-3 items-center justify-center flex-row gap-1.5"
              accessibilityRole="button"
              accessibilityLabel={`${unreadChatCount} unread messages`}
            >
              <MessageSquare size={18} color="#ffffff" />
              <Text className="text-base font-extrabold text-white">{unreadChatCount}</Text>
            </Pressable>
          ) : null}

          {onSwitchToAdmin ? (
            <Pressable
              onPress={onSwitchToAdmin}
              className="min-h-[48px] min-w-[48px] rounded-xl bg-[#800020] border border-white/20 items-center justify-center px-3 flex-row gap-1.5 active:opacity-90"
              accessibilityRole="button"
              accessibilityLabel="Back to Admin Dashboard"
            >
              <LayoutDashboard size={18} color="#ffffff" />
              <Text className="text-base font-bold text-white hidden sm:flex">Admin</Text>
            </Pressable>
          ) : null}

          {onLogout ? (
            <Pressable
              onPress={onLogout}
              className="min-h-[48px] min-w-[48px] rounded-xl bg-white/10 border border-white/15 items-center justify-center active:opacity-85"
              accessibilityRole="button"
              accessibilityLabel="Clock Out"
            >
              <LogOut size={18} color="#f5d0fe" />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sidebarContainer}>
      {/* Top: Official Bar Logo */}
      <View style={styles.logoSection}>
        <View style={styles.logoBadge}>
          <ExpoImage
            source={MONKS_DREAM_LOGO}
            style={styles.logoImage}
            contentFit="contain"
            priority="high"
          />
        </View>
      </View>

      {/* Middle: Main Navigation Buttons */}
      <View style={styles.navGroup}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const { Icon } = item;

          return (
            <Pressable
              key={item.id}
              onPress={() => onTabChange(item.id)}
              style={({ pressed }) => [
                styles.navButton,
                isActive && styles.navButtonActive,
                pressed && styles.navButtonPressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.iconWrapper}>
                <Icon
                  size={22}
                  color={isActive ? '#ffffff' : '#d8b4bc'}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                  </View>
                ) : item.hasDot ? (
                  <View style={styles.notificationDot} />
                ) : null}
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Bottom: Admin Switch, Settings & Logout */}
      <View style={styles.bottomSection}>
        {onSwitchToAdmin ? (
          <Pressable
            onPress={onSwitchToAdmin}
            style={({ pressed }) => [
              styles.settingsBtn,
              { backgroundColor: '#800020', borderColor: 'rgba(255,255,255,0.28)' },
              pressed && styles.navButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Back to Admin Dashboard"
          >
            <LayoutDashboard size={20} color="#ffffff" />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => onTabChange('settings')}
          style={({ pressed }) => [
            styles.settingsBtn,
            activeTab === 'settings' && styles.settingsBtnActive,
            pressed && styles.navButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Settings size={20} color={activeTab === 'settings' ? '#ffffff' : '#d8b4bc'} />
        </Pressable>

        {onLogout ? (
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.navButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Switch Staff User"
          >
            <LogOut size={20} color="#b38d95" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    width: 78,
    backgroundColor: '#431621',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 14,
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logoBadge: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  logoImage: {
    width: 38,
    height: 38,
  },
  navGroup: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  navButton: {
    width: 62,
    minHeight: 52,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonActive: {
    backgroundColor: '#5d1f2e',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  navButtonPressed: {
    opacity: 0.85,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#f43f5e',
    borderWidth: 1,
    borderColor: '#431621',
  },
  badgePill: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#431621',
  },
  badgePillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
    textAlign: 'center',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d8b4bc',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  bottomSection: {
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  settingsBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnActive: {
    backgroundColor: '#5d1f2e',
    borderColor: '#ffffff',
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
