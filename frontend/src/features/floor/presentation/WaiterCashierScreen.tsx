import React, { useState, useMemo } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/features/auth';
import { useOrderStore } from '@/features/orders';
import { toast } from '@/features/shared/toast/useToastStore';
import { Sidebar, NavTabId, useResponsive } from '@/features/shared';
import { styles } from './WaiterCashierScreen.styles';
import { FloorWorkspaceView } from './FloorWorkspaceView';
import { ChecksHistoryView } from '@/features/check-history';
import { CashDrawerModalView } from '@/features/cash-drawer';
import { FloorAlertsView } from '@/features/alerts';
import { FloorChatView, useChatStore } from '@/features/chat';
import { PrinterTerminalScreen } from '@/features/printer';
import { ShiftSettingsModal } from './ShiftSettingsModal';

interface WaiterCashierScreenProps {
  onSwitchToAdmin?: () => void;
}

export const WaiterCashierScreen: React.FC<WaiterCashierScreenProps> = ({ onSwitchToAdmin }) => {
  const { lockTerminal, logout } = useAuthStore();
  const { isMobile } = useResponsive();
  const alerts = useOrderStore((state) => state.alerts);
  const unreadChatCount = useChatStore((state) =>
    state.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  );

  const handleLockTerminal = () => {
    lockTerminal();
  };

  // Navigation state (Sidebar)
  const [activeNavTab, setActiveNavTab] = useState<NavTabId>('tables');

  // Unread badge counts
  const unreadAlerts = useMemo(() => alerts.filter((a) => !a.isRead).length, [alerts]);

  return (
    <View style={[styles.screenContainer, isMobile && styles.screenContainerMobile]}>
      {/* 1. Navigation Sidebar (Top Bar on Mobile <768px | Left Rail on >=768px) */}
      <Sidebar
        activeTab={activeNavTab}
        onTabChange={setActiveNavTab}
        onLogout={handleLockTerminal}
        onSwitchToAdmin={onSwitchToAdmin}
        alertCount={unreadAlerts}
        unreadChatCount={unreadChatCount}
      />

      {/* 2. Main Viewport */}
      <View style={styles.mainContent}>
        {activeNavTab === 'tables' ? (
          <FloorWorkspaceView />
        ) : activeNavTab === 'checks' ? (
          <ChecksHistoryView />
        ) : activeNavTab === 'drawer' ? (
          <CashDrawerModalView initialDrawer="main" />
        ) : activeNavTab === 'printer' ? (
          <PrinterTerminalScreen />
        ) : activeNavTab === 'alerts' ? (
          <FloorAlertsView />
        ) : activeNavTab === 'chat' ? (
          <FloorChatView />
        ) : (
          <ShiftSettingsModal onLock={handleLockTerminal} onLogout={logout} />
        )}
      </View>
    </View>
  );
};
