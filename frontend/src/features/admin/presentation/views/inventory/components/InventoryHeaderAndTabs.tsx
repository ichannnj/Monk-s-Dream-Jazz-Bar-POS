import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  Boxes,
  RefreshCw,
  FileSpreadsheet,
  Plus,
  Building2,
  ClipboardCheck,
  Trash2,
  Package,
  FileText,
} from 'lucide-react-native';
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
  isLoadingSupporting,
  handleRefreshAll,
  onAddItem,
  onAddSupplier,
  onRunStocktake,
  onLogSpillage,
}) => {
  const inventoryTabItems: Array<{
    id: InventoryTab;
    label: string;
    icon: React.ComponentType<{ size: number; color: string }>;
    count?: number;
  }> = [
    { id: 'stock', label: 'Stock & Par Alerts', icon: Package, count: inventory.length },
    { id: 'suppliers', label: 'Suppliers Directory', icon: Building2, count: suppliersCount },
    { id: 'ledger', label: 'Movement Ledger', icon: FileText, count: movementsCount },
    { id: 'stocktake', label: 'Physical Stocktake', icon: ClipboardCheck },
    { id: 'waste', label: 'Waste & Spillage', icon: Trash2 },
  ];

  return (
    <>
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
              onPress={onAddItem}
              className="min-h-[44px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-sm"
            >
              <Plus size={18} color="#ffffff" />
              <Text className="ml-1.5 text-sm font-bold text-white">+ Add Item</Text>
            </Pressable>
          )}

          {activeTab === 'suppliers' && (
            <Pressable
              onPress={onAddSupplier}
              className="min-h-[44px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-sm"
            >
              <Building2 size={18} color="#ffffff" />
              <Text className="ml-1.5 text-sm font-bold text-white">+ Add Supplier</Text>
            </Pressable>
          )}

          {activeTab === 'stocktake' && (
            <Pressable
              onPress={onRunStocktake}
              className="min-h-[44px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-sm"
            >
              <ClipboardCheck size={18} color="#ffffff" />
              <Text className="ml-1.5 text-sm font-bold text-white">Run Stocktake</Text>
            </Pressable>
          )}

          {activeTab === 'waste' && (
            <Pressable
              onPress={onLogSpillage}
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
    </>
  );
};
