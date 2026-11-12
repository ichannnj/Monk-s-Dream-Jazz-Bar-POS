/**
 * Reusable utility to group and aggregate receipt items.
 *
 * Combines items sharing identical:
 * - Product identifier / name
 * - Variant configuration (temperature, size)
 * - Unit price
 * - Identical modifiers
 * - Identical special notes
 * - Corkage status
 *
 * Items with differing notes or modifiers remain on separate lines
 * to maintain transparent order preparation details.
 */

export interface ReceiptItemInput {
  id?: string;
  productId?: string;
  product_id?: string;
  productName?: string;
  name?: string;
  unitPrice?: number;
  unit_price?: number;
  price?: number;
  quantity?: number;
  temperature?: string;
  size?: string;
  sizeLabel?: string;
  flavor?: string;
  stationTarget?: string;
  station?: string;
  categorySlug?: string;
  modifiers?: string[];
  notes?: string;
  isCorkage?: boolean;
  is_corkage?: boolean;
  total?: number;
  [key: string]: any;
}

export function aggregateReceiptItems<T extends ReceiptItemInput>(
  items: T[]
): Array<T & { total: number }> {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const map = new Map<string, T & { total: number }>();

  for (const rawItem of items) {
    if (!rawItem) continue;

    const prodKey = (
      rawItem.productId ||
      rawItem.product_id ||
      rawItem.productName ||
      rawItem.name ||
      'item'
    ).trim();

    const price = Number(rawItem.unitPrice ?? rawItem.unit_price ?? rawItem.price ?? 0);

    const temp = (rawItem.temperature || '').trim().toUpperCase();
    const size = (rawItem.size || rawItem.sizeLabel || '').trim();
    const flavor = (rawItem.flavor || '').trim();

    const mods = Array.isArray(rawItem.modifiers)
      ? [...rawItem.modifiers]
          .map((m) => String(m).trim())
          .sort()
          .join('|')
      : '';

    const notes = (rawItem.notes || '').trim().toLowerCase();
    const isCorkage = Boolean(rawItem.isCorkage || rawItem.is_corkage);

    const groupKey = `${prodKey}::${price.toFixed(2)}::${temp}::${size}::${flavor}::${mods}::${notes}::${isCorkage}`;

    const qty = Number(rawItem.quantity) || 1;

    if (map.has(groupKey)) {
      const existing = map.get(groupKey)!;
      const currentQty = Number(existing.quantity) || 1;
      const newQty = currentQty + qty;

      existing.quantity = newQty;
      existing.total = Number((price * newQty).toFixed(2));
    } else {
      const cloned: T & { total: number } = {
        ...rawItem,
        quantity: qty,
        unitPrice: price,
        price,
        total: Number((price * qty).toFixed(2)),
      };
      map.set(groupKey, cloned);
    }
  }

  return Array.from(map.values());
}
