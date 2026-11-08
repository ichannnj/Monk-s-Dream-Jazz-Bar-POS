import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { toast } from '../../../shared/toast/useToastStore';
import { Sidebar } from '../../../shared/navigation/Sidebar';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { BaristaKanbanColumn } from '../barista/components/BaristaKanbanColumn';
import { KdsModals } from './components/KdsModals';
import { KdsToolbar } from './components/KdsToolbar';
import { SharedChatView } from '../../../chat/presentation/SharedChatView';
import { useChatStore } from '../../../chat';
import { SharedAlertsView } from '../../../alerts/presentation/SharedAlertsView';
import { FloorWorkspaceView } from '../../../floor';
import { ChecksHistoryView } from '../../../check-history';
import { CashDrawerModalView } from '../../../cash-drawer';
import { useKdsStock } from './hooks/useKdsStock';
import { useKdsTickets } from './hooks/useKdsTickets';
import { useKdsArrivals } from './hooks/useKdsArrivals';
import { useKdsWorkstationController } from './useKdsWorkstationController';

export interface UnifiedKdsScreenProps {
  stationTarget: 'bar' | 'kitchen';
  stationName: string;
  stationSubtitle: string;
  defaultStaffName: string;
  defaultStaffRole: string;
  defaultStaffInitials: string;
  chatSenderRole: string;
  chatDefaultChannel: 'bar' | 'kitchen';
}

export const UnifiedKdsScreen: React.FC<UnifiedKdsScreenProps> = ({
  stationTarget,
  stationName,
  stationSubtitle,
  defaultStaffName,
  defaultStaffRole,
  defaultStaffInitials,
  chatSenderRole,
  chatDefaultChannel,
}) => {
  const { isMobile } = useResponsive();

  const {
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
  } = useKdsWorkstationController({ stationTarget, stationName });

  const {
    inventory,
    stationProducts,
    outOfStockItems,
    handleToggleAvailability,
    handleUpdateStockCount,
  } = useKdsStock({ stationTarget });

  const {
    allTickets,
    newTickets,
    preparingTickets,
    readyTickets,
    activeTicketsCount,
    handleStartTicket,
    handleReadyTicket,
    handleDismissReadyTicket,
    handleRecallTicket,
    handleToggleItem,
  } = useKdsTickets({ stationTarget, inventory });

  useKdsArrivals({ newTickets, audioChimes, stationName });

  const unreadChatCount = useChatStore((state) =>
    state.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  );

  const staffDisplayName = currentUser?.displayName || defaultStaffName;
  const staffInitials =
    staffDisplayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || defaultStaffInitials;

  return (
    <View style={[styles.screenContainer, isMobile && styles.screenContainerMobile]}>
      {/* 1. App-Wide Navigation Sidebar (mode="kds") */}
      <Sidebar
        mode="kds"
        activeTab={activeSidebarTab}
        onTabChange={handleSelectSidebarTab}
        onLogout={() => {
          toast.info(`${stationName} locked.`, { title: 'Clocked Out' });
          logout();
        }}
        unreadChatCount={unreadChatCount}
        alertCount={unreadAlertCount}
        hiddenTabs={stationTarget === 'kitchen' ? ['tables', 'drawer'] : []}
      />

      {/* 2. Main Content Container */}
      <View
        style={[
          styles.mainContent,
          isMobile && styles.mainContentMobile,
          (activeSidebarTab === 'chat' || activeSidebarTab === 'tables') && styles.mainContentFlush,
        ]}
      >
        {activeSidebarTab === 'tables' && stationTarget !== 'kitchen' ? (
          <FloorWorkspaceView
            autoStartStation={stationTarget}
            staffName={staffDisplayName}
            staffInitials={staffInitials}
          />
        ) : activeSidebarTab === 'checks' ? (
          <ChecksHistoryView />
        ) : activeSidebarTab === 'drawer' && stationTarget !== 'kitchen' ? (
          <CashDrawerModalView initialDrawer="bar" />
        ) : activeSidebarTab === 'chat' ? (
          <SharedChatView
            senderName={staffDisplayName}
            senderRole={chatSenderRole}
            defaultChannel={chatDefaultChannel}
            onBack={() => setActiveSidebarTab('board')}
          />
        ) : activeSidebarTab === 'alerts' ? (
          <SharedAlertsView onBack={() => setActiveSidebarTab('board')} />
        ) : (
          <>
            <KdsToolbar
              stationName={stationName}
              isOnline={isOnline}
              staffName={staffDisplayName}
              staffInitials={staffInitials}
              onStaffPress={() => setIsSettingsModalOpen(true)}
              stationSubtitle={stationSubtitle}
              activeTicketsCount={activeTicketsCount}
              outOfStockCount={outOfStockItems.length}
              newCount={newTickets.length}
              preparingCount={preparingTickets.length}
              readyCount={readyTickets.length}
              mobileStage={mobileStage}
              onMobileStageChange={setMobileStage}
              onOpenAvailability={() => setIsAvailabilityModalOpen(true)}
              onOpenOutOfStockList={() => setIsOutOfStockListModalOpen(true)}
              onOpenStockAdjust={() => setIsStockModalOpen(true)}
            />

            {/* 3. Kanban Board */}
            <View style={styles.kanbanBoard}>
              {(!isMobile || mobileStage === 'new') && (
                <BaristaKanbanColumn
                  stage="new"
                  title="New"
                  count={newTickets.length}
                  tickets={newTickets}
                  overflowCount={newTickets.length > 2 ? newTickets.length - 1 : 0}
                  onStartTicket={handleStartTicket}
                  onViewFohStatus={(ticket) => setFohModalTicket(ticket)}
                  onToggleItem={handleToggleItem}
                />
              )}

              {(!isMobile || mobileStage === 'preparing') && (
                <BaristaKanbanColumn
                  stage="preparing"
                  title="Preparing"
                  count={preparingTickets.length}
                  tickets={preparingTickets}
                  overflowCount={preparingTickets.length > 2 ? preparingTickets.length - 1 : 1}
                  onReadyTicket={handleReadyTicket}
                  onReadyBlockedPress={(ticket) => setFohModalTicket(ticket)}
                  onToggleItem={handleToggleItem}
                />
              )}

              {(!isMobile || mobileStage === 'ready') && (
                <BaristaKanbanColumn
                  stage="ready"
                  title="Ready"
                  count={readyTickets.length}
                  tickets={readyTickets}
                  overflowCount={readyTickets.length > 2 ? 1 : 0}
                  onRecallTicket={handleRecallTicket}
                  onDismissTicket={handleDismissReadyTicket}
                  onToggleItem={handleToggleItem}
                />
              )}
            </View>
          </>
        )}
      </View>

      {/* Floating Chat Bubble at bottom-right */}
      {activeSidebarTab === 'board' ? (
        <Pressable
          onPress={() => setActiveSidebarTab('chat')}
          style={({ pressed }) => [styles.floatingChatBtn, pressed && styles.floatingChatPressed]}
        >
          <MessageSquare size={24} color="#ffffff" strokeWidth={2.2} />
          {unreadChatCount > 0 && (
            <View style={styles.floatingChatBadge}>
              <Text style={styles.floatingChatBadgeText}>{unreadChatCount}</Text>
            </View>
          )}
        </Pressable>
      ) : null}

      {/* Modals & Drawers */}
      <KdsModals
        isAvailabilityModalOpen={isAvailabilityModalOpen}
        onCloseAvailability={() => setIsAvailabilityModalOpen(false)}
        stationProducts={stationProducts}
        onToggleAvailability={handleToggleAvailability}
        isOutOfStockListModalOpen={isOutOfStockListModalOpen}
        onCloseOutOfStockList={() => setIsOutOfStockListModalOpen(false)}
        outOfStockItems={outOfStockItems}
        onOpenAvailabilityManager={() => setIsAvailabilityModalOpen(true)}
        isStockModalOpen={isStockModalOpen}
        onCloseStockModal={() => setIsStockModalOpen(false)}
        inventory={inventory}
        onUpdateStockCount={handleUpdateStockCount}
        fohModalTicket={fohModalTicket}
        onCloseFohModal={() => setFohModalTicket(null)}
        onSendSubstitutionRequest={(id, sug) =>
          handleSendSubstitutionRequest(
            allTickets.find((t) => t.id === id),
            sug
          )
        }
        onForceUnblock={handleForceUnblock}
        isSettingsModalOpen={isSettingsModalOpen}
        onCloseSettings={() => setIsSettingsModalOpen(false)}
        isOnline={isOnline}
        onToggleOnline={setIsOnline}
        audioChimes={audioChimes}
        onToggleAudio={setAudioChimes}
        stationFilter={stationFilter}
        onToggleBarFilter={setStationFilter}
        onClockOut={() => {
          toast.info(`${stationName} locked.`, { title: 'Clocked Out' });
          logout();
        }}
        stationTarget={stationTarget}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f6f0ed',
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 18,
  },
  screenContainerMobile: {
    flexDirection: 'column',
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 10,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  mainContentMobile: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 8,
  },
  mainContentFlush: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  kanbanBoard: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  floatingChatBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#832238',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#832238',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
  },
  floatingChatPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  floatingChatBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  floatingChatBadgeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
