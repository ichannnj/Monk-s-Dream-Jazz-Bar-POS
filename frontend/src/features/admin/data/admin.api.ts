import { supabase } from '@/features/shared/infrastructure/supabase';
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
  description?: string;
  allergens?: string[];
  dietary?: string[];
  is_available?: boolean;
  categories?: {
    id: string;
    name: string;
    slug: string;
  };
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

export interface AttendanceRecordAdmin {
  id: string;
  user_id: string;
  date: string;
  is_present: boolean;
  base_daily_pay: number;
  addon_pay: number;
  total_day_pay: number;
  user?: {
    display_name: string;
    role: string;
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
}

export interface SalesOverviewFilterParams {
  filterMode?: OperatingMode;
  startDate?: string;
  endDate?: string;
  station?: string;
}

export const adminApi = {
  /**
   * Venue Settings & Operating Mode
   */
  async getVenueSettings(): Promise<VenueSettings> {
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
    return data as VenueSettings;
  },

  async setOperatingMode(mode: OperatingMode): Promise<void> {
    const { error } = await (supabase.from as any)('venue_settings')
      .update({ operating_mode: mode, updated_at: new Date().toISOString() })
      .neq('id', 'non-existent');

    if (error) {
      console.error('[adminApi.setOperatingMode] Failed:', error);
      throw error;
    }
  },

  async updateVenueSettings(updates: Partial<VenueSettings>): Promise<void> {
    const { error } = await (supabase.from as any)('venue_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .neq('id', 'non-existent');

    if (error) throw error;
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
        '*, categories(id, name, slug), product_ingredients(*, inventory_items(name, unit, unit_cost))'
      )
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map((p: any) => ({
      ...p,
      ingredients: p.product_ingredients,
    })) as ProductAdmin[];
  },

  async createProduct(params: {
    name: string;
    category_id: string;
    base_price: number;
    station_target: 'bar' | 'kitchen';
    is_resold_outside_food?: boolean;
    original_cost?: number | null;
    image_url?: string | null;
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
        description: params.description ?? '',
        allergens: params.allergens ?? [],
        dietary: params.dietary ?? [],
        is_available: params.is_available ?? true,
      })
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
      description: string;
      allergens: string[];
      dietary: string[];
      is_available: boolean;
      auto_86: boolean;
    }>
  ): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
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
    }>
  ) {
    // Delete existing recipe BOM, insert new
    await supabase.from('product_ingredients').delete().eq('product_id', productId);

    if (ingredients.length > 0) {
      const rows = ingredients.map((ing) => ({
        product_id: productId,
        inventory_item_id: ing.inventoryItemId,
        amount: ing.amount,
        unit: ing.unit,
        conversion_factor: ing.conversionFactor || 1,
      }));
      const { error } = await supabase.from('product_ingredients').insert(rows);
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
   * Staff Attendance & Payroll
   */
  async getAttendanceRecords(dateStr: string): Promise<AttendanceRecordAdmin[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*, users(display_name, role, is_workflow_staff)')
      .eq('date', dateStr);

    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      user: row.users,
    })) as AttendanceRecordAdmin[];
  },

  async updateDiscretionaryAddon(recordId: string, addonPay: number, baseRate: number) {
    const total = baseRate + addonPay;
    const { error } = await supabase
      .from('attendance_records')
      .update({
        addon_pay: addonPay,
        total_day_pay: total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId);

    if (error) throw error;
  },

  /**
   * Venue Staff Profiles Roster
   */
  async getStaffRoster(): Promise<any[]> {
    const { data, error } = await supabase
      .from('users')
      .select(
        'id, username, display_name, role, is_workflow_staff, base_daily_rate, email, phone, avatar_url, is_active'
      )
      .order('role', { ascending: true });
    if (error) throw error;
    return data || [];
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
      'id, amount, payment_method, created_at, drawer_target, tab_id, tabs(order_channel, operating_mode)'
    );

    if (filterOptions.startDate) {
      query = query.gte('created_at', filterOptions.startDate);
    }
    if (filterOptions.endDate) {
      query = query.lt('created_at', filterOptions.endDate);
    }

    const { data: payments, error } = await query;
    if (error) {
      console.error('[adminApi.getSalesOverview] DB query error:', error);
      throw error;
    }

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

    const filtered = (payments || []).filter((p: any) => {
      if (filterOptions.filterMode && p.tabs?.operating_mode !== filterOptions.filterMode) {
        return false;
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
    // Labor: benchmark ₱450 per station shift, scaled with active volume
    const totalLaborExpense = orderCount > 0 ? Math.min(grossSales * 0.18, 600) : 0;
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
  },

  async deleteTable(id: string): Promise<void> {
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) throw error;
  },

  async releaseTable(id: string): Promise<{ success: boolean; closedTabsCount: number }> {
    const { data, error } = await (supabase.rpc as any)('admin_force_release_table', {
      p_table_id: id,
    });
    if (error) throw error;
    return (data as any) || { success: true, closedTabsCount: 0 };
  },
};

export interface TableAdmin {
  id: string;
  table_number: string;
  zone: 'CAFE_AREA' | 'BAR_AREA';
  capacity: number;
  is_occupied: boolean;
}
