import { CustomerTab, TakeoutOrder, TableItem } from '@/types/floor';
import { PricingLineItem } from '../../../utils/taxAndDiscountCalculator';

export function extractRawOrderItems(
  isTakeout: boolean,
  takeoutOrder?: TakeoutOrder | null,
  settlementMode?: 'single_tab' | 'entire_table',
  activeTab?: CustomerTab | null,
  table?: TableItem | null
) {
  if (isTakeout && takeoutOrder) {
    return (takeoutOrder.items || []).map((i) => ({
      id: i.id,
      productName: i.productName,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      stationTarget: (i.stationTarget as 'bar' | 'kitchen') || 'bar',
      modifiers: i.modifiers,
      notes: i.notes,
    }));
  }
  if (settlementMode === 'single_tab' && activeTab) {
    return (activeTab.items || [])
      .filter((i) => i.status !== 'cancelled')
      .map((i) => ({
        id: i.id,
        productName: i.productName,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        stationTarget: (i.stationTarget as 'bar' | 'kitchen') || 'bar',
        modifiers: i.modifiers,
        notes: i.notes,
      }));
  }
  if (table?.tabs) {
    return table.tabs
      .flatMap((t) => t.items || [])
      .filter((i) => i.status !== 'cancelled')
      .map((i) => ({
        id: i.id,
        productName: i.productName,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        stationTarget: (i.stationTarget as 'bar' | 'kitchen') || 'bar',
        modifiers: i.modifiers,
        notes: i.notes,
      }));
  }
  return [];
}

export function computePricingLineItems(
  rawItems: any[],
  isSeniorOrPwd: boolean,
  seniorItemSelectionMode: 'all' | 'select',
  selectedSeniorItemIds: Set<string>
): PricingLineItem[] {
  return rawItems.map((item) => {
    const isItemSenior =
      isSeniorOrPwd && (seniorItemSelectionMode === 'all' || selectedSeniorItemIds.has(item.id));
    return {
      id: item.id,
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      stationTarget: item.stationTarget || 'bar',
      isSeniorDiscounted: isItemSenior,
    };
  });
}
