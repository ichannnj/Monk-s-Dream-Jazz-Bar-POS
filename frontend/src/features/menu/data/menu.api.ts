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
