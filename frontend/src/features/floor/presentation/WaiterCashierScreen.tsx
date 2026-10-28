import React, { useState, useMemo } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/features/auth';
import { useOrderStore } from '@/features/orders';
import { toast } from '@/features/shared/toast/useToastStore';
import { Sidebar, NavTabId } from '@/features/shared';
import { styles } from './WaiterCashierScreen.styles';
import { FloorWorkspaceView } from './FloorWorkspaceView';
import { ChecksHistoryView } from '@/features/check-history';
import { CashDrawerModalView } from '@/features/cash-drawer';
import { FloorAlertsView } from '@/features/alerts';
import { FloorChatView } from '@/features/chat';
import { PrinterTerminalScreen } from '@/features/printer';
import { ShiftSettingsModal } from './ShiftSettingsModal';

export const WaiterCashierScreen: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const alerts = useOrderStore((state) => state.alerts);

  const handleLogout = () => {
    toast.info('Terminal locked. Staff session ended.', { title: 'Clocked Out' });
    logout();
  };

  // Navigation state (Sidebar)
  const [activeNavTab, setActiveNavTab] = useState<NavTabId>('tables');

  // Unread badge counts
  const unreadAlerts = useMemo(() => alerts.filter((a) => !a.isRead).length, [alerts]);

  return (
    <View style={styles.screenContainer}>
      {/* 1. Dedicated Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeNavTab}
        onTabChange={setActiveNavTab}
        onLogout={handleLogout}
        alertCount={unreadAlerts}
        unreadChatCount={0}
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
          <ShiftSettingsModal onLogout={handleLogout} />
        )}
      </View>
    </View>
  );
};
