import {
  MenuItem,
  OrderLineItem,
  ProductVariant,
  BeverageTemperature,
  OrderItemVariantSelection,
} from '@/types/floor';
import { formatCurrency } from '@monks/shared';

export function createOrderLineItem(
  item: MenuItem,
  variant: ProductVariant | undefined,
  mods: string[] = [],
  notesStr: string = '',
  variantSelections: OrderItemVariantSelection[] = []
): {
  effectivePrice: number;
  formattedName: string;
  formattedMods: string[];
  newItem: OrderLineItem;
} {
  let extraPrice = 0;
  const formattedMods = mods.map((modName) => {
    const found = item.modifiers?.find((m) => m.name === modName);
    if (found) {
      extraPrice += found.priceDelta;
      if (found.priceDelta > 0) {
        return `${found.name} (+${formatCurrency(found.priceDelta)})`;
      }
    }
    return modName;
  });

  // Calculate variant option deltas
  let optionsDelta = 0;
  const flavorNames: string[] = [];
  if (variantSelections && variantSelections.length > 0) {
    variantSelections.forEach((sel) => {
      const grp = item.variantGroups?.find((g) => g.id === sel.groupId);
      const opt = grp?.options.find((o) => o.id === sel.optionId);
      const delta = opt?.priceDelta ?? sel.priceDeltaSnapshot ?? 0;
      optionsDelta += delta;
      const optName = opt?.name ?? sel.optionNameSnapshot;
      if (optName) flavorNames.push(optName);
    });
  }

  const baseUnit = variant ? variant.price : item.price;
  const effectivePrice = baseUnit + extraPrice + optionsDelta;

  const descParts: string[] = [];
  if (flavorNames.length > 0) {
    descParts.push(flavorNames.join(', '));
  }
  if (variant && variant.temperature !== 'NONE') {
    descParts.push(variant.temperature === 'HOT' ? 'Hot' : 'Iced');
  }
  if (variant && variant.sizeLabel && variant.sizeLabel !== 'Standard') {
    descParts.push(variant.sizeLabel);
  }

  let formattedName = item.name;
  if (descParts.length > 0) {
    formattedName = `${item.name} (${descParts.join(' · ')})`;
  }

  const newItem: OrderLineItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    productId: item.id,
    productName: formattedName,
    stationTarget: item.stationTarget,
    variantId: variant?.id,
    temperature: variant?.temperature,
    sizeLabel: variant?.sizeLabel,
    unitPrice: effectivePrice,
    quantity: 1,
    status: 'pending',
    modifiers: formattedMods.length > 0 ? formattedMods : undefined,
    notes: notesStr ? notesStr : undefined,
    variantSelections: variantSelections.length > 0 ? variantSelections : undefined,
  };

  return { effectivePrice, formattedName, formattedMods, newItem };
}

export function appendOrIncrementCartItem(
  prev: OrderLineItem[],
  item: MenuItem,
  variant: ProductVariant | undefined,
  mods: string[] = [],
  notesStr: string = '',
  variantSelections: OrderItemVariantSelection[] = []
): OrderLineItem[] {
  const { formattedMods, newItem } = createOrderLineItem(
    item,
    variant,
    mods,
    notesStr,
    variantSelections
  );

  const normalizeSelections = (sels?: OrderItemVariantSelection[]) =>
    (sels || [])
      .map((s) => `${s.groupId}:${s.optionId}`)
      .sort()
      .join('|');

  const incomingSelectionsKey = normalizeSelections(variantSelections);

  const existingIdx = prev.findIndex(
    (i) =>
      i.productId === item.id &&
      (i.variantId || undefined) === (variant?.id || undefined) &&
      (i.notes || '') === (notesStr || '') &&
      normalizeSelections(i.variantSelections) === incomingSelectionsKey &&
      JSON.stringify(i.modifiers?.sort() || []) === JSON.stringify(formattedMods.sort())
  );

  if (existingIdx >= 0) {
    const copy = [...prev];
    copy[existingIdx].quantity += 1;
    return copy;
  }
  return [...prev, newItem];
}

export function resolveInitialCustomizerState(item: MenuItem): {
  initialTemp: BeverageTemperature;
  initialSize: string;
} {
  const hasHot = item.variants?.some((v) => v.temperature === 'HOT');
  const initialTemp: BeverageTemperature = hasHot
    ? 'HOT'
    : (item.variants?.[0]?.temperature as BeverageTemperature) || 'HOT';

  const initialSize =
    item.variants?.find((v) => v.temperature === initialTemp)?.sizeLabel ||
    item.variants?.[0]?.sizeLabel ||
    'Standard';

  return { initialTemp, initialSize };
}

export function findMatchingVariant(
  item: MenuItem,
  selectedTemperature: BeverageTemperature,
  selectedSize: string
): ProductVariant | undefined {
  if (!item.variants || item.variants.length === 0) return undefined;

  let matched = item.variants.find(
    (v) =>
      (v.temperature === selectedTemperature || v.temperature === 'NONE') &&
      v.sizeLabel === selectedSize
  );

  if (!matched) {
    matched = item.variants.find((v) => v.temperature === selectedTemperature) || item.variants[0];
  }
  return matched;
}

export function computeServiceChargeLabel(
  isDineIn: boolean,
  serviceChargeEnabled: boolean,
  operatingMode: string,
  cartItems: OrderLineItem[],
  cafeFoodServiceChargeRate: number,
  eventServiceChargeRate: number
): string {
  if (!isDineIn) return 'Service Charge (Takeout 0%):';
  if (!serviceChargeEnabled) return 'Service Charge (Disabled):';
  if (operatingMode === 'CAFE') {
    const hasFood = cartItems.some((ci) => ci.stationTarget === 'kitchen');
    const hasBar = cartItems.some((ci) => ci.stationTarget === 'bar');
    if (hasFood && !hasBar) return `Service Charge (${cafeFoodServiceChargeRate}% Food):`;
    if (!hasFood && hasBar) return 'Service Charge (Cafe Drinks 0%):';
    return `Service Charge (${cafeFoodServiceChargeRate}% Food / 0% Drinks):`;
  }
  return `Service Charge (${eventServiceChargeRate}% Event):`;
}
