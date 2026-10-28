import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LayoutDashboard } from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
import { useOrderStore } from '@/features/orders';
import { toast } from '@/features/shared/toast/useToastStore';
import { Sidebar, NavTabId } from '@/features/shared';
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
  const { currentUser, logout } = useAuthStore();
  const alerts = useOrderStore((state) => state.alerts);
  const unreadChatCount = useChatStore((state) =>
    state.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  );

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
      {/* Return to Admin Dashboard Button for Managers */}
      {onSwitchToAdmin && (
        <View className="absolute top-3 right-5 z-50">
          <Pressable
            onPress={onSwitchToAdmin}
            className="flex-row items-center rounded-xl bg-[#800020] px-3.5 py-2 shadow-lg active:opacity-90"
          >
            <LayoutDashboard size={15} color="#ffffff" />
            <Text className="ml-2 text-xs font-bold text-white">Back to Admin Dashboard</Text>
          </Pressable>
        </View>
      )}

      {/* 1. Dedicated Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeNavTab}
        onTabChange={setActiveNavTab}
        onLogout={handleLogout}
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
          <ShiftSettingsModal onLogout={handleLogout} />
        )}
      </View>
    </View>
  );
};
