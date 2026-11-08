import React from 'react';
import { View, ScrollView } from 'react-native';
import { type InventoryItemAdmin } from '../../data/admin.api';
import { useInventoryViewController } from './inventory/components/useInventoryViewController';
import { InventoryHeaderAndTabs } from './inventory/components/InventoryHeaderAndTabs';
import { InventoryStockKpiAndFilters } from './inventory/components/InventoryStockKpiAndFilters';
import { InventoryStockTable } from './inventory/components/InventoryStockTable';
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
    movements,
    isLoadingSupporting,
    selectedRestockItem,
    setSelectedRestockItem,
    restockQty,
    setRestockQty,
    restockCost,
    setRestockCost,
    restockInvoice,
    setRestockInvoice,
    isSubmittingRestock,
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
    totalValuation,
    inParItemsCount,
    belowParItemsCount,
    depletedItemsCount,
    handleRefreshAll,
    handleExecuteRestock,
    handleDeleteItem,
    handleDeleteSupplier,
    filteredInventory,
    filteredMovements,
  } = useInventoryViewController(inventory, onRefresh);

  return (
    <ScrollView
      className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      <InventoryHeaderAndTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        inventory={inventory}
        categoryFilter={categoryFilter}
        suppliersCount={suppliers.length}
        movementsCount={movements.length}
        isLoadingSupporting={isLoadingSupporting}
        handleRefreshAll={handleRefreshAll}
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

      {/* TAB 1: STOCK ON-HAND & REAL-TIME ALERTS */}
      {activeTab === 'stock' && (
        <View className="space-y-6">
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
            onDeleteItem={handleDeleteItem}
          />
        </View>
      )}

      {/* TAB 2: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <InventorySuppliersSection
          suppliers={suppliers}
          onEditSupplier={(sup) => {
            setEditingSupplier(sup);
            setIsSupplierModalOpen(true);
          }}
          onDeleteSupplier={handleDeleteSupplier}
        />
      )}

      {/* TABS 3, 4, 5: LEDGER, STOCKTAKE, WASTE */}
      {(activeTab === 'ledger' || activeTab === 'stocktake' || activeTab === 'waste') && (
        <InventoryMovementsAndAuditSection
          activeTab={activeTab}
          filteredMovements={filteredMovements}
          ledgerTypeFilter={ledgerTypeFilter}
          setLedgerTypeFilter={setLedgerTypeFilter}
          onOpenStocktake={() => setIsStocktakeModalOpen(true)}
          onOpenWaste={() => setIsWasteModalOpen(true)}
        />
      )}

      <InventoryActionModals
        selectedRestockItem={selectedRestockItem}
        onCloseRestock={() => setSelectedRestockItem(null)}
        restockQty={restockQty}
        setRestockQty={setRestockQty}
        restockCost={restockCost}
        setRestockCost={setRestockCost}
        restockInvoice={restockInvoice}
        setRestockInvoice={setRestockInvoice}
        isSubmittingRestock={isSubmittingRestock}
        handleExecuteRestock={handleExecuteRestock}
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
        inventory={inventory}
        suppliers={suppliers}
        onRefreshAll={handleRefreshAll}
      />
    </ScrollView>
  );
};

export default AdminInventoryView;
