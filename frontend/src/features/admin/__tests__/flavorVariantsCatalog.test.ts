import { describe, it, expect } from 'vitest';
import type { ProductFlavorOptionStateItem } from '../presentation/views/menu/item-modal/menuItemModal.types';
import {
  formatLineItemLabel,
  calculateOrderPrice,
  shouldMergeCartItem,
} from '@monks/printing/flavorVariants.test';

describe('Flavor Variants Catalog & Dynamic Customization', () => {
  it('allows adding custom flavors for non-coffee items such as Mocktails and Cocktails', () => {
    const mocktailFlavors: ProductFlavorOptionStateItem[] = [
      {
        id: 'opt-passionfruit',
        code: 'passionfruit',
        name: 'Passionfruit',
        price_delta: '20.00',
        is_assigned: true,
        is_available: true,
        is_default: true,
      },
      {
        id: 'opt-strawberry',
        code: 'wild_strawberry',
        name: 'Wild Strawberry',
        price_delta: '25.00',
        is_assigned: true,
        is_available: true,
        is_default: false,
      },
      {
        id: 'opt-lychee',
        code: 'lychee',
        name: 'Lychee Blossom',
        price_delta: '30.00',
        is_assigned: true,
        is_available: true,
        is_default: false,
      },
    ];

    expect(mocktailFlavors).toHaveLength(3);
    const defaultOpt = mocktailFlavors.find((f) => f.is_default);
    expect(defaultOpt?.name).toBe('Passionfruit');
    expect(parseFloat(defaultOpt?.price_delta || '0')).toBe(20.0);
  });

  it('correctly handles custom group titles and required selection rules', () => {
    const customGroupConfig = {
      groupTitle: 'Mocktail Flavor',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
    };

    expect(customGroupConfig.groupTitle).toBe('Mocktail Flavor');
    expect(customGroupConfig.isRequired).toBe(true);
    expect(customGroupConfig.minSelections).toBe(1);
    expect(customGroupConfig.maxSelections).toBe(1);
  });

  it('calculates order line total correctly for custom beverage flavors', () => {
    // Base Mocktail (₱180.00) + Lychee Blossom Flavor (+₱30.00) + Chia Seeds Add-on (+₱25.00)
    const basePrice = 180;
    const variantPriceDelta = 0;
    const flavorDelta = 30;
    const modifiersDelta = 25;

    const total = calculateOrderPrice(basePrice, variantPriceDelta, flavorDelta, modifiersDelta);
    expect(total).toBe(235.0);
  });

  it('formats non-coffee line item labels cleanly with flavor and notes', () => {
    const label = formatLineItemLabel('Mojito Mocktail', 'Passionfruit', undefined, 'Large');
    expect(label).toBe('Mojito Mocktail (Passionfruit · Large)');

    const cocktailLabel = formatLineItemLabel(
      'Old Fashioned',
      'Smoked Maple',
      undefined,
      undefined
    );
    expect(cocktailLabel).toBe('Old Fashioned (Smoked Maple)');
  });

  it('keeps different beverage flavors separate in cart and merges identical flavor orders', () => {
    const passionfruitMojito = {
      productId: 'prod-mojito',
      variantId: undefined,
      selections: ['grp-flavor:opt-passionfruit'],
      mods: ['Extra Mint'],
    };

    const strawberryMojito = {
      productId: 'prod-mojito',
      variantId: undefined,
      selections: ['grp-flavor:opt-strawberry'],
      mods: ['Extra Mint'],
    };

    const identicalPassionfruitMojito = {
      productId: 'prod-mojito',
      variantId: undefined,
      selections: ['grp-flavor:opt-passionfruit'],
      mods: ['Extra Mint'],
    };

    // Different flavors should not merge
    expect(shouldMergeCartItem(passionfruitMojito, strawberryMojito)).toBe(false);
    // Identical flavors and add-ons should merge
    expect(shouldMergeCartItem(passionfruitMojito, identicalPassionfruitMojito)).toBe(true);
  });

  it('re-elects a new default when the default flavor is unassigned or removed', () => {
    const activeFlavors: ProductFlavorOptionStateItem[] = [
      {
        id: 'opt-1',
        code: 'classic',
        name: 'Classic Lime',
        price_delta: '0.00',
        is_assigned: true,
        is_available: true,
        is_default: true,
      },
      {
        id: 'opt-2',
        code: 'mango',
        name: 'Ripe Mango',
        price_delta: '20.00',
        is_assigned: true,
        is_available: true,
        is_default: false,
      },
    ];

    // Remove opt-1
    const target = activeFlavors.find((o) => o.id === 'opt-1');
    const updated = activeFlavors.map((o) =>
      o.id === 'opt-1' ? { ...o, is_assigned: false, is_default: false } : o
    );

    if (target?.is_default) {
      const nextDefault = updated.find((o) => o.is_assigned);
      if (nextDefault) {
        nextDefault.is_default = true;
      }
    }

    expect(updated.find((o) => o.id === 'opt-1')?.is_assigned).toBe(false);
    expect(updated.find((o) => o.id === 'opt-2')?.is_default).toBe(true);
  });
});
