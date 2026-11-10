/**
 * Menu Products & Inventory API
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 */
import { supabase } from '../../shared/infrastructure/supabase';
import {
  prepareMenuImageForUpload,
  uploadAndRecordProductImage,
  cleanupStorageObject,
  type PreparedMenuImage,
} from './imageUpload.service';
import { mapRawProductToMenuItem } from './menuMapper';

let hasWarnedMenuVariantsFallback = false;

export class MenuApi {
  /**
   * Fetch all active menu products, categories, and Auto-86 availability.
   */
  async getProducts(categoryId?: string) {
    try {
      let query = supabase
        .from('products')
        .select(
          `
          id,
          name,
          category_id,
          image_url,
          base_price,
          station_target,
          is_available,
          auto_86,
          description,
          allergens,
          dietary,
          categories (
            id,
            name,
            slug
          )
        `
        )
        .eq('is_available', true);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query.order('name');
      if (error) throw new Error(error.message);
      return data || [];
    } catch (err) {
      console.warn('getProducts error:', err);
      return [];
    }
  }

  /**
   * Fetch all active menu products mapped to the frontend MenuItem model.
   */
  async getMenuItems(): Promise<import('../../../types/floor').MenuItem[]> {
    try {
      let rawProducts: any[] = [];
      const queryWithVariants = await supabase
        .from('products')
        .select(
          `
          id,
          name,
          category_id,
          image_url,
          base_price,
          station_target,
          is_available,
          auto_86,
          out_of_stock_reason,
          description,
          allergens,
          dietary,
          is_resold_outside_food,
          original_cost,
          categories (
            id,
            name,
            slug
          ),
          product_variants (
            id,
            product_id,
            temperature,
            size_label,
            price,
            is_available,
            sort_order
          ),
          product_modifiers (
            id,
            name,
            price_delta
          ),
          product_ingredients (
            amount,
            conversion_factor,
            inventory_items (
              id,
              name,
              current_stock,
              min_alert_level,
              unit
            )
          )
        `
        )
        .order('name');

      if (!queryWithVariants.error && queryWithVariants.data) {
        rawProducts = queryWithVariants.data;
      } else {
        if (!hasWarnedMenuVariantsFallback) {
          hasWarnedMenuVariantsFallback = true;
          console.info(
            'getMenuItems: product_variants table not yet present; serving base menu catalog.'
          );
        }
        const queryBase = await supabase
          .from('products')
          .select(
            `
            id,
            name,
            category_id,
            image_url,
            base_price,
            station_target,
            is_available,
            auto_86,
            out_of_stock_reason,
            description,
            allergens,
            dietary,
            is_resold_outside_food,
            original_cost,
            categories (
              id,
              name,
              slug
            ),
            product_modifiers (
              id,
              name,
              price_delta
            ),
            product_ingredients (
              amount,
              conversion_factor,
              inventory_items (
                id,
                name,
                current_stock,
                min_alert_level,
                unit
              )
            )
          `
          )
          .order('name');

        if (queryBase.error || !queryBase.data) {
          console.warn('getMenuItems base fallback failed:', queryBase.error?.message);
          return [];
        }
        rawProducts = queryBase.data;
      }

      // Enrich products with active variant groups & options
      const groupsByProd = new Map<string, any[]>();
      try {
        const [groupsRes, optionsRes] = await Promise.all([
          (supabase.from as any)('product_variant_group_assignments')
            .select(
              `
              product_id,
              min_selections,
              max_selections,
              is_required,
              sort_order,
              product_variant_groups (
                id,
                code,
                name,
                min_selections,
                max_selections,
                is_required,
                allows_duplicates,
                sort_order
              )
            `
            )
            .eq('is_active', true),
          (supabase.from as any)('product_variant_option_assignments')
            .select(
              `
              product_id,
              option_id,
              price_delta,
              is_default,
              is_available,
              sort_order,
              product_variant_options (
                id,
                group_id,
                code,
                name,
                default_price_delta,
                sort_order
              )
            `
            )
            .eq('is_available', true),
        ]);

        if (!groupsRes.error && groupsRes.data && !optionsRes.error && optionsRes.data) {
          groupsRes.data.forEach((row: any) => {
            const grp = row.product_variant_groups;
            if (!grp) return;
            const list = groupsByProd.get(row.product_id) || [];
            list.push({
              id: grp.id,
              code: grp.code,
              name: grp.name,
              minSelections: row.min_selections ?? grp.min_selections ?? 0,
              maxSelections: row.max_selections ?? grp.max_selections ?? 1,
              isRequired: row.is_required ?? grp.is_required ?? false,
              allowsDuplicates: grp.allows_duplicates ?? false,
              sortOrder: row.sort_order ?? grp.sort_order ?? 0,
              options: [],
            });
            groupsByProd.set(row.product_id, list);
          });

          optionsRes.data.forEach((row: any) => {
            const opt = row.product_variant_options;
            if (!opt) return;
            const groups = groupsByProd.get(row.product_id);
            if (!groups) return;
            const targetGroup = groups.find((g) => g.id === opt.group_id);
            if (targetGroup) {
              targetGroup.options.push({
                id: opt.id,
                groupId: opt.group_id,
                code: opt.code,
                name: opt.name,
                priceDelta: Number(row.price_delta ?? opt.default_price_delta ?? 0),
                isDefault: row.is_default ?? false,
                isAvailable: row.is_available ?? true,
                sortOrder: row.sort_order ?? opt.sort_order ?? 0,
              });
            }
          });

          // Sort groups and options by sortOrder
          groupsByProd.forEach((groups) => {
            groups.sort((a, b) => a.sortOrder - b.sortOrder);
            groups.forEach((g) => g.options.sort((a: any, b: any) => a.sortOrder - b.sortOrder));
          });
        }
      } catch (err) {
        console.warn('[menuApi.getMenuItems] Error hydrating variant groups from DB:', err);
      }

      // Catalog Fallback for Latte if DB assignments table is not yet migrated/populated
      const DEFAULT_FLAVOR_GROUP = {
        id: '20000000-0000-0000-0000-000000000010',
        code: 'flavor',
        name: 'Flavor',
        minSelections: 0,
        maxSelections: 1,
        isRequired: false,
        allowsDuplicates: false,
        sortOrder: 1,
        options: [
          {
            id: '30000000-0000-0000-0000-000000000041',
            groupId: '20000000-0000-0000-0000-000000000010',
            code: 'classic',
            name: 'Classic',
            priceDelta: 0,
            isDefault: true,
            isAvailable: true,
            sortOrder: 1,
          },
          {
            id: '30000000-0000-0000-0000-000000000042',
            groupId: '20000000-0000-0000-0000-000000000010',
            code: 'spanish',
            name: 'Spanish',
            priceDelta: 25,
            isDefault: false,
            isAvailable: true,
            sortOrder: 2,
          },
          {
            id: '30000000-0000-0000-0000-000000000043',
            groupId: '20000000-0000-0000-0000-000000000010',
            code: 'caramel',
            name: 'Caramel',
            priceDelta: 30,
            isDefault: false,
            isAvailable: true,
            sortOrder: 3,
          },
          {
            id: '30000000-0000-0000-0000-000000000044',
            groupId: '20000000-0000-0000-0000-000000000010',
            code: 'vanilla',
            name: 'Vanilla',
            priceDelta: 25,
            isDefault: false,
            isAvailable: true,
            sortOrder: 4,
          },
        ],
      };

      rawProducts = rawProducts.map((p) => {
        const assignedGroups = groupsByProd.get(p.id) || [];
        // If product is Latte and has no groups assigned in DB, attach default Flavor group
        if (assignedGroups.length === 0 && p.name?.trim().toLowerCase() === 'latte') {
          return {
            ...p,
            variant_groups: [DEFAULT_FLAVOR_GROUP],
          };
        }
        return {
          ...p,
          variant_groups: assignedGroups,
        };
      });

      return rawProducts.map(mapRawProductToMenuItem);
    } catch (err) {
      console.warn('getMenuItems error:', err);
      return [];
    }
  }

  /**
   * Fetch all product categories (Cocktails, Wine, Beer, Kitchen, Non-Alcoholic, etc.).
   */
  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, sort_order')
        .order('sort_order', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err) {
      console.warn('getCategories error:', err);
      return [];
    }
  }

  /**
   * Update a menu product's image URL in the database.
   */
  async updateProductImage(productId: string, imageUrl: string) {
    try {
      const { data, error } = await (supabase.rpc as any)('update_product_image', {
        p_product_id: productId,
        p_image_url: imageUrl,
      });

      if (!error && data) return { success: true, data };

      const { data: directData, error: directError } = await supabase
        .from('products')
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', productId)
        .select()
        .single();

      if (directError) throw new Error(directError.message);
      return { success: true, data: directData };
    } catch (err: any) {
      console.warn('updateProductImage error:', err);
      return { success: false, error: err?.message || 'Failed to update image' };
    }
  }

  /**
   * Upload an image file or blob to the 'menu-images' storage bucket.
   */
  async uploadProductImage(
    productId: string,
    file: Blob | File | ArrayBuffer,
    fileExt: string = 'jpg',
    uploadedByUserId?: string
  ) {
    try {
      let prepared: PreparedMenuImage;
      if (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File)) {
        prepared = await prepareMenuImageForUpload(file as Blob | File, `product-${productId}`);
      } else {
        const blob = new Blob([file], { type: `image/${fileExt}` });
        prepared = await prepareMenuImageForUpload(blob, `product-${productId}`);
      }

      const res = await uploadAndRecordProductImage(productId, prepared, uploadedByUserId);
      if (!res.success) {
        return { success: false, error: res.error || 'Failed to upload image' };
      }

      return { success: true, url: res.publicUrl, storagePath: res.storagePath };
    } catch (err: any) {
      console.warn('uploadProductImage error:', err);
      return { success: false, error: err?.message || 'Failed to upload image' };
    }
  }

  /**
   * Delete a storage object and dissociate it from a product.
   */
  async deleteProductImage(productId: string, storagePath?: string) {
    try {
      if (storagePath) {
        await cleanupStorageObject(storagePath);
      }
      await supabase
        .from('products')
        .update({
          image_url: null,
          image_storage_path: null,
          image_mime_type: null,
          image_size_bytes: null,
          image_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', productId);

      return { success: true };
    } catch (err: any) {
      console.warn('deleteProductImage error:', err);
      return { success: false, error: err?.message };
    }
  }

  /**
   * Fetch inventory stock levels to check ingredient availability.
   */
  async getInventoryLevels() {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, category, current_stock, min_alert_level, unit, unit_cost, sku')
        .order('name');

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err) {
      console.warn('getInventoryLevels error:', err);
      return [];
    }
  }
}

export const menuApi = new MenuApi();
