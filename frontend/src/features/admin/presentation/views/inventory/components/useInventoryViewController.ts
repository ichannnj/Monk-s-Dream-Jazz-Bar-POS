import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from '@/features/shared/toast/useToastStore';
import {
  adminApi,
  type InventoryItemAdmin,
  type SupplierAdmin,
  type StockMovementAdmin,
} from '../../../../data/admin.api';
import { useWindowVisibilitySync } from '@/features/shared';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';
import { InventoryTab, StockStatusFilter, CATEGORY_FILTERS } from './inventory.types';

export function useInventoryViewController(inventory: InventoryItemAdmin[], onRefresh: () => void) {
  const [activeTab, setActiveTab] = useState<InventoryTab>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatusFilter>('ALL');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('ALL');

  const [suppliers, setSuppliers] = useState<SupplierAdmin[]>([]);
  const [movements, setMovements] = useState<StockMovementAdmin[]>([]);
  const [isLoadingSupporting, setIsLoadingSupporting] = useState(false);

  const [selectedRestockItem, setSelectedRestockItem] = useState<InventoryItemAdmin | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockInvoice, setRestockInvoice] = useState('');
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  const [selectedAdjustItem, setSelectedAdjustItem] = useState<InventoryItemAdmin | null>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemAdmin | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierAdmin | null>(null);

  const [isStocktakeModalOpen, setIsStocktakeModalOpen] = useState(false);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);

  const totalValuation = useMemo(() => {
    return inventory.reduce((sum, item) => {
      const stock = Math.max(0, Number(item.current_stock || 0));
      const cost = Number(item.unit_cost || 0);
      return sum + stock * cost;
    }, 0);
  }, [inventory]);

  const inParItemsCount = useMemo(() => {
    return inventory.filter(
      (item) => Number(item.current_stock || 0) > Number(item.min_alert_level || 0)
    ).length;
  }, [inventory]);

  const belowParItemsCount = useMemo(() => {
    return inventory.filter(
      (item) =>
        Number(item.current_stock || 0) <= Number(item.min_alert_level || 0) &&
        Number(item.current_stock || 0) > 0
    ).length;
  }, [inventory]);

  const depletedItemsCount = useMemo(() => {
    return inventory.filter((item) => Number(item.current_stock || 0) <= 0).length;
  }, [inventory]);

  const loadSupportingData = useCallback(async () => {
    setIsLoadingSupporting(true);
    try {
      const [supsRes, movsRes] = await Promise.allSettled([
        adminApi.getSuppliers(),
        adminApi.getStockMovements(80),
      ]);
      if (supsRes.status === 'fulfilled') {
        setSuppliers(supsRes.value);
      }
      if (movsRes.status === 'fulfilled') {
        setMovements(movsRes.value);
      }
    } catch {
      toast.error('Failed to load inventory movements or suppliers', { title: 'Load Error' });
    } finally {
      setIsLoadingSupporting(false);
    }
  }, []);

  useEffect(() => {
    loadSupportingData();
  }, [loadSupportingData]);

  useWindowVisibilitySync(() => {
    loadSupportingData();
    onRefresh();
  });

  useEffect(() => {
    const heartbeat = setInterval(() => {
      loadSupportingData();
      onRefresh();
    }, 10000);

    const unsub = realtimeGateway.subscribeGlobalPOSRealtime({
      onInventoryChange: () => {
        loadSupportingData();
        onRefresh();
      },
      onStockMovementChange: () => {
        loadSupportingData();
        onRefresh();
      },
      onPosSyncNeeded: () => {
        loadSupportingData();
        onRefresh();
      },
    });

    return () => {
      clearInterval(heartbeat);
      unsub();
    };
  }, [loadSupportingData, onRefresh]);

  const handleRefreshAll = () => {
    loadSupportingData();
    onRefresh();
  };

  const handleExecuteRestock = async () => {
    if (!selectedRestockItem || !restockQty || !restockCost) return;
    setIsSubmittingRestock(true);
    try {
      await adminApi.restockDelivery({
        inventoryItemId: selectedRestockItem.id,
        quantity: parseFloat(restockQty),
        invoiceUnitCost: parseFloat(restockCost),
        supplierName: selectedRestockItem.supplier?.name || undefined,
        invoiceNumber: restockInvoice.trim() || undefined,
      });
      toast.success(
        `Restocked ${restockQty} ${selectedRestockItem.unit} of ${selectedRestockItem.name} with updated Weighted MAC`,
        { title: 'Delivery Intake Recorded' }
      );
      setSelectedRestockItem(null);
      setRestockQty('');
      setRestockCost('');
      setRestockInvoice('');
      handleRefreshAll();
    } catch {
      toast.error('Failed to record restock intake', { title: 'Restock Error' });
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  const handleDeleteItem = async (item: InventoryItemAdmin) => {
    try {
      await adminApi.deleteInventoryItem(item.id);
      toast.success(`Deleted "${item.name}" from inventory`, { title: 'Item Deleted' });
      handleRefreshAll();
    } catch (err: any) {
      toast.error(err?.message || 'Cannot delete item linked to active recipes', {
        title: 'Delete Error',
      });
    }
  };

  const handleDeleteSupplier = async (sup: SupplierAdmin) => {
    try {
      await adminApi.deleteSupplier(sup.id);
      toast.success(`Deleted supplier "${sup.name}"`, { title: 'Supplier Deleted' });
      handleRefreshAll();
    } catch (err: any) {
      toast.error(err?.message || 'Cannot delete supplier with active purchase history', {
        title: 'Delete Error',
      });
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const stock = Number(item.current_stock || 0);
      const par = Number(item.min_alert_level || 0);

      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.supplier?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;

      let matchesStatus = true;
      if (stockStatusFilter === 'IN_PAR') {
        matchesStatus = stock > par;
      } else if (stockStatusFilter === 'BELOW_PAR') {
        matchesStatus = stock <= par && stock > 0;
      } else if (stockStatusFilter === 'DEPLETED') {
        matchesStatus = stock <= 0;
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [inventory, searchQuery, categoryFilter, stockStatusFilter]);

  const filteredMovements = useMemo(() => {
    if (ledgerTypeFilter === 'ALL') return movements;
    return movements.filter((m) => m.movement_type === ledgerTypeFilter);
  }, [movements, ledgerTypeFilter]);

  return {
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
  };
}
