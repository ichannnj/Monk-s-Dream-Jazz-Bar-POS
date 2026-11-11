import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { FileSpreadsheet, Plus, Building2, ClipboardCheck, Trash2 } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { InventoryItemAdmin } from '../../../../data/admin.api';
import { exportInventoryValuationToExcel } from '../../../../utils/readingExcelExport';
import { InventoryTab } from './inventory.types';

interface InventoryHeaderAndTabsProps {
  activeTab: InventoryTab;
  setActiveTab: (tab: InventoryTab) => void;
  inventory: InventoryItemAdmin[];
  categoryFilter: string;
  suppliersCount: number;
  movementsCount: number;
  isLoadingSupporting: boolean;
  handleRefreshAll: () => void;
  onAddItem: () => void;
  onAddSupplier: () => void;
  onRunStocktake: () => void;
  onLogSpillage: () => void;
}

export const InventoryHeaderAndTabs: React.FC<InventoryHeaderAndTabsProps> = ({
  activeTab,
  setActiveTab,
  inventory,
  categoryFilter,
  suppliersCount,
  movementsCount,
  onAddItem,
  onAddSupplier,
  onRunStocktake,
  onLogSpillage,
}) => {
  const inventoryTabItems: Array<{
    id: InventoryTab;
    label: string;
    count?: number;
  }> = [
    { id: 'stock', label: 'Stock On-Hand', count: inventory.length },
    { id: 'suppliers', label: 'Suppliers', count: suppliersCount },
    { id: 'ledger', label: 'Movements Ledger', count: movementsCount },
    { id: 'stocktake', label: 'Stocktake Audit' },
    { id: 'waste', label: 'Spillage & Waste' },
  ];

  return (
    <>
      {/* 1. Header (Clean single line, no subtitle, no manual refresh button) */}
      <View className="mb-5 flex-row items-center justify-between flex-wrap gap-3">
        <Text className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
          Inventory Hub
        </Text>

        {/* Global Hub Action Buttons */}
        <View className="flex-row items-center gap-2 flex-wrap">
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
            className="h-10 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white px-3 active:bg-stone-50 shadow-xs"
            accessibilityLabel="Export Inventory Valuation to Excel"
          >
            <FileSpreadsheet size={15} color="#800020" />
            <Text className="ml-1.5 text-xs font-bold text-stone-800">Export</Text>
          </Pressable>

          {activeTab === 'stock' && (
            <Pressable
              onPress={onAddItem}
              className="h-10 flex-row items-center justify-center rounded-xl bg-[#800020] px-3.5 active:bg-[#600018] shadow-xs"
            >
              <Plus size={16} color="#ffffff" />
              <Text className="ml-1.5 text-xs font-bold text-white">Add Item</Text>
            </Pressable>
          )}

          {activeTab === 'suppliers' && (
            <Pressable
              onPress={onAddSupplier}
              className="h-10 flex-row items-center justify-center rounded-xl bg-[#800020] px-3.5 active:bg-[#600018] shadow-xs"
            >
              <Building2 size={16} color="#ffffff" />
              <Text className="ml-1.5 text-xs font-bold text-white">Add Supplier</Text>
            </Pressable>
          )}

          {activeTab === 'stocktake' && (
            <Pressable
              onPress={onRunStocktake}
              className="h-10 flex-row items-center justify-center rounded-xl bg-[#800020] px-3.5 active:bg-[#600018] shadow-xs"
            >
              <ClipboardCheck size={16} color="#ffffff" />
              <Text className="ml-1.5 text-xs font-bold text-white">Run Stocktake</Text>
            </Pressable>
          )}

          {activeTab === 'waste' && (
            <Pressable
              onPress={onLogSpillage}
              className="h-10 flex-row items-center justify-center rounded-xl bg-[#800020] px-3.5 active:bg-[#600018] shadow-xs"
            >
              <Trash2 size={16} color="#ffffff" />
              <Text className="ml-1.5 text-xs font-bold text-white">Log Spillage</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* 2. Top Segmented Navigation Tabs */}
      <View className="mb-5 rounded-2xl bg-white p-1.5 border border-stone-200/80 shadow-xs">
        <View className="flex-row items-center gap-1.5 flex-wrap">
          {inventoryTabItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[120px] flex-row items-center justify-center py-2 px-3 rounded-xl transition-all ${
                  isActive ? 'bg-[#FAF8F5] border border-stone-200' : 'active:bg-stone-50'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${isActive ? 'text-[#800020]' : 'text-stone-600'}`}
                >
                  {tab.label}
                </Text>
                {tab.count !== undefined && (
                  <View
                    className={`ml-1.5 rounded-full px-1.5 py-0.2 ${
                      isActive ? 'bg-[#800020]' : 'bg-stone-100'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        isActive ? 'text-white' : 'text-stone-700'
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
    </>
  );
};
