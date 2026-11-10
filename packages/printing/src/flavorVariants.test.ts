import test from 'node:test';
import assert from 'node:assert/strict';

export interface OrderItemVariantSelection {
  groupId: string;
  optionId: string;
  groupNameSnapshot?: string;
  optionNameSnapshot?: string;
  priceDeltaSnapshot?: number;
}

export function formatLineItemLabel(
  baseName: string,
  flavor?: string,
  temp?: string,
  size?: string
): string {
  const parts: string[] = [];
  if (flavor) parts.push(flavor);
  if (temp && temp !== 'NONE') {
    parts.push(temp === 'HOT' ? 'Hot' : 'Iced');
  }
  if (size && size !== 'Standard') {
    parts.push(size);
  }
  if (parts.length > 0) {
    return `${baseName} (${parts.join(' · ')})`;
  }
  return baseName;
}

export function calculateOrderPrice(
  basePrice: number,
  variantPriceDelta: number,
  optionsDelta: number,
  modifiersDelta: number
): number {
  return basePrice + variantPriceDelta + optionsDelta + modifiersDelta;
}

export function shouldMergeCartItem(
  itemA: {
    productId: string;
    variantId?: string;
    selections: string[];
    mods: string[];
    notes?: string;
  },
  itemB: {
    productId: string;
    variantId?: string;
    selections: string[];
    mods: string[];
    notes?: string;
  }
): boolean {
  if (itemA.productId !== itemB.productId) return false;
  if ((itemA.variantId || '') !== (itemB.variantId || '')) return false;
  if ((itemA.notes || '') !== (itemB.notes || '')) return false;

  const selA = [...itemA.selections].sort().join('|');
  const selB = [...itemB.selections].sort().join('|');
  if (selA !== selB) return false;

  const modA = [...itemA.mods].sort().join('|');
  const modB = [...itemB.mods].sort().join('|');
  return modA === modB;
}

test('formatLineItemLabel correctly formats flavor with temperature and size', () => {
  const formatted = formatLineItemLabel('Latte', 'Spanish', 'HOT', '12oz');
  assert.equal(formatted, 'Latte (Spanish · Hot · 12oz)');

  const icedCaramel = formatLineItemLabel('Latte', 'Caramel', 'COLD', '16oz');
  assert.equal(icedCaramel, 'Latte (Caramel · Iced · 16oz)');
});

test('calculateOrderPrice correctly sums base + option + modifier deltas', () => {
  // Base 12oz Iced Latte (200) + Spanish flavor (+25) + Oat Milk (+50) + Extra Shot (+40) = 315
  const finalPrice = calculateOrderPrice(200, 0, 25, 90);
  assert.equal(finalPrice, 315.0);
});

test('shouldMergeCartItem keeps different flavors separate and merges identical selections', () => {
  const spanishLatte = {
    productId: 'prod-latte',
    variantId: 'var-cold-12oz',
    selections: ['grp-flavor:opt-spanish'],
    mods: ['Barista Oat Milk'],
  };

  const caramelLatte = {
    productId: 'prod-latte',
    variantId: 'var-cold-12oz',
    selections: ['grp-flavor:opt-caramel'],
    mods: ['Barista Oat Milk'],
  };

  const identicalSpanishLatte = {
    productId: 'prod-latte',
    variantId: 'var-cold-12oz',
    selections: ['grp-flavor:opt-spanish'],
    mods: ['Barista Oat Milk'],
  };

  assert.equal(shouldMergeCartItem(spanishLatte, caramelLatte), false);
  assert.equal(shouldMergeCartItem(spanishLatte, identicalSpanishLatte), true);
});
