import type { CustomerTab, TableArea, TableItem, TableStatus } from '@/types/floor';

/**
 * Returns active/open customer tabs for a table sorted by tabIndex.
 * Synthesizes a fallback tab only if `hasOpenCheck` is true with no hydrated tabs.
 */
export function getOpenTabs(table: TableItem): CustomerTab[] {
  const openTabs = (table.tabs || [])
    .filter((t) => t.status === 'open')
    .sort((a, b) => a.tabIndex - b.tabIndex);

  if (openTabs.length > 0) return openTabs;

  if (table.hasOpenCheck && table.status !== 'empty') {
    const fallbackIndex = table.activeTabs?.[0] ?? 1;
    return [
      {
        id: `fallback-${table.id}-${fallbackIndex}`,
        tabIndex: fallbackIndex,
        guestName: `Guest ${fallbackIndex}`,
        status: 'open',
        items: [],
        totalAmount: table.totalAmount || 0,
      },
    ];
  }

  return [];
}

/**
 * Derives preparation/service status for an individual customer tab.
 */
export function deriveTabStatus(tab: CustomerTab): Exclude<TableStatus, 'empty'> {
  const activeItems = (tab.items || []).filter((i) => i.status !== 'cancelled');
  if (activeItems.length === 0) return 'occupied';

  if (activeItems.some((i) => i.status === 'ready')) return 'ready';
  if (activeItems.some((i) => i.status === 'preparing' || i.status === 'pending')) {
    return 'preparing';
  }
  if (activeItems.every((i) => i.status === 'served')) return 'served';

  return 'occupied';
}

export const FLOOR_AREA_LABELS = {
  cafe: 'CAFE AREA',
  bar: 'MUSIC LOUNGE',
} as const;

/**
 * Formats a floor area or DB zone into the standardized uppercase display label.
 */
export function formatFloorAreaLabel(area: TableArea | 'CAFE_AREA' | 'BAR_AREA'): string {
  return area === 'bar' || area === 'BAR_AREA' ? FLOOR_AREA_LABELS.bar : FLOOR_AREA_LABELS.cafe;
}

/**
 * Formats a table code and area into the standard display label (e.g., "Cafe 1", "Bar 2").
 */
export function formatTableDisplayName(code: string, area: TableArea): string {
  const trimmed = (code || '').trim();
  if (trimmed.toLowerCase().startsWith('cafe') || trimmed.toLowerCase().startsWith('bar')) {
    return trimmed;
  }
  if (trimmed.toLowerCase().startsWith('table')) {
    const num = trimmed.replace(/[^0-9]/g, '');
    return `${area === 'bar' ? 'Bar' : 'Cafe'} ${num || '1'}`;
  }
  if (/^[bc]\d+$/i.test(trimmed)) {
    const num = trimmed.slice(1);
    return `${trimmed.toUpperCase().startsWith('B') ? 'Bar' : 'Cafe'} ${num}`;
  }
  return `${area === 'bar' ? 'Bar' : 'Cafe'} ${trimmed}`;
}

/**
 * Produces a concise item preview string for a tab or across all open tabs.
 */
export function summarizeTabItems(tab?: CustomerTab, allTabs?: CustomerTab[]): string {
  const sourceItems = tab ? tab.items || [] : (allTabs || []).flatMap((t) => t.items || []);

  const activeItems = sourceItems.filter((i) => i.status !== 'cancelled');
  if (activeItems.length === 0) {
    return 'Tab open — tap + Order';
  }

  return activeItems.map((i) => `${i.quantity}x ${i.productName}`).join(', ');
}

export const TAB_STATUS_DOT_COLORS: Record<Exclude<TableStatus, 'empty'>, string> = {
  ready: '#10b981',
  preparing: '#f59e0b',
  served: '#810021',
  occupied: '#64748b',
};

/**
 * Sorts tables consistently: CAFE AREA first, then MUSIC LOUNGE, ordered numerically by table number.
 */
export function sortTablesInOrder(tables: TableItem[]): TableItem[] {
  const parseTableNum = (code: string): number => {
    const match = (code || '').match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  return [...tables].sort((a, b) => {
    if (a.area !== b.area) {
      return a.area === 'cafe' ? -1 : 1;
    }
    const numDiff = parseTableNum(a.code) - parseTableNum(b.code);
    if (numDiff !== 0) return numDiff;
    return (a.code || '').localeCompare(b.code || '');
  });
}
