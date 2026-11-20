import { describe, it, expect } from 'vitest';
import {
  getOpenTabs,
  deriveTabStatus,
  formatTableDisplayName,
  summarizeTabItems,
} from '../tableTabHelpers';
import type { CustomerTab, TableItem } from '@/types/floor';

const makeTab = (overrides: Partial<CustomerTab> = {}): CustomerTab => ({
  id: 'tab-1',
  tabIndex: 1,
  guestName: 'Alice',
  status: 'open',
  items: [],
  totalAmount: 0,
  ...overrides,
});

const makeTable = (overrides: Partial<TableItem> = {}): TableItem => ({
  id: 'tbl-1',
  code: 'Cafe 1',
  area: 'cafe',
  seats: 4,
  guests: 2,
  status: 'occupied',
  elapsedTime: '05:00',
  hasOpenCheck: true,
  activeTabs: [1],
  maxTabs: 10,
  isMyTable: true,
  tabs: [],
  ...overrides,
});

describe('tableTabHelpers', () => {
  describe('getOpenTabs', () => {
    it('filters out closed/billed tabs and sorts by tabIndex', () => {
      const table = makeTable({
        tabs: [
          makeTab({ id: 't3', tabIndex: 3, guestName: 'Charlie', status: 'open' }),
          makeTab({ id: 't2', tabIndex: 2, guestName: 'Bob', status: 'closed' }),
          makeTab({ id: 't1', tabIndex: 1, guestName: 'Alice', status: 'open' }),
        ],
      });
      const result = getOpenTabs(table);
      expect(result.map((t) => t.guestName)).toEqual(['Alice', 'Charlie']);
    });

    it('returns empty array for empty table with no tabs', () => {
      const table = makeTable({ status: 'empty', hasOpenCheck: false, tabs: [] });
      expect(getOpenTabs(table)).toEqual([]);
    });

    it('synthesizes fallback tab when hasOpenCheck is true but tabs array is empty', () => {
      const table = makeTable({
        status: 'occupied',
        hasOpenCheck: true,
        activeTabs: [2],
        totalAmount: 350,
        tabs: [],
      });
      const result = getOpenTabs(table);
      expect(result).toHaveLength(1);
      expect(result[0].tabIndex).toBe(2);
      expect(result[0].totalAmount).toBe(350);
    });
  });

  describe('deriveTabStatus', () => {
    it('prioritizes ready > preparing > served > occupied', () => {
      const readyTab = makeTab({
        items: [
          {
            id: '1',
            productId: 'p1',
            productName: 'Latte',
            unitPrice: 150,
            quantity: 1,
            stationTarget: 'bar',
            status: 'preparing',
          },
          {
            id: '2',
            productId: 'p2',
            productName: 'Pasta',
            unitPrice: 300,
            quantity: 1,
            stationTarget: 'kitchen',
            status: 'ready',
          },
        ],
      });
      expect(deriveTabStatus(readyTab)).toBe('ready');

      const prepTab = makeTab({
        items: [
          {
            id: '1',
            productId: 'p1',
            productName: 'Latte',
            unitPrice: 150,
            quantity: 1,
            stationTarget: 'bar',
            status: 'pending',
          },
        ],
      });
      expect(deriveTabStatus(prepTab)).toBe('preparing');

      const servedTab = makeTab({
        items: [
          {
            id: '1',
            productId: 'p1',
            productName: 'Latte',
            unitPrice: 150,
            quantity: 1,
            stationTarget: 'bar',
            status: 'served',
          },
        ],
      });
      expect(deriveTabStatus(servedTab)).toBe('served');

      const emptyTab = makeTab({ items: [] });
      expect(deriveTabStatus(emptyTab)).toBe('occupied');
    });
  });

  describe('formatTableDisplayName', () => {
    it('formats table codes consistently', () => {
      expect(formatTableDisplayName('Cafe 1', 'cafe')).toBe('Cafe 1');
      expect(formatTableDisplayName('Bar 3', 'bar')).toBe('Bar 3');
      expect(formatTableDisplayName('B2', 'bar')).toBe('Bar 2');
      expect(formatTableDisplayName('C4', 'cafe')).toBe('Cafe 4');
      expect(formatTableDisplayName('Table 5', 'cafe')).toBe('Cafe 5');
    });
  });

  describe('summarizeTabItems', () => {
    it('summarizes active items and ignores cancelled items', () => {
      const tab = makeTab({
        items: [
          {
            id: '1',
            productId: 'p1',
            productName: 'Flat White',
            unitPrice: 160,
            quantity: 2,
            stationTarget: 'bar',
            status: 'served',
          },
          {
            id: '2',
            productId: 'p2',
            productName: 'Voided',
            unitPrice: 100,
            quantity: 1,
            stationTarget: 'bar',
            status: 'cancelled',
          },
        ],
      });
      expect(summarizeTabItems(tab)).toBe('2x Flat White');
    });

    it('returns clean prompt when no active items exist', () => {
      expect(summarizeTabItems(makeTab({ items: [] }))).toBe('Tab open — tap + Order');
    });
  });
});
