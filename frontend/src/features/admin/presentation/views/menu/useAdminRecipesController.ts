import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/features/shared/toast/useToastStore';
import { realtimeGateway, useWindowVisibilitySync } from '@/features/shared';
import {
  adminApi,
  type ProductAdmin,
  type CategoryAdmin,
  type ModifierGroupAdmin,
  type InventoryItemAdmin,
} from '../../../data/admin.api';

export type MenuTab = 'items' | 'categories' | 'modifiers' | 'bom';

export const useAdminRecipesController = (products: ProductAdmin[], onRefresh: () => void) => {
  const [activeTab, setActiveTab] = useState<MenuTab>('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  const [localProducts, setLocalProducts] = useState<ProductAdmin[]>(products);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);

  useEffect(() => {
    if (products && products.length > 0) {
      setLocalProducts(products);
    }
  }, [products]);

  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupAdmin[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemAdmin[]>([]);

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
    if (isProductModalOpen) return;
    setIsLoadingCatalogs(true);
    try {
      const [catsRes, groupsRes, invRes] = await Promise.allSettled([
        adminApi.getCategories(),
        adminApi.getModifierGroups(),
        adminApi.getInventoryItems(),
      ]);
      if (catsRes.status === 'fulfilled') setCategories(catsRes.value);
      if (groupsRes.status === 'fulfilled') setModifierGroups(groupsRes.value);
      if (invRes.status === 'fulfilled') setInventoryItems(invRes.value);
    } catch (err) {
      console.error('[AdminRecipesView] Error loading supporting data:', err);
      toast.error('Failed to load menu supporting catalogs', { title: 'Load Error' });
    } finally {
      setIsLoadingCatalogs(false);
    }
  }, [isProductModalOpen]);

  useWindowVisibilitySync(() => {
    loadSupportingData();
    loadProducts();
  });

  useEffect(() => {
    loadSupportingData();
    loadProducts();

    const interval = setInterval(() => {
      loadSupportingData();
      loadProducts();
    }, 10000);

    const unsub = realtimeGateway.subscribeGlobalPOSRealtime({
      onProductChange: () => loadProducts(),
      onCategoryChange: () => loadSupportingData(),
      onInventoryChange: () => loadSupportingData(),
      onPosSyncNeeded: () => {
        loadSupportingData();
        loadProducts();
      },
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [loadSupportingData, loadProducts]);

  const handleRefreshAll = () => {
    loadSupportingData();
    loadProducts();
    onRefresh();
  };

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

  const displayProducts = localProducts.length > 0 ? localProducts : products;
  const filteredProducts = displayProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.categories?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategoryFilter === 'ALL' || p.category_id === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return {
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
    isLoadingCatalogs,
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
  };
};
