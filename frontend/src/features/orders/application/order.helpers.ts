import { HybridLogicalClock } from '@monks/shared';
import { CustomerTab, TableItem } from '../../../types/floor';

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
  const activeItems = allItems.filter((i) => i.status !== 'cancelled');

  if (activeItems.length === 0) return 'occupied';
  if (activeItems.some((i) => i.status === 'ready')) return 'ready';
  if (activeItems.some((i) => i.status === 'preparing' || i.status === 'pending'))
    return 'preparing';
  if (activeItems.every((i) => i.status === 'served')) return 'served';

  return 'occupied';
}
