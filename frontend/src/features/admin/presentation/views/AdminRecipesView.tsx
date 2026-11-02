import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  Utensils,
  Plus,
  Edit,
  Trash2,
  Layers,
  Sliders,
  FolderPlus,
  Search,
  CheckCircle,
  AlertOctagon,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import {
  adminApi,
  type ProductAdmin,
  type CategoryAdmin,
  type ModifierGroupAdmin,
  type InventoryItemAdmin,
} from '../../data/admin.api';
import { MenuItemModal } from './menu/MenuItemModal';
import { CategoryModal } from './menu/CategoryModal';
import { ModifierGroupModal } from './menu/ModifierGroupModal';
import { RecipeBomModal } from './menu/RecipeBomModal';
import { AdminInput } from '../components/AdminInput';

type MenuTab = 'items' | 'categories' | 'modifiers' | 'bom';

interface AdminRecipesViewProps {
  products: ProductAdmin[];
  onRefresh: () => void;
}

export const AdminRecipesView: React.FC<AdminRecipesViewProps> = ({ products, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<MenuTab>('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Local products cache for autonomous updates & resilience
  const [localProducts, setLocalProducts] = useState<ProductAdmin[]>(products);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);

  useEffect(() => {
    if (products && products.length > 0) {
      setLocalProducts(products);
    }
  }, [products]);

  // Supporting entities
  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupAdmin[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemAdmin[]>([]);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductAdmin | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryAdmin | null>(null);

  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [editingModifierGroup, setEditingModifierGroup] = useState<ModifierGroupAdmin | null>(null);

  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [bomProduct, setBomProduct] = useState<ProductAdmin | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const prods = await adminApi.getProductsWithBOM();
      setLocalProducts(prods);
    } catch (err) {
      console.warn('[AdminRecipesView] Failed to load products directly:', err);
    }
  }, []);

  const loadSupportingData = useCallback(async () => {
    setIsLoadingCatalogs(true);
    try {
      const [catsRes, groupsRes, invRes] = await Promise.allSettled([
        adminApi.getCategories(),
        adminApi.getModifierGroups(),
        adminApi.getInventoryItems(),
      ]);
      if (catsRes.status === 'fulfilled') {
        setCategories(catsRes.value);
      } else {
        console.warn('[AdminRecipesView] Failed to load categories:', catsRes.reason);
      }
      if (groupsRes.status === 'fulfilled') {
        setModifierGroups(groupsRes.value);
      } else {
        console.warn('[AdminRecipesView] Failed to load modifier groups:', groupsRes.reason);
      }
      if (invRes.status === 'fulfilled') {
        setInventoryItems(invRes.value);
      } else {
        console.warn('[AdminRecipesView] Failed to load inventory items:', invRes.reason);
      }
    } catch (err) {
      console.error('[AdminRecipesView] Error loading supporting data:', err);
      toast.error('Failed to load menu supporting catalogs', { title: 'Load Error' });
    } finally {
      setIsLoadingCatalogs(false);
    }
  }, []);

  useEffect(() => {
    loadSupportingData();
    if (localProducts.length === 0) {
      loadProducts();
    }
  }, [loadSupportingData, loadProducts]);

  const handleRefreshAll = () => {
    loadSupportingData();
    loadProducts();
    onRefresh();
  };

  // Product Actions
  const handleToggleAuto86 = async (prod: ProductAdmin) => {
    const next86 = !prod.auto_86;
    try {
      await adminApi.toggleAuto86(prod.id, next86, next86 ? 'Manual Stockout' : undefined);
      toast.success(
        next86 ? `Marked "${prod.name}" as Sold Out` : `Restored "${prod.name}" to Active Menu`,
        { title: 'Availability Updated' }
      );
      handleRefreshAll();
    } catch {
      toast.error('Failed to update availability', { title: 'Error' });
    }
  };

  const handleDeleteProduct = async (prod: ProductAdmin) => {
    try {
      await adminApi.deleteProduct(prod.id);
      toast.success(`Deleted "${prod.name}" from catalog`, { title: 'Product Deleted' });
      handleRefreshAll();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete product', { title: 'Delete Error' });
    }
  };

  const handleDeleteCategory = async (cat: CategoryAdmin) => {
    try {
      await adminApi.deleteCategory(cat.id);
      toast.success(`Deleted category "${cat.name}"`, { title: 'Category Deleted' });
      handleRefreshAll();
    } catch (err: any) {
      toast.error(err?.message || 'Cannot delete category containing products', {
        title: 'Delete Error',
      });
    }
  };

  const handleDeleteModifierGroup = async (group: ModifierGroupAdmin) => {
    try {
      await adminApi.deleteModifierGroup(group.id);
      toast.success(`Deleted modifier group "${group.name}"`, { title: 'Group Deleted' });
      handleRefreshAll();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete modifier group', { title: 'Delete Error' });
    }
  };

  // Filtered Products
  const displayProducts = localProducts.length > 0 ? localProducts : products;
  const filteredProducts = displayProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.categories?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategoryFilter === 'ALL' || p.category_id === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <ScrollView className="flex-1 bg-[#fcf9f9] p-8" showsVerticalScrollIndicator={false}>
      {/* Page Header */}
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-extrabold tracking-tight text-stone-900">
            Menu Catalog & Recipe Engineering
          </Text>
          <Text className="mt-1 text-base text-stone-500">
            Products, category hierarchy, modifier groups, and Bill of Materials (BOM) with live
            COGS
          </Text>
        </View>

        {/* Global Action Buttons based on tab */}
        <View className="flex-row items-center space-x-3">
          {activeTab === 'items' && (
            <Pressable
              onPress={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="min-h-[48px] flex-row items-center rounded-xl bg-[#800020] px-5 active:opacity-90 shadow-sm"
            >
              <Plus size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">Add Menu Item</Text>
            </Pressable>
          )}

          {activeTab === 'categories' && (
            <Pressable
              onPress={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="min-h-[48px] flex-row items-center rounded-xl bg-[#800020] px-5 active:opacity-90 shadow-sm"
            >
              <FolderPlus size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">Add Category</Text>
            </Pressable>
          )}

          {activeTab === 'modifiers' && (
            <Pressable
              onPress={() => {
                setEditingModifierGroup(null);
                setIsModifierModalOpen(true);
              }}
              className="min-h-[48px] flex-row items-center rounded-xl bg-[#800020] px-5 active:opacity-90 shadow-sm"
            >
              <Sliders size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">New Modifier Group</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Sub-Navigation Tabs */}
      <View className="mb-6 flex-row border-b border-stone-200">
        {[
          { key: 'items', label: `Menu Items (${displayProducts.length})`, icon: Utensils },
          { key: 'categories', label: `Categories (${categories.length})`, icon: FolderPlus },
          { key: 'modifiers', label: `Modifier Groups (${modifierGroups.length})`, icon: Sliders },
          { key: 'bom', label: 'Recipe BOM & Costing', icon: Layers },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const IconComp = tab.icon;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as MenuTab)}
              className={`min-h-[48px] flex-row items-center px-6 border-b-2 transition-all ${
                isActive
                  ? 'border-[#800020] bg-[#800020]/5'
                  : 'border-transparent active:bg-stone-100'
              }`}
            >
              <IconComp size={18} color={isActive ? '#800020' : '#78716c'} />
              <Text
                className={`ml-2 text-base ${
                  isActive ? 'font-bold text-[#800020]' : 'font-medium text-stone-600'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* TAB 1: MENU ITEMS */}
      {activeTab === 'items' && (
        <View className="space-y-4">
          {/* Search & Category Filter Bar */}
          <View className="space-y-3">
            <AdminInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search products by name or category..."
              leftElement={<Search size={20} color="#78716c" />}
            />

            {/* Responsive Wrapped Category Pills (Zero horizontal scroll) */}
            <View className="flex-row flex-wrap gap-2 pt-1">
              <Pressable
                onPress={() => setSelectedCategoryFilter('ALL')}
                className={`min-h-[48px] px-4 items-center justify-center rounded-xl border transition-all ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-[#800020] border-[#800020]'
                    : 'bg-white border-stone-300 active:bg-stone-100'
                }`}
              >
                <Text
                  className={`text-base font-semibold ${
                    selectedCategoryFilter === 'ALL' ? 'text-white' : 'text-stone-700'
                  }`}
                >
                  All Categories
                </Text>
              </Pressable>
              {categories.map((c) => {
                const isSelected = selectedCategoryFilter === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedCategoryFilter(c.id)}
                    className={`min-h-[48px] px-4 items-center justify-center rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#800020] border-[#800020]'
                        : 'bg-white border-stone-300 active:bg-stone-100'
                    }`}
                  >
                    <Text
                      className={`text-base font-semibold ${
                        isSelected ? 'text-white' : 'text-stone-700'
                      }`}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Products List Cards */}
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
                  <View
                    key={prod.id}
                    className="flex-row items-center justify-between rounded-xl border border-stone-200 bg-white p-4 transition-all"
                  >
                    {/* Left Side: Product Info */}
                    <View className="flex-1 pr-4">
                      <View className="flex-row items-center space-x-2.5">
                        <Text className="text-lg font-bold text-stone-900">{prod.name}</Text>
                        <View
                          className={`rounded-md px-2.5 py-0.5 border ${
                            prod.station_target === 'bar'
                              ? 'bg-purple-50 border-purple-200'
                              : 'bg-amber-50 border-amber-200'
                          }`}
                        >
                          <Text
                            className={`text-base font-bold ${
                              prod.station_target === 'bar' ? 'text-purple-800' : 'text-amber-800'
                            }`}
                          >
                            {prod.station_target === 'bar' ? 'Bar' : 'Kitchen'}
                          </Text>
                        </View>
                        {prod.is_resold_outside_food && (
                          <View className="rounded-md bg-stone-100 border border-stone-300 px-2.5 py-0.5">
                            <Text className="text-base font-medium text-stone-700">
                              +20% Partner
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="flex-row items-center space-x-2 mt-1">
                        <Text className="text-base text-stone-500">
                          {prod.categories?.name || 'Unassigned'}
                        </Text>
                        <Text className="text-stone-300">•</Text>
                        <Text className="text-base font-extrabold text-[#800020]">
                          ₱{Number(prod.base_price || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* Right Side: Availability Pill & Action Icons */}
                    <View className="flex-row items-center space-x-3">
                      {/* Availability Status Toggle Pill */}
                      <Pressable
                        onPress={() => handleToggleAuto86(prod)}
                        className={`min-h-[48px] px-4 flex-row items-center justify-center rounded-xl border transition-all ${
                          prod.auto_86
                            ? 'bg-rose-50 border-rose-300 active:bg-rose-100'
                            : 'bg-emerald-50 border-emerald-300 active:bg-emerald-100'
                        }`}
                      >
                        <View
                          className={`h-2.5 w-2.5 rounded-full mr-2 ${
                            prod.auto_86 ? 'bg-rose-600' : 'bg-emerald-600'
                          }`}
                        />
                        <Text
                          className={`text-base font-bold ${
                            prod.auto_86 ? 'text-rose-800' : 'text-emerald-800'
                          }`}
                        >
                          {prod.auto_86 ? 'Sold Out' : 'Available'}
                        </Text>
                      </Pressable>

                      {/* Recipe BOM Icon Button */}
                      <Pressable
                        onPress={() => {
                          setBomProduct(prod);
                          setIsBomModalOpen(true);
                        }}
                        className="min-h-[48px] flex-row items-center rounded-xl border border-stone-300 bg-stone-50 px-3.5 active:bg-stone-100"
                      >
                        <Layers size={18} color="#800020" />
                        <Text className="ml-1.5 text-base font-bold text-[#800020]">Recipe</Text>
                      </Pressable>

                      {/* Edit Icon Button */}
                      <Pressable
                        onPress={() => {
                          setEditingProduct(prod);
                          setIsProductModalOpen(true);
                        }}
                        className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-stone-300 bg-white active:bg-stone-100"
                      >
                        <Edit size={18} color="#44403c" />
                      </Pressable>

                      {/* Delete Icon Button */}
                      <Pressable
                        onPress={() => handleDeleteProduct(prod)}
                        className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 active:bg-rose-100"
                      >
                        <Trash2 size={18} color="#e11d48" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === 'categories' && (
        <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <View className="space-y-3">
            {categories.map((cat) => {
              const productCount = products.filter((p) => p.category_id === cat.id).length;
              return (
                <View
                  key={cat.id}
                  className="flex-row items-center justify-between border-b border-stone-100 py-3.5"
                >
                  <View>
                    <Text className="text-lg font-bold text-stone-900">{cat.name}</Text>
                    <Text className="text-base text-stone-500">
                      Slug: {cat.slug} • Order: {cat.sort_order} • Products: {productCount}
                    </Text>
                  </View>
                  <View className="flex-row items-center space-x-2">
                    <Pressable
                      onPress={() => {
                        setEditingCategory(cat);
                        setIsCategoryModalOpen(true);
                      }}
                      className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
                    >
                      <Edit size={18} color="#44403c" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteCategory(cat)}
                      className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-rose-50 active:bg-rose-100"
                    >
                      <Trash2 size={18} color="#e11d48" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* TAB 3: MODIFIER GROUPS */}
      {activeTab === 'modifiers' && (
        <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <View className="space-y-4">
            {modifierGroups.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Sliders size={40} color="#a8a29e" />
                <Text className="mt-2 text-base text-stone-500">
                  No modifier groups configured. Tap "New Modifier Group" to add.
                </Text>
              </View>
            ) : (
              modifierGroups.map((group) => (
                <View
                  key={group.id}
                  className="rounded-xl border border-stone-200 bg-stone-50/70 p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <View className="flex-row items-center space-x-2">
                        <Text className="text-lg font-bold text-stone-900">{group.name}</Text>
                        {group.is_required && (
                          <View className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5">
                            <Text className="text-base font-bold text-amber-900">Required</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-base text-stone-500 mt-0.5">
                        Rules: Min {group.min_selections} • Max {group.max_selections} choices
                      </Text>
                    </View>
                    <View className="flex-row items-center space-x-2">
                      <Pressable
                        onPress={() => {
                          setEditingModifierGroup(group);
                          setIsModifierModalOpen(true);
                        }}
                        className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-white border border-stone-300 active:bg-stone-100"
                      >
                        <Edit size={18} color="#44403c" />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteModifierGroup(group)}
                        className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-rose-50 border border-rose-200 active:bg-rose-100"
                      >
                        <Trash2 size={18} color="#e11d48" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Options Chips */}
                  <View className="mt-3 border-t border-stone-200 pt-3">
                    <Text className="text-base font-semibold text-stone-600 mb-2">Options:</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {group.options && group.options.length > 0 ? (
                        group.options.map((opt) => (
                          <View
                            key={opt.id}
                            className="rounded-lg bg-white border border-stone-300 px-3 py-1.5"
                          >
                            <Text className="text-base text-stone-800">
                              {opt.name}{' '}
                              <Text className="font-bold text-[#800020]">
                                {Number(opt.price_delta || 0) > 0
                                  ? `(+₱${Number(opt.price_delta || 0).toFixed(2)})`
                                  : '(+₱0.00)'}
                              </Text>
                              {opt.inventory_item && (
                                <Text className="text-base text-stone-500">
                                  {' '}
                                  • -{opt.amount_delta} {opt.unit}
                                </Text>
                              )}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text className="text-base text-stone-400">No options defined</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {/* TAB 4: RECIPE BOM & COSTING */}
      {activeTab === 'bom' && (
        <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <View className="space-y-4">
            {displayProducts.map((prod) => {
              const cogs = (prod.ingredients || []).reduce((acc, ing) => {
                const unitCost = ing.inventory_item?.unit_cost || 0;
                return acc + ing.amount * (ing.conversion_factor || 1) * unitCost;
              }, 0);
              const numPrice = Number(prod.base_price || 0);
              const margin = numPrice > 0 ? ((numPrice - cogs) / numPrice) * 100 : 0;

              return (
                <View
                  key={prod.id}
                  className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-4">
                      <Text className="text-lg font-bold text-stone-900">{prod.name}</Text>
                      <View className="flex-row items-center space-x-3 mt-1">
                        <Text className="text-base text-stone-500">
                          Price:{' '}
                          <Text className="font-bold text-stone-800">₱{numPrice.toFixed(2)}</Text>
                        </Text>
                        <Text className="text-stone-300">•</Text>
                        <Text className="text-base text-stone-500">
                          COGS: <Text className="font-bold text-[#800020]">₱{cogs.toFixed(2)}</Text>
                        </Text>
                        <Text className="text-stone-300">•</Text>
                        <View
                          className={`rounded-md px-2.5 py-0.5 border ${
                            margin >= 70
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-amber-50 border-amber-200'
                          }`}
                        >
                          <Text
                            className={`text-base font-bold ${
                              margin >= 70 ? 'text-emerald-800' : 'text-amber-800'
                            }`}
                          >
                            {margin.toFixed(1)}% Margin
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        setBomProduct(prod);
                        setIsBomModalOpen(true);
                      }}
                      className="min-h-[48px] flex-row items-center rounded-xl bg-[#800020] px-4 active:opacity-90"
                    >
                      <Layers size={18} color="#ffffff" />
                      <Text className="ml-1.5 text-base font-bold text-white">
                        Configure Recipe
                      </Text>
                    </Pressable>
                  </View>

                  {/* Ingredients Table */}
                  <View className="mt-3 border-t border-stone-200 pt-2">
                    {prod.ingredients && prod.ingredients.length > 0 ? (
                      <View className="flex-row flex-wrap gap-2">
                        {prod.ingredients.map((ing) => (
                          <View
                            key={ing.id}
                            className="rounded-lg bg-white border border-stone-300 px-3 py-1.5"
                          >
                            <Text className="text-base text-stone-800">
                              {ing.inventory_item?.name || 'Raw Item'} — {ing.amount} {ing.unit}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text className="text-base text-stone-400">
                        Direct inventory item (1:1 unit depletion or no sub-ingredients)
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
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
