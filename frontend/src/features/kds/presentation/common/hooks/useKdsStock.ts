import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../../shared/infrastructure/supabase';
import { useOrderStore } from '../../../../orders/application/useOrderStore';
import { toast } from '../../../../shared/toast/useToastStore';
import { StockInventoryItem } from '../../barista/types';
import { BarProductStock } from '../../barista/modals/OutOfStockModal';

interface UseKdsStockProps {
  stationTarget: 'bar' | 'kitchen';
}

export function useKdsStock({ stationTarget }: UseKdsStockProps) {
  const [inventory, setInventory] = useState<StockInventoryItem[]>([]);
  const addAlert = useOrderStore((state) => state.addAlert);

  // Load real inventory items from DB
  useEffect(() => {
    let isMounted = true;
    async function loadDbInventory() {
      try {
        const { data } = await supabase
          .from('inventory_items')
          .select('id, name, category, unit, current_stock, min_alert_level')
          .order('name');
        if (isMounted && data) {
          setInventory(
            data.map((item: any) => ({
              id: item.id,
              name: item.name,
              category: (item.category || 'spirits').toLowerCase(),
              unit: item.unit,
              inStockCount: parseFloat(item.current_stock) || 0,
              lowStockThreshold: parseFloat(item.min_alert_level) || 0,
              is86: (parseFloat(item.current_stock) || 0) <= 0,
            }))
          );
        }
      } catch (err) {
        console.warn(`Failed to load inventory from DB for ${stationTarget}:`, err);
      }
    }
    loadDbInventory();
    return () => {
      isMounted = false;
    };
  }, [stationTarget]);

  // Derived products for availability manager
  const stationProducts: BarProductStock[] = useMemo(() => {
    return inventory.map((inv) => ({
      id: inv.id,
      name: inv.name,
      category: inv.category,
      is86: inv.is86,
      stockCount: inv.inStockCount,
    }));
  }, [inventory]);

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
