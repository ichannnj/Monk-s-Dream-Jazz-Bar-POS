import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../../shared/infrastructure/supabase';
import { useOrderStore } from '../../../../orders/application/useOrderStore';
import { toast } from '../../../../shared/toast/useToastStore';
import { SEED_MENU_ITEMS } from '../../../../menu/data/menu.mock';
import { StockInventoryItem } from '../../barista/types';
import { BarProductStock } from '../../barista/modals/OutOfStockModal';

interface UseKdsStockProps {
  stationTarget: 'bar' | 'kitchen';
}

const KITCHEN_CATEGORIES = new Set([
  'mains_pasta',
  'small_plates',
  'desserts',
  'dairy_plant',
  'produce',
  'dry_goods',
  'meat_poultry',
]);

const BAR_CATEGORIES = new Set([
  'spirits',
  'beer',
  'wine',
  'wine_beer',
  'coffee',
  'coffee_beans',
  'syrups_mixers',
  'non_alcoholic',
]);

export function useKdsStock({ stationTarget }: UseKdsStockProps) {
  const [inventory, setInventory] = useState<StockInventoryItem[]>([]);
  const [menuProducts, setMenuProducts] = useState<BarProductStock[]>([]);
  const addAlert = useOrderStore((state) => state.addAlert);

  // Load real inventory items & station products from DB
  useEffect(() => {
    let isMounted = true;
    async function loadDbStock() {
      try {
        const [invRes, prodRes] = await Promise.all([
          supabase
            .from('inventory_items')
            .select('id, name, category, unit, current_stock, min_alert_level')
            .order('name'),
          supabase
            .from('products')
            .select('id, name, station_target, is_available, auto_86')
            .eq('station_target', stationTarget)
            .order('name'),
        ]);

        if (isMounted) {
          if (invRes.data && invRes.data.length > 0) {
            const allowedCats = stationTarget === 'kitchen' ? KITCHEN_CATEGORIES : BAR_CATEGORIES;
            const filteredInv = invRes.data.filter((item: any) =>
              allowedCats.has((item.category || '').toLowerCase())
            );
            setInventory(
              filteredInv.map((item: any) => ({
                id: item.id,
                name: item.name,
                category: (
                  item.category || (stationTarget === 'kitchen' ? 'produce' : 'spirits')
                ).toLowerCase(),
                unit: item.unit,
                inStockCount: parseFloat(item.current_stock) || 0,
                lowStockThreshold: parseFloat(item.min_alert_level) || 0,
                is86: (parseFloat(item.current_stock) || 0) <= 0,
              }))
            );
          }

          if (prodRes.data && prodRes.data.length > 0) {
            setMenuProducts(
              prodRes.data.map((p: any) => ({
                id: p.id,
                name: p.name,
                category: stationTarget === 'kitchen' ? 'kitchen' : 'bar',
                is86: p.auto_86 || !p.is_available,
              }))
            );
          } else {
            // Local fallback from SEED_MENU_ITEMS
            const fallbackStationItems = SEED_MENU_ITEMS.filter(
              (i) => i.stationTarget === stationTarget
            ).map((i) => ({
              id: i.id,
              name: i.name,
              category: i.category,
              is86: Boolean(i.auto86 || !i.isAvailable),
            }));
            setMenuProducts(fallbackStationItems);
          }
        }
      } catch (err) {
        console.warn(`Failed to load inventory from DB for ${stationTarget}:`, err);
        if (isMounted) {
          const fallbackStationItems = SEED_MENU_ITEMS.filter(
            (i) => i.stationTarget === stationTarget
          ).map((i) => ({
            id: i.id,
            name: i.name,
            category: i.category,
            is86: Boolean(i.auto86 || !i.isAvailable),
          }));
          setMenuProducts(fallbackStationItems);
        }
      }
    }
    loadDbStock();
    return () => {
      isMounted = false;
    };
  }, [stationTarget]);

  // Derived products for availability manager (Station menu items + Station pantry/raw inventory)
  const stationProducts: BarProductStock[] = useMemo(() => {
    const fromInv: BarProductStock[] = inventory.map((inv) => ({
      id: inv.id,
      name: inv.name,
      category: inv.category,
      is86: inv.is86,
      stockCount: inv.inStockCount,
    }));

    // Avoid duplicate names
    const existingNames = new Set(fromInv.map((p) => p.name.toLowerCase()));
    const additional = menuProducts.filter((p) => !existingNames.has(p.name.toLowerCase()));
    return [...additional, ...fromInv];
  }, [inventory, menuProducts]);

  const outOfStockItems = useMemo(() => {
    return stationProducts.filter((p) => p.is86);
  }, [stationProducts]);

  // Toggle item availability
  const handleToggleAvailability = (
    productId: string,
    willBeUnavailable: boolean,
    reason = 'Depleted'
  ) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === productId
          ? {
              ...item,
              is86: willBeUnavailable,
              inStockCount: willBeUnavailable ? 0 : item.inStockCount || 10,
            }
          : item
      )
    );

    const product = inventory.find((p) => p.id === productId);
    const prodName = product?.name || 'Selected Item';

    addAlert({
      title: willBeUnavailable ? `⚠️ Out of Stock: ${prodName}` : `✅ In Stock: ${prodName}`,
      description: willBeUnavailable
        ? `${prodName} is now out of stock (${reason}). Ordering prevented on all floor terminals.`
        : `${prodName} has been replenished and is now available on floor menu.`,
      type: 'auto_86',
      targetRef: prodName,
    });

    if (willBeUnavailable) {
      toast.warning(`${prodName} is now out of stock (${reason})`, { title: 'Item Out of Stock' });
    } else {
      toast.success(`${prodName} is back in stock!`, { title: 'Item Available' });
    }
  };

  // Stock inventory adjustment
  const handleUpdateStockCount = (id: string, delta: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextCount = Math.max(0, item.inStockCount + delta);
        const autoOutOfStock = nextCount === 0;

        if (autoOutOfStock && !item.is86) {
          handleToggleAvailability(item.id, true, 'Zero Stock Count');
        } else if (nextCount > 0 && item.is86) {
          handleToggleAvailability(item.id, false);
        }

        return {
          ...item,
          inStockCount: nextCount,
          is86: nextCount === 0,
        };
      })
    );
  };

  return {
    inventory,
    stationProducts,
    outOfStockItems,
    handleToggleAvailability,
    handleUpdateStockCount,
  };
}
