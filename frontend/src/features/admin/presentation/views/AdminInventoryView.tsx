import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  Package,
  Plus,
  Building2,
  FileText,
  ClipboardCheck,
  Trash2,
  Search,
  Edit,
  ArrowDownRight,
  ArrowUpRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sliders,
  Boxes,
  RefreshCw,
  Layers,
  Phone,
  Mail,
  Clock,
  MapPin,
  Sparkles,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { formatCurrency } from '@monks/shared';
import {
  adminApi,
  type InventoryItemAdmin,
  type SupplierAdmin,
  type StockMovementAdmin,
} from '../../data/admin.api';
import { exportInventoryValuationToExcel } from '../../utils/readingExcelExport';
import { InventoryItemModal } from './inventory/InventoryItemModal';
import { SupplierModal } from './inventory/SupplierModal';
import { StocktakeAuditModal } from './inventory/StocktakeAuditModal';
import { WasteLoggerModal } from './inventory/WasteLoggerModal';
import { QuickAdjustStockModal } from './inventory/QuickAdjustStockModal';
import { AdminModal, AdminInput, AdminNumberInput } from '../components';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';

type InventoryTab = 'stock' | 'suppliers' | 'ledger' | 'stocktake' | 'waste';
type StockStatusFilter = 'ALL' | 'IN_PAR' | 'BELOW_PAR' | 'DEPLETED';

interface AdminInventoryViewProps {
  inventory: InventoryItemAdmin[];
  onRefresh: () => void;
}

const CATEGORY_FILTERS = [
  { key: 'ALL', label: 'All Categories' },
  { key: 'COFFEE_TEA', label: '☕ Coffee & Tea' },
  { key: 'SPIRITS_LIQUOR', label: '🥃 Spirits & Liquor' },
  { key: 'WINE_BEER', label: '🍷 Wine & Beer' },
  { key: 'DAIRY_PLANT', label: '🥛 Dairy & Milks' },
  { key: 'SYRUPS_MIXERS', label: '🍯 Syrups & Mixers' },
  { key: 'KITCHEN_MEAT', label: '🥩 Kitchen Meats' },
  { key: 'PRODUCE', label: '🥬 Fresh Produce' },
  { key: 'DRY_GOODS', label: '🍝 Dry Goods' },
  { key: 'PACKAGING', label: '📦 Disposables & Packaging' },
];

export const AdminInventoryView: React.FC<AdminInventoryViewProps> = ({ inventory, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatusFilter>('ALL');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('ALL');

  // Supporting entities
  const [suppliers, setSuppliers] = useState<SupplierAdmin[]>([]);
  const [movements, setMovements] = useState<StockMovementAdmin[]>([]);
  const [isLoadingSupporting, setIsLoadingSupporting] = useState(false);

  // Restock Intake state
  const [selectedRestockItem, setSelectedRestockItem] = useState<InventoryItemAdmin | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockInvoice, setRestockInvoice] = useState('');
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  // Quick In-Line Stock Adjust state
  const [selectedAdjustItem, setSelectedAdjustItem] = useState<InventoryItemAdmin | null>(null);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemAdmin | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierAdmin | null>(null);

  const [isStocktakeModalOpen, setIsStocktakeModalOpen] = useState(false);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);

  // Executive KPI Calculations
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

  // Real-time synchronization: quiet refresh when items are depleted on KDS ready, restocked, or adjusted
  useEffect(() => {
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

    return () => unsub();
  }, [loadSupportingData, onRefresh]);

  const handleRefreshAll = () => {
    loadSupportingData();
    onRefresh();
  };

  // Restock Intake Submit
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

  // Filtered Inventory Items
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const stock = Number(item.current_stock || 0);
      const par = Number(item.min_alert_level || 0);

      // 1. Text Search
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.supplier?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Category
      const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;

      // 3. Status Filter Pill
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

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    if (ledgerTypeFilter === 'ALL') return movements;
    return movements.filter((m) => m.movement_type === ledgerTypeFilter);
  }, [movements, ledgerTypeFilter]);

  const inventoryTabItems: Array<{
    id: InventoryTab;
    label: string;
    icon: React.ComponentType<{ size: number; color: string }>;
    count?: number;
  }> = [
    { id: 'stock', label: 'Stock & Par Alerts', icon: Package, count: inventory.length },
    { id: 'suppliers', label: 'Suppliers Directory', icon: Building2, count: suppliers.length },
    { id: 'ledger', label: 'Movement Ledger', icon: FileText, count: movements.length },
    { id: 'stocktake', label: 'Physical Stocktake', icon: ClipboardCheck },
    { id: 'waste', label: 'Waste & Spillage', icon: Trash2 },
  ];

  const categoryDropdownOptions: PosDropdownOption<string>[] = CATEGORY_FILTERS.map((f) => ({
    value: f.key,
    label: f.label,
  }));

  return (
    <ScrollView
      className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header & Context Actions */}
      <View className="mb-6 flex-col lg:flex-row lg:items-center justify-between gap-4">
        <View>
          <View className="flex-row items-center gap-2 mb-1">
            <View className="h-8 w-8 rounded-lg bg-[#800020]/10 items-center justify-center">
              <Boxes size={18} color="#800020" />
            </View>
            <Text className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900">
              Inventory &amp; Depletion Hub
            </Text>
          </View>
          <Text className="text-sm font-medium text-stone-500">
            Real-time recipe depletion on KDS ready, non-blocking par safeguards, and weighted MAC
            valuation
          </Text>
        </View>

        {/* Global Hub Action Buttons */}
        <View className="flex-row items-center gap-2.5 flex-wrap">
          <Pressable
            onPress={handleRefreshAll}
            className="min-h-[44px] flex-row items-center justify-center rounded-xl border border-stone-200 bg-white px-3.5 active:bg-stone-50 shadow-xs"
            accessibilityLabel="Refresh Inventory Data"
          >
            <RefreshCw
              size={16}
              color="#44403c"
              className={isLoadingSupporting ? 'animate-spin' : ''}
            />
            <Text className="ml-1.5 text-xs sm:text-sm font-bold text-stone-700">Refresh</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              try {
                exportInventoryValuationToExcel(inventory, categoryFilter);
                toast.success('Inventory valuation exported to Excel (.xls)', {
                  title: 'Excel Export Ready',
                });
              } catch (err) {
                console.error('[AdminInventoryView] Export error:', err);
                toast.error('Failed to export inventory spreadsheet', { title: 'Export Error' });
              }
            }}
            className="min-h-[44px] flex-row items-center justify-center rounded-xl border border-stone-200 bg-white px-3.5 active:bg-stone-50 shadow-xs"
            accessibilityLabel="Export Inventory Valuation to Excel"
          >
            <FileSpreadsheet size={16} color="#047857" />
            <Text className="ml-1.5 text-xs sm:text-sm font-bold text-stone-800">Export Excel</Text>
          </Pressable>

          {activeTab === 'stock' && (
            <Pressable
              onPress={() => {
                setEditingItem(null);
                setIsItemModalOpen(true);
              }}
              className="min-h-[44px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-sm"
            >
              <Plus size={18} color="#ffffff" />
              <Text className="ml-1.5 text-sm font-bold text-white">+ Add Item</Text>
            </Pressable>
          )}

          {activeTab === 'suppliers' && (
            <Pressable
              onPress={() => {
                setEditingSupplier(null);
                setIsSupplierModalOpen(true);
              }}
              className="min-h-[44px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-sm"
            >
              <Building2 size={18} color="#ffffff" />
              <Text className="ml-1.5 text-sm font-bold text-white">+ Add Supplier</Text>
            </Pressable>
          )}

          {activeTab === 'stocktake' && (
            <Pressable
              onPress={() => setIsStocktakeModalOpen(true)}
              className="min-h-[44px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-sm"
            >
              <ClipboardCheck size={18} color="#ffffff" />
              <Text className="ml-1.5 text-sm font-bold text-white">Run Stocktake</Text>
            </Pressable>
          )}

          {activeTab === 'waste' && (
            <Pressable
              onPress={() => setIsWasteModalOpen(true)}
              className="min-h-[44px] flex-row items-center justify-center rounded-xl bg-rose-700 px-4 active:opacity-90 shadow-sm"
            >
              <Trash2 size={18} color="#ffffff" />
              <Text className="ml-1.5 text-sm font-bold text-white">Log Spillage</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* 2. Top Segmented Navigation Tabs */}
      <View className="mb-6 rounded-2xl bg-stone-200/60 p-1.5 border border-stone-200/80">
        <View className="flex-row items-center gap-1.5 flex-wrap">
          {inventoryTabItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[130px] sm:min-w-[150px] flex-row items-center justify-center py-2.5 px-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-white shadow-xs border border-stone-200/80'
                    : 'active:bg-stone-300/50'
                }`}
              >
                <Icon size={16} color={isActive ? '#800020' : '#57534e'} />
                <Text
                  className={`ml-2 text-xs sm:text-sm font-bold ${
                    isActive ? 'text-stone-900' : 'text-stone-600'
                  }`}
                >
                  {tab.label}
                </Text>
                {tab.count !== undefined && (
                  <View
                    className={`ml-1.5 rounded-full px-1.5 py-0.2 ${
                      isActive ? 'bg-[#800020]/10' : 'bg-stone-300/60'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-black ${
                        isActive ? 'text-[#800020]' : 'text-stone-700'
                      }`}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* TAB 1: STOCK ON-HAND & REAL-TIME ALERTS */}
      {activeTab === 'stock' && (
        <View className="space-y-6">
          {/* Executive KPI Summary Cards */}
          <View className="flex-row flex-wrap gap-4">
            {/* Card 1: Total Valuation */}
            <View className="flex-1 min-w-[200px] sm:min-w-[220px] rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs justify-between">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Total Valuation
                </Text>
                <View className="h-8 w-8 rounded-lg bg-[#800020]/10 items-center justify-center">
                  <Boxes size={17} color="#800020" />
                </View>
              </View>
              <Text className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {formatCurrency(totalValuation)}
              </Text>
              <Text className="text-xs font-medium text-stone-500 mt-2">
                {inventory.length} SKUs across all stations
              </Text>
            </View>

            {/* Card 2: Healthy In-Par */}
            <Pressable
              onPress={() =>
                setStockStatusFilter(stockStatusFilter === 'IN_PAR' ? 'ALL' : 'IN_PAR')
              }
              className={`flex-1 min-w-[200px] sm:min-w-[220px] rounded-2xl border p-5 sm:p-6 shadow-xs transition-all justify-between ${
                stockStatusFilter === 'IN_PAR'
                  ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                  : 'border-stone-200 bg-white active:bg-stone-50'
              }`}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  In-Par Healthy
                </Text>
                <View className="h-8 w-8 rounded-lg bg-emerald-100 items-center justify-center">
                  <CheckCircle2 size={17} color="#059669" />
                </View>
              </View>
              <Text className="text-2xl sm:text-3xl font-black text-emerald-900 tracking-tight">
                {inParItemsCount}
              </Text>
              <Text className="text-xs font-medium text-emerald-700 mt-2">
                {inventory.length > 0
                  ? `${Math.round((inParItemsCount / inventory.length) * 100)}% of stock healthy`
                  : '0%'}
              </Text>
            </Pressable>

            {/* Card 3: Below Par Alerts */}
            <Pressable
              onPress={() =>
                setStockStatusFilter(stockStatusFilter === 'BELOW_PAR' ? 'ALL' : 'BELOW_PAR')
              }
              className={`flex-1 min-w-[200px] sm:min-w-[220px] rounded-2xl border p-5 sm:p-6 shadow-xs transition-all justify-between ${
                stockStatusFilter === 'BELOW_PAR'
                  ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                  : 'border-stone-200 bg-white active:bg-stone-50'
              }`}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Below Par (Reorder)
                </Text>
                <View className="h-8 w-8 rounded-lg bg-amber-100 items-center justify-center">
                  <AlertCircle size={17} color="#d97706" />
                </View>
              </View>
              <Text className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight">
                {belowParItemsCount}
              </Text>
              <Text className="text-xs font-medium text-amber-700 mt-2">
                {belowParItemsCount > 0 ? 'Replenishment recommended' : 'Zero items below par'}
              </Text>
            </Pressable>

            {/* Card 4: Depleted / Out of Stock */}
            <Pressable
              onPress={() =>
                setStockStatusFilter(stockStatusFilter === 'DEPLETED' ? 'ALL' : 'DEPLETED')
              }
              className={`flex-1 min-w-[200px] sm:min-w-[220px] rounded-2xl border p-5 sm:p-6 shadow-xs transition-all justify-between ${
                stockStatusFilter === 'DEPLETED'
                  ? 'border-rose-600 bg-rose-50/70 ring-2 ring-rose-500/20'
                  : 'border-stone-200 bg-white active:bg-stone-50'
              }`}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  Depleted / Overdrawn
                </Text>
                <View className="h-8 w-8 rounded-lg bg-rose-100 items-center justify-center">
                  <AlertTriangle size={17} color="#e11d48" />
                </View>
              </View>
              <Text className="text-2xl sm:text-3xl font-black text-rose-900 tracking-tight">
                {depletedItemsCount}
              </Text>
              <Text className="text-xs font-medium text-rose-700 mt-2">
                Orders active (soft warnings)
              </Text>
            </Pressable>
          </View>

          {/* Search Bar, Filter Pills & Category Dropdown */}
          <View className="flex-col gap-3">
            <View className="flex-col md:flex-row md:items-center justify-between gap-3">
              <View className="flex-1">
                <AdminInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search ingredients, SKUs, suppliers..."
                  leftElement={<Search size={18} color="#78716c" />}
                />
              </View>

              <View className="flex-row items-center justify-between md:justify-end gap-3 flex-wrap sm:flex-nowrap">
                {/* Quick Filter Status Pills */}
                <View className="flex-row items-center gap-1.5 flex-wrap">
                  <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1">
                    Status:
                  </Text>
                  <Pressable
                    onPress={() => setStockStatusFilter('ALL')}
                    className={`rounded-xl px-3 py-2 border ${
                      stockStatusFilter === 'ALL'
                        ? 'bg-stone-900 border-stone-900 text-white'
                        : 'bg-white border-stone-200 active:bg-stone-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        stockStatusFilter === 'ALL' ? 'text-white' : 'text-stone-700'
                      }`}
                    >
                      All ({inventory.length})
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setStockStatusFilter('IN_PAR')}
                    className={`rounded-xl px-3 py-2 border ${
                      stockStatusFilter === 'IN_PAR'
                        ? 'bg-emerald-700 border-emerald-700 text-white'
                        : 'bg-white border-stone-200 active:bg-stone-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        stockStatusFilter === 'IN_PAR' ? 'text-white' : 'text-emerald-800'
                      }`}
                    >
                      🟢 In-Par ({inParItemsCount})
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setStockStatusFilter('BELOW_PAR')}
                    className={`rounded-xl px-3 py-2 border ${
                      stockStatusFilter === 'BELOW_PAR'
                        ? 'bg-amber-600 border-amber-600 text-white'
                        : 'bg-white border-stone-200 active:bg-stone-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        stockStatusFilter === 'BELOW_PAR' ? 'text-white' : 'text-amber-800'
                      }`}
                    >
                      🟡 Below Par ({belowParItemsCount})
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setStockStatusFilter('DEPLETED')}
                    className={`rounded-xl px-3 py-2 border ${
                      stockStatusFilter === 'DEPLETED'
                        ? 'bg-rose-700 border-rose-700 text-white'
                        : 'bg-white border-stone-200 active:bg-stone-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        stockStatusFilter === 'DEPLETED' ? 'text-white' : 'text-rose-800'
                      }`}
                    >
                      🔴 Depleted ({depletedItemsCount})
                    </Text>
                  </Pressable>
                </View>

                {/* Category Dropdown */}
                <PosDropdown
                  options={categoryDropdownOptions}
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  sheetTitle="Filter Inventory by Category"
                  className="w-full sm:w-60"
                />
              </View>
            </View>

            {/* Showing count indicator */}
            <View className="flex-row justify-end items-center px-1">
              <Text className="text-xs font-semibold text-stone-500">
                Showing {filteredInventory.length} of {inventory.length} ingredients
              </Text>
            </View>
          </View>

          {/* Master Inventory Data Table */}
          <View className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-xs">
            {filteredInventory.length === 0 ? (
              <View className="py-16 items-center justify-center">
                <Package size={48} color="#a8a29e" />
                <Text className="mt-3 text-base font-bold text-stone-700">
                  No inventory items match the current filters.
                </Text>
                <Text className="text-xs text-stone-400 mt-1">
                  Try adjusting search criteria or selecting "All Items".
                </Text>
              </View>
            ) : (
              <View>
                {/* Table Header (Desktop view) */}
                <View className="hidden lg:flex flex-row items-center bg-stone-50/90 border-b border-stone-200 px-6 py-3.5">
                  <View className="w-[32%]">
                    <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Ingredient &amp; Category
                    </Text>
                  </View>
                  <View className="w-[24%]">
                    <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Par Level Health
                    </Text>
                  </View>
                  <View className="w-[16%] text-right">
                    <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Stock On-Hand
                    </Text>
                  </View>
                  <View className="w-[14%] text-right">
                    <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      MAC &amp; Valuation
                    </Text>
                  </View>
                  <View className="w-[14%] text-right">
                    <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Actions
                    </Text>
                  </View>
                </View>

                {/* Table Rows */}
                <View className="divide-y divide-stone-100">
                  {filteredInventory.map((item) => {
                    const currentStock = Number(item.current_stock || 0);
                    const minAlert = Number(item.min_alert_level || 0);
                    const isBelowPar = currentStock <= minAlert && currentStock > 0;
                    const isCritical = currentStock <= 0;
                    const unitCost = Number(item.unit_cost || 0);
                    const itemValuation = Math.max(0, currentStock) * unitCost;

                    const parRatio = minAlert > 0 ? currentStock / minAlert : 1;
                    const progressPct = Math.min(100, Math.max(0, parRatio * 100));

                    return (
                      <View
                        key={item.id}
                        className="p-4 sm:p-5 lg:px-6 lg:py-4 hover:bg-stone-50/60 transition-colors"
                      >
                        {/* Desktop Row Layout */}
                        <View className="hidden lg:flex flex-row items-center">
                          {/* Col 1: Ingredient & Category (32%) */}
                          <View className="w-[32%] pr-4">
                            <View className="flex-row items-center gap-2 flex-wrap">
                              <Text className="text-base font-extrabold text-stone-900">
                                {item.name}
                              </Text>

                              {isCritical ? (
                                <View className="rounded-md bg-rose-100 border border-rose-300 px-2 py-0.5 flex-row items-center gap-1">
                                  <AlertTriangle size={11} color="#be123c" />
                                  <Text className="text-[11px] font-bold text-rose-800">
                                    Depleted
                                  </Text>
                                </View>
                              ) : isBelowPar ? (
                                <View className="rounded-md bg-amber-50 border border-amber-300 px-2 py-0.5 flex-row items-center gap-1">
                                  <AlertCircle size={11} color="#b45309" />
                                  <Text className="text-[11px] font-bold text-amber-800">
                                    Low Stock
                                  </Text>
                                </View>
                              ) : (
                                <View className="rounded-md bg-emerald-50 border border-emerald-300 px-2 py-0.5 flex-row items-center gap-1">
                                  <CheckCircle2 size={11} color="#047857" />
                                  <Text className="text-[11px] font-bold text-emerald-800">
                                    In Par
                                  </Text>
                                </View>
                              )}
                            </View>

                            <View className="flex-row items-center gap-2 mt-1">
                              <View className="rounded bg-stone-100 border border-stone-200 px-1.5 py-0.5">
                                <Text className="text-[11px] font-semibold text-stone-600">
                                  {item.category}
                                </Text>
                              </View>
                              <Text className="text-xs text-stone-500">
                                SKU: <Text className="font-mono text-stone-700">{item.sku}</Text>
                              </Text>
                              <Text className="text-xs text-stone-400">•</Text>
                              <Text className="text-xs text-stone-600 truncate max-w-[140px]">
                                {item.supplier?.name || item.supplier_name || 'Direct Wholesale'}
                              </Text>
                            </View>
                          </View>

                          {/* Col 2: Par Health & Progress (24%) */}
                          <View className="w-[24%] pr-6">
                            <View className="flex-row items-center justify-between mb-1.5">
                              <Text className="text-xs font-semibold text-stone-600">
                                Par:{' '}
                                <Text className="font-bold text-stone-900">
                                  {minAlert} {item.unit}
                                </Text>
                              </Text>
                              <Text
                                className={`text-xs font-bold ${
                                  isCritical
                                    ? 'text-rose-700'
                                    : isBelowPar
                                      ? 'text-amber-700'
                                      : 'text-emerald-700'
                                }`}
                              >
                                {isCritical
                                  ? '0% (Depleted)'
                                  : `${Math.round(parRatio * 100)}% of Par`}
                              </Text>
                            </View>

                            <View className="h-2 w-full bg-stone-100 rounded-full overflow-hidden border border-stone-200/60">
                              <View
                                className={`h-full rounded-full transition-all ${
                                  isCritical
                                    ? 'bg-rose-500'
                                    : isBelowPar
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </View>
                          </View>

                          {/* Col 3: Stock On-Hand (16%) */}
                          <View className="w-[16%] pr-4">
                            <Text
                              className={`text-lg font-black ${
                                isCritical
                                  ? 'text-rose-700'
                                  : isBelowPar
                                    ? 'text-amber-700'
                                    : 'text-stone-900'
                              }`}
                            >
                              {currentStock.toFixed(2)} {item.unit}
                            </Text>
                            <Text className="text-xs text-stone-500 mt-0.5">
                              {currentStock > minAlert
                                ? `+${(currentStock - minAlert).toFixed(2)} above par`
                                : currentStock <= 0
                                  ? 'Restock needed'
                                  : `${(minAlert - currentStock).toFixed(2)} to par`}
                            </Text>
                          </View>

                          {/* Col 4: Cost & Valuation (14%) */}
                          <View className="w-[14%] pr-4">
                            <Text className="text-sm font-bold text-stone-900">
                              {formatCurrency(itemValuation)}
                            </Text>
                            <Text className="text-xs text-stone-500 mt-0.5">
                              ₱{unitCost.toFixed(2)}/{item.unit}
                            </Text>
                          </View>

                          {/* Col 5: Actions (14%) */}
                          <View className="w-[14%] flex-row items-center justify-end gap-1.5">
                            <Pressable
                              onPress={() => setSelectedAdjustItem(item)}
                              className="h-9 px-2.5 rounded-lg bg-stone-100 border border-stone-200 flex-row items-center active:bg-stone-200"
                              accessibilityLabel={`Quick count for ${item.name}`}
                            >
                              <Sliders size={14} color="#44403c" />
                              <Text className="ml-1 text-xs font-bold text-stone-800">Count</Text>
                            </Pressable>

                            <Pressable
                              onPress={() => setSelectedRestockItem(item)}
                              className="h-9 px-2.5 rounded-lg bg-[#800020] flex-row items-center active:opacity-90 shadow-xs"
                              accessibilityLabel={`Restock ${item.name}`}
                            >
                              <Plus size={14} color="#ffffff" />
                              <Text className="ml-1 text-xs font-bold text-white">Restock</Text>
                            </Pressable>

                            <Pressable
                              onPress={() => {
                                setEditingItem(item);
                                setIsItemModalOpen(true);
                              }}
                              className="h-9 w-9 items-center justify-center rounded-lg bg-stone-100 active:bg-stone-200"
                              accessibilityLabel={`Edit ${item.name}`}
                            >
                              <Edit size={14} color="#44403c" />
                            </Pressable>

                            <Pressable
                              onPress={() => handleDeleteItem(item)}
                              className="h-9 w-9 items-center justify-center rounded-lg bg-rose-50 active:bg-rose-100"
                              accessibilityLabel={`Delete ${item.name}`}
                            >
                              <Trash2 size={14} color="#e11d48" />
                            </Pressable>
                          </View>
                        </View>

                        {/* Mobile / Tablet Card Layout */}
                        <View className="flex lg:hidden flex-col gap-3">
                          <View className="flex-row items-start justify-between gap-2">
                            <View className="flex-1">
                              <View className="flex-row items-center gap-1.5 flex-wrap">
                                <Text className="text-base font-bold text-stone-900">
                                  {item.name}
                                </Text>
                                {isCritical ? (
                                  <View className="rounded bg-rose-100 px-1.5 py-0.5">
                                    <Text className="text-[10px] font-bold text-rose-800">
                                      Depleted
                                    </Text>
                                  </View>
                                ) : isBelowPar ? (
                                  <View className="rounded bg-amber-100 px-1.5 py-0.5">
                                    <Text className="text-[10px] font-bold text-amber-800">
                                      Low
                                    </Text>
                                  </View>
                                ) : (
                                  <View className="rounded bg-emerald-100 px-1.5 py-0.5">
                                    <Text className="text-[10px] font-bold text-emerald-800">
                                      In Par
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text className="text-xs text-stone-500 mt-0.5">
                                SKU: {item.sku} • {item.category}
                              </Text>
                            </View>

                            <View className="items-end">
                              <Text
                                className={`text-base font-black ${
                                  isCritical
                                    ? 'text-rose-700'
                                    : isBelowPar
                                      ? 'text-amber-700'
                                      : 'text-stone-900'
                                }`}
                              >
                                {currentStock.toFixed(2)} {item.unit}
                              </Text>
                              <Text className="text-xs text-stone-500 mt-0.5">
                                Value: {formatCurrency(itemValuation)}
                              </Text>
                            </View>
                          </View>

                          {/* Par bar */}
                          <View>
                            <View className="flex-row items-center justify-between text-xs mb-1">
                              <Text className="text-[11px] font-medium text-stone-500">
                                Par Threshold: {minAlert} {item.unit}
                              </Text>
                              <Text className="text-[11px] font-bold text-stone-700">
                                {Math.round(parRatio * 100)}%
                              </Text>
                            </View>
                            <View className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                              <View
                                className={`h-full rounded-full ${
                                  isCritical
                                    ? 'bg-rose-500'
                                    : isBelowPar
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </View>
                          </View>

                          {/* Mobile Action Buttons */}
                          <View className="flex-row items-center justify-end gap-2 pt-1 border-t border-stone-100">
                            <Pressable
                              onPress={() => setSelectedAdjustItem(item)}
                              className="h-10 px-3 rounded-xl bg-stone-100 border border-stone-200 flex-row items-center active:bg-stone-200"
                            >
                              <Sliders size={15} color="#44403c" />
                              <Text className="ml-1 text-xs font-bold text-stone-800">Count</Text>
                            </Pressable>

                            <Pressable
                              onPress={() => setSelectedRestockItem(item)}
                              className="h-10 px-3.5 rounded-xl bg-[#800020] flex-row items-center active:opacity-90 shadow-xs"
                            >
                              <Plus size={15} color="#ffffff" />
                              <Text className="ml-1 text-xs font-bold text-white">Restock</Text>
                            </Pressable>

                            <Pressable
                              onPress={() => {
                                setEditingItem(item);
                                setIsItemModalOpen(true);
                              }}
                              className="h-10 w-10 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
                            >
                              <Edit size={16} color="#44403c" />
                            </Pressable>

                            <Pressable
                              onPress={() => handleDeleteItem(item)}
                              className="h-10 w-10 items-center justify-center rounded-xl bg-rose-50 active:bg-rose-100"
                            >
                              <Trash2 size={16} color="#e11d48" />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* TAB 2: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <View className="space-y-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-bold text-stone-900">
              Active Vendor Accounts ({suppliers.length})
            </Text>
          </View>

          {suppliers.length === 0 ? (
            <View className="rounded-2xl border border-stone-200/80 bg-white p-12 items-center justify-center">
              <Building2 size={44} color="#a8a29e" />
              <Text className="mt-3 text-base font-bold text-stone-700">
                No suppliers registered in directory.
              </Text>
              <Text className="text-xs text-stone-400 mt-1">
                Add suppliers to link purchase orders and delivery restocks.
              </Text>
            </View>
          ) : (
            <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map((sup) => (
                <View
                  key={sup.id}
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex-col justify-between"
                >
                  <View>
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-2">
                        <View className="h-9 w-9 rounded-xl bg-[#800020]/10 items-center justify-center">
                          <Building2 size={18} color="#800020" />
                        </View>
                        <Text className="text-base font-bold text-stone-900">{sup.name}</Text>
                      </View>
                      <View className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-emerald-800">
                          Active Vendor
                        </Text>
                      </View>
                    </View>

                    <View className="space-y-1.5 mt-2">
                      {sup.contact_person && (
                        <View className="flex-row items-center gap-2">
                          <Text className="text-xs text-stone-500">Contact:</Text>
                          <Text className="text-xs font-semibold text-stone-800">
                            {sup.contact_person}
                          </Text>
                        </View>
                      )}

                      {sup.phone && (
                        <View className="flex-row items-center gap-2">
                          <Phone size={13} color="#78716c" />
                          <Text className="text-xs font-mono text-stone-700">{sup.phone}</Text>
                        </View>
                      )}

                      {sup.email && (
                        <View className="flex-row items-center gap-2">
                          <Mail size={13} color="#78716c" />
                          <Text className="text-xs text-stone-700">{sup.email}</Text>
                        </View>
                      )}

                      {sup.lead_time_days !== undefined && (
                        <View className="flex-row items-center gap-2 mt-1">
                          <Clock size={13} color="#78716c" />
                          <Text className="text-xs text-stone-600">
                            Delivery Lead Time:{' '}
                            <Text className="font-bold text-stone-900">
                              {sup.lead_time_days} Days
                            </Text>
                          </Text>
                        </View>
                      )}

                      {sup.address && (
                        <View className="flex-row items-center gap-2">
                          <MapPin size={13} color="#78716c" />
                          <Text className="text-xs text-stone-500 truncate">{sup.address}</Text>
                        </View>
                      )}
                    </View>

                    {sup.notes && (
                      <View className="mt-3 rounded-lg bg-stone-50 p-2.5 border border-stone-200/60">
                        <Text className="text-xs italic text-stone-600">"{sup.notes}"</Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center justify-end gap-2 pt-3 mt-4 border-t border-stone-100">
                    <Pressable
                      onPress={() => {
                        setEditingSupplier(sup);
                        setIsSupplierModalOpen(true);
                      }}
                      className="h-9 px-3 rounded-lg bg-stone-100 border border-stone-200 flex-row items-center active:bg-stone-200"
                    >
                      <Edit size={14} color="#44403c" />
                      <Text className="ml-1 text-xs font-bold text-stone-700">Edit</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleDeleteSupplier(sup)}
                      className="h-9 px-3 rounded-lg bg-rose-50 border border-rose-200 flex-row items-center active:bg-rose-100"
                    >
                      <Trash2 size={14} color="#e11d48" />
                      <Text className="ml-1 text-xs font-bold text-rose-700">Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* TAB 3: STOCK MOVEMENT LEDGER */}
      {activeTab === 'ledger' && (
        <View className="space-y-4">
          <View className="flex-col sm:flex-row sm:items-center justify-between gap-3">
            <View>
              <Text className="text-xl font-bold text-stone-900">
                Immutable Stock Movement Ledger
              </Text>
              <Text className="text-xs font-medium text-stone-500 mt-0.5">
                Audit trail of deliveries, depletions on KDS ready, adjustments, and waste
              </Text>
            </View>

            {/* Ledger Movement Type Filters */}
            <View className="flex-row items-center gap-1.5 flex-wrap">
              {[
                { key: 'ALL', label: 'All Events' },
                { key: 'SALE_DEPLETION', label: 'Sale Depletions' },
                { key: 'RESTOCK_DELIVERY', label: 'Deliveries' },
                { key: 'MANUAL_ADJUST', label: 'Manual Counts' },
                { key: 'SPOILAGE_WASTE', label: 'Waste Logs' },
                { key: 'CANCEL_RESTORE', label: 'Void Restorals' },
              ].map((pill) => (
                <Pressable
                  key={pill.key}
                  onPress={() => setLedgerTypeFilter(pill.key)}
                  className={`rounded-lg px-2.5 py-1.5 border text-xs ${
                    ledgerTypeFilter === pill.key
                      ? 'bg-stone-900 border-stone-900 text-white font-bold'
                      : 'bg-white border-stone-200 text-stone-700 active:bg-stone-100'
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      ledgerTypeFilter === pill.key
                        ? 'text-white font-bold'
                        : 'text-stone-700 font-medium'
                    }`}
                  >
                    {pill.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-xs">
            {filteredMovements.length === 0 ? (
              <View className="py-14 items-center justify-center">
                <FileText size={44} color="#a8a29e" />
                <Text className="mt-3 text-base font-bold text-stone-700">
                  No stock movements match the filter.
                </Text>
              </View>
            ) : (
              <View className="divide-y divide-stone-100">
                {filteredMovements.map((mov) => {
                  const isDeduction = Number(mov.change_amount || 0) < 0;
                  const absAmount = Math.abs(Number(mov.change_amount || 0));

                  return (
                    <View
                      key={mov.id}
                      className="p-4 sm:px-6 sm:py-3.5 flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50"
                    >
                      <View className="flex-row items-center gap-3">
                        <View
                          className={`h-9 w-9 items-center justify-center rounded-xl ${
                            isDeduction ? 'bg-rose-100' : 'bg-emerald-100'
                          }`}
                        >
                          {isDeduction ? (
                            <ArrowDownRight size={17} color="#e11d48" />
                          ) : (
                            <ArrowUpRight size={17} color="#059669" />
                          )}
                        </View>
                        <View>
                          <Text className="text-sm sm:text-base font-bold text-stone-900">
                            {mov.inventory_item?.name || 'Inventory Ingredient'}
                          </Text>
                          <Text className="text-xs text-stone-500 mt-0.5">
                            {new Date(mov.created_at).toLocaleString()} • Ref:{' '}
                            <Text className="font-mono text-stone-700">
                              {mov.reference_id ? mov.reference_id.slice(0, 8) : 'System'}
                            </Text>
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center justify-between sm:justify-end gap-3">
                        <View
                          className={`rounded-md px-2 py-0.5 border ${
                            mov.movement_type === 'RESTOCK_DELIVERY'
                              ? 'bg-emerald-50 border-emerald-300'
                              : mov.movement_type === 'SALE_DEPLETION'
                                ? 'bg-stone-100 border-stone-300'
                                : mov.movement_type === 'CANCEL_RESTORE'
                                  ? 'bg-blue-50 border-blue-300'
                                  : mov.movement_type === 'SPOILAGE_WASTE'
                                    ? 'bg-rose-50 border-rose-300'
                                    : 'bg-amber-50 border-amber-300'
                          }`}
                        >
                          <Text className="text-xs font-bold text-stone-800">
                            {mov.movement_type}
                          </Text>
                        </View>

                        <View className="items-end">
                          <Text
                            className={`text-sm sm:text-base font-black ${
                              isDeduction ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {isDeduction ? `-${absAmount.toFixed(2)}` : `+${absAmount.toFixed(2)}`}{' '}
                            {mov.inventory_item?.unit}
                          </Text>
                          <Text className="text-[11px] text-stone-500">
                            Balance: {mov.balance_after} {mov.inventory_item?.unit}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}

      {/* TAB 4: PHYSICAL STOCKTAKE */}
      {activeTab === 'stocktake' && (
        <View className="rounded-2xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <View className="flex-col sm:flex-row sm:items-center justify-between gap-4">
            <View>
              <Text className="text-2xl font-black text-stone-900">
                Cycle Counts &amp; Physical Stocktake
              </Text>
              <Text className="text-sm font-medium text-stone-500 mt-1">
                Audit shelf inventory against expected theoretical stock to detect shrinkage and
                over-pouring
              </Text>
            </View>

            <Pressable
              onPress={() => setIsStocktakeModalOpen(true)}
              className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#800020] px-6 active:opacity-90 shadow-sm"
            >
              <ClipboardCheck size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">Start Physical Count</Text>
            </Pressable>
          </View>

          <View className="rounded-xl bg-stone-50 p-5 border border-stone-200 space-y-2.5">
            <Text className="text-sm font-bold text-stone-900">
              Stocktake Operational Standard:
            </Text>
            <Text className="text-xs sm:text-sm text-stone-600">
              • Expected on-hand stock incorporates live recipe depletion on KDS ready tickets and
              recorded deliveries.
            </Text>
            <Text className="text-xs sm:text-sm text-stone-600">
              • Actual counts are compared instantly:{' '}
              <Text className="font-mono font-bold text-stone-800">
                Variance = Actual - Expected
              </Text>
              .
            </Text>
            <Text className="text-xs sm:text-sm text-stone-600">
              • Committing updates the ledger with immutable{' '}
              <Text className="font-mono font-bold text-stone-800">STOCKTAKE_ADJUST</Text> audit
              movements.
            </Text>
          </View>
        </View>
      )}

      {/* TAB 5: WASTE & SPILLAGE */}
      {activeTab === 'waste' && (
        <View className="rounded-2xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <View className="flex-col sm:flex-row sm:items-center justify-between gap-4">
            <View>
              <Text className="text-2xl font-black text-stone-900">
                Spillage, Spoilage &amp; Waste Loss Log
              </Text>
              <Text className="text-sm font-medium text-stone-500 mt-1">
                Account for dropped bottles, expired perishables, burned food, or tasting flights
              </Text>
            </View>

            <Pressable
              onPress={() => setIsWasteModalOpen(true)}
              className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-rose-700 px-6 active:opacity-90 shadow-sm"
            >
              <Trash2 size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">Log Waste Event</Text>
            </Pressable>
          </View>

          <View className="rounded-xl bg-rose-50/60 p-5 border border-rose-200 space-y-2.5">
            <Text className="text-sm font-bold text-rose-950">Loss Accounting Guardrail:</Text>
            <Text className="text-xs sm:text-sm text-rose-800">
              Logging waste immediately deducts ingredient quantities from active stock and
              attributes the financial cost (Quantity × MAC) to operational overhead, maintaining
              audit transparency.
            </Text>
          </View>
        </View>
      )}

      {/* RESTOCK INTAKE MODAL (With Live MAC) */}
      <AdminModal
        visible={!!selectedRestockItem}
        onClose={() => setSelectedRestockItem(null)}
        title={`Restock Intake: ${selectedRestockItem?.name || ''}`}
        subtitle={`Current Stock: ${selectedRestockItem?.current_stock || 0} ${selectedRestockItem?.unit || ''} • Current MAC: ₱${Number(selectedRestockItem?.unit_cost || 0).toFixed(2)}`}
        icon={<Package size={22} color="#800020" />}
        size="md"
        footer={
          <>
            <Pressable
              onPress={() => setSelectedRestockItem(null)}
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
        onClose={() => setSelectedAdjustItem(null)}
        item={selectedAdjustItem}
        onSuccess={handleRefreshAll}
      />

      {/* FULL INVENTORY ITEM CRUD MODAL */}
      <InventoryItemModal
        visible={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSuccess={handleRefreshAll}
        item={editingItem}
        suppliers={suppliers}
      />

      {/* FULL SUPPLIER MODAL */}
      <SupplierModal
        visible={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={handleRefreshAll}
        supplier={editingSupplier}
      />

      {/* STOCKTAKE AUDIT MODAL */}
      <StocktakeAuditModal
        visible={isStocktakeModalOpen}
        onClose={() => setIsStocktakeModalOpen(false)}
        onSuccess={handleRefreshAll}
        inventory={inventory}
      />

      {/* WASTE LOGGER MODAL */}
      <WasteLoggerModal
        visible={isWasteModalOpen}
        onClose={() => setIsWasteModalOpen(false)}
        onSuccess={handleRefreshAll}
        inventory={inventory}
      />
    </ScrollView>
  );
};
