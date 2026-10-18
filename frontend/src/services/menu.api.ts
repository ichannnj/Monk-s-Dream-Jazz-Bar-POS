/**
 * Menu Products & Inventory API
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 */
import { supabase } from './supabase';

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

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (err) {
      console.warn('getProducts error:', err);
      return [];
    }
  }

  /**
   * Fetch all active menu products mapped to the frontend MenuItem model.
   */
  async getMenuItems(): Promise<import('../types/floor').MenuItem[]> {
    try {
      const { data, error } = await supabase
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
          )
        `
        )
        .order('name');

      if (error || !data) {
        console.warn('getMenuItems query error:', error?.message);
        return [];
      }

      return data.map((p: any) => ({
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
        isResoldOutsideFood: p.is_resold_outside_food || false,
        originalCost: p.original_cost ? parseFloat(p.original_cost) : undefined,
        modifiers: (p.product_modifiers || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          priceDelta: parseFloat(m.price_delta) || 0,
        })),
      }));
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

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (err) {
      console.warn('getCategories error:', err);
      return [];
    }
  }

  /**
   * Update a menu product's image URL in the database.
   * Calls the stored procedure update_product_image with direct fallback.
   */
  async updateProductImage(productId: string, imageUrl: string) {
    try {
      // 1. Attempt stored function execution
      const { data, error } = await (supabase.rpc as any)('update_product_image', {
        p_product_id: productId,
        p_image_url: imageUrl,
      });

      if (!error && data) {
        return { success: true, data };
      }

      // 2. Fallback direct table update
      const { data: directData, error: directError } = await supabase
        .from('products')
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', productId)
        .select()
        .single();

      if (directError) {
        throw new Error(directError.message);
      }

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
    fileExt: string = 'jpg'
  ) {
    try {
      const fileName = `${productId}-${Date.now()}.${fileExt}`;
      const filePath = `items/${fileName}`;

      const { error } = await supabase.storage.from('menu-images').upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (error) {
        throw new Error(error.message);
      }

      const { data: publicUrlData } = supabase.storage.from('menu-images').getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Update product record
      await this.updateProductImage(productId, publicUrl);

      return { success: true, url: publicUrl };
    } catch (err: any) {
      console.warn('uploadProductImage error:', err);
      return { success: false, error: err?.message || 'Failed to upload image' };
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

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (err) {
      console.warn('getInventoryLevels error:', err);
      return [];
    }
  }
}

export const menuApi = new MenuApi();
