import type { TableItem } from '../../../types/floor';

export const SEED_TABLES: TableItem[] = [
  // 15 Cafe Area Tables (Cafe 1 - 15)
  ...Array.from({ length: 15 }, (_, i) => {
    const num = i + 1;
    const seats = [1, 2, 8, 9, 14].includes(num) ? 2 : [6, 7, 13].includes(num) ? 6 : 4;
    return {
      id: `tbl-c${num}`,
      code: `Cafe ${num}`,
      area: 'cafe' as const,
      seats,
      guests: 0,
      status: 'empty' as const,
      elapsedTime: '0m',
      hasOpenCheck: false,
      activeTabs: [],
      maxTabs: 99,
      isMyTable: false,
      tabs: [],
    };
  }),
  // 10 Bar Area Tables (Bar 1 - 10)
  ...Array.from({ length: 10 }, (_, i) => {
    const num = i + 1;
    return {
      id: `tbl-b${num}`,
      code: `Bar ${num}`,
      area: 'bar' as const,
      seats: 1,
      guests: 0,
      status: 'empty' as const,
      elapsedTime: '0m',
      hasOpenCheck: false,
      activeTabs: [],
      maxTabs: 99,
      isMyTable: false,
      tabs: [],
    };
  }),
];
