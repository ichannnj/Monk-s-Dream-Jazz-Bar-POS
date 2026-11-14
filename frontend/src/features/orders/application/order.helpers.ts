import { HybridLogicalClock } from '@monks/shared';
import type { CustomerTab, TableItem } from '../../../types/floor';

export const posHlc = new HybridLogicalClock(
  `pos-node-${Math.random().toString(36).substring(2, 7)}`
);

export function deriveTabTotal(tab: CustomerTab): number {
  const itemsTotal = (tab.items || [])
    .filter((i) => i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const corkage = tab.hasCorkageFee ? tab.corkageAmount || 0 : 0;
  return itemsTotal + corkage;
}

export function deriveTableStatus(
  hasOpenTabs: boolean,
  tabs: CustomerTab[] = []
): TableItem['status'] {
  if (!hasOpenTabs || tabs.length === 0) return 'empty';

  const allItems = tabs.flatMap((t) => t.items || []);
  // Exclude Door Charge from food/drink preparation status derivation
  const activeItems = allItems.filter(
    (i) =>
      i.status !== 'cancelled' &&
      i.categorySlug !== 'door_charge' &&
      !i.productName?.toLowerCase().includes('door charge')
  );

  if (activeItems.length === 0) return 'occupied';
  if (activeItems.some((i) => i.status === 'ready')) return 'ready';
  if (activeItems.some((i) => i.status === 'preparing' || i.status === 'pending'))
    return 'preparing';
  if (activeItems.every((i) => i.status === 'served')) return 'served';

  return 'occupied';
}

/**
 * Returns the authoritative ISO timestamp representing when the table entered its current state,
 * allowing live timers to reset to 00:00 per state (Occupied -> Prep -> Ready -> Served).
 */
export function deriveTableStateTimestamp(
  status: TableItem['status'],
  tabs: CustomerTab[] = [],
  occupiedSinceIso?: string
): string | undefined {
  if (status === 'empty') return undefined;

  const allItems = tabs.flatMap((t) => t.items || []);
  const activeKitchenBarItems = allItems.filter(
    (i) =>
      i.status !== 'cancelled' &&
      i.categorySlug !== 'door_charge' &&
      !i.productName?.toLowerCase().includes('door charge')
  );

  if (status === 'occupied' || activeKitchenBarItems.length === 0) {
    if (occupiedSinceIso) return occupiedSinceIso;
    const earliestTab = tabs
      .map((t) => t.openedAtIso)
      .filter(Boolean)
      .sort()[0];
    return earliestTab;
  }

  if (status === 'preparing') {
    const prepItems = activeKitchenBarItems.filter(
      (i) => i.status === 'preparing' || i.status === 'pending'
    );
    const earliestPrep = prepItems
      .map((i) => i.preparingAt || i.stateChangedAt || i.createdAt)
      .filter(Boolean)
      .sort()[0];
    return earliestPrep || occupiedSinceIso;
  }

  if (status === 'ready') {
    const readyItems = activeKitchenBarItems.filter((i) => i.status === 'ready');
    const latestReady = readyItems
      .map((i) => i.readyAt || i.stateChangedAt || i.createdAt)
      .filter(Boolean)
      .sort()
      .reverse()[0];
    return latestReady || occupiedSinceIso;
  }

  if (status === 'served') {
    const servedItems = activeKitchenBarItems.filter((i) => i.status === 'served');
    const latestServed = servedItems
      .map((i) => i.servedAt || i.stateChangedAt || i.createdAt)
      .filter(Boolean)
      .sort()
      .reverse()[0];
    return latestServed || occupiedSinceIso;
  }

  return occupiedSinceIso;
}
