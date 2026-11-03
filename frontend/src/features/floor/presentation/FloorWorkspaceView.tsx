import React, { useState, useMemo } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { useAuthStore } from '@/features/auth';
import { ChannelCategory } from '@/types/floor';
import { toast } from '@/features/shared/toast/useToastStore';
import { ConfirmationModal } from '@/features/shared';
import { UnifiedCommandBar, StatusFilter } from './UnifiedCommandBar';
import { FloorGridView } from './FloorGridView';
import { useFloorFilters } from './useFloorFilters';
import { useWaiterWorkflows } from '../application/useWaiterWorkflows';
import { WaiterModalsCluster } from './WaiterModalsCluster';
import { ManagerModeSwitchModal } from './ManagerModeSwitchModal';
import { useVenueStore } from '@/features/shared';
import { getStaffFirstName, getStaffInitials } from '@/features/shared/utils/staffHelpers';

export interface FloorWorkspaceViewProps {
  autoStartStation?: 'bar' | 'kitchen';
  staffName?: string;
  staffInitials?: string;
}

export const FloorWorkspaceView: React.FC<FloorWorkspaceViewProps> = ({
  autoStartStation,
  staffName: propStaffName,
  staffInitials: propStaffInitials,
}) => {
  const { currentUser } = useAuthStore();
  const { width: windowWidth } = useWindowDimensions();

  // Channel & Status Filter state
  const [selectedChannel, setSelectedChannel] = useState<ChannelCategory>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');

  // Venue operating mode & Manager mode switch modal state
  const { operatingMode, setOperatingMode } = useVenueStore();
  const [isModeSwitchModalOpen, setIsModeSwitchModalOpen] = useState(false);

  // Encapsulated Waiter Workflows with optional autoStartStation
  const workflows = useWaiterWorkflows({ autoStartStation });

  // Floor filtering & category counts via custom hook
  const {
    channelCounts,
    statusCounts,
    filteredTables,
    filteredTakeoutOrders,
    filteredOnlineOrders,
  } = useFloorFilters(
    workflows.tables,
    workflows.takeoutOrders,
    workflows.onlineOrders,
    selectedChannel,
    selectedStatus
  );

  const [gridWidth, setGridWidth] = useState<number>(0);

  // Phone-to-Desktop dynamic grid column distribution
  const numColumns = useMemo(() => {
    if (windowWidth >= 1440) return 5;
    if (windowWidth >= 1140) return 4;
    if (windowWidth >= 768) return 3;
    if (windowWidth >= 460) return 2;
    return 1;
  }, [windowWidth]);

  const gridGap = 16;
  const cardWidth = useMemo(() => {
    if (numColumns === 1) return '100%' as any;
    if (gridWidth > 0) {
      return Math.floor((gridWidth - (numColumns - 1) * gridGap) / numColumns);
    }
    const fallbackPercent = ((100 - (numColumns - 1) * 1.6) / numColumns).toFixed(2);
    return `${fallbackPercent}%` as any;
  }, [gridWidth, numColumns]);

  const activeStaffName = propStaffName || currentUser?.displayName || 'Floor Staff';
  const activeStaffInitials =
    propStaffInitials || getStaffInitials(currentUser?.displayName || 'Floor Staff');

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Unified Sleek Top Command Bar */}
        <UnifiedCommandBar
          selectedChannel={selectedChannel}
          onChannelChange={setSelectedChannel}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          channelCounts={channelCounts}
          statusCounts={statusCounts}
          onOpenTableTab={() => workflows.setIsOpenTabModalOpen(true)}
          onNewTakeout={() => workflows.setIsTakeoutModalOpen(true)}
          onInputOnlineOrder={() => workflows.setIsOnlineModalOpen(true)}
          staffName={activeStaffName}
          staffInitials={activeStaffInitials}
          operatingMode={operatingMode}
          onToggleOperatingMode={() => setIsModeSwitchModalOpen(true)}
        />

        {/* Combined Responsive Grid: Tables, Takeout Queue & Online Orders */}
        <FloorGridView
          cardWidth={cardWidth}
          filteredTables={filteredTables}
          filteredTakeoutOrders={filteredTakeoutOrders}
          filteredOnlineOrders={filteredOnlineOrders}
          onResetFilters={() => {
            setSelectedChannel('all');
            setSelectedStatus('all');
          }}
          onTablePress={workflows.handleTablePress}
          onTakeoutPress={(o) => {
            workflows.setOrderEntryContext({
              type: 'takeout',
              title: `Takeout #${o.ticketNumber} • "${o.customerName}"`,
              takeoutOrderId: o.id,
              takeoutCustomer: o.customerName,
              takeoutPrepaid: o.isPrepaid,
              takeoutNotes: o.notes,
              previousTabItems: o.items,
              initialItems: [],
            });
            workflows.setIsOrderEntryOpen(true);
          }}
          onTakeoutPay={(order, collectAfterPay) =>
            workflows.handleOpenTakeoutCheckout(order, collectAfterPay)
          }
          onTakeoutReady={(id) => {
            const o = workflows.takeoutOrders.find((x) => x.id === id);
            workflows.updateTakeoutStatus(id, 'ready');
            toast.success(
              `Takeout #${o?.ticketNumber || ''} (${o?.customerName || ''}) is READY for pickup!`,
              { title: 'Takeout Ready' }
            );
          }}
          onTakeoutCollected={(id) => {
            const o = workflows.takeoutOrders.find((x) => x.id === id);
            if (o && !o.isPrepaid) {
              workflows.handleOpenTakeoutCheckout(o, true);
              return;
            }
            workflows.setConfirmFloorAction({
              type: 'takeout_collected',
              id,
              title: `Hand Off Takeout #${o?.ticketNumber || ''}?`,
              message: `Mark Takeout order for "${o?.customerName || 'Guest'}" (${
                o?.items.length || 0
              } items) as collected and complete?`,
            });
          }}
          onOnlinePress={(o) => {
            workflows.setOrderEntryContext({
              type: 'online',
              title: `${o.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda'} #${o.platformOrderRef} • "${o.customerName}"`,
              onlineOrderId: o.id,
              onlinePlatform: o.platform,
              onlineRef: o.platformOrderRef,
              onlineRider: o.riderName,
              onlineCustomer: o.customerName,
              previousTabItems: o.items,
              initialItems: [],
            });
            workflows.setIsOrderEntryOpen(true);
          }}
          onOnlineReady={(id) => {
            const o = workflows.onlineOrders.find((x) => x.id === id);
            workflows.updateOnlineStatus(id, 'ready');
            const plat = o?.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
            toast.success(
              `${plat} #${o?.platformOrderRef || ''} bagged & READY for driver pickup!`,
              { title: 'Delivery Ready' }
            );
          }}
          onOnlineHandToRider={(id) => {
            const o = workflows.onlineOrders.find((x) => x.id === id);
            const plat = o?.platform === 'grabfood' ? 'GrabFood' : 'Foodpanda';
            workflows.setConfirmFloorAction({
              type: 'online_courier',
              id,
              title: `Hand Off to ${plat} Courier?`,
              message: `Confirm hand-off of ${plat} order #${o?.platformOrderRef || ''} to courier ${
                o?.riderName || 'Assigned Rider'
              }?`,
            });
          }}
          onLayoutGrid={(w) => setGridWidth(w)}
        />
      </ScrollView>

      {/* Modal Hub Cluster */}
      <WaiterModalsCluster
        tables={workflows.tables}
        takeoutOrdersCount={workflows.takeoutOrders.length}
        selectedTable={workflows.liveSelectedTable}
        isActionModalOpen={workflows.isActionModalOpen}
        onCloseActionModal={() => workflows.setIsActionModalOpen(false)}
        onOpenOrderEntryFromModal={workflows.handleOpenOrderEntryFromModal}
        onOpenNewSplitTab={workflows.handleOpenNewSplitTab}
        onCheckoutFromModal={workflows.handleOpenCheckout}
        onTransferTableFromModal={(t) => {
          workflows.setTableToTransfer(t);
          workflows.setIsTransferModalOpen(true);
        }}
        tableToTransfer={workflows.tableToTransfer}
        isTransferModalOpen={workflows.isTransferModalOpen}
        onCloseTransferModal={() => workflows.setIsTransferModalOpen(false)}
        onConfirmTransfer={workflows.handleConfirmTransfer}
        isOpenTabModalOpen={workflows.isOpenTabModalOpen}
        onCloseOpenTabModal={() => workflows.setIsOpenTabModalOpen(false)}
        isOpenDirectModalOpen={workflows.isOpenDirectModalOpen}
        onCloseOpenDirectModal={() => workflows.setIsOpenDirectModalOpen(false)}
        isSplitTabDirect={workflows.isSplitTabDirect}
        onConfirmOpenTab={workflows.handleConfirmOpenTab}
        isTakeoutModalOpen={workflows.isTakeoutModalOpen}
        onCloseTakeoutModal={() => workflows.setIsTakeoutModalOpen(false)}
        onProceedTakeout={workflows.handleProceedTakeout}
        isOnlineModalOpen={workflows.isOnlineModalOpen}
        onCloseOnlineModal={() => workflows.setIsOnlineModalOpen(false)}
        onProceedOnline={workflows.handleProceedOnline}
        isOrderEntryOpen={workflows.isOrderEntryOpen}
        orderEntryContext={workflows.orderEntryContext}
        onCloseOrderEntry={() => {
          workflows.setIsOrderEntryOpen(false);
          workflows.setOrderEntryContext(null);
        }}
        onSendOrder={workflows.handleOrderEntrySubmit}
        isCheckoutOpen={workflows.isCheckoutOpen}
        checkoutContext={workflows.checkoutContext}
        onCloseCheckout={() => {
          workflows.setIsCheckoutOpen(false);
          workflows.setCheckoutContext(null);
        }}
        onDeferTakeoutPayment={() => {
          const toOrder = workflows.checkoutContext?.takeoutOrder;
          workflows.setIsCheckoutOpen(false);
          workflows.setCheckoutContext(null);
          if (toOrder) {
            toast.info(`Takeout #${toOrder.ticketNumber} remains DUE on pickup.`, {
              title: 'Deferred to Pickup',
            });
          }
        }}
        onConfirmPayment={workflows.handleConfirmPayment}
      />

      {/* Confirmation Modal for Floor Quick Actions */}
      <ConfirmationModal
        visible={!!workflows.confirmFloorAction}
        title={workflows.confirmFloorAction?.title || 'Confirm Action'}
        message={workflows.confirmFloorAction?.message || 'Are you sure you want to proceed?'}
        confirmText="Confirm Hand-off"
        cancelText="Cancel"
        variant="success"
        onConfirm={workflows.handleExecuteFloorAction}
        onCancel={() => workflows.setConfirmFloorAction(null)}
      />

      {/* Manager Operating Mode Switch Modal */}
      <ManagerModeSwitchModal
        visible={isModeSwitchModalOpen}
        currentMode={operatingMode}
        isAdminUser={currentUser?.role === 'admin'}
        onClose={() => setIsModeSwitchModalOpen(false)}
        onConfirmSwitch={async (next) => {
          await setOperatingMode(next);
          toast.success(
            next === 'EVENT'
              ? '🎷 Event Mode Activated! New orders tagged for Live Jazz Set (auto-reverts to Cafe Mode at 6:00 AM).'
              : '☀️ Daytime Cafe Mode Activated! New orders tagged for Cafe.',
            { title: 'Operating Mode Updated' }
          );
        }}
      />
    </View>
  );
};
