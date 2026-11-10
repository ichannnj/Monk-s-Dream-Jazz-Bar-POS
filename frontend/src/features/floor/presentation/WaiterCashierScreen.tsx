import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { supabase } from '@/features/shared/infrastructure/supabase';
import { playKdsChime } from '@/features/shared/infrastructure/audio';
import { useAuthStore } from '@/features/auth';
import { useOrderStore } from '@/features/orders';
import { useRunnerTickets } from '@/features/kds/presentation/foh-runner/hooks/useRunnerTickets';
import { toast } from '@/features/shared/toast/useToastStore';
import { Sidebar, NavTabId, useResponsive } from '@/features/shared';
import { styles } from './WaiterCashierScreen.styles';
import { FloorWorkspaceView } from './FloorWorkspaceView';
import { FohWorkspaceView } from './foh/FohWorkspaceView';
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
  const { currentUser, lockTerminal, logout } = useAuthStore();
  const { isMobile } = useResponsive();
  const alerts = useOrderStore((state) => state.alerts);
  const unreadChatCount = useChatStore((state) =>
    state.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  );

  // FOH pass ticket queue & live ready counts
  const { runnerTickets, fullyReadyCount } = useRunnerTickets();

  // Heartbeat tracking to report runner station online status to PostgreSQL
  useEffect(() => {
    const sendHeartbeat = async (online: boolean) => {
      try {
        await (supabase.rpc as any)('report_station_heartbeat', {
          p_station_key: 'runner',
          p_user_id: (currentUser?.id || null) as any,
          p_is_online: online,
        });
      } catch (e) {
        console.warn('Failed to report runner heartbeat from Waiter/Cashier terminal:', e);
      }
    };

    sendHeartbeat(true);
    const timer = setInterval(() => sendHeartbeat(true), 60000);
    return () => {
      clearInterval(timer);
      sendHeartbeat(false);
    };
  }, [currentUser?.id]);

  // Audio-visual chime & toast notification for newly ready orders
  const prevReadyCountRef = useRef(fullyReadyCount);
  useEffect(() => {
    if (fullyReadyCount > prevReadyCountRef.current) {
      playKdsChime();
      const readyTicket = runnerTickets.find((t) => t.allDone);
      toast.success(
        readyTicket
          ? `Order for ${readyTicket.sourceTitle} is fully prepared!`
          : 'New order ready for table delivery!',
        { title: 'FOH Buzzout' }
      );
    }
    prevReadyCountRef.current = fullyReadyCount;
  }, [fullyReadyCount, runnerTickets]);

  const handleLockTerminal = () => {
    lockTerminal();
  };

  // Navigation state (Sidebar)
  const [activeNavTab, setActiveNavTab] = useState<NavTabId>('tables');

  // Unread badge counts
  const unreadAlerts = useMemo(() => alerts.filter((a) => !a.isRead).length, [alerts]);
  const hasPartialReady = useMemo(
    () => runnerTickets.some((t) => !t.allDone && t.readyItemsCount > 0),
    [runnerTickets]
  );

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
        fohBadgeCount={fullyReadyCount}
        fohHasDot={hasPartialReady}
      />

      {/* 2. Main Viewport */}
      <View style={styles.mainContent}>
        {activeNavTab === 'tables' ? (
          <FloorWorkspaceView />
        ) : activeNavTab === 'foh' ? (
          <FohWorkspaceView />
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
