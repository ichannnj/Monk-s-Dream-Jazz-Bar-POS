import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from '@/features/shared/toast/useToastStore';
import {
  adminApi,
  type InventoryItemAdmin,
  type SupplierAdmin,
  type StockMovementAdmin,
  type StocktakeSessionAdmin,
  type WasteLogAdmin,
} from '../../../../data/admin.api';
import { cleanupInventoryImageObject } from '../../../../data/api/inventoryImage.service';
import { useWindowVisibilitySync } from '@/features/shared';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';
import { InventoryTab, StockStatusFilter } from './inventory.types';
import { getStockStatus } from '../utils/inventoryCalculations';
import type { PhotoLightboxData } from './PhotoLightboxModal';

export function useInventoryViewController(inventory: InventoryItemAdmin[], onRefresh: () => void) {
  const [activeTab, setActiveTab] = useState<InventoryTab>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatusFilter>('ALL');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('ALL');

  const [suppliers, setSuppliers] = useState<SupplierAdmin[]>([]);
  const [movements, setMovements] = useState<StockMovementAdmin[]>([]);
  const [stocktakeSessions, setStocktakeSessions] = useState<StocktakeSessionAdmin[]>([]);
  const [wasteLogs, setWasteLogs] = useState<WasteLogAdmin[]>([]);
  const [isLoadingSupporting, setIsLoadingSupporting] = useState(false);

  const [selectedRestockItem, setSelectedRestockItem] = useState<InventoryItemAdmin | null>(null);
  const [selectedAdjustItem, setSelectedAdjustItem] = useState<InventoryItemAdmin | null>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemAdmin | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierAdmin | null>(null);

  const [isStocktakeModalOpen, setIsStocktakeModalOpen] = useState(false);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<InventoryItemAdmin | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierAdmin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoLightboxData | null>(null);

  const totalValuation = useMemo(() => {
    return inventory.reduce((sum, item) => {
      const stock = Math.max(0, Number(item.current_stock || 0));
      const cost = Number(item.unit_cost || 0);
      return sum + stock * cost;
    }, 0);
  }, [inventory]);

  const inParItemsCount = useMemo(
    () =>
      inventory.filter(
        (item) => getStockStatus(item.current_stock, item.min_alert_level) === 'IN_PAR'
      ).length,
    [inventory]
  );

  const belowParItemsCount = useMemo(
    () =>
      inventory.filter(
        (item) => getStockStatus(item.current_stock, item.min_alert_level) === 'BELOW_PAR'
      ).length,
    [inventory]
  );

  const depletedItemsCount = useMemo(
    () =>
      inventory.filter(
        (item) => getStockStatus(item.current_stock, item.min_alert_level) === 'DEPLETED'
      ).length,
    [inventory]
  );

  const toBuyItems = useMemo(() => {
    return inventory
      .filter((item) => getStockStatus(item.current_stock, item.min_alert_level) !== 'IN_PAR')
      .sort((a, b) => {
        const aOut = Number(a.current_stock || 0) <= 0 ? 0 : 1;
        const bOut = Number(b.current_stock || 0) <= 0 ? 0 : 1;
        if (aOut !== bOut) return aOut - bOut;
        return a.name.localeCompare(b.name);
      });
  }, [inventory]);

  const loadSupportingData = useCallback(async () => {
    setIsLoadingSupporting(true);
    try {
      const [supsRes, movsRes, auditsRes, wasteRes] = await Promise.allSettled([
        adminApi.getSuppliers(),
        adminApi.getStockMovements(80),
        adminApi.getStocktakeSessions(25),
        adminApi.getWasteLogs(40),
      ]);
      if (supsRes.status === 'fulfilled') setSuppliers(supsRes.value);
      if (movsRes.status === 'fulfilled') setMovements(movsRes.value);
      if (auditsRes.status === 'fulfilled') setStocktakeSessions(auditsRes.value);
      if (wasteRes.status === 'fulfilled') setWasteLogs(wasteRes.value);
    } catch {
      toast.error('Failed to load inventory records', { title: 'Load Error' });
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
      onWasteLogChange: () => {
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

  const handleRefreshAll = useCallback(() => {
    loadSupportingData();
    onRefresh();
  }, [loadSupportingData, onRefresh]);

  const requestDeleteItem = (item: InventoryItemAdmin) => {
    const linked = item.linked_recipes || [];
    if (linked.length > 0) {
      const names = linked
        .slice(0, 3)
        .map((r) => r.name)
        .join(', ');
      const extra = linked.length > 3 ? ` (+${linked.length - 3} more)` : '';
      toast.error(`Used in recipes: ${names}${extra}. Remove it from those recipes first.`, {
        title: 'Cannot Delete Ingredient',
      });
      return;
    }
    setItemToDelete(item);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await adminApi.deleteInventoryItem(itemToDelete.id);
      if (itemToDelete.reference_image_storage_path) {
        cleanupInventoryImageObject(itemToDelete.reference_image_storage_path);
      }
      toast.success(`Deleted "${itemToDelete.name}"`, { title: 'Item Deleted' });
      setItemToDelete(null);
      handleRefreshAll();
    } catch (err: any) {
      toast.error(err?.message || 'Cannot delete item with historical ledger entries.', {
        title: 'Delete Blocked',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    try {
      await adminApi.deleteSupplier(supplierToDelete.id);
      toast.success(`Deleted supplier "${supplierToDelete.name}"`, { title: 'Supplier Deleted' });
      setSupplierToDelete(null);
      handleRefreshAll();
    } catch (err: any) {
      toast.error(err?.message || 'Cannot delete supplier with active records.', {
        title: 'Delete Error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredInventory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inventory.filter((item) => {
      const status = getStockStatus(item.current_stock, item.min_alert_level);
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.supplier?.name || '').toLowerCase().includes(q);
      const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchesStatus = stockStatusFilter === 'ALL' || status === stockStatusFilter;
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
    stocktakeSessions,
    wasteLogs,
    isLoadingSupporting,
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
  };
}
