import {
  ProductAdmin,
  CategoryAdmin,
  ProductModifierOptionAdmin,
} from '../../../../data/admin.api';
import { ProductModifierStateItem, VariantMatrixRow } from './menuItemModal.types';

export function initializeProductFormState({
  product,
  categories,
}: {
  product?: ProductAdmin | null;
  categories: CategoryAdmin[];
}) {
  if (product) {
    const matchedCat = categories.find((c) => c.id === product.category_id);
    const initialCatSlug = matchedCat?.slug || 'all';

    const productModifiers: ProductModifierStateItem[] =
      product.modifiers && product.modifiers.length > 0
        ? product.modifiers.map((m: any) => ({
            id: m.id,
            name: m.name,
            price_delta: (m.price_delta || 0).toString(),
            applicable_category: m.applicable_category || initialCatSlug,
            inventory_item_id: m.inventory_item_id || null,
            amount_delta: m.amount_delta || 0,
            unit: m.unit || null,
          }))
        : [];

    let hasVariants = false;
    let supportedTemps: ('HOT' | 'COLD')[] = ['HOT', 'COLD'];
    let selectedSizes: string[] = ['8oz', '12oz', '16oz'];
    let variantsMatrix: VariantMatrixRow[] = [];

    if (product.variants && product.variants.length > 0) {
      hasVariants = true;
      const temps = Array.from(
        new Set(
          product.variants
            .map((v: any) => v.temperature)
            .filter((t: any): t is 'HOT' | 'COLD' => t === 'HOT' || t === 'COLD')
        )
      );
      const sizes = Array.from(new Set(product.variants.map((v: any) => v.size_label as string)));
      supportedTemps = temps.length > 0 ? (temps as ('HOT' | 'COLD')[]) : ['HOT', 'COLD'];
      selectedSizes = sizes.length > 0 ? sizes : ['8oz', '12oz', '16oz'];
      variantsMatrix = product.variants.map((v: any) => ({
        id: v.id,
        temperature: v.temperature,
        size_label: v.size_label,
        price: v.price.toString(),
        is_available: v.is_available !== false,
      }));
    }

    return {
      name: product.name,
      categoryId: product.category_id,
      basePrice: product.base_price.toString(),
      stationTarget: ((product.station_target as any) === 'kitchen' ? 'kitchen' : 'bar') as
        'bar' | 'kitchen',
      isResoldOutsideFood: product.is_resold_outside_food,
      originalCost: product.original_cost ? product.original_cost.toString() : '',
      imageUrl: product.image_url || '',
      description: product.description || '',
      selectedAllergens: product.allergens || [],
      selectedDietary: product.dietary || [],
      initialCatSlug,
      productModifiers,
      hasVariants,
      supportedTemps,
      selectedSizes,
      variantsMatrix,
    };
  }

  const initialCatSlug = categories[0]?.slug || 'all';
  return {
    name: '',
    categoryId: categories[0]?.id || '',
    basePrice: '',
    stationTarget: 'bar' as 'bar' | 'kitchen',
    isResoldOutsideFood: false,
    originalCost: '',
    imageUrl: '',
    description: '',
    selectedAllergens: [],
    selectedDietary: [],
    initialCatSlug,
    productModifiers: [],
    hasVariants: false,
    supportedTemps: ['HOT', 'COLD'] as ('HOT' | 'COLD')[],
    selectedSizes: ['8oz', '12oz', '16oz'],
    variantsMatrix: [],
  };
}
