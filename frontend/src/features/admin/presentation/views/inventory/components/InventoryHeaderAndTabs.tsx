import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
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
  toBuyCount: number;
  suppliersCount: number;
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
  toBuyCount,
  suppliersCount,
  onAddItem,
  onAddSupplier,
  onRunStocktake,
  onLogSpillage,
}) => {
  const tabs: Array<{ id: InventoryTab; label: string; count?: number }> = [
    { id: 'stock', label: 'Stock', count: inventory.length },
    { id: 'grocery', label: 'To Buy', count: toBuyCount },
    { id: 'suppliers', label: 'Suppliers', count: suppliersCount },
    { id: 'activity', label: 'Activity & Audits' },
  ];

  const handleExport = () => {
    try {
      exportInventoryValuationToExcel(inventory, categoryFilter);
      toast.success('Inventory valuation exported to Excel (.xls)', {
        title: 'Excel Export Ready',
      });
    } catch {
      toast.error('Failed to export inventory spreadsheet', { title: 'Export Error' });
    }
  };

  return (
    <View className="mb-5 gap-4">
      {/* Header Row */}
      <View className="flex-row items-center justify-between flex-wrap gap-3">
        <Text className="text-2xl font-extrabold tracking-tight text-[#1C1917]">Inventory</Text>

        <View className="flex-row items-center gap-2 flex-wrap">
          <Pressable
            onPress={handleExport}
            className="min-h-[48px] flex-row items-center justify-center rounded-xl border border-[#E7E5E4] bg-white px-4 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Export inventory valuation to Excel"
          >
            <FileSpreadsheet size={18} color="#810021" />
            <Text className="ml-2 text-base font-bold text-[#1C1917]">Export</Text>
          </Pressable>

          {(activeTab === 'stock' || activeTab === 'grocery') && (
            <Pressable
              onPress={onAddItem}
              className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#810021] px-4 active:opacity-85"
              accessibilityRole="button"
              accessibilityLabel="Add inventory item"
            >
              <Plus size={18} color="#FFFFFF" />
              <Text className="ml-1.5 text-base font-bold text-white">Add Item</Text>
            </Pressable>
          )}

          {activeTab === 'suppliers' && (
            <Pressable
              onPress={onAddSupplier}
              className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#810021] px-4 active:opacity-85"
              accessibilityRole="button"
              accessibilityLabel="Add supplier"
            >
              <Building2 size={18} color="#FFFFFF" />
              <Text className="ml-1.5 text-base font-bold text-white">Add Supplier</Text>
            </Pressable>
          )}

          {activeTab === 'activity' && (
            <>
              <Pressable
                onPress={onLogSpillage}
                className="min-h-[48px] flex-row items-center justify-center rounded-xl border border-[#E7E5E4] bg-white px-4 active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Log spillage or waste"
              >
                <Trash2 size={18} color="#810021" />
                <Text className="ml-1.5 text-base font-bold text-[#1C1917]">Log Waste</Text>
              </Pressable>

              <Pressable
                onPress={onRunStocktake}
                className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#810021] px-4 active:opacity-85"
                accessibilityRole="button"
                accessibilityLabel="Start physical stocktake audit"
              >
                <ClipboardCheck size={18} color="#FFFFFF" />
                <Text className="ml-1.5 text-base font-bold text-white">Stocktake</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Scrollable Segmented Tab Bar */}
      <View className="rounded-2xl bg-white p-1.5 border border-[#E7E5E4]">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row items-center gap-1.5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  className={`min-h-[48px] flex-row items-center justify-center px-4 rounded-xl ${
                    isActive ? 'bg-[#810021]' : 'bg-transparent active:bg-[#FAF8F5]'
                  }`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    className={`text-base font-bold ${isActive ? 'text-white' : 'text-[#1C1917]'}`}
                  >
                    {tab.label}
                  </Text>
                  {tab.count !== undefined && (
                    <View
                      className={`ml-2 rounded-full px-2 py-0.5 ${
                        isActive ? 'bg-white/20' : 'bg-[#FAF8F5] border border-[#E7E5E4]'
                      }`}
                    >
                      <Text
                        className={`text-base font-bold tabular-nums ${
                          isActive ? 'text-white' : 'text-[#78716C]'
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
        </ScrollView>
      </View>
    </View>
  );
};
