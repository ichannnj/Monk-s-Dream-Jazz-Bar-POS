import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Package } from 'lucide-react-native';
import { AdminModal, AdminInput, AdminNumberInput } from '../../../components';
import { InventoryItemAdmin, SupplierAdmin } from '../../../../data/admin.api';
import { InventoryItemModal } from '../InventoryItemModal';
import { SupplierModal } from '../SupplierModal';
import { StocktakeAuditModal } from '../StocktakeAuditModal';
import { WasteLoggerModal } from '../WasteLoggerModal';
import { QuickAdjustStockModal } from '../QuickAdjustStockModal';

interface InventoryActionModalsProps {
  selectedRestockItem: InventoryItemAdmin | null;
  onCloseRestock: () => void;
  restockQty: string;
  setRestockQty: (val: string) => void;
  restockCost: string;
  setRestockCost: (val: string) => void;
  restockInvoice: string;
  setRestockInvoice: (val: string) => void;
  isSubmittingRestock: boolean;
  handleExecuteRestock: () => void;
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
  inventory: InventoryItemAdmin[];
  suppliers: SupplierAdmin[];
  onRefreshAll: () => void;
}

export const InventoryActionModals: React.FC<InventoryActionModalsProps> = ({
  selectedRestockItem,
  onCloseRestock,
  restockQty,
  setRestockQty,
  restockCost,
  setRestockCost,
  restockInvoice,
  setRestockInvoice,
  isSubmittingRestock,
  handleExecuteRestock,
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
  inventory,
  suppliers,
  onRefreshAll,
}) => {
  return (
    <>
      {/* RESTOCK INTAKE MODAL (With Live MAC) */}
      <AdminModal
        visible={!!selectedRestockItem}
        onClose={onCloseRestock}
        title={`Restock Intake: ${selectedRestockItem?.name || ''}`}
        subtitle={`Current Stock: ${selectedRestockItem?.current_stock || 0} ${selectedRestockItem?.unit || ''} • Current MAC: ₱${Number(selectedRestockItem?.unit_cost || 0).toFixed(2)}`}
        icon={<Package size={22} color="#800020" />}
        size="md"
        footer={
          <>
            <Pressable
              onPress={onCloseRestock}
              disabled={isSubmittingRestock}
              className="min-h-[48px] rounded-xl bg-stone-100 px-5 items-center justify-center active:bg-stone-200"
            >
              <Text className="text-base font-bold text-stone-700">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleExecuteRestock}
              disabled={isSubmittingRestock}
              className="min-h-[48px] rounded-xl bg-[#800020] px-6 items-center justify-center active:opacity-90"
            >
              <Text className="text-base font-bold text-white">
                {isSubmittingRestock ? 'Intaking...' : 'Confirm Delivery'}
              </Text>
            </Pressable>
          </>
        }
      >
        <View className="space-y-4">
          <AdminNumberInput
            label={`Received Quantity (${selectedRestockItem?.unit || 'unit'})`}
            mode="decimal"
            value={restockQty}
            onChangeText={setRestockQty}
            placeholder="e.g. 10"
            suffix={selectedRestockItem?.unit}
          />

          <AdminNumberInput
            label={`Invoice Unit Cost (₱ / ${selectedRestockItem?.unit || 'unit'})`}
            mode="currency"
            value={restockCost}
            onChangeText={setRestockCost}
            placeholder="e.g. 25.50"
          />

          <AdminInput
            label="Invoice / PO Reference #:"
            value={restockInvoice}
            onChangeText={setRestockInvoice}
            placeholder="e.g. INV-99218"
          />
        </View>
      </AdminModal>

      {/* FAST IN-LINE STOCK COUNT ADJUST MODAL */}
      <QuickAdjustStockModal
        visible={!!selectedAdjustItem}
        onClose={onCloseAdjust}
        item={selectedAdjustItem}
        onSuccess={onRefreshAll}
      />

      {/* FULL INVENTORY ITEM CRUD MODAL */}
      <InventoryItemModal
        visible={isItemModalOpen}
        onClose={onCloseItemModal}
        onSuccess={onRefreshAll}
        item={editingItem}
        suppliers={suppliers}
      />

      {/* FULL SUPPLIER MODAL */}
      <SupplierModal
        visible={isSupplierModalOpen}
        onClose={onCloseSupplierModal}
        onSuccess={onRefreshAll}
        supplier={editingSupplier}
      />

      {/* STOCKTAKE AUDIT MODAL */}
      <StocktakeAuditModal
        visible={isStocktakeModalOpen}
        onClose={onCloseStocktakeModal}
        onSuccess={onRefreshAll}
        inventory={inventory}
      />

      {/* WASTE LOGGER MODAL */}
      <WasteLoggerModal
        visible={isWasteModalOpen}
        onClose={onCloseWasteModal}
        onSuccess={onRefreshAll}
        inventory={inventory}
      />
    </>
  );
};
