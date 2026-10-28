import React from 'react';
import { OutOfStockModal } from '../../barista/modals/OutOfStockModal';
import { OutOfStockListModal } from '../../barista/modals/OutOfStockListModal';
import { AdjustStockModal } from '../../barista/modals/AdjustStockModal';
import { FohStatusModal } from '../../barista/modals/FohStatusModal';
import { StationSettingsModal } from '../modals/StationSettingsModal';
import { BarTicket, StockInventoryItem } from '../../barista/types';
import { BarProductStock } from '../../barista/modals/OutOfStockModal';

export interface KdsModalsProps {
  isAvailabilityModalOpen: boolean;
  onCloseAvailability: () => void;
  stationProducts: BarProductStock[];
  onToggleAvailability: (productId: string, willBeUnavailable: boolean, reason?: string) => void;

  isOutOfStockListModalOpen: boolean;
  onCloseOutOfStockList: () => void;
  outOfStockItems: BarProductStock[];
  onOpenAvailabilityManager: () => void;

  isStockModalOpen: boolean;
  onCloseStockModal: () => void;
  inventory: StockInventoryItem[];
  onUpdateStockCount: (id: string, delta: number) => void;

  fohModalTicket: BarTicket | null;
  onCloseFohModal: () => void;
  onSendSubstitutionRequest: (ticketId: string, suggestion: string) => void;
  onForceUnblock: (ticketId: string) => void;

  isSettingsModalOpen: boolean;
  onCloseSettings: () => void;
  isOnline: boolean;
  onToggleOnline: (online: boolean) => void;
  audioChimes: boolean;
  onToggleAudio: (chimes: boolean) => void;
  stationFilter: boolean;
  onToggleBarFilter: (filter: boolean) => void;
  onClockOut: () => void;
  stationTarget?: 'bar' | 'kitchen';
}

export const KdsModals: React.FC<KdsModalsProps> = ({
  isAvailabilityModalOpen,
  onCloseAvailability,
  stationProducts,
  onToggleAvailability,
  isOutOfStockListModalOpen,
  onCloseOutOfStockList,
  outOfStockItems,
  onOpenAvailabilityManager,
  isStockModalOpen,
  onCloseStockModal,
  inventory,
  onUpdateStockCount,
  fohModalTicket,
  onCloseFohModal,
  onSendSubstitutionRequest,
  onForceUnblock,
  isSettingsModalOpen,
  onCloseSettings,
  isOnline,
  onToggleOnline,
  audioChimes,
  onToggleAudio,
  stationFilter,
  onToggleBarFilter,
  onClockOut,
  stationTarget = 'bar',
}) => {
  return (
    <>
      <OutOfStockModal
        visible={isAvailabilityModalOpen}
        onClose={onCloseAvailability}
        products={stationProducts}
        onToggleAvailability={onToggleAvailability}
        stationTarget={stationTarget}
      />

      <OutOfStockListModal
        visible={isOutOfStockListModalOpen}
        onClose={onCloseOutOfStockList}
        outOfStockItems={outOfStockItems}
        onRestock={(id: string) => onToggleAvailability(id, false)}
        onOpenAvailabilityManager={onOpenAvailabilityManager}
      />

      <AdjustStockModal
        visible={isStockModalOpen}
        onClose={onCloseStockModal}
        inventory={inventory}
        onUpdateCount={onUpdateStockCount}
      />

      <FohStatusModal
        visible={Boolean(fohModalTicket)}
        ticket={fohModalTicket}
        onClose={onCloseFohModal}
        onSendSubstitutionRequest={onSendSubstitutionRequest}
        onForceUnblock={onForceUnblock}
        stationTarget={stationTarget}
      />

      <StationSettingsModal
        visible={isSettingsModalOpen}
        onClose={onCloseSettings}
        isOnline={isOnline}
        onToggleOnline={onToggleOnline}
        audioChimes={audioChimes}
        onToggleAudio={onToggleAudio}
        barOnlyFilter={stationFilter}
        onToggleBarFilter={onToggleBarFilter}
        onClockOut={onClockOut}
      />
    </>
  );
};
