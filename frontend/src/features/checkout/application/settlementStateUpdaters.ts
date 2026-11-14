import type {
  TableItem,
  CustomerTab,
  CheckItem,
  DrawerEntry,
  TakeoutOrder,
} from '../../../types/floor';
import { deriveTableStatus } from '../../orders/application/order.helpers';

export function determineDrawerTarget(
  effectiveCashierName: string,
  tableArea?: string,
  currentUserRole?: string
): 'main' | 'bar' {
  const isBar =
    tableArea === 'bar' ||
    currentUserRole === 'station_bar' ||
    currentUserRole === 'station_cafe' ||
    effectiveCashierName.toLowerCase().includes('bar') ||
    effectiveCashierName.toLowerCase().includes('thelonious') ||
    effectiveCashierName.toLowerCase().includes('bill');
  return isBar ? 'bar' : 'main';
}

export function createCashDrawerEntry(
  grandTotal: number,
  reason: string,
  performedBy: string,
  drawerTarget: 'main' | 'bar'
): DrawerEntry {
  return {
    id: `drw-${Date.now()}`,
    type: 'sale',
    amount: grandTotal,
    reason,
    performedBy,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    drawerTarget,
  };
}

export function createCheckItemRecord(p: {
  checkNumber: string;
  orderType: 'dine_in' | 'takeout';
  tableOrRef: string;
  guestName: string;
  itemsCount: number;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: any;
  paymentChannel?: string;
  referenceNumber?: string;
  cashierName: string;
  itemsSummary: string;
  tendersSummary?: string;
}): CheckItem {
  return {
    id: `chk-${Date.now()}`,
    ...p,
    status: 'paid',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export function updateTableOnSettlement(
  tables: TableItem[],
  tableId: string,
  tabIndex: number
): TableItem[] {
  return tables.map((t) => {
    if (t.id !== tableId) return t;
    const remainingTabs = (t.tabs || []).filter((tab: CustomerTab) => tab.tabIndex !== tabIndex);
    const remainingActiveTabs = (t.activeTabs || []).filter((num: number) => num !== tabIndex);
    const remainingAmount = remainingTabs.reduce(
      (acc: number, cur: CustomerTab) => acc + (cur.totalAmount || 0),
      0
    );
    const isTableEmpty = remainingActiveTabs.length === 0 || remainingTabs.length === 0;
    const nextTableStatus = isTableEmpty
      ? 'empty'
      : deriveTableStatus(remainingActiveTabs.length > 0, remainingTabs);

    return {
      ...t,
      activeTabs: isTableEmpty ? [] : remainingActiveTabs,
      tabs: isTableEmpty ? [] : remainingTabs,
      status: isTableEmpty ? ('empty' as const) : nextTableStatus,
      hasOpenCheck: !isTableEmpty,
      totalAmount: isTableEmpty ? undefined : remainingAmount,
      guests: isTableEmpty ? 0 : Math.max(1, t.guests - 1),
      elapsedTime: isTableEmpty ? '0m' : t.elapsedTime,
    };
  });
}

export function updateTableGroupOnSettlement(tables: TableItem[], tableId: string): TableItem[] {
  return tables.map((t) => {
    if (t.id !== tableId) return t;
    return {
      ...t,
      status: 'empty' as const,
      guests: 0,
      hasOpenCheck: false,
      totalAmount: undefined,
      activeTabs: [],
      tabs: [],
      elapsedTime: '0m',
    };
  });
}

export function updateTakeoutOnSettlement(
  takeoutOrders: TakeoutOrder[],
  takeoutId: string,
  completeOrder: boolean,
  paymentMethod: any
): TakeoutOrder[] {
  return takeoutOrders.map((o) => {
    if (o.id !== takeoutId && o.tabId !== takeoutId) return o;
    return {
      ...o,
      isPrepaid: true,
      paymentMethod,
      status: completeOrder ? ('completed' as const) : o.status,
      items: completeOrder
        ? o.items.map((i) => (i.status === 'cancelled' ? i : { ...i, status: 'served' as const }))
        : o.items,
    };
  });
}
