import { supabase } from '@/features/shared/infrastructure/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@monks/shared';
import type { CategoryAdmin, ProductAdmin, ProductVariantAdmin } from '../admin.types';

let hasWarnedMissingVariants = false;

type ProductDbRow = Tables<'products'> & {
  categories?: Pick<Tables<'categories'>, 'id' | 'name' | 'slug'> | null;
  product_ingredients?: Array<
    Tables<'product_ingredients'> & {
      inventory_items?: Pick<Tables<'inventory_items'>, 'name' | 'unit' | 'unit_cost'> | null;
    }
  > | null;
  product_modifiers?: Array<
    Tables<'product_modifiers'> & {
      inventory_items?: Pick<Tables<'inventory_items'>, 'name' | 'unit'> | null;
    }
  > | null;
  product_variants?: Tables<'product_variants'>[] | null;
};

export const catalogProductsApi = {
  async getCategories(): Promise<CategoryAdmin[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as CategoryAdmin[];
  },

  async createCategory(category: {
    name: string;
    slug: string;
    sort_order?: number;
  }): Promise<CategoryAdmin> {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: category.name,
        slug: category.slug,
        sort_order: category.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as CategoryAdmin;
  },

  async updateCategory(
    id: string,
    updates: Partial<{ name: string; slug: string; sort_order: number }>
  ): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  },

  async getProductsWithBOM(): Promise<ProductAdmin[]> {
    let rawData: ProductDbRow[];
    const queryWithVariants = await supabase
      .from('products')
      .select(
        '*, categories(id, name, slug), product_ingredients(*, inventory_items(name, unit, unit_cost)), product_variants(*), product_modifiers(*, inventory_items(name, unit))'
      )
      .order('name', { ascending: true });

    if (!queryWithVariants.error) {
      rawData = (queryWithVariants.data || []) as unknown as ProductDbRow[];
    } else {
      if (!hasWarnedMissingVariants) {
        hasWarnedMissingVariants = true;
        console.info(
          '[catalogProductsApi.getProductsWithBOM] product_variants or product_modifiers join fallback; gracefully serving base menu catalog.'
        );
      }
      const queryBase = await supabase
        .from('products')
        .select(
          '*, categories(id, name, slug), product_ingredients(*, inventory_items(name, unit, unit_cost)), product_modifiers(*)'
        )
        .order('name', { ascending: true });

      if (queryBase.error) throw queryBase.error;
      rawData = (queryBase.data || []) as unknown as ProductDbRow[];
    }

    return rawData.map((p) => ({
      ...p,
      ingredients: p.product_ingredients,
      modifiers: (p.product_modifiers || []).map((m) => ({
        ...m,
        inventory_item: m.inventory_items,
      })),
      variants: (p.product_variants || []).sort(
        (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
      ),
    })) as unknown as ProductAdmin[];
  },

  async upsertProductVariants(
    productId: string,
    variants: ProductVariantAdmin[]
  ): Promise<boolean> {
    try {
      // Fetch existing variants to preserve IDs and avoid cascade-nulling historical references
      const { data: existing, error: fetchErr } = await supabase
        .from('product_variants')
        .select('id, temperature, size_label')
        .eq('product_id', productId);

      if (fetchErr) {
        console.warn(
          '[catalogProductsApi.upsertProductVariants] table may not exist:',
          fetchErr.message
        );
        return false;
      }

      const existingMap = new Map<string, string>();
      (existing || []).forEach((row) => {
        existingMap.set(`${row.temperature}:${row.size_label}`, row.id);
      });

      const touchedIds = new Set<string>();

      for (let idx = 0; idx < (variants || []).length; idx++) {
        const v = variants[idx]!;
        const key = `${v.temperature || 'NONE'}:${v.size_label || 'Standard'}`;
        const existingId = existingMap.get(key);

        if (existingId) {
          touchedIds.add(existingId);
          await supabase
            .from('product_variants')
            .update({
              price: v.price,
              is_available: v.is_available !== false,
              sku: v.sku || null,
              sort_order: v.sort_order !== undefined ? v.sort_order : idx + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingId);
        } else {
          const { data: inserted } = await supabase
            .from('product_variants')
            .insert({
              product_id: productId,
              temperature: v.temperature || 'NONE',
              size_label: v.size_label || 'Standard',
              price: v.price,
              is_available: v.is_available !== false,
              sku: v.sku || null,
              sort_order: v.sort_order !== undefined ? v.sort_order : idx + 1,
            })
            .select('id')
            .single();
          if (inserted?.id) {
            touchedIds.add(inserted.id);
          }
        }
      }

      // Mark removed variants as unavailable instead of deleting them to preserve historical order lines
      const toDeactivate = (existing || []).filter((row) => !touchedIds.has(row.id));
      if (toDeactivate.length > 0) {
        const deactivateIds = toDeactivate.map((r) => r.id);
        await supabase
          .from('product_variants')
          .update({ is_available: false, updated_at: new Date().toISOString() })
          .in('id', deactivateIds);
      }

      return true;
    } catch (err: unknown) {
      console.warn(
        '[catalogProductsApi.upsertProductVariants] unexpected error:',
        err instanceof Error ? err.message : String(err)
      );
      return false;
    }
  },

  async createProduct(params: {
    name: string;
    category_id: string;
    base_price: number;
    station_target: 'bar' | 'kitchen';
    is_resold_outside_food?: boolean;
    original_cost?: number | null;
    image_url?: string | null;
    image_storage_path?: string | null;
    image_mime_type?: string | null;
    image_size_bytes?: number | null;
    description?: string;
    allergens?: string[];
    dietary?: string[];
    is_available?: boolean;
  }): Promise<ProductAdmin> {
    const insertPayload: TablesInsert<'products'> = {
      name: params.name,
      category_id: params.category_id,
      base_price: params.base_price,
      station_target: params.station_target,
      is_resold_outside_food: params.is_resold_outside_food ?? false,
      original_cost: params.original_cost ?? null,
      image_url: params.image_url ?? null,
      image_storage_path: params.image_storage_path ?? null,
      image_mime_type: params.image_mime_type ?? null,
      image_size_bytes: params.image_size_bytes ?? null,
      description: params.description ?? '',
      allergens: params.allergens ?? [],
      dietary: params.dietary ?? [],
      is_available: params.is_available ?? true,
    };

    const { data, error } = await supabase
      .from('products')
      .insert(insertPayload)
      .select('*, categories(id, name, slug)')
      .single();

    if (error) throw error;
    return data as unknown as ProductAdmin;
  },

  async updateProduct(
    id: string,
    updates: Partial<{
      name: string;
      category_id: string;
      base_price: number;
      station_target: 'bar' | 'kitchen';
      is_resold_outside_food: boolean;
      original_cost: number | null;
      image_url: string | null;
      image_storage_path: string | null;
      image_mime_type: string | null;
      image_size_bytes: number | null;
      description: string;
      allergens: string[];
      dietary: string[];
      is_available: boolean;
      auto_86: boolean;
    }>
  ): Promise<void> {
    const updatePayload: TablesUpdate<'products'> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('products').update(updatePayload).eq('id', id);

    if (error) throw error;
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },

  async toggleAuto86(productId: string, auto86: boolean, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({
        auto_86: auto86,
        out_of_stock_reason: auto86 ? reason || 'Manual Admin Stockout' : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (error) throw error;
  },

  async saveProductBOM(
    productId: string,
    ingredients: Array<{
      inventoryItemId: string;
      amount: number;
      unit: string;
      conversionFactor?: number;
    }>,
    variantId?: string | null
  ) {
    if (variantId) {
      try {
        await supabase.from('product_ingredients').delete().eq('variant_id', variantId);
      } catch (err) {
        console.warn('Could not delete by variant_id:', err);
      }
    } else {
      const delScoped = await supabase
        .from('product_ingredients')
        .delete()
        .eq('product_id', productId)
        .is('variant_id', null);
      if (delScoped.error) {
        await supabase.from('product_ingredients').delete().eq('product_id', productId);
      }
    }

    if (ingredients.length > 0) {
      const rowsWithVariant: Array<TablesInsert<'product_ingredients'>> = ingredients.map(
        (ing) => ({
          product_id: productId,
          variant_id: variantId || null,
          inventory_item_id: ing.inventoryItemId,
          amount: ing.amount,
          unit: ing.unit,
          conversion_factor: ing.conversionFactor || 1,
        })
      );
      const { error } = await supabase.from('product_ingredients').insert(rowsWithVariant);
      if (error) {
        const rowsWithoutVariant: Array<TablesInsert<'product_ingredients'>> = ingredients.map(
          (ing) => ({
            product_id: productId,
            inventory_item_id: ing.inventoryItemId,
            amount: ing.amount,
            unit: ing.unit,
            conversion_factor: ing.conversionFactor || 1,
          })
        );
        const retryRes = await supabase.from('product_ingredients').insert(rowsWithoutVariant);
        if (retryRes.error) throw retryRes.error;
      }
    }
  },
};
