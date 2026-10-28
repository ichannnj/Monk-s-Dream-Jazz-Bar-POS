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

  // Tablet-optimized dynamic grid column distribution
  const numColumns = useMemo(() => {
    if (windowWidth >= 1440) return 5;
    if (windowWidth >= 1140) return 4;
    if (windowWidth >= 740) return 3;
    return 2;
  }, [windowWidth]);

  const gridGap = 16;
  const cardWidth = useMemo(() => {
    if (gridWidth > 0) {
      return Math.floor((gridWidth - (numColumns - 1) * gridGap) / numColumns);
    }
    const fallbackPercent = ((100 - (numColumns - 1) * 1.6) / numColumns).toFixed(2);
    return `${fallbackPercent}%` as any;
  }, [gridWidth, numColumns]);

  const activeStaffName = propStaffName || currentUser?.displayName || 'Jess Santos';
  const activeStaffInitials =
    propStaffInitials ||
    (currentUser?.displayName
      ? currentUser.displayName
          .split(' ')
          .map((s) => s[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : 'JS');

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
              takeoutCustomer: o.customerName,
              takeoutPrepaid: o.isPrepaid,
              initialItems: o.items,
            });
            workflows.setIsOrderEntryOpen(true);
          }}
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
              onlinePlatform: o.platform,
              onlineRef: o.platformOrderRef,
              onlineRider: o.riderName,
              onlineCustomer: o.customerName,
              initialItems: o.items,
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
    </View>
  );
};
