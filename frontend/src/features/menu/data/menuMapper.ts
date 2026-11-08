import type { MenuItem } from '../../../types/floor';

export function mapRawProductToMenuItem(p: any): MenuItem {
  let stockStatus: 'in_stock' | 'low_stock' | 'depleted' = 'in_stock';
  let stockAlertMessage: string | undefined = undefined;
  let lowestStockIngredient: any = undefined;

  if (Array.isArray(p.product_ingredients) && p.product_ingredients.length > 0) {
    for (const ing of p.product_ingredients) {
      const inv = ing.inventory_items;
      if (!inv) continue;
      const stock = parseFloat(inv.current_stock) || 0;
      const minAlert = parseFloat(inv.min_alert_level) || 0;
      if (stock <= 0) {
        stockStatus = 'depleted';
        stockAlertMessage = `${inv.name} depleted (${stock.toFixed(1)} ${inv.unit})`;
        lowestStockIngredient = {
          name: inv.name,
          currentStock: stock,
          unit: inv.unit,
          minAlertLevel: minAlert,
        };
        break;
      } else if (stock <= minAlert && stockStatus === 'in_stock') {
        stockStatus = 'low_stock';
        stockAlertMessage = `${inv.name} low (${stock.toFixed(1)} ${inv.unit})`;
        lowestStockIngredient = {
          name: inv.name,
          currentStock: stock,
          unit: inv.unit,
          minAlertLevel: minAlert,
        };
      }
    }
  }

  return {
    id: p.id,
    name: p.name,
    imageUrl: p.image_url || undefined,
    category: (p.categories?.slug || 'coffee') as any,
    price: parseFloat(p.base_price) || 0,
    stationTarget: (p.station_target || 'bar') as 'bar' | 'kitchen',
    description: p.description || '',
    allergens: Array.isArray(p.allergens) ? p.allergens : [],
    dietary: Array.isArray(p.dietary) ? p.dietary : [],
    isAvailable: p.is_available ?? true,
    auto86: p.auto_86 ?? false,
    outOfStockReason: p.out_of_stock_reason || undefined,
    stockStatus,
    stockAlertMessage,
    lowestStockIngredient,
    isResoldOutsideFood: p.is_resold_outside_food || false,
    originalCost: p.original_cost ? parseFloat(p.original_cost) : undefined,
    modifiers: (p.product_modifiers || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      priceDelta: parseFloat(m.price_delta) || 0,
    })),
    variants: (p.product_variants || [])
      .filter((v: any) => v.is_available)
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((v: any) => ({
        id: v.id,
        productId: v.product_id,
        temperature: v.temperature || 'NONE',
        sizeLabel: v.size_label || 'Standard',
        price: parseFloat(v.price) || 0,
        isAvailable: v.is_available ?? true,
        sortOrder: v.sort_order,
      })),
  };
}
