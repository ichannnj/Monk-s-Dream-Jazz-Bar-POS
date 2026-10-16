import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  LayoutGrid,
  MessageSquare,
  Receipt,
  Coins,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react-native';

const MONKS_DREAM_LOGO = require('../../../assets/Monks Dream Logo files-02.png');

export type NavTabId = 'tables' | 'chat' | 'checks' | 'drawer' | 'alerts' | 'settings';

interface SidebarProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  onLogout?: () => void;
  unreadChatCount?: number;
  alertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  unreadChatCount = 0,
  alertCount = 1,
}) => {
  const navItems = [
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
      id: 'alerts' as NavTabId,
      label: 'Alerts',
      Icon: Bell,
      hasDot: alertCount > 0,
    },
  ];

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
              style={[styles.navButton, isActive && styles.navButtonActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.iconWrapper}>
                <Icon
                  size={22}
                  color={isActive ? '#ffffff' : '#d8b4bc'}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                {item.hasDot ? <View style={styles.notificationDot} /> : null}
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Bottom: Settings & Logout */}
      <View style={styles.bottomSection}>
        <Pressable
          onPress={() => onTabChange('settings')}
          style={[styles.settingsBtn, activeTab === 'settings' && styles.settingsBtnActive]}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Settings size={20} color={activeTab === 'settings' ? '#ffffff' : '#d8b4bc'} />
        </Pressable>

        {onLogout ? (
          <Pressable
            onPress={onLogout}
            style={styles.logoutBtn}
            accessibilityRole="button"
            accessibilityLabel="Switch Staff User"
          >
            <LogOut size={18} color="#b38d95" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    width: 80,
    backgroundColor: '#431621',
    borderRadius: 26,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
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
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  navGroup: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  navButton: {
    width: 58,
    paddingVertical: 10,
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
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f43f5e',
    borderWidth: 1,
    borderColor: '#431621',
  },
  navLabel: {
    fontSize: 10.5,
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
    width: 44,
    height: 44,
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
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
