import React, { useState, useEffect, useCallback } from 'react';
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
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
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
import { AdminModal, AdminInput, AdminNumberInput } from '../components';
import { PosDropdown, PosDropdownOption } from '@/features/shared';

type InventoryTab = 'stock' | 'suppliers' | 'ledger' | 'stocktake' | 'waste';

interface AdminInventoryViewProps {
  inventory: InventoryItemAdmin[];
  onRefresh: () => void;
}

const CATEGORY_FILTERS = [
  { key: 'ALL', label: 'All Items' },
  { key: 'PACKAGING', label: '📦 Disposables & Packaging' },
  { key: 'COFFEE_TEA', label: '☕ Coffee & Tea' },
  { key: 'SPIRITS_LIQUOR', label: '🥃 Spirits & Liquor' },
  { key: 'WINE_BEER', label: '🍷 Wine & Beer' },
  { key: 'DAIRY_PLANT', label: '🥛 Dairy & Milks' },
  { key: 'SYRUPS_MIXERS', label: '🍯 Syrups & Mixers' },
  { key: 'KITCHEN_MEAT', label: '🥩 Kitchen Meats' },
  { key: 'PRODUCE', label: '🥬 Fresh Produce' },
  { key: 'DRY_GOODS', label: '🍝 Dry Goods' },
];

export const AdminInventoryView: React.FC<AdminInventoryViewProps> = ({ inventory, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Supporting entities
  const [suppliers, setSuppliers] = useState<SupplierAdmin[]>([]);
  const [movements, setMovements] = useState<StockMovementAdmin[]>([]);

  // Restock Intake state
  const [selectedRestockItem, setSelectedRestockItem] = useState<InventoryItemAdmin | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockInvoice, setRestockInvoice] = useState('');
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemAdmin | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierAdmin | null>(null);

  const [isStocktakeModalOpen, setIsStocktakeModalOpen] = useState(false);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);

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
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.supplier?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const inventoryTabOptions: PosDropdownOption<InventoryTab>[] = [
    {
      value: 'stock',
      label: 'Stock On-Hand',
      badge: inventory.length,
      icon: Package,
      description: 'Live ingredient stock levels and restock intake',
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
      {/* Page Header & View Dropdown */}
      <View className="mb-5 flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Text className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
          Inventory &amp; Costing (MAC)
        </Text>

        {/* View Selector Dropdown + Contextual Action Button */}
        <View className="flex-row items-center gap-2.5 flex-wrap">
          <PosDropdown
            options={inventoryTabOptions}
            value={activeTab}
            onChange={setActiveTab}
            prefixLabel="View:"
            sheetTitle="Select Inventory Section"
            className="flex-1 sm:flex-initial min-w-[195px]"
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
            <Text className="ml-2 text-base font-bold text-stone-800">Export Excel</Text>
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

      {/* TAB 1: STOCK ON-HAND */}
      {activeTab === 'stock' && (
        <View className="space-y-4">
          {/* Search & Category Dropdown Bar */}
          <View className="flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <View className="flex-1">
              <AdminInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search inventory items, SKUs, or vendors..."
                leftElement={<Search size={20} color="#78716c" />}
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

          {/* Inventory Table / Cards */}
          <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
            {filteredInventory.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Package size={40} color="#a8a29e" />
                <Text className="mt-2 text-base text-stone-500">
                  No inventory items match the current filters.
                </Text>
              </View>
            ) : (
              <View className="space-y-4">
                {filteredInventory.map((item) => {
                  const isBelowPar = item.current_stock <= item.min_alert_level;
                  const isCritical = item.current_stock <= 0;

                  return (
                    <View
                      key={item.id}
                      className="flex-col md:flex-row md:items-center justify-between border-b border-stone-100 pb-4 gap-4"
                    >
                      <View className="flex-1 md:pr-4">
                        <View className="flex-row items-center space-x-2 flex-wrap gap-1.5">
                          <Text className="text-lg font-bold text-stone-900">{item.name}</Text>
                          {isCritical ? (
                            <View className="rounded-md bg-rose-100 border border-rose-300 px-2 py-0.5">
                              <Text className="text-base font-bold text-rose-800">
                                🔴 Out of Stock
                              </Text>
                            </View>
                          ) : isBelowPar ? (
                            <View className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5">
                              <Text className="text-base font-bold text-amber-800">
                                🟡 Below Par
                              </Text>
                            </View>
                          ) : (
                            <View className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                              <Text className="text-base font-bold text-emerald-800">
                                🟢 In Par
                              </Text>
                            </View>
                          )}
                          {item.category === 'PACKAGING' && (
                            <View className="rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5">
                              <Text className="text-base font-bold text-sky-800">
                                📦 Disposable
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text className="text-base text-stone-500 mt-1">
                          SKU: {item.sku} • Category: {item.category} • Par Alert:{' '}
                          {item.min_alert_level} {item.unit}
                        </Text>
                        <Text className="text-base text-stone-600 mt-0.5">
                          Supplier:{' '}
                          {item.supplier?.name || item.supplier_name || 'Direct Wholesale'}
                        </Text>
                      </View>

                      {/* Stock on Hand & Cost & Actions */}
                      <View className="flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t border-stone-100/70 md:border-t-0">
                        <View className="flex-row sm:flex-col items-baseline sm:items-end justify-between sm:mr-3">
                          <Text
                            className={`text-lg font-extrabold ${
                              isCritical
                                ? 'text-rose-700'
                                : isBelowPar
                                  ? 'text-amber-700'
                                  : 'text-stone-900'
                            }`}
                          >
                            {Number(item.current_stock || 0).toFixed(2)} {item.unit}
                          </Text>
                          <Text className="text-base text-stone-500">
                            MAC: ₱{Number(item.unit_cost || 0).toFixed(2)}/{item.unit}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-2">
                          <Pressable
                            onPress={() => setSelectedRestockItem(item)}
                            className="flex-1 sm:flex-initial min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-xs"
                          >
                            <Plus size={18} color="#ffffff" />
                            <Text className="ml-1 text-base font-bold text-white">Restock</Text>
                          </Pressable>

                          <Pressable
                            onPress={() => {
                              setEditingItem(item);
                              setIsItemModalOpen(true);
                            }}
                            className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
                            accessibilityLabel="Edit inventory item"
                          >
                            <Edit size={18} color="#44403c" />
                          </Pressable>

                          <Pressable
                            onPress={() => handleDeleteItem(item)}
                            className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-rose-50 active:bg-rose-100"
                            accessibilityLabel="Delete inventory item"
                          >
                            <Trash2 size={18} color="#e11d48" />
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
                Inventory Cycle Counts & Variance Auditing
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
              Audit Guardrails & Mathematical Verification:
            </Text>
            <Text className="text-base text-stone-600">
              • Expected on-hand stock reflects real-time dispatch depletion and past restocks.
            </Text>
            <Text className="text-base text-stone-600">
              • System calculates Variance Qty ($Variance = Actual - Expected$) and cost impact
              ($Cost = Variance \times MAC$).
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
                Spillage, Spoilage & Loss Logging
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

      {/* MODALS */}
      <InventoryItemModal
        visible={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSuccess={handleRefreshAll}
        item={editingItem}
        suppliers={suppliers}
      />

      <SupplierModal
        visible={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={handleRefreshAll}
        supplier={editingSupplier}
      />

      <StocktakeAuditModal
        visible={isStocktakeModalOpen}
        onClose={() => setIsStocktakeModalOpen(false)}
        onSuccess={handleRefreshAll}
        inventory={inventory}
      />

      <WasteLoggerModal
        visible={isWasteModalOpen}
        onClose={() => setIsWasteModalOpen(false)}
        onSuccess={handleRefreshAll}
        inventory={inventory}
      />
    </ScrollView>
  );
};
