import { supabase } from '@/features/shared/infrastructure/supabase';
import type { Database } from '@monks/shared';

export type OperatingMode = Database['public']['Enums']['operating_mode'];

export interface VenueSettings {
  id: string;
  operating_mode: OperatingMode;
  venue_name: string;
  daily_overhead_cost: number;
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

  /**
   * Inventory & Restock
   */
  async getInventoryItems(): Promise<InventoryItemAdmin[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as InventoryItemAdmin[];
  },

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
   * Recipe BOM & Products
   */
  async getProductsWithBOM(): Promise<ProductAdmin[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_ingredients(*, inventory_items(name, unit, unit_cost))')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map((p: any) => ({
      ...p,
      ingredients: p.product_ingredients,
    })) as ProductAdmin[];
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
    // Replace ingredients: delete existing, insert new
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

  async updateProductPricing(
    productId: string,
    params: {
      basePrice: number;
      isResoldOutsideFood?: boolean;
      originalCost?: number;
    }
  ) {
    const { error } = await supabase
      .from('products')
      .update({
        base_price: params.basePrice,
        is_resold_outside_food: params.isResoldOutsideFood || false,
        original_cost: params.originalCost || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (error) throw error;
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
  async getSalesOverview(filterMode?: OperatingMode): Promise<SalesAnalyticsOverview> {
    const { data: payments, error } = await (supabase.from as any)('payments').select(
      '*, tabs(order_channel, operating_mode)'
    );
    if (error) throw error;

    let grossSales = 0;
    const channelBreakdown: Record<string, { sales: number; count: number }> = {
      CAFE_AREA: { sales: 0, count: 0 },
      BAR_AREA: { sales: 0, count: 0 },
      TAKEOUT_COUNTER: { sales: 0, count: 0 },
      GRAB_FOOD: { sales: 0, count: 0 },
      FOODPANDA: { sales: 0, count: 0 },
    };

    const filtered = (payments || []).filter((p: any) => {
      if (!filterMode) return true;
      return p.tabs?.operating_mode === filterMode;
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
    }

    const orderCount = filtered.length;
    const averageTicket = orderCount > 0 ? grossSales / orderCount : 0;
    const totalLaborExpense = 450; // Aggregate daily base baseline
    const totalCogs = grossSales * 0.28; // Standard 28% beverage & food COGS baseline
    const estimatedNetProfit = grossSales - (totalLaborExpense + totalCogs + 150);

    return {
      grossSales,
      orderCount,
      averageTicket,
      totalLaborExpense,
      totalCogs,
      estimatedNetProfit,
      channelBreakdown,
    };
  },
};
