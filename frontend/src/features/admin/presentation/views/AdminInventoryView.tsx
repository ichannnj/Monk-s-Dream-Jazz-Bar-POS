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
  TrendingDown,
  ShieldCheck,
  Boxes,
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

  // Supporting entities
  const [suppliers, setSuppliers] = useState<SupplierAdmin[]>([]);
  const [movements, setMovements] = useState<StockMovementAdmin[]>([]);

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
    try {
      const [supsRes, movsRes] = await Promise.allSettled([
        adminApi.getSuppliers(),
        adminApi.getStockMovements(80),
      ]);
      if (supsRes.status === 'fulfilled') {
        setSuppliers(supsRes.value);
      } else {
        console.warn('[AdminInventoryView] Failed to load suppliers:', supsRes.reason);
      }
      if (movsRes.status === 'fulfilled') {
        setMovements(movsRes.value);
      } else {
        console.warn('[AdminInventoryView] Failed to load movements:', movsRes.reason);
      }
    } catch {
      toast.error('Failed to load inventory movements or suppliers', { title: 'Load Error' });
    }
  }, []);

  useEffect(() => {
    loadSupportingData();
  }, [loadSupportingData]);

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
  const filteredInventory = inventory.filter((item) => {
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

  const inventoryTabOptions: PosDropdownOption<InventoryTab>[] = [
    {
      value: 'stock',
      label: 'Stock On-Hand & Par',
      badge: inventory.length,
      icon: Package,
      description: 'Live ingredient stock levels, alerts, and quick counts',
    },
    {
      value: 'suppliers',
      label: 'Vendors & Suppliers',
      badge: suppliers.length,
      icon: Building2,
      description: 'Directory of active food, beverage, and packaging vendors',
    },
    {
      value: 'ledger',
      label: 'Movement Ledger',
      badge: movements.length,
      icon: FileText,
      description: 'Chronological audit trail of deliveries, depletions, and adjustments',
    },
    {
      value: 'stocktake',
      label: 'Physical Stocktake',
      icon: ClipboardCheck,
      description: 'Reconcile shelf counts against system inventory',
    },
    {
      value: 'waste',
      label: 'Waste & Spillage',
      icon: Trash2,
      description: 'Log spoilage, breakage, and post-prep voids',
    },
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
      {/* Top Header & Context Actions */}
      <View className="mb-6 flex-col lg:flex-row lg:items-center justify-between gap-3">
        <View>
          <Text className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
            Inventory &amp; Depletion Hub
          </Text>
          <Text className="text-sm font-medium text-stone-500 mt-1">
            Real-time recipe ingredient depletion, non-blocking par safeguards, and weighted MAC
            valuation
          </Text>
        </View>

        {/* View Selector Dropdown + Contextual Action Button */}
        <View className="flex-row items-center gap-2.5 flex-wrap">
          <PosDropdown
            options={inventoryTabOptions}
            value={activeTab}
            onChange={setActiveTab}
            prefixLabel="Section:"
            sheetTitle="Select Inventory Section"
            className="flex-1 sm:flex-initial min-w-[210px]"
          />

          {/* Export Inventory Valuation Button */}
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
            className="min-h-[48px] flex-row items-center justify-center rounded-xl border border-stone-200 bg-white px-3.5 sm:px-4 active:bg-stone-50 shadow-xs"
            accessibilityLabel="Export Inventory Valuation to Excel"
          >
            <FileSpreadsheet size={18} color="#047857" />
            <Text className="ml-2 text-sm sm:text-base font-bold text-stone-800">Export Excel</Text>
          </Pressable>

          {activeTab === 'stock' && (
            <Pressable
              onPress={() => {
                setEditingItem(null);
                setIsItemModalOpen(true);
              }}
              className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-sm w-full sm:w-auto"
            >
              <Plus size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">+ Add Item</Text>
            </Pressable>
          )}

          {activeTab === 'suppliers' && (
            <Pressable
              onPress={() => {
                setEditingSupplier(null);
                setIsSupplierModalOpen(true);
              }}
              className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-sm w-full sm:w-auto"
            >
              <Building2 size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">+ Add Supplier</Text>
            </Pressable>
          )}

          {activeTab === 'stocktake' && (
            <Pressable
              onPress={() => setIsStocktakeModalOpen(true)}
              className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-sm w-full sm:w-auto"
            >
              <ClipboardCheck size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">Run Stocktake</Text>
            </Pressable>
          )}

          {activeTab === 'waste' && (
            <Pressable
              onPress={() => setIsWasteModalOpen(true)}
              className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-rose-700 px-4 active:opacity-90 shadow-sm w-full sm:w-auto"
            >
              <Trash2 size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">Log Spillage / Waste</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* TAB 1: STOCK ON-HAND & REAL-TIME ALERTS */}
      {activeTab === 'stock' && (
        <View className="space-y-5">
          {/* Executive KPI Summary Cards */}
          <View className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Card 1: Total Valuation */}
            <View className="rounded-2xl border border-stone-200 bg-white p-4.5 shadow-xs">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Total Valuation
                </Text>
                <View className="h-8 w-8 rounded-lg bg-[#800020]/10 items-center justify-center">
                  <Boxes size={17} color="#800020" />
                </View>
              </View>
              <Text className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {formatCurrency(totalValuation)}
              </Text>
              <Text className="text-xs font-medium text-stone-500 mt-1">
                {inventory.length} SKUs across all stations
              </Text>
            </View>

            {/* Card 2: Healthy In-Par */}
            <Pressable
              onPress={() =>
                setStockStatusFilter(stockStatusFilter === 'IN_PAR' ? 'ALL' : 'IN_PAR')
              }
              className={`rounded-2xl border p-4.5 shadow-xs transition-all ${
                stockStatusFilter === 'IN_PAR'
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-stone-200 bg-white active:bg-stone-50'
              }`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  In-Par Healthy
                </Text>
                <View className="h-8 w-8 rounded-lg bg-emerald-100 items-center justify-center">
                  <CheckCircle2 size={17} color="#059669" />
                </View>
              </View>
              <Text className="text-xl sm:text-2xl font-black text-emerald-900 tracking-tight">
                {inParItemsCount}
              </Text>
              <Text className="text-xs font-medium text-emerald-700 mt-1">
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
              className={`rounded-2xl border p-4.5 shadow-xs transition-all ${
                stockStatusFilter === 'BELOW_PAR'
                  ? 'border-amber-500 bg-amber-50/50'
                  : 'border-stone-200 bg-white active:bg-stone-50'
              }`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Below Par (Reorder)
                </Text>
                <View className="h-8 w-8 rounded-lg bg-amber-100 items-center justify-center">
                  <AlertCircle size={17} color="#d97706" />
                </View>
              </View>
              <Text className="text-xl sm:text-2xl font-black text-amber-900 tracking-tight">
                {belowParItemsCount}
              </Text>
              <Text className="text-xs font-medium text-amber-700 mt-1">
                {belowParItemsCount > 0 ? 'Replenishment recommended' : 'Zero items below par'}
              </Text>
            </Pressable>

            {/* Card 4: Depleted / Out of Stock */}
            <Pressable
              onPress={() =>
                setStockStatusFilter(stockStatusFilter === 'DEPLETED' ? 'ALL' : 'DEPLETED')
              }
              className={`rounded-2xl border p-4.5 shadow-xs transition-all ${
                stockStatusFilter === 'DEPLETED'
                  ? 'border-rose-600 bg-rose-50/50'
                  : 'border-stone-200 bg-white active:bg-stone-50'
              }`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  Depleted / Overdrawn
                </Text>
                <View className="h-8 w-8 rounded-lg bg-rose-100 items-center justify-center">
                  <AlertTriangle size={17} color="#e11d48" />
                </View>
              </View>
              <Text className="text-xl sm:text-2xl font-black text-rose-900 tracking-tight">
                {depletedItemsCount}
              </Text>
              <Text className="text-xs font-medium text-rose-700 mt-1">
                Orders active (soft warnings)
              </Text>
            </Pressable>
          </View>

          {/* Search, Filter Pills & Category Dropdown */}
          <View className="flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <View className="flex-1">
              <AdminInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search ingredients, SKUs, suppliers..."
                leftElement={<Search size={19} color="#78716c" />}
              />
            </View>

            <PosDropdown
              options={categoryDropdownOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              sheetTitle="Filter Inventory by Category"
              className="w-full sm:w-64"
            />
          </View>

          {/* Quick Filter Status Pills */}
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1">
              Status:
            </Text>
            <Pressable
              onPress={() => setStockStatusFilter('ALL')}
              className={`rounded-xl px-3 py-1.5 border ${
                stockStatusFilter === 'ALL'
                  ? 'bg-stone-900 border-stone-900 text-white'
                  : 'bg-white border-stone-200 active:bg-stone-100'
              }`}
            >
              <Text
                className={`text-xs font-bold ${stockStatusFilter === 'ALL' ? 'text-white' : 'text-stone-700'}`}
              >
                All Items ({inventory.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStockStatusFilter('IN_PAR')}
              className={`rounded-xl px-3 py-1.5 border ${
                stockStatusFilter === 'IN_PAR'
                  ? 'bg-emerald-700 border-emerald-700 text-white'
                  : 'bg-white border-stone-200 active:bg-stone-100'
              }`}
            >
              <Text
                className={`text-xs font-bold ${stockStatusFilter === 'IN_PAR' ? 'text-white' : 'text-emerald-800'}`}
              >
                🟢 In-Par ({inParItemsCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStockStatusFilter('BELOW_PAR')}
              className={`rounded-xl px-3 py-1.5 border ${
                stockStatusFilter === 'BELOW_PAR'
                  ? 'bg-amber-600 border-amber-600 text-white'
                  : 'bg-white border-stone-200 active:bg-stone-100'
              }`}
            >
              <Text
                className={`text-xs font-bold ${stockStatusFilter === 'BELOW_PAR' ? 'text-white' : 'text-amber-800'}`}
              >
                🟡 Below Par ({belowParItemsCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStockStatusFilter('DEPLETED')}
              className={`rounded-xl px-3 py-1.5 border ${
                stockStatusFilter === 'DEPLETED'
                  ? 'bg-rose-700 border-rose-700 text-white'
                  : 'bg-white border-stone-200 active:bg-stone-100'
              }`}
            >
              <Text
                className={`text-xs font-bold ${stockStatusFilter === 'DEPLETED' ? 'text-white' : 'text-rose-800'}`}
              >
                🔴 Depleted ({depletedItemsCount})
              </Text>
            </Pressable>
          </View>

          {/* Inventory Table / Cards */}
          <View className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs">
            {filteredInventory.length === 0 ? (
              <View className="py-14 items-center justify-center">
                <Package size={44} color="#a8a29e" />
                <Text className="mt-3 text-base font-semibold text-stone-600">
                  No inventory items match the current filters.
                </Text>
                <Text className="text-xs text-stone-400 mt-1">
                  Try adjusting search criteria or selecting "All Items".
                </Text>
              </View>
            ) : (
              <View className="space-y-4">
                {filteredInventory.map((item) => {
                  const currentStock = Number(item.current_stock || 0);
                  const minAlert = Number(item.min_alert_level || 0);
                  const isBelowPar = currentStock <= minAlert && currentStock > 0;
                  const isCritical = currentStock <= 0;
                  const unitCost = Number(item.unit_cost || 0);
                  const itemValuation = Math.max(0, currentStock) * unitCost;

                  // Ratio of current stock to par alert level (0 to 100%+)
                  const parRatio = minAlert > 0 ? currentStock / minAlert : 1;
                  const progressPct = Math.min(100, Math.max(0, parRatio * 100));

                  return (
                    <View
                      key={item.id}
                      className="flex-col lg:flex-row lg:items-center justify-between border-b border-stone-100 pb-4.5 gap-4"
                    >
                      {/* Left: Item Name, SKU, Supplier & Category Badges */}
                      <View className="flex-1 lg:pr-4">
                        <View className="flex-row items-center space-x-2 flex-wrap gap-1.5">
                          <Text className="text-lg font-bold text-stone-900">{item.name}</Text>

                          {/* Status Badge */}
                          {isCritical ? (
                            <View className="rounded-md bg-rose-100 border border-rose-300 px-2 py-0.5 flex-row items-center gap-1">
                              <AlertTriangle size={12} color="#be123c" />
                              <Text className="text-xs font-bold text-rose-800">
                                Depleted / Overdrawn
                              </Text>
                            </View>
                          ) : isBelowPar ? (
                            <View className="rounded-md bg-amber-50 border border-amber-300 px-2 py-0.5 flex-row items-center gap-1">
                              <AlertCircle size={12} color="#b45309" />
                              <Text className="text-xs font-bold text-amber-800">
                                Low Stock Alert
                              </Text>
                            </View>
                          ) : (
                            <View className="rounded-md bg-emerald-50 border border-emerald-300 px-2 py-0.5 flex-row items-center gap-1">
                              <CheckCircle2 size={12} color="#047857" />
                              <Text className="text-xs font-bold text-emerald-800">In Par</Text>
                            </View>
                          )}

                          <View className="rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5">
                            <Text className="text-xs font-semibold text-stone-600">
                              {item.category}
                            </Text>
                          </View>
                        </View>

                        <Text className="text-xs sm:text-sm text-stone-500 mt-1">
                          SKU: <Text className="font-mono text-stone-700">{item.sku}</Text> • Par
                          Threshold:{' '}
                          <Text className="font-bold text-stone-700">
                            {minAlert} {item.unit}
                          </Text>{' '}
                          • Supplier:{' '}
                          <Text className="text-stone-700 font-medium">
                            {item.supplier?.name || item.supplier_name || 'Direct Wholesale'}
                          </Text>
                        </Text>

                        {/* Visual Par Level Progress Bar */}
                        <View className="mt-2.5 max-w-md">
                          <View className="flex-row items-center justify-between text-xs mb-1">
                            <Text className="text-[11px] font-semibold text-stone-500">
                              Stock vs Par Level
                            </Text>
                            <Text
                              className={`text-[11px] font-bold ${
                                isCritical
                                  ? 'text-rose-700'
                                  : isBelowPar
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                              }`}
                            >
                              {isCritical
                                ? '0% (Depleted)'
                                : `${(parRatio * 100).toFixed(0)}% of Par Level`}
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
                      </View>

                      {/* Right: Stock On-Hand, MAC Valuation & In-Line Actions */}
                      <View className="flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3.5 pt-2 lg:pt-0 border-t border-stone-100/80 lg:border-t-0">
                        {/* Numerical Stock Count & Valuation */}
                        <View className="flex-row sm:flex-col items-baseline sm:items-end justify-between sm:mr-3">
                          <Text
                            className={`text-xl font-black ${
                              isCritical
                                ? 'text-rose-700'
                                : isBelowPar
                                  ? 'text-amber-700'
                                  : 'text-stone-900'
                            }`}
                          >
                            {currentStock.toFixed(2)} {item.unit}
                          </Text>
                          <View className="flex-row items-center gap-1.5 mt-0.5">
                            <Text className="text-xs text-stone-500">
                              MAC: ₱{unitCost.toFixed(2)}/{item.unit}
                            </Text>
                            <Text className="text-xs font-bold text-stone-700">
                              • Value: {formatCurrency(itemValuation)}
                            </Text>
                          </View>
                        </View>

                        {/* In-Line Action Buttons */}
                        <View className="flex-row items-center gap-2">
                          {/* 1-Tap Quick Count Adjust */}
                          <Pressable
                            onPress={() => setSelectedAdjustItem(item)}
                            className="min-h-[44px] flex-row items-center justify-center rounded-xl bg-stone-100 border border-stone-200 px-3 active:bg-stone-200"
                            accessibilityLabel={`Quick adjust stock count for ${item.name}`}
                          >
                            <Sliders size={16} color="#44403c" />
                            <Text className="ml-1 text-xs font-bold text-stone-800">Count</Text>
                          </Pressable>

                          {/* Restock Delivery Intake */}
                          <Pressable
                            onPress={() => setSelectedRestockItem(item)}
                            className="min-h-[44px] flex-row items-center justify-center rounded-xl bg-[#800020] px-3.5 active:opacity-90 shadow-xs"
                            accessibilityLabel={`Restock intake for ${item.name}`}
                          >
                            <Plus size={16} color="#ffffff" />
                            <Text className="ml-1 text-xs font-bold text-white">Restock</Text>
                          </Pressable>

                          {/* Edit Full Item */}
                          <Pressable
                            onPress={() => {
                              setEditingItem(item);
                              setIsItemModalOpen(true);
                            }}
                            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
                            accessibilityLabel={`Edit full details of ${item.name}`}
                          >
                            <Edit size={16} color="#44403c" />
                          </Pressable>

                          {/* Delete Item */}
                          <Pressable
                            onPress={() => handleDeleteItem(item)}
                            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-rose-50 active:bg-rose-100"
                            accessibilityLabel={`Delete ${item.name} from inventory`}
                          >
                            <Trash2 size={16} color="#e11d48" />
                          </Pressable>
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

      {/* TAB 2: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <View className="space-y-4">
            {suppliers.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Building2 size={40} color="#a8a29e" />
                <Text className="mt-2 text-base text-stone-500">
                  No suppliers registered in directory.
                </Text>
              </View>
            ) : (
              suppliers.map((sup) => (
                <View
                  key={sup.id}
                  className="rounded-xl border border-stone-200 bg-stone-50/70 p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-lg font-bold text-stone-900">{sup.name}</Text>
                      <Text className="text-base text-stone-600 mt-0.5">
                        Contact: {sup.contact_person || 'N/A'} • Phone: {sup.phone || 'N/A'} •
                        Email: {sup.email || 'N/A'}
                      </Text>
                      <Text className="text-base text-stone-500 mt-0.5">
                        Depot: {sup.address || 'N/A'} • Delivery Lead Time:{' '}
                        <Text className="font-bold text-stone-800">{sup.lead_time_days} Days</Text>
                      </Text>
                      {sup.notes && (
                        <Text className="text-base italic text-stone-500 mt-1">"{sup.notes}"</Text>
                      )}
                    </View>

                    <View className="flex-row items-center space-x-2">
                      <Pressable
                        onPress={() => {
                          setEditingSupplier(sup);
                          setIsSupplierModalOpen(true);
                        }}
                        className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-white border border-stone-300 active:bg-stone-100"
                      >
                        <Edit size={18} color="#44403c" />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteSupplier(sup)}
                        className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-rose-50 border border-rose-200 active:bg-rose-100"
                      >
                        <Trash2 size={18} color="#e11d48" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {/* TAB 3: STOCK MOVEMENT LEDGER */}
      {activeTab === 'ledger' && (
        <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <Text className="text-xl font-bold text-stone-900 mb-4">
            Immutable Audit Log: Stock Movement Ledger
          </Text>
          <View className="space-y-3">
            {movements.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <FileText size={40} color="#a8a29e" />
                <Text className="mt-2 text-base text-stone-500">
                  No stock movements recorded yet.
                </Text>
              </View>
            ) : (
              movements.map((mov) => {
                const isDeduction = mov.change_amount < 0;
                return (
                  <View
                    key={mov.id}
                    className="flex-row items-center justify-between border-b border-stone-100 py-3"
                  >
                    <View className="flex-row items-center space-x-3">
                      <View
                        className={`h-9 w-9 items-center justify-center rounded-lg ${
                          isDeduction ? 'bg-rose-100' : 'bg-emerald-100'
                        }`}
                      >
                        {isDeduction ? (
                          <ArrowDownRight size={18} color="#e11d48" />
                        ) : (
                          <ArrowUpRight size={18} color="#059669" />
                        )}
                      </View>
                      <View>
                        <Text className="text-base font-bold text-stone-900">
                          {mov.inventory_item?.name || 'Inventory Item'}
                        </Text>
                        <Text className="text-base text-stone-500">
                          {new Date(mov.created_at).toLocaleString()} • Ref:{' '}
                          {mov.reference_id || 'System'}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <View className="flex-row items-center space-x-2">
                        <View
                          className={`rounded-md px-2 py-0.5 border ${
                            mov.movement_type === 'RESTOCK_DELIVERY'
                              ? 'bg-emerald-50 border-emerald-300'
                              : mov.movement_type === 'SALE_DEPLETION'
                                ? 'bg-stone-100 border-stone-300'
                                : mov.movement_type === 'SPOILAGE_WASTE'
                                  ? 'bg-rose-50 border-rose-300'
                                  : 'bg-amber-50 border-amber-300'
                          }`}
                        >
                          <Text className="text-base font-bold text-stone-800">
                            {mov.movement_type}
                          </Text>
                        </View>
                        <Text
                          className={`text-base font-extrabold ${
                            isDeduction ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {mov.change_amount > 0 ? `+${mov.change_amount}` : mov.change_amount}{' '}
                          {mov.inventory_item?.unit}
                        </Text>
                      </View>
                      <Text className="text-base text-stone-500 mt-0.5">
                        Balance After: {mov.balance_after} {mov.inventory_item?.unit}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      )}

      {/* TAB 4: PHYSICAL STOCKTAKE */}
      {activeTab === 'stocktake' && (
        <View className="rounded-2xl border border-stone-200/80 bg-white p-8 shadow-xs">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-2xl font-bold text-stone-900">
                Inventory Cycle Counts &amp; Variance Auditing
              </Text>
              <Text className="text-base text-stone-500 mt-1">
                Perform weekly or monthly physical counts to reconcile shrinkage, over-pouring, and
                unrecorded waste.
              </Text>
            </View>
            <Pressable
              onPress={() => setIsStocktakeModalOpen(true)}
              className="min-h-[48px] flex-row items-center rounded-xl bg-[#800020] px-6 active:opacity-90 shadow-sm"
            >
              <ClipboardCheck size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">Start Physical Count</Text>
            </Pressable>
          </View>

          <View className="rounded-xl bg-stone-50 p-6 border border-stone-200 space-y-3">
            <Text className="text-base font-bold text-stone-800">
              Audit Guardrails &amp; Mathematical Verification:
            </Text>
            <Text className="text-base text-stone-600">
              • Expected on-hand stock reflects real-time dispatch depletion and past restocks.
            </Text>
            <Text className="text-base text-stone-600">
              • System calculates Variance Qty (Variance = Actual - Expected) and cost impact (Cost
              = Variance × MAC).
            </Text>
            <Text className="text-base text-stone-600">
              • Upon confirmation, atomic database transaction commits adjustments directly to the
              immutable Stock Movement Ledger.
            </Text>
          </View>
        </View>
      )}

      {/* TAB 5: WASTE & SPILLAGE */}
      {activeTab === 'waste' && (
        <View className="rounded-2xl border border-stone-200/80 bg-white p-8 shadow-xs">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-2xl font-bold text-stone-900">
                Spillage, Spoilage &amp; Loss Logging
              </Text>
              <Text className="text-base text-stone-500 mt-1">
                Log dropped bottles, expired ingredients, burned dishes, or tasting portions booked
                to venue overheads.
              </Text>
            </View>
            <Pressable
              onPress={() => setIsWasteModalOpen(true)}
              className="min-h-[48px] flex-row items-center rounded-xl bg-rose-700 px-6 active:opacity-90 shadow-sm"
            >
              <Trash2 size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">Log Waste Event</Text>
            </Pressable>
          </View>

          <View className="rounded-xl bg-rose-50/50 p-6 border border-rose-200 space-y-3">
            <Text className="text-base font-bold text-rose-950">Loss Accounting Rule:</Text>
            <Text className="text-base text-rose-800">
              Waste entries deduct raw stock from active inventory and debit the financial loss
              directly into the venue overhead expense pool, preventing artificial inventory
              inflation without masking shrink.
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
