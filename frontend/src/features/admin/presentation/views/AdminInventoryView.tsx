import React from 'react';
import { View, ScrollView } from 'react-native';
import { type InventoryItemAdmin } from '../../data/admin.api';
import { useInventoryViewController } from './inventory/components/useInventoryViewController';
import { InventoryHeaderAndTabs } from './inventory/components/InventoryHeaderAndTabs';
import { InventoryStockKpiAndFilters } from './inventory/components/InventoryStockKpiAndFilters';
import { InventoryStockTable } from './inventory/components/InventoryStockTable';
import { InventoryGroceryListSection } from './inventory/components/InventoryGroceryListSection';
import { InventorySuppliersSection } from './inventory/components/InventorySuppliersSection';
import { InventoryMovementsAndAuditSection } from './inventory/components/InventoryMovementsAndAuditSection';
import { InventoryActionModals } from './inventory/components/InventoryActionModals';

export interface AdminInventoryViewProps {
  inventory: InventoryItemAdmin[];
  onRefresh: () => void;
}

export const AdminInventoryView: React.FC<AdminInventoryViewProps> = ({ inventory, onRefresh }) => {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    stockStatusFilter,
    setStockStatusFilter,
    ledgerTypeFilter,
    setLedgerTypeFilter,
    suppliers,
    stocktakeSessions,
    wasteLogs,
    selectedRestockItem,
    setSelectedRestockItem,
    selectedAdjustItem,
    setSelectedAdjustItem,
    isItemModalOpen,
    setIsItemModalOpen,
    editingItem,
    setEditingItem,
    isSupplierModalOpen,
    setIsSupplierModalOpen,
    editingSupplier,
    setEditingSupplier,
    isStocktakeModalOpen,
    setIsStocktakeModalOpen,
    isWasteModalOpen,
    setIsWasteModalOpen,
    itemToDelete,
    setItemToDelete,
    supplierToDelete,
    setSupplierToDelete,
    isDeleting,
    lightboxPhoto,
    setLightboxPhoto,
    totalValuation,
    inParItemsCount,
    belowParItemsCount,
    depletedItemsCount,
    toBuyItems,
    handleRefreshAll,
    requestDeleteItem,
    confirmDeleteItem,
    confirmDeleteSupplier,
    filteredInventory,
    filteredMovements,
  } = useInventoryViewController(inventory, onRefresh);

  return (
    <ScrollView
      className="flex-1 bg-[#FAF8F5] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      <InventoryHeaderAndTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        inventory={inventory}
        categoryFilter={categoryFilter}
        toBuyCount={toBuyItems.length}
        suppliersCount={suppliers.length}
        onAddItem={() => {
          setEditingItem(null);
          setIsItemModalOpen(true);
        }}
        onAddSupplier={() => {
          setEditingSupplier(null);
          setIsSupplierModalOpen(true);
        }}
        onRunStocktake={() => setIsStocktakeModalOpen(true)}
        onLogSpillage={() => setIsWasteModalOpen(true)}
      />

      {activeTab === 'stock' && (
        <View className="gap-4 pb-8">
          <InventoryStockKpiAndFilters
            inventory={inventory}
            totalValuation={totalValuation}
            inParItemsCount={inParItemsCount}
            belowParItemsCount={belowParItemsCount}
            depletedItemsCount={depletedItemsCount}
            stockStatusFilter={stockStatusFilter}
            setStockStatusFilter={setStockStatusFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            filteredCount={filteredInventory.length}
          />

          <InventoryStockTable
            filteredInventory={filteredInventory}
            onQuickCount={(item) => setSelectedAdjustItem(item)}
            onRestock={(item) => setSelectedRestockItem(item)}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsItemModalOpen(true);
            }}
            onDeleteItem={requestDeleteItem}
            onPreviewPhoto={setLightboxPhoto}
          />
        </View>
      )}

      {activeTab === 'grocery' && (
        <View className="pb-8">
          <InventoryGroceryListSection
            items={toBuyItems}
            suppliers={suppliers}
            onRestock={(item) => setSelectedRestockItem(item)}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsItemModalOpen(true);
            }}
            onPreviewPhoto={setLightboxPhoto}
          />
        </View>
      )}

      {activeTab === 'suppliers' && (
        <View className="pb-8">
          <InventorySuppliersSection
            suppliers={suppliers}
            onEditSupplier={(sup) => {
              setEditingSupplier(sup);
              setIsSupplierModalOpen(true);
            }}
            onDeleteSupplier={(sup) => setSupplierToDelete(sup)}
          />
        </View>
      )}

      {activeTab === 'activity' && (
        <View className="pb-8">
          <InventoryMovementsAndAuditSection
            filteredMovements={filteredMovements}
            stocktakeSessions={stocktakeSessions}
            wasteLogs={wasteLogs}
            ledgerTypeFilter={ledgerTypeFilter}
            setLedgerTypeFilter={setLedgerTypeFilter}
            onOpenStocktake={() => setIsStocktakeModalOpen(true)}
            onOpenWaste={() => setIsWasteModalOpen(true)}
          />
        </View>
      )}

      <InventoryActionModals
        selectedRestockItem={selectedRestockItem}
        onCloseRestock={() => setSelectedRestockItem(null)}
        selectedAdjustItem={selectedAdjustItem}
        onCloseAdjust={() => setSelectedAdjustItem(null)}
        isItemModalOpen={isItemModalOpen}
        onCloseItemModal={() => setIsItemModalOpen(false)}
        editingItem={editingItem}
        isSupplierModalOpen={isSupplierModalOpen}
        onCloseSupplierModal={() => setIsSupplierModalOpen(false)}
        editingSupplier={editingSupplier}
        isStocktakeModalOpen={isStocktakeModalOpen}
        onCloseStocktakeModal={() => setIsStocktakeModalOpen(false)}
        isWasteModalOpen={isWasteModalOpen}
        onCloseWasteModal={() => setIsWasteModalOpen(false)}
        itemToDelete={itemToDelete}
        onCancelDeleteItem={() => setItemToDelete(null)}
        onConfirmDeleteItem={confirmDeleteItem}
        supplierToDelete={supplierToDelete}
        onCancelDeleteSupplier={() => setSupplierToDelete(null)}
        onConfirmDeleteSupplier={confirmDeleteSupplier}
        isDeleting={isDeleting}
        lightboxPhoto={lightboxPhoto}
        onCloseLightbox={() => setLightboxPhoto(null)}
        inventory={inventory}
        suppliers={suppliers}
        onRefreshAll={handleRefreshAll}
      />
    </ScrollView>
  );
};

export default AdminInventoryView;
