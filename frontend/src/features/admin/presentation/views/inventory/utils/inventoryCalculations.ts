export type InventoryStockHealth = 'DEPLETED' | 'BELOW_PAR' | 'IN_PAR';

/**
 * Classifies an inventory item's stock level against its minimum alert threshold.
 */
export function getStockStatus(currentStock: number, minAlertLevel: number): InventoryStockHealth {
  const stock = Number(currentStock || 0);
  const par = Number(minAlertLevel || 0);
  if (stock <= 0) return 'DEPLETED';
  if (stock <= par) return 'BELOW_PAR';
  return 'IN_PAR';
}

/**
 * Computes how much quantity should be purchased on a grocery run.
 * Uses targetStockLevel when configured; otherwise falls back to 2x minAlertLevel
 * when the item is at or below par.
 */
export function calculateSuggestedBuyQty(
  currentStock: number,
  minAlertLevel: number,
  targetStockLevel?: number | null
): number {
  const stock = Math.max(0, Number(currentStock || 0));
  const par = Math.max(0, Number(minAlertLevel || 0));
  const hasExplicitTarget =
    targetStockLevel !== null &&
    targetStockLevel !== undefined &&
    !Number.isNaN(Number(targetStockLevel)) &&
    Number(targetStockLevel) > 0;

  if (hasExplicitTarget) {
    const target = Number(targetStockLevel);
    return Math.max(0, Number((target - stock).toFixed(3)));
  }

  if (stock > par) return 0;
  const fallbackTarget = Math.max(par * 2, par > 0 ? par : 1);
  return Math.max(0, Number((fallbackTarget - stock).toFixed(3)));
}

/**
 * Computes the new Weighted Moving Average Cost (MAC) upon delivery intake.
 * Mirrors PostgreSQL `intake_inventory_restock`.
 */
export function calculateWeightedMac(
  currentStock: number,
  currentUnitCost: number,
  receivedQty: number,
  invoiceUnitCost: number
): number {
  const safeQty = Number(receivedQty);
  const safeInvoiceCost = Math.max(0, Number(invoiceUnitCost || 0));
  if (!Number.isFinite(safeQty) || safeQty <= 0) {
    return Math.max(0, Number(currentUnitCost || 0));
  }

  const oldStock = Number(currentStock || 0);
  const oldCost = Math.max(0, Number(currentUnitCost || 0));

  if (oldStock <= 0) {
    return Number(safeInvoiceCost.toFixed(2));
  }

  const totalValue = oldStock * oldCost + safeQty * safeInvoiceCost;
  const newTotalStock = oldStock + safeQty;
  return Number((totalValue / newTotalStock).toFixed(2));
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateRestockInput(qtyRaw: string, costRaw: string): ValidationResult {
  const qty = parseFloat(qtyRaw);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { valid: false, error: 'Received quantity must be greater than 0.' };
  }
  const cost = parseFloat(costRaw);
  if (!Number.isFinite(cost) || cost < 0) {
    return { valid: false, error: 'Invoice unit cost must be 0 or greater.' };
  }
  return { valid: true };
}

export function validateQuickAdjustInput(newStockRaw: string, parRaw: string): ValidationResult {
  const stock = parseFloat(newStockRaw);
  if (!Number.isFinite(stock) || stock < 0) {
    return { valid: false, error: 'Shelf stock count cannot be negative.' };
  }
  const par = parseFloat(parRaw);
  if (!Number.isFinite(par) || par < 0) {
    return { valid: false, error: 'Minimum par level cannot be negative.' };
  }
  return { valid: true };
}

export function validateWasteInput(qtyRaw: string): ValidationResult {
  const qty = parseFloat(qtyRaw);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { valid: false, error: 'Waste quantity must be greater than 0.' };
  }
  return { valid: true };
}

export function validateInventoryItemInput(params: {
  name: string;
  sku: string;
  minAlertLevel: string;
  targetStockLevel: string;
  unitCost: string;
  currentStock: string;
  isEditing: boolean;
}): ValidationResult {
  if (!params.name.trim()) {
    return { valid: false, error: 'Item name is required.' };
  }
  if (!params.sku.trim()) {
    return { valid: false, error: 'SKU code is required.' };
  }
  const par = parseFloat(params.minAlertLevel);
  if (!Number.isFinite(par) || par < 0) {
    return { valid: false, error: 'Min par level must be 0 or greater.' };
  }
  if (params.targetStockLevel.trim() !== '') {
    const target = parseFloat(params.targetStockLevel);
    if (!Number.isFinite(target) || target < 0) {
      return { valid: false, error: 'Target reorder level must be 0 or greater.' };
    }
    if (target < par) {
      return {
        valid: false,
        error: 'Target reorder level should be at least equal to Min Par.',
      };
    }
  }
  const cost = parseFloat(params.unitCost);
  if (!Number.isFinite(cost) || cost < 0) {
    return { valid: false, error: 'Unit cost cannot be negative.' };
  }
  if (!params.isEditing) {
    const initialStock = parseFloat(params.currentStock);
    if (!Number.isFinite(initialStock) || initialStock < 0) {
      return { valid: false, error: 'Initial stock cannot be negative.' };
    }
  }
  return { valid: true };
}
