import React from 'react';
import { ConfirmationModal } from '@/features/shared/ui/ConfirmationModal';
import { InventoryItemAdmin, SupplierAdmin } from '../../../../data/admin.api';
import { RestockIntakeModal } from '../RestockIntakeModal';
import { InventoryItemModal } from '../InventoryItemModal';
import { SupplierModal } from '../SupplierModal';
import { StocktakeAuditModal } from '../StocktakeAuditModal';
import { WasteLoggerModal } from '../WasteLoggerModal';
import { QuickAdjustStockModal } from '../QuickAdjustStockModal';
import { PhotoLightboxModal, type PhotoLightboxData } from './PhotoLightboxModal';

interface InventoryActionModalsProps {
  selectedRestockItem: InventoryItemAdmin | null;
  onCloseRestock: () => void;
  selectedAdjustItem: InventoryItemAdmin | null;
  onCloseAdjust: () => void;
  isItemModalOpen: boolean;
  onCloseItemModal: () => void;
  editingItem: InventoryItemAdmin | null;
  isSupplierModalOpen: boolean;
  onCloseSupplierModal: () => void;
  editingSupplier: SupplierAdmin | null;
  isStocktakeModalOpen: boolean;
  onCloseStocktakeModal: () => void;
  isWasteModalOpen: boolean;
  onCloseWasteModal: () => void;
  itemToDelete: InventoryItemAdmin | null;
  onCancelDeleteItem: () => void;
  onConfirmDeleteItem: () => void;
  supplierToDelete: SupplierAdmin | null;
  onCancelDeleteSupplier: () => void;
  onConfirmDeleteSupplier: () => void;
  isDeleting: boolean;
  lightboxPhoto: PhotoLightboxData | null;
  onCloseLightbox: () => void;
  inventory: InventoryItemAdmin[];
  suppliers: SupplierAdmin[];
  onRefreshAll: () => void;
}

export const InventoryActionModals: React.FC<InventoryActionModalsProps> = ({
  selectedRestockItem,
  onCloseRestock,
  selectedAdjustItem,
  onCloseAdjust,
  isItemModalOpen,
  onCloseItemModal,
  editingItem,
  isSupplierModalOpen,
  onCloseSupplierModal,
  editingSupplier,
  isStocktakeModalOpen,
  onCloseStocktakeModal,
  isWasteModalOpen,
  onCloseWasteModal,
  itemToDelete,
  onCancelDeleteItem,
  onConfirmDeleteItem,
  supplierToDelete,
  onCancelDeleteSupplier,
  onConfirmDeleteSupplier,
  isDeleting,
  lightboxPhoto,
  onCloseLightbox,
  inventory,
  suppliers,
  onRefreshAll,
}) => {
  return (
    <>
      <RestockIntakeModal
        visible={!!selectedRestockItem}
        item={selectedRestockItem}
        suppliers={suppliers}
        onClose={onCloseRestock}
        onSuccess={onRefreshAll}
      />

      <QuickAdjustStockModal
        visible={!!selectedAdjustItem}
        onClose={onCloseAdjust}
        item={selectedAdjustItem}
        onSuccess={onRefreshAll}
      />

      <InventoryItemModal
        visible={isItemModalOpen}
        onClose={onCloseItemModal}
        onSuccess={onRefreshAll}
        item={editingItem}
        suppliers={suppliers}
      />

      <SupplierModal
        visible={isSupplierModalOpen}
        onClose={onCloseSupplierModal}
        onSuccess={onRefreshAll}
        supplier={editingSupplier}
      />

      <StocktakeAuditModal
        visible={isStocktakeModalOpen}
        onClose={onCloseStocktakeModal}
        onSuccess={onRefreshAll}
        inventory={inventory}
      />

      <WasteLoggerModal
        visible={isWasteModalOpen}
        onClose={onCloseWasteModal}
        onSuccess={onRefreshAll}
        inventory={inventory}
      />

      <PhotoLightboxModal photo={lightboxPhoto} onClose={onCloseLightbox} />

      <ConfirmationModal
        visible={!!itemToDelete}
        title="Delete Inventory Item?"
        message={`Remove "${itemToDelete?.name || ''}" (${itemToDelete?.sku || ''})? Items with movement history cannot be deleted.`}
        confirmText="Delete Item"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={onConfirmDeleteItem}
        onCancel={onCancelDeleteItem}
      />

      <ConfirmationModal
        visible={!!supplierToDelete}
        title="Delete Supplier?"
        message={`Remove "${supplierToDelete?.name || ''}" from the supplier directory?`}
        confirmText="Delete Supplier"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={onConfirmDeleteSupplier}
        onCancel={onCancelDeleteSupplier}
      />
    </>
  );
};
