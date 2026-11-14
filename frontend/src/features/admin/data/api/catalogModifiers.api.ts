import { supabase } from '@/features/shared/infrastructure/supabase';
import type { Tables } from '@monks/shared';
import type { ModifierGroupAdmin, ProductModifierOptionAdmin } from '../admin.types';

type ModifierGroupWithItems = Tables<'modifier_groups'> & {
  product_modifiers?: Array<
    Tables<'product_modifiers'> & {
      inventory_items?: Pick<Tables<'inventory_items'>, 'name' | 'unit'> | null;
    }
  > | null;
};

type ProductModifierWithItem = Tables<'product_modifiers'> & {
  inventory_items?: Pick<Tables<'inventory_items'>, 'name' | 'unit'> | null;
};

export const catalogModifiersApi = {
  async getModifierGroups(productId?: string): Promise<ModifierGroupAdmin[]> {
    let query = supabase
      .from('modifier_groups')
      .select('*, product_modifiers(*, inventory_items(name, unit))')
      .order('sort_order', { ascending: true });

    if (productId) {
      query = query.or(`product_id.is.null,product_id.eq.${productId}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return ((data || []) as unknown as ModifierGroupWithItems[]).map((g) => ({
      ...g,
      options: (g.product_modifiers || []).map((m) => ({
        ...m,
        inventory_item: m.inventory_items,
      })),
    })) as unknown as ModifierGroupAdmin[];
  },

  async createModifierGroup(group: {
    name: string;
    product_id?: string | null;
    min_selections?: number;
    max_selections?: number;
    is_required?: boolean;
    sort_order?: number;
  }): Promise<ModifierGroupAdmin> {
    const { data, error } = await supabase
      .from('modifier_groups')
      .insert({
        name: group.name,
        product_id: group.product_id ?? null,
        min_selections: group.min_selections ?? 0,
        max_selections: group.max_selections ?? 1,
        is_required: group.is_required ?? false,
        sort_order: group.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ModifierGroupAdmin;
  },

  async updateModifierGroup(
    id: string,
    updates: Partial<{
      name: string;
      min_selections: number;
      max_selections: number;
      is_required: boolean;
      sort_order: number;
    }>
  ): Promise<void> {
    const { error } = await supabase
      .from('modifier_groups')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteModifierGroup(id: string): Promise<void> {
    const { error } = await supabase.from('modifier_groups').delete().eq('id', id);
    if (error) throw error;
  },

  async saveProductModifier(params: {
    id?: string;
    group_id?: string | null;
    product_id?: string | null;
    name: string;
    price_delta: number;
    inventory_item_id?: string | null;
    amount_delta?: number;
    unit?: string | null;
  }): Promise<void> {
    if (params.id) {
      const { error } = await supabase
        .from('product_modifiers')
        .update({
          group_id: params.group_id ?? null,
          product_id: params.product_id ?? null,
          name: params.name,
          price_delta: params.price_delta,
          inventory_item_id: params.inventory_item_id ?? null,
          amount_delta: params.amount_delta ?? 0,
          unit: params.unit ?? null,
        })
        .eq('id', params.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('product_modifiers').insert({
        group_id: params.group_id ?? null,
        product_id: params.product_id ?? null,
        name: params.name,
        price_delta: params.price_delta,
        inventory_item_id: params.inventory_item_id ?? null,
        amount_delta: params.amount_delta ?? 0,
        unit: params.unit ?? null,
      });
      if (error) throw error;
    }
  },

  async getCatalogModifiers(): Promise<ProductModifierOptionAdmin[]> {
    try {
      const { data, error } = await supabase
        .from('product_modifiers')
        .select('*, inventory_items(name, unit)')
        .is('product_id', null)
        .order('name', { ascending: true });

      if (error) {
        console.warn(
          '[catalogModifiersApi.getCatalogModifiers] Error fetching template modifiers:',
          error.message
        );
        return [];
      }

      return ((data || []) as unknown as ProductModifierWithItem[]).map((m) => ({
        ...m,
        inventory_item: m.inventory_items,
      })) as unknown as ProductModifierOptionAdmin[];
    } catch (err: unknown) {
      console.warn(
        '[catalogModifiersApi.getCatalogModifiers] Failed:',
        err instanceof Error ? err.message : String(err)
      );
      return [];
    }
  },

  async upsertProductModifiers(
    productId: string,
    modifiers: Array<{
      id?: string;
      group_id?: string | null;
      name: string;
      price_delta: number;
      applicable_category?: string;
      inventory_item_id?: string | null;
      amount_delta?: number;
      unit?: string | null;
    }>
  ): Promise<boolean> {
    try {
      const { error: delErr } = await supabase
        .from('product_modifiers')
        .delete()
        .eq('product_id', productId);

      if (delErr) {
        console.warn('[catalogModifiersApi.upsertProductModifiers] delete error:', delErr.message);
        return false;
      }

      if (!modifiers || modifiers.length === 0) return true;

      const toInsert = modifiers.map((m) => ({
        product_id: productId,
        group_id: m.group_id ?? null,
        name: m.name.trim(),
        price_delta: Number(m.price_delta) || 0,
        applicable_category: m.applicable_category || 'all',
        inventory_item_id: m.inventory_item_id ?? null,
        amount_delta: Number(m.amount_delta) || 0,
        unit: m.unit ?? null,
      }));

      const { error: insErr } = await supabase.from('product_modifiers').insert(toInsert);
      if (insErr) {
        console.warn('[catalogModifiersApi.upsertProductModifiers] insert error:', insErr.message);
        return false;
      }

      return true;
    } catch (err: unknown) {
      console.warn(
        '[catalogModifiersApi.upsertProductModifiers] failed:',
        err instanceof Error ? err.message : String(err)
      );
      return false;
    }
  },

  async deleteProductModifier(id: string): Promise<void> {
    const { error } = await supabase.from('product_modifiers').delete().eq('id', id);
    if (error) throw error;
  },
};
