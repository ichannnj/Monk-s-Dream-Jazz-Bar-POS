import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  Utensils,
  Plus,
  Layers,
  Sliders,
  FolderPlus,
  Search,
  FileSpreadsheet,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import type { ProductAdmin } from '../../data/admin.api';
import { exportMenuCatalogToExcel } from '../../utils/readingExcelExport';
import { MenuItemModal } from './menu/MenuItemModal';
import { CategoryModal } from './menu/CategoryModal';
import { ModifierGroupModal } from './menu/ModifierGroupModal';
import { RecipeBomModal } from './menu/RecipeBomModal';
import { ProductCatalogRow } from './menu/ProductCatalogRow';
import { RecipeBomCostingTab } from './menu/RecipeBomCostingTab';
import { CategoryListTab } from './menu/CategoryListTab';
import { ModifierGroupListTab } from './menu/ModifierGroupListTab';
import { AdminInput } from '../components/AdminInput';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { useAdminRecipesController, type MenuTab } from './menu/useAdminRecipesController';

interface AdminRecipesViewProps {
  products: ProductAdmin[];
  onRefresh: () => void;
}

export const AdminRecipesView: React.FC<AdminRecipesViewProps> = ({ products, onRefresh }) => {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    displayProducts,
    filteredProducts,
    categories,
    modifierGroups,
    inventoryItems,
    isProductModalOpen,
    setIsProductModalOpen,
    editingProduct,
    setEditingProduct,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    editingCategory,
    setEditingCategory,
    isModifierModalOpen,
    setIsModifierModalOpen,
    editingModifierGroup,
    setEditingModifierGroup,
    isBomModalOpen,
    setIsBomModalOpen,
    bomProduct,
    setBomProduct,
    handleRefreshAll,
    handleToggleAuto86,
    handleDeleteProduct,
    handleDeleteCategory,
    handleDeleteModifierGroup,
  } = useAdminRecipesController(products, onRefresh);

  const menuTabOptions: PosDropdownOption<MenuTab>[] = [
    {
      value: 'items',
      label: 'Menu Items',
      badge: displayProducts.length,
      icon: Utensils,
      description: 'Active menu catalog, pricing, and Auto-86 availability',
    },
    {
      value: 'categories',
      label: 'Categories',
      badge: categories.length,
      icon: FolderPlus,
      description: 'Menu category hierarchy and KDS station routing',
    },
    {
      value: 'modifiers',
      label: 'Modifier Groups',
      badge: modifierGroups.length,
      icon: Sliders,
      description: 'Add-ons, milk options, doneness, and price deltas',
    },
    {
      value: 'bom',
      label: 'Recipe BOM & Costing',
      icon: Layers,
      description: 'Bill of Materials ingredient depletion & live COGS',
    },
  ];

  const categoryFilterOptions: PosDropdownOption<string>[] = [
    { value: 'ALL', label: 'All Categories', badge: displayProducts.length, icon: Layers },
    ...categories.map((c) => ({
      value: c.id,
      label: c.name,
    })),
  ];

  return (
    <ScrollView
      className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      {/* Page Header & View Dropdown */}
      <View className="mb-5 flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Text className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
          Menu Catalog &amp; Recipe BOM
        </Text>

        <View className="flex-row items-center gap-2.5 flex-wrap">
          <PosDropdown
            options={menuTabOptions}
            value={activeTab}
            onChange={setActiveTab}
            prefixLabel="View:"
            sheetTitle="Select Menu Catalog Section"
            className="flex-1 sm:flex-initial min-w-[195px]"
          />

          <Pressable
            onPress={() => {
              try {
                exportMenuCatalogToExcel(displayProducts);
                toast.success('Recipe BOM & costing exported to Excel (.xls)', {
                  title: 'Excel Export Ready',
                });
              } catch (err) {
                console.error('[AdminRecipesView] Export error:', err);
                toast.error('Failed to export recipe spreadsheet', { title: 'Export Error' });
              }
            }}
            className="min-h-[48px] flex-row items-center justify-center rounded-xl border border-stone-200 bg-white px-3.5 sm:px-4 active:bg-stone-50 shadow-xs"
            accessibilityLabel="Export Recipe Catalog & BOM to Excel"
          >
            <FileSpreadsheet size={18} color="#047857" />
            <Text className="ml-2 text-base font-bold text-stone-800">Export Excel</Text>
          </Pressable>

          {activeTab === 'items' && (
            <Pressable
              onPress={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-sm w-full sm:w-auto"
            >
              <Plus size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">+ Add Item</Text>
            </Pressable>
          )}

          {activeTab === 'categories' && (
            <Pressable
              onPress={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-sm w-full sm:w-auto"
            >
              <FolderPlus size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">+ Add Category</Text>
            </Pressable>
          )}

          {activeTab === 'modifiers' && (
            <Pressable
              onPress={() => {
                setEditingModifierGroup(null);
                setIsModifierModalOpen(true);
              }}
              className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-sm w-full sm:w-auto"
            >
              <Sliders size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">+ New Modifier Group</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* TAB 1: MENU ITEMS */}
      {activeTab === 'items' && (
        <View className="space-y-4">
          <View className="flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <View className="flex-1">
              <AdminInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search products by name or category..."
                leftElement={<Search size={20} color="#78716c" />}
              />
            </View>

            <PosDropdown
              options={categoryFilterOptions}
              value={selectedCategoryFilter}
              onChange={setSelectedCategoryFilter}
              sheetTitle="Filter Products by Category"
              className="w-full sm:w-64"
            />
          </View>

          <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
            {filteredProducts.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Utensils size={40} color="#a8a29e" />
                <Text className="mt-2 text-base text-stone-500">
                  No menu products match the selected criteria.
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {filteredProducts.map((prod) => (
                  <ProductCatalogRow
                    key={prod.id}
                    prod={prod}
                    onToggleAuto86={handleToggleAuto86}
                    onOpenBom={(p) => {
                      setBomProduct(p);
                      setIsBomModalOpen(true);
                    }}
                    onEdit={(p) => {
                      setEditingProduct(p);
                      setIsProductModalOpen(true);
                    }}
                    onDelete={handleDeleteProduct}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === 'categories' && (
        <CategoryListTab
          categories={categories}
          products={products}
          onEditCategory={(cat) => {
            setEditingCategory(cat);
            setIsCategoryModalOpen(true);
          }}
          onDeleteCategory={handleDeleteCategory}
        />
      )}

      {/* TAB 3: MODIFIER GROUPS */}
      {activeTab === 'modifiers' && (
        <ModifierGroupListTab
          modifierGroups={modifierGroups}
          onEditGroup={(group) => {
            setEditingModifierGroup(group);
            setIsModifierModalOpen(true);
          }}
          onDeleteGroup={handleDeleteModifierGroup}
        />
      )}

      {/* TAB 4: RECIPE BOM & COSTING */}
      {activeTab === 'bom' && (
        <RecipeBomCostingTab
          products={displayProducts}
          onConfigureRecipe={(prod) => {
            setBomProduct(prod);
            setIsBomModalOpen(true);
          }}
        />
      )}

      {/* MODALS */}
      <MenuItemModal
        visible={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSuccess={handleRefreshAll}
        product={editingProduct}
        categories={categories}
      />

      <CategoryModal
        visible={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={handleRefreshAll}
        category={editingCategory}
      />

      <ModifierGroupModal
        visible={isModifierModalOpen}
        onClose={() => setIsModifierModalOpen(false)}
        onSuccess={handleRefreshAll}
        group={editingModifierGroup}
        inventoryItems={inventoryItems}
      />

      <RecipeBomModal
        visible={isBomModalOpen}
        onClose={() => setIsBomModalOpen(false)}
        onSuccess={handleRefreshAll}
        product={bomProduct}
        inventoryItems={inventoryItems}
      />
    </ScrollView>
  );
};
