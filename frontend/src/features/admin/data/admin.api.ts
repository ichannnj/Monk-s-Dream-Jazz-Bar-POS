import { supabase } from '@/features/shared/infrastructure/supabase';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';
import type { Database } from '@monks/shared';

export type OperatingMode = Database['public']['Enums']['operating_mode'];

export interface VenueSettings {
  id: string;
  operating_mode: OperatingMode;
  venue_name: string;
  daily_overhead_cost: number;
  vat_rate?: number;
  vat_inclusive?: boolean;
  service_charge_rate?: number;
  service_charge_enabled?: boolean;
  discounts_config?: {
    senior_pwd_percent: number;
    musician_comp_percent: number;
    staff_discount_percent: number;
    [key: string]: number;
  };
  printer_routing_config?: {
    bar_printer_ip?: string;
    kitchen_printer_ip?: string;
    runner_printer_ip?: string;
    [key: string]: string | undefined;
  };
  mode_switched_at?: string;
  updated_at?: string;
}

/**
 * Returns the most recent 6:00:00 AM local timestamp.
 * Any Event Mode activated before this cutoff should automatically revert to Cafe Mode.
 */
export function getLatest6AmCutoff(now: Date = new Date()): Date {
  const today6Am = new Date(now);
  today6Am.setHours(6, 0, 0, 0);
  if (now.getTime() >= today6Am.getTime()) {
    return today6Am;
  }
  const yesterday6Am = new Date(today6Am);
  yesterday6Am.setDate(yesterday6Am.getDate() - 1);
  return yesterday6Am;
}

/**
 * Returns milliseconds remaining until the next 6:00:00 AM local time.
 */
export function getMsUntilNext6Am(now: Date = new Date()): number {
  const next6Am = new Date(now);
  next6Am.setHours(6, 0, 0, 0);
  if (now.getTime() >= next6Am.getTime()) {
    next6Am.setDate(next6Am.getDate() + 1);
  }
  return Math.max(1000, next6Am.getTime() - now.getTime());
}

export interface SupplierAdmin {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  lead_time_days: number;
  notes: string | null;
}

export interface InventoryItemAdmin {
  id: string;
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  unit: string;
  min_alert_level: number;
  unit_cost: number;
  supplier_name: string | null;
  supplier_id?: string | null;
  supplier?: SupplierAdmin | null;
}

export interface CategoryAdmin {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface ProductModifierOptionAdmin {
  id: string;
  group_id?: string | null;
  product_id?: string | null;
  name: string;
  price_delta: number;
  inventory_item_id?: string | null;
  amount_delta?: number;
  unit?: string | null;
  inventory_item?: {
    name: string;
    unit: string;
  };
}

export interface ModifierGroupAdmin {
  id: string;
  name: string;
  product_id: string | null;
  min_selections: number;
  max_selections: number;
  is_required: boolean;
  sort_order: number;
  options?: ProductModifierOptionAdmin[];
}

export interface ProductVariantAdmin {
  id?: string;
  product_id?: string;
  temperature: 'HOT' | 'COLD' | 'ROOM' | 'NONE';
  size_label: string;
  price: number;
  is_available?: boolean;
  sku?: string | null;
  sort_order?: number;
}

export interface ProductAdmin {
  id: string;
  name: string;
  category_id: string;
  base_price: number;
  station_target: string;
  is_resold_outside_food: boolean;
  original_cost: number | null;
  auto_86: boolean;
  image_url: string | null;
  image_storage_path?: string | null;
  image_mime_type?: string | null;
  image_size_bytes?: number | null;
  description?: string;
  allergens?: string[];
  dietary?: string[];
  is_available?: boolean;
  categories?: {
    id: string;
    name: string;
    slug: string;
  };
  variants?: ProductVariantAdmin[];
  ingredients?: Array<{
    id: string;
    inventory_item_id: string;
    amount: number;
    unit: string;
    conversion_factor: number;
    inventory_item?: {
      name: string;
      unit: string;
      unit_cost: number;
    };
  }>;
  modifier_groups?: ModifierGroupAdmin[];
}

export interface StockMovementAdmin {
  id: string;
  inventory_item_id: string;
  movement_type: string;
  change_amount: number;
  balance_before: number;
  balance_after: number;
  reference_id: string | null;
  created_at: string;
  inventory_item?: {
    name: string;
    sku: string;
    unit: string;
  };
}

export interface StocktakeSessionAdmin {
  id: string;
  conducted_by_id: string | null;
  notes: string | null;
  status: string;
  total_variance_cost: number;
  created_at: string;
}

export const PH_MINIMUM_WAGE_DAILY = 645.0;

export type StaffRoleType =
  | 'admin'
  | 'cashier'
  | 'waiter'
  | 'station_bar'
  | 'station_cafe'
  | 'station_food'
  | 'foh_runner'
  | 'printer_station';

export interface StaffMemberAdmin {
  id: string;
  username: string;
  display_name: string;
  role: StaffRoleType | string;
  job_title?: string | null;
  is_workflow_staff: boolean;
  base_daily_rate: number | string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface CreateStaffUserPayload {
  display_name: string;
  username: string;
  pin: string;
  role: StaffRoleType;
  job_title?: string | null;
  base_daily_rate: number;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  password?: string | null;
}

export interface CreateNonWorkflowStaffPayload {
  display_name: string;
  job_title: string;
  username?: string;
  pin?: string;
  base_daily_rate: number;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface UpdateStaffMemberPayload {
  display_name?: string;
  username?: string;
  role?: StaffRoleType;
  job_title?: string | null;
  base_daily_rate?: number;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
}

export interface AttendanceRecordAdmin {
  id: string;
  user_id: string;
  date: string;
  is_present: boolean;
  shift_status?: 'CLOCKED_IN' | 'COMPLETED' | 'ABSENT';
  clock_in_at?: string | null;
  clock_out_at?: string | null;
  hours_worked?: number;
  base_daily_pay: number;
  addon_pay: number;
  total_day_pay: number;
  notes?: string | null;
  user?: {
    display_name: string;
    role: string;
    job_title?: string | null;
    is_workflow_staff: boolean;
  };
}

export interface SalesAnalyticsOverview {
  grossSales: number;
  orderCount: number;
  averageTicket: number;
  totalLaborExpense: number;
  totalCogs: number;
  estimatedNetProfit: number;
  channelBreakdown: Record<string, { sales: number; count: number }>;
  tenderBreakdown: {
    cash: number;
    card: number;
    digital: number;
    delivery: number;
    total: number;
  };
  hourlySales: {
    hour: string;
    sales: number;
    orderCount?: number;
  }[];
  peakHourLabel?: string;
  modeBreakdown?: {
    cafeSales: number;
    eventSales: number;
    cafeOrderCount: number;
    eventOrderCount: number;
    totalSales: number;
    cafePercent: number;
    eventPercent: number;
  };
}

export interface SalesOverviewFilterParams {
  filterMode?: OperatingMode | 'ALL';
  startDate?: string;
  endDate?: string;
  station?: string;
}

export const adminApi = {
  /**
   * Venue Settings & Operating Mode
   */
  async getVenueSettings(): Promise<VenueSettings> {
    // 1. Attempt server-side 6:00 AM reconciliation RPC first
    try {
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
        'reconcile_operating_mode_6am'
      );
      if (!rpcError && rpcData && rpcData.id) {
        return rpcData as VenueSettings;
      }
    } catch {
      // Fallback to standard select if migration RPC is not yet applied
    }

    const { data, error } = await (supabase.from as any)('venue_settings')
      .select('*')
      .limit(1)
      .single();
    if (error) {
      console.warn('[adminApi.getVenueSettings] Falling back to default settings:', error.message);
      return {
        id: 'default',
        operating_mode: 'CAFE',
        venue_name: "Monk's Dream Jazz Bar",
        daily_overhead_cost: 150,
        vat_rate: 12,
        vat_inclusive: true,
        service_charge_rate: 10,
        service_charge_enabled: true,
        discounts_config: {
          senior_pwd_percent: 20,
          musician_comp_percent: 100,
          staff_discount_percent: 50,
        },
      };
    }

    const settings = data as VenueSettings;
    // Client-side safeguard: if operating_mode is EVENT from before the latest 6:00 AM cutoff, auto-revert to CAFE
    if (settings.operating_mode === 'EVENT') {
      const switchedAtStr = settings.mode_switched_at || settings.updated_at;
      if (switchedAtStr) {
        const switchedAt = new Date(switchedAtStr);
        const cutoff6Am = getLatest6AmCutoff();
        if (!isNaN(switchedAt.getTime()) && switchedAt.getTime() < cutoff6Am.getTime()) {
          const nowIso = new Date().toISOString();
          settings.operating_mode = 'CAFE';
          settings.mode_switched_at = nowIso;
          settings.updated_at = nowIso;
          await (supabase.from as any)('venue_settings')
            .update({ operating_mode: 'CAFE', updated_at: nowIso })
            .eq('id', settings.id);
        }
      }
    }

    return settings;
  },

  async setOperatingMode(mode: OperatingMode): Promise<void> {
    const current = await adminApi.getVenueSettings();
    const targetId =
      current?.id && current.id !== 'default' ? current.id : '00000000-0000-0000-0000-000000000001';
    const nowIso = new Date().toISOString();

    const { error } = await (supabase.from as any)('venue_settings')
      .update({ operating_mode: mode, updated_at: nowIso })
      .eq('id', targetId);

    if (error) {
      console.error('[adminApi.setOperatingMode] Failed:', error);
      throw error;
    }
    realtimeGateway.broadcastPosSync('operating_mode_switched');
  },

  async updateVenueSettings(updates: Partial<VenueSettings>): Promise<void> {
    const current = await adminApi.getVenueSettings();
    const targetId =
      current?.id && current.id !== 'default' ? current.id : '00000000-0000-0000-0000-000000000001';

    const { error } = await (supabase.from as any)('venue_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', targetId);

    if (error) throw error;
    realtimeGateway.broadcastPosSync('venue_settings_updated');
  },

  /**
   * Menu Categories CRUD
   */
  async getCategories(): Promise<CategoryAdmin[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as CategoryAdmin[];
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
    return data as CategoryAdmin;
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

  /**
   * Menu Products (Catalog) CRUD & BOM
   */
  async getProductsWithBOM(): Promise<ProductAdmin[]> {
    const { data, error } = await supabase
      .from('products')
      .select(
        '*, categories(id, name, slug), product_ingredients(*, inventory_items(name, unit, unit_cost)), product_variants(*)'
      )
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map((p: any) => ({
      ...p,
      ingredients: p.product_ingredients,
      variants: (p.product_variants || []).sort(
        (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
      ),
    })) as ProductAdmin[];
  },

  async upsertProductVariants(
    productId: string,
    variants: ProductVariantAdmin[]
  ): Promise<boolean> {
    await (supabase.from as any)('product_variants').delete().eq('product_id', productId);
    if (!variants || variants.length === 0) return true;

    const toInsert = variants.map((v, idx) => ({
      product_id: productId,
      temperature: v.temperature || 'NONE',
      size_label: v.size_label || 'Standard',
      price: v.price,
      is_available: v.is_available !== false,
      sku: v.sku || null,
      sort_order: v.sort_order !== undefined ? v.sort_order : idx + 1,
    }));

    const { error } = await (supabase.from as any)('product_variants').insert(toInsert);
    if (error) throw error;
    return true;
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
    const { data, error } = await supabase
      .from('products')
      .insert({
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
      } as any)
      .select('*, categories(id, name, slug)')
      .single();

    if (error) throw error;
    return data as ProductAdmin;
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
    const { error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id);

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
    // Delete existing recipe BOM scoped to variant or base product
    if (variantId) {
      await (supabase.from as any)('product_ingredients').delete().eq('variant_id', variantId);
    } else {
      await (supabase.from as any)('product_ingredients')
        .delete()
        .eq('product_id', productId)
        .is('variant_id', null);
    }

    if (ingredients.length > 0) {
      const rows = ingredients.map((ing) => ({
        product_id: productId,
        variant_id: variantId || null,
        inventory_item_id: ing.inventoryItemId,
        amount: ing.amount,
        unit: ing.unit,
        conversion_factor: ing.conversionFactor || 1,
      }));
      const { error } = await (supabase.from as any)('product_ingredients').insert(rows);
      if (error) throw error;
    }
  },

  /**
   * Modifier Groups & Options CRUD
   */
  async getModifierGroups(productId?: string): Promise<ModifierGroupAdmin[]> {
    let query = (supabase.from as any)('modifier_groups')
      .select('*, product_modifiers(*, inventory_items(name, unit))')
      .order('sort_order', { ascending: true });

    if (productId) {
      // Global groups (product_id is null) OR item-specific groups
      query = query.or(`product_id.is.null,product_id.eq.${productId}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((g: any) => ({
      ...g,
      options: (g.product_modifiers || []).map((m: any) => ({
        ...m,
        inventory_item: m.inventory_items,
      })),
    })) as ModifierGroupAdmin[];
  },

  async createModifierGroup(group: {
    name: string;
    product_id?: string | null;
    min_selections?: number;
    max_selections?: number;
    is_required?: boolean;
    sort_order?: number;
  }): Promise<ModifierGroupAdmin> {
    const { data, error } = await (supabase.from as any)('modifier_groups')
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
    return data as ModifierGroupAdmin;
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
    const { error } = await (supabase.from as any)('modifier_groups')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteModifierGroup(id: string): Promise<void> {
    const { error } = await (supabase.from as any)('modifier_groups').delete().eq('id', id);
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
      const { error } = await (supabase.from as any)('product_modifiers')
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
      const { error } = await (supabase.from as any)('product_modifiers').insert({
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

  async deleteProductModifier(id: string): Promise<void> {
    const { error } = await (supabase.from as any)('product_modifiers').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Suppliers Directory CRUD
   */
  async getSuppliers(): Promise<SupplierAdmin[]> {
    const { data, error } = await (supabase.from as any)('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as SupplierAdmin[];
  },

  async createSupplier(supplier: {
    name: string;
    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    lead_time_days?: number;
    notes?: string | null;
  }): Promise<SupplierAdmin> {
    const { data, error } = await (supabase.from as any)('suppliers')
      .insert(supplier)
      .select()
      .single();

    if (error) throw error;
    return data as SupplierAdmin;
  },

  async updateSupplier(id: string, updates: Partial<SupplierAdmin>): Promise<void> {
    const { error } = await (supabase.from as any)('suppliers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteSupplier(id: string): Promise<void> {
    const { error } = await (supabase.from as any)('suppliers').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Inventory Items CRUD & Depletion
   */
  async getInventoryItems(): Promise<InventoryItemAdmin[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, suppliers(id, name, contact_person, phone)')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      supplier: row.suppliers,
    })) as InventoryItemAdmin[];
  },

  async createInventoryItem(item: {
    sku: string;
    name: string;
    category: any;
    current_stock: number;
    unit: string;
    min_alert_level: number;
    unit_cost: number;
    supplier_id?: string | null;
    supplier_name?: string | null;
  }): Promise<InventoryItemAdmin> {
    const { data, error } = await (supabase.from as any)('inventory_items')
      .insert({
        sku: item.sku,
        name: item.name,
        category: item.category,
        current_stock: item.current_stock,
        unit: item.unit,
        min_alert_level: item.min_alert_level,
        unit_cost: item.unit_cost,
        supplier_id: item.supplier_id ?? null,
        supplier_name: item.supplier_name ?? null,
      })
      .select('*, suppliers(id, name, contact_person, phone)')
      .single();

    if (error) throw error;
    return {
      ...(data as any),
      supplier: (data as any).suppliers,
    } as InventoryItemAdmin;
  },

  async updateInventoryItem(
    id: string,
    updates: Partial<{
      sku: string;
      name: string;
      category: any;
      unit: string;
      min_alert_level: number;
      unit_cost: number;
      supplier_id: string | null;
      supplier_name: string | null;
    }>
  ): Promise<void> {
    const { error } = await (supabase.from as any)('inventory_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteInventoryItem(id: string): Promise<void> {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Restock Delivery Intake (MAC)
   */
  async restockDelivery(params: {
    inventoryItemId: string;
    quantity: number;
    invoiceUnitCost: number;
    supplierName?: string;
    invoiceNumber?: string;
  }) {
    const { data, error } = await (supabase.rpc as any)('intake_inventory_restock', {
      p_inventory_item_id: params.inventoryItemId,
      p_quantity: params.quantity,
      p_invoice_unit_cost: params.invoiceUnitCost,
      p_supplier_name: params.supplierName || null,
      p_invoice_number: params.invoiceNumber || null,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Fast In-Line Stock Adjustment RPC (Admin Inventory Hub)
   */
  async quickAdjustStock(params: {
    inventoryItemId: string;
    newStock: number;
    reason?: string;
    adjustedById?: string;
  }) {
    const { data, error } = await (supabase.rpc as any)('admin_quick_adjust_inventory_stock', {
      p_inventory_item_id: params.inventoryItemId,
      p_new_stock: params.newStock,
      p_reason: params.reason || 'Manual physical count adjustment',
      p_adjusted_by_id: params.adjustedById || null,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Fast In-Line Par Alert Level Update (Admin Inventory Hub)
   */
  async updateParLevel(params: { inventoryItemId: string; newPar: number }) {
    const { data, error } = await (supabase.rpc as any)('admin_update_inventory_par_level', {
      p_inventory_item_id: params.inventoryItemId,
      p_new_par: params.newPar,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Spillage & Waste Logger
   */
  async logWaste(params: {
    inventoryItemId: string;
    quantity: number;
    reason: any;
    reportedById?: string;
  }) {
    const { data, error } = await (supabase.rpc as any)('log_inventory_waste', {
      p_inventory_item_id: params.inventoryItemId,
      p_quantity: params.quantity,
      p_reason: params.reason,
      p_reported_by_id: params.reportedById || null,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Stock Movement Ledger & Stocktake Audits
   */
  async getStockMovements(limit = 100): Promise<StockMovementAdmin[]> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, inventory_items(name, sku, unit)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      inventory_item: row.inventory_items,
    })) as StockMovementAdmin[];
  },

  async submitStocktakeAudit(params: {
    conductedById?: string;
    notes?: string;
    items: Array<{
      inventory_item_id: string;
      expected_quantity: number;
      actual_quantity: number;
      unit_cost: number;
    }>;
  }) {
    const { data, error } = await (supabase.rpc as any)('submit_stocktake_session', {
      p_conducted_by_id: params.conductedById || null,
      p_notes: params.notes || 'Routine physical inventory count audit',
      p_items: params.items,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Staff Attendance & Payroll Ledger Query (Supports single date or date range)
   */
  async getAttendanceRecords(
    startDate: string,
    endDate?: string
  ): Promise<AttendanceRecordAdmin[]> {
    let query = supabase
      .from('attendance_records')
      .select(
        '*, users(username, display_name, role, job_title, is_workflow_staff, base_daily_rate)'
      );

    if (endDate && endDate !== startDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    } else {
      query = query.eq('date', startDate);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => {
      const userRate = Number(row.users?.base_daily_rate || 0);
      const rawBase = Number(row.base_daily_pay || 0);
      const resolvedBase =
        userRate > 200 ? userRate : rawBase > 200 ? rawBase : PH_MINIMUM_WAGE_DAILY;
      const addon = Number(row.addon_pay || 0);
      return {
        ...row,
        base_daily_pay: resolvedBase,
        total_day_pay: row.is_present ? resolvedBase + addon : 0,
        user: row.users,
      };
    }) as AttendanceRecordAdmin[];
  },

  /**
   * Admin Upsert Attendance Record (Manual Clock-In/Out, Absent override, and OT Bonus adjustment)
   */
  async adminUpsertAttendance(params: {
    userId: string;
    date: string;
    isPresent: boolean;
    shiftStatus: 'CLOCKED_IN' | 'COMPLETED' | 'ABSENT';
    baseDailyPay: number;
    addonPay: number;
    notes?: string;
  }): Promise<any> {
    const { data, error } = await (supabase.rpc as any)('admin_upsert_attendance_record', {
      p_user_id: params.userId,
      p_date: params.date,
      p_is_present: params.isPresent,
      p_shift_status: params.shiftStatus,
      p_base_daily_pay: params.baseDailyPay,
      p_addon_pay: params.addonPay,
      p_notes: params.notes || null,
    });

    if (error) throw error;
    return data;
  },

  async updateDiscretionaryAddon(
    recordId: string,
    addonPay: number,
    baseRate: number,
    fallbackContext?: { userId: string; dateStr: string; isPresent?: boolean }
  ) {
    const total = baseRate + addonPay;

    if (fallbackContext?.userId) {
      await supabase
        .from('users')
        .update({
          base_daily_rate: baseRate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fallbackContext.userId);
    }

    if (recordId.startsWith('att-') && fallbackContext) {
      const { error } = await supabase.from('attendance_records').upsert(
        {
          user_id: fallbackContext.userId,
          date: fallbackContext.dateStr,
          is_present: fallbackContext.isPresent ?? true,
          base_daily_pay: baseRate,
          addon_pay: addonPay,
          total_day_pay: total,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      );
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('attendance_records')
      .update({
        base_daily_pay: baseRate,
        addon_pay: addonPay,
        total_day_pay: total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId);

    if (error) throw error;
  },

  /**
   * Venue Staff Profiles Roster & Management
   */
  async getStaffRoster(): Promise<StaffMemberAdmin[]> {
    const normalizeRoster = (rows: any[]): StaffMemberAdmin[] => {
      return rows.map((row) => {
        const rawRate = parseFloat(String(row.base_daily_rate ?? 0));
        // Upgrade only legacy USD-era (< 200) seed values to PH minimum wage baseline (645.00),
        // while preserving any custom base pay set by the Admin.
        if (isNaN(rawRate) || rawRate <= 200) {
          supabase
            .from('users')
            .update({ base_daily_rate: PH_MINIMUM_WAGE_DAILY })
            .eq('id', row.id)
            .then(() => {});
          return { ...row, base_daily_rate: PH_MINIMUM_WAGE_DAILY };
        }
        return row;
      });
    };

    const { data, error } = await (supabase.from('users') as any)
      .select(
        'id, username, display_name, role, job_title, is_workflow_staff, base_daily_rate, email, phone, avatar_url, is_active, created_at'
      )
      .order('is_workflow_staff', { ascending: false })
      .order('display_name', { ascending: true });

    if (error) {
      // Fallback if job_title column is not yet migrated on remote DB
      const fallback = await supabase
        .from('users')
        .select(
          'id, username, display_name, role, is_workflow_staff, base_daily_rate, email, phone, avatar_url, is_active, created_at'
        )
        .order('is_workflow_staff', { ascending: false })
        .order('display_name', { ascending: true });
      if (fallback.error) throw fallback.error;
      return normalizeRoster(fallback.data || []);
    }
    return normalizeRoster(data || []);
  },

  /**
   * Create a POS App User Account (is_workflow_staff = true, requires 4-digit PIN)
   */
  async createStaffUser(payload: CreateStaffUserPayload): Promise<StaffMemberAdmin> {
    const cleanUsername = payload.username.trim().toLowerCase().replace(/\s+/g, '_');
    const cleanPin = payload.pin.trim();

    if (!cleanUsername) {
      throw new Error('Staff ID / Username is required.');
    }
    if (!/^\d{4}$/.test(cleanPin)) {
      throw new Error('A 4-digit numeric PIN is required for POS user accounts.');
    }

    // If password provided for Admin, call atomic RPC
    if (payload.role === 'admin' && payload.password) {
      const { data: rpcRes, error: rpcErr } = await (supabase.rpc as any)(
        'create_staff_account_with_secrets',
        {
          p_display_name: payload.display_name.trim(),
          p_username: cleanUsername,
          p_pin: cleanPin,
          p_role: payload.role,
          p_job_title: payload.job_title?.trim() || null,
          p_base_daily_rate: payload.base_daily_rate,
          p_phone: payload.phone?.trim() || null,
          p_email: payload.email?.trim() || null,
          p_password: payload.password,
        }
      );
      if (!rpcErr && rpcRes && rpcRes.success) {
        const { data: createdUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', rpcRes.userId)
          .single();
        if (createdUser) return createdUser as StaffMemberAdmin;
      }
    }

    const insertRow: Record<string, any> = {
      display_name: payload.display_name.trim(),
      username: cleanUsername,
      pin: cleanPin,
      role: payload.role,
      job_title: payload.job_title?.trim() || null,
      is_workflow_staff: true,
      base_daily_rate: payload.base_daily_rate,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      avatar_url: payload.avatar_url?.trim() || null,
      is_active: true,
    };

    const { data, error } = await (supabase.from('users') as any)
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      // Handle case where job_title column does not exist yet on remote
      if (error.message?.includes('job_title')) {
        delete insertRow.job_title;
        const retry = await (supabase.from('users') as any).insert(insertRow).select().single();
        if (retry.error) throw retry.error;
        realtimeGateway.broadcastPosSync('staff_user_created');
        return retry.data as StaffMemberAdmin;
      }
      throw error;
    }

    realtimeGateway.broadcastPosSync('staff_user_created');
    return data as StaffMemberAdmin;
  },

  /**
   * Add a Non-User Venue Staff Member (is_workflow_staff = false, no POS login PIN required)
   */
  async createNonWorkflowStaff(payload: CreateNonWorkflowStaffPayload): Promise<StaffMemberAdmin> {
    const cleanTitle = payload.job_title.trim();
    const slugBase = payload.display_name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const resolvedUsername =
      payload.username?.trim().toLowerCase().replace(/\s+/g, '_') ||
      `staff_${slugBase || 'member'}_${randomSuffix}`;

    const insertRow: Record<string, any> = {
      display_name: payload.display_name.trim(),
      username: resolvedUsername,
      pin: payload.pin?.trim() || '0000',
      role: 'waiter',
      job_title: cleanTitle || 'Venue Staff',
      is_workflow_staff: false,
      base_daily_rate: payload.base_daily_rate,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      avatar_url: payload.avatar_url?.trim() || null,
      is_active: true,
    };

    const { data, error } = await (supabase.from('users') as any)
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      // Fallback if remote DB has not yet applied nullable pin or job_title migration
      const fallbackRow = { ...insertRow };
      if (error.message?.includes('job_title')) {
        delete fallbackRow.job_title;
      }
      if (error.message?.includes('pin') || error.code === '23502') {
        fallbackRow.pin = '0000';
      }
      const retry = await (supabase.from('users') as any).insert(fallbackRow).select().single();
      if (retry.error) throw retry.error;
      realtimeGateway.broadcastPosSync('staff_member_created');
      return { ...retry.data, job_title: cleanTitle } as StaffMemberAdmin;
    }

    realtimeGateway.broadcastPosSync('staff_member_created');
    return data as StaffMemberAdmin;
  },

  /**
   * Update existing staff member profile (both POS users and non-user staff)
   */
  async updateStaffMember(
    id: string,
    payload: UpdateStaffMemberPayload
  ): Promise<StaffMemberAdmin> {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.display_name !== undefined) updateData.display_name = payload.display_name.trim();
    if (payload.username !== undefined) {
      updateData.username = payload.username.trim().toLowerCase().replace(/\s+/g, '_');
    }
    if (payload.role !== undefined) updateData.role = payload.role;
    if (payload.job_title !== undefined) updateData.job_title = payload.job_title?.trim() || null;
    if (payload.base_daily_rate !== undefined) updateData.base_daily_rate = payload.base_daily_rate;
    if (payload.email !== undefined) updateData.email = payload.email?.trim() || null;
    if (payload.phone !== undefined) updateData.phone = payload.phone?.trim() || null;
    if (payload.avatar_url !== undefined)
      updateData.avatar_url = payload.avatar_url?.trim() || null;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

    const { data, error } = await (supabase.from('users') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('job_title')) {
        delete updateData.job_title;
        const retry = await (supabase.from('users') as any)
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (retry.error) throw retry.error;
        realtimeGateway.broadcastPosSync('staff_member_updated');
        return retry.data as StaffMemberAdmin;
      }
      throw error;
    }

    realtimeGateway.broadcastPosSync('staff_member_updated');
    return data as StaffMemberAdmin;
  },

  /**
   * Reset 4-digit numeric PIN for a POS user account
   */
  async resetStaffPin(id: string, newPin: string): Promise<void> {
    const cleanPin = newPin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      throw new Error('PIN must be exactly 4 numeric digits.');
    }

    const { error } = await supabase
      .from('users')
      .update({
        pin: cleanPin,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    realtimeGateway.broadcastPosSync('staff_pin_reset');
  },

  /**
   * Soft deactivate or reactivate a staff member
   */
  async toggleStaffStatus(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Sales Analytics
   */
  /**
   * Sales Analytics with timeframe boundaries, station filtering, hourly velocity, and tender mix
   */
  async getSalesOverview(
    params?: SalesOverviewFilterParams | OperatingMode
  ): Promise<SalesAnalyticsOverview> {
    const filterOptions: SalesOverviewFilterParams =
      typeof params === 'string' ? { filterMode: params } : params || {};

    let query = (supabase.from as any)('payments').select(
      'id, amount, payment_method, operating_mode, created_at, drawer_target, tab_id, tabs(order_channel, operating_mode)'
    );

    if (filterOptions.startDate) {
      query = query.gte('created_at', filterOptions.startDate);
    }
    if (filterOptions.endDate) {
      query = query.lt('created_at', filterOptions.endDate);
    }

    // Query actual staff attendance payroll records within this boundary
    let attendanceQuery = (supabase.from as any)('attendance_records').select(
      'total_day_pay, is_present, date'
    );
    if (filterOptions.startDate) {
      attendanceQuery = attendanceQuery.gte('date', filterOptions.startDate.split('T')[0]);
    }
    if (filterOptions.endDate) {
      attendanceQuery = attendanceQuery.lte('date', filterOptions.endDate.split('T')[0]);
    }

    const [paymentsRes, attendanceRes] = await Promise.all([
      query,
      attendanceQuery.eq('is_present', true),
    ]);

    const payments = paymentsRes.data;
    if (paymentsRes.error) {
      console.error('[adminApi.getSalesOverview] DB query error:', paymentsRes.error);
      throw paymentsRes.error;
    }

    // Real payroll expense from attendance records
    const attendanceRows = (attendanceRes.data || []) as any[];
    const actualPayrollExpense = attendanceRows.reduce(
      (sum, row) => sum + (Number(row.total_day_pay) || 0),
      0
    );

    let grossSales = 0;
    const channelBreakdown: Record<string, { sales: number; count: number }> = {
      CAFE_AREA: { sales: 0, count: 0 },
      BAR_AREA: { sales: 0, count: 0 },
      TAKEOUT_COUNTER: { sales: 0, count: 0 },
      GRAB_FOOD: { sales: 0, count: 0 },
      FOODPANDA: { sales: 0, count: 0 },
    };

    const tenderBreakdown = {
      cash: 0,
      card: 0,
      digital: 0,
      delivery: 0,
      total: 0,
    };

    const hourlyBucket = new Map<number, { sales: number; count: number }>();
    for (let h = 8; h <= 23; h++) {
      hourlyBucket.set(h, { sales: 0, count: 0 });
    }

    // Overall Mode Breakdown across the timeframe
    let cafeSales = 0;
    let eventSales = 0;
    let cafeOrderCount = 0;
    let eventOrderCount = 0;

    for (const p of payments || []) {
      const amt = Number(p.amount) || 0;
      const m = p.operating_mode || p.tabs?.operating_mode || 'CAFE';
      if (m === 'EVENT') {
        eventSales += amt;
        eventOrderCount++;
      } else {
        cafeSales += amt;
        cafeOrderCount++;
      }
    }

    const totalModeSales = cafeSales + eventSales;
    const cafePercent = totalModeSales > 0 ? Math.round((cafeSales / totalModeSales) * 100) : 0;
    const eventPercent = totalModeSales > 0 ? 100 - cafePercent : 0;

    const filtered = (payments || []).filter((p: any) => {
      if (filterOptions.filterMode && filterOptions.filterMode !== 'ALL') {
        const itemMode = p.operating_mode || p.tabs?.operating_mode || 'CAFE';
        if (itemMode !== filterOptions.filterMode) {
          return false;
        }
      }
      if (filterOptions.station && filterOptions.station !== 'ALL') {
        const st = filterOptions.station.toUpperCase();
        const ch = (p.tabs?.order_channel || '').toUpperCase();
        if (st === 'CAFE_AREA' && !ch.includes('CAFE') && p.drawer_target !== 'main') return false;
        if (st === 'BAR_AREA' && !ch.includes('BAR') && p.drawer_target !== 'bar') return false;
        if (st === 'TAKEOUT_COUNTER' && !ch.includes('TAKEOUT') && !ch.includes('COUNTER'))
          return false;
        if (st === 'GRAB_FOOD' && !ch.includes('GRAB') && !ch.includes('DELIVERY')) return false;
      }
      return true;
    });

    for (const p of filtered) {
      const amt = Number(p.amount) || 0;
      grossSales += amt;
      const channel = p.tabs?.order_channel || 'CAFE_AREA';
      if (!channelBreakdown[channel]) {
        channelBreakdown[channel] = { sales: 0, count: 0 };
      }
      channelBreakdown[channel].sales += amt;
      channelBreakdown[channel].count += 1;

      // Tender breakdown
      const method = (p.payment_method || '').toUpperCase();
      if (method === 'CASH') {
        tenderBreakdown.cash += amt;
      } else if (method === 'CARD') {
        tenderBreakdown.card += amt;
      } else if (method === 'DIGITAL_WALLET') {
        tenderBreakdown.digital += amt;
      } else if (
        method.includes('GRAB') ||
        method.includes('PANDA') ||
        method.includes('DELIVERY')
      ) {
        tenderBreakdown.delivery += amt;
      } else {
        tenderBreakdown.cash += amt;
      }

      // Hourly grouping
      const date = new Date(p.created_at);
      const hour = date.getHours();
      const currentH = hourlyBucket.get(hour) || { sales: 0, count: 0 };
      hourlyBucket.set(hour, { sales: currentH.sales + amt, count: currentH.count + 1 });
    }

    tenderBreakdown.total = grossSales;

    const orderCount = filtered.length;
    const averageTicket = orderCount > 0 ? grossSales / orderCount : 0;
    // Real labor expense from attendance ledger (or fallback to active shift minimum wage baseline if unrecorded)
    const totalLaborExpense =
      actualPayrollExpense > 0
        ? actualPayrollExpense
        : orderCount > 0
          ? Math.min(grossSales * 0.18, 645)
          : 0;
    // COGS: 28% of gross
    const totalCogs = grossSales * 0.28;
    const estimatedNetProfit =
      grossSales > 0 ? Math.max(0, grossSales - (totalLaborExpense + totalCogs)) : 0;

    // Build hourly sales points (08:00 - 23:00)
    let maxHourSales = 0;
    let peakHourStr = '20:00';
    const hourlySales = Array.from({ length: 16 }, (_, i) => {
      const hourNum = i + 8;
      const label = `${hourNum.toString().padStart(2, '0')}:00`;
      const bucket = hourlyBucket.get(hourNum) || { sales: 0, count: 0 };
      if (bucket.sales > maxHourSales) {
        maxHourSales = bucket.sales;
        peakHourStr = label;
      }
      return {
        hour: label,
        sales: bucket.sales,
        orderCount: bucket.count,
      };
    });

    return {
      grossSales,
      orderCount,
      averageTicket,
      totalLaborExpense,
      totalCogs,
      estimatedNetProfit,
      channelBreakdown,
      tenderBreakdown,
      hourlySales,
      peakHourLabel: maxHourSales > 0 ? peakHourStr : undefined,
      modeBreakdown: {
        cafeSales,
        eventSales,
        cafeOrderCount,
        eventOrderCount,
        totalSales: totalModeSales,
        cafePercent,
        eventPercent,
      },
    };
  },

  /**
   * Table Layout Management
   */
  async getTables(): Promise<TableAdmin[]> {
    const { data, error } = await supabase
      .from('tables')
      .select('id, table_number, zone, capacity, is_occupied')
      .order('table_number', { ascending: true });
    if (error) throw error;
    return (data || []) as TableAdmin[];
  },

  async createTable(table: {
    table_number: string;
    zone: 'CAFE_AREA' | 'BAR_AREA';
    capacity: number;
  }): Promise<TableAdmin> {
    const { data, error } = await supabase.from('tables').insert(table).select().single();
    if (error) throw error;
    realtimeGateway.broadcastPosSync('table_created');
    return data as TableAdmin;
  },

  async updateTable(
    id: string,
    updates: Partial<{
      table_number: string;
      zone: 'CAFE_AREA' | 'BAR_AREA';
      capacity: number;
      is_occupied: boolean;
    }>
  ): Promise<void> {
    const { error } = await supabase.from('tables').update(updates).eq('id', id);
    if (error) throw error;
    realtimeGateway.broadcastPosSync('table_updated');
  },

  async deleteTable(id: string): Promise<void> {
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) throw error;
    realtimeGateway.broadcastPosSync('table_deleted');
  },

  async releaseTable(id: string): Promise<{ success: boolean; closedTabsCount: number }> {
    const { data, error } = await (supabase.rpc as any)('admin_force_release_table', {
      p_table_id: id,
    });
    if (error) throw error;
    realtimeGateway.broadcastPosSync('table_released');
    return (data as any) || { success: true, closedTabsCount: 0 };
  },

  async resetStationMetrics(
    pin: string
  ): Promise<{ success: boolean; reset_at?: string; manager_name?: string; error?: string }> {
    const { data, error } = await (supabase.rpc as any)('reset_station_turnaround_metrics', {
      p_manager_pin: pin.trim(),
    });
    if (error) {
      return { success: false, error: error.message || 'Failed to reset station metrics.' };
    }
    return (data as any) || { success: true };
  },

  async clearStationMetricsReset(): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await (supabase.rpc as any)('clear_station_turnaround_reset');
    if (error) {
      return { success: false, error: error.message || 'Failed to clear reset baseline.' };
    }
    return (data as any) || { success: true };
  },
};

export interface TableAdmin {
  id: string;
  table_number: string;
  zone: 'CAFE_AREA' | 'BAR_AREA';
  capacity: number;
  is_occupied: boolean;
}
