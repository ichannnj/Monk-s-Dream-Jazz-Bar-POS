import { useState, useEffect } from 'react';
import { supabase } from '../../../shared/infrastructure/supabase';
import { useAuthStore } from '../../../auth/application/useAuthStore';
import { useOrderStore } from '../../../orders/application/useOrderStore';
import { toast } from '../../../shared/toast/useToastStore';
import { NavTabId } from '../../../shared/navigation/Sidebar';
import { BarTicket } from '../barista/types';
import { KdsStageFilter } from './components/KdsToolbar';

export interface UseKdsWorkstationControllerProps {
  stationTarget: 'bar' | 'kitchen';
  stationName: string;
}

export function useKdsWorkstationController({
  stationTarget,
  stationName,
}: UseKdsWorkstationControllerProps) {
  const { currentUser, logout, isOnline, setIsOnline } = useAuthStore();
  const alerts = useOrderStore((state) => state.alerts);
  const addAlert = useOrderStore((state) => state.addAlert);

  const [activeSidebarTab, setActiveSidebarTab] = useState<NavTabId>('board');
  const [mobileStage, setMobileStage] = useState<KdsStageFilter>('new');
  const [audioChimes, setAudioChimes] = useState(true);
  const [stationFilter, setStationFilter] = useState(true);

  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isOutOfStockListModalOpen, setIsOutOfStockListModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [fohModalTicket, setFohModalTicket] = useState<BarTicket | null>(null);

  // Heartbeat tracking to report real station online status to PostgreSQL
  useEffect(() => {
    const stationKey = stationTarget === 'kitchen' ? 'kitchen' : 'bar';

    const sendHeartbeat = async (online: boolean) => {
      try {
        await (supabase.rpc as any)('report_station_heartbeat', {
          p_station_key: stationKey,
          p_user_id: (currentUser?.id || null) as any,
          p_is_online: online,
        });
      } catch (e) {
        console.warn('Failed to report station heartbeat:', e);
      }
    };

    if (isOnline) {
      sendHeartbeat(true);
      const timer = setInterval(() => sendHeartbeat(true), 60000);
      return () => {
        clearInterval(timer);
        sendHeartbeat(false);
      };
    } else {
      sendHeartbeat(false);
    }
  }, [stationTarget, currentUser?.role, currentUser?.id, isOnline]);

  const unreadAlertCount = alerts.filter((a) => !a.isRead).length;

  const handleSendSubstitutionRequest = (ticket: BarTicket | undefined, suggestion: string) => {
    if (!ticket) return;

    const icon = stationTarget === 'kitchen' ? '🍳' : '🍸';
    addAlert({
      title: `${icon} ${stationName} Substitution Needed: ${ticket.tableOrSource}`,
      description: `Ticket ${ticket.orderNumber}: ${suggestion}. Waiter alerted.`,
      type: 'station_ready',
      targetRef: ticket.tableOrSource,
    });

    toast.success(`Prompt sent to waiter for ${ticket.tableOrSource}`);
  };

  const handleForceUnblock = (_ticketId: string) => {
    toast.success('Order unblocked. Proceeding with preparation.');
  };

  const handleSelectSidebarTab = (tab: NavTabId) => {
    if (tab === 'settings') {
      setIsSettingsModalOpen(true);
    } else if (stationTarget === 'kitchen' && (tab === 'tables' || tab === 'drawer')) {
      setActiveSidebarTab('board');
    } else {
      setActiveSidebarTab(tab);
    }
  };

  return {
    currentUser,
    logout,
    isOnline,
    setIsOnline,
    activeSidebarTab,
    setActiveSidebarTab,
    mobileStage,
    setMobileStage,
    audioChimes,
    setAudioChimes,
    stationFilter,
    setStationFilter,
    isAvailabilityModalOpen,
    setIsAvailabilityModalOpen,
    isOutOfStockListModalOpen,
    setIsOutOfStockListModalOpen,
    isStockModalOpen,
    setIsStockModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    fohModalTicket,
    setFohModalTicket,
    unreadAlertCount,
    handleSendSubstitutionRequest,
    handleForceUnblock,
    handleSelectSidebarTab,
  };
}
