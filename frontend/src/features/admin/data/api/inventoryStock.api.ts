import { supabase } from '@/features/shared/infrastructure/supabase';
import type { InventoryItemAdmin, StockMovementAdmin, SupplierAdmin } from '../admin.types';

export const inventoryStockApi = {
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

  async updateParLevel(params: { inventoryItemId: string; newPar: number }) {
    const { data, error } = await (supabase.rpc as any)('admin_update_inventory_par_level', {
      p_inventory_item_id: params.inventoryItemId,
      p_new_par: params.newPar,
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
};
