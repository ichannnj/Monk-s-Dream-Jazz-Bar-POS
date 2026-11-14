import type { CustomerTab, OrderLineItem } from '../../../types/floor';
import type { OrderStoreSet } from '../../orders/domain/order.types';
import { tablesApi } from '../data/tables.api';
import { deriveTabTotal } from '../../orders/application/order.helpers';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { useVenueStore } from '../../shared/stores/useVenueStore';

export const transferOrderItemsToTabAction = async (
  set: OrderStoreSet,
  tableId: string,
  sourceTabIndex: number,
  targetTabIndex: number | 'new',
  itemTransfers: Array<{ orderItemId: string; quantity: number }>,
  newTabName?: string
) => {
  let sourceTabUuid: string | undefined;
  let targetTabUuid: string | undefined;
  let targetTabIndexCaptured: number | undefined;
  const currentStaffId = useAuthStore.getState().currentUser?.id;

  set((state) => {
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) return state;

    const sourceTab = table.tabs?.find((t) => t.tabIndex === sourceTabIndex);
    if (!sourceTab) return state;
    sourceTabUuid = sourceTab.id;

    let effectiveTargetTabIndex: number;
    let targetTab: CustomerTab | undefined;
    const nextTabs = [...(table.tabs || [])];

    if (targetTabIndex === 'new') {
      const existingIndices = [...(table.activeTabs || []), ...nextTabs.map((tb) => tb.tabIndex)];
      effectiveTargetTabIndex = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 1;
      const finalName = newTabName?.trim() || `Senior Tab #${effectiveTargetTabIndex}`;
      const newLocalTab: CustomerTab = {
        id: `tab-${tableId}-${effectiveTargetTabIndex}`,
        tabIndex: effectiveTargetTabIndex,
        guestName: finalName,
        status: 'open',
        totalAmount: 0,
        items: [],
        openedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        openedAtIso: new Date().toISOString(),
        operatingMode: useVenueStore.getState().operatingMode,
      };
      nextTabs.push(newLocalTab);
      targetTab = newLocalTab;
    } else {
      effectiveTargetTabIndex = targetTabIndex;
      targetTab = nextTabs.find((t) => t.tabIndex === effectiveTargetTabIndex);
    }

    if (!targetTab) return state;
    targetTabUuid = targetTab.id;
    targetTabIndexCaptured = effectiveTargetTabIndex;

    const transferMap = new Map<string, number>();
    itemTransfers.forEach((it) => {
      transferMap.set(it.orderItemId, it.quantity);
    });

    const updatedSourceItems: OrderLineItem[] = [];
    const transferredItemsToAdd: OrderLineItem[] = [];

    sourceTab.items.forEach((item) => {
      const qtyToMove = transferMap.get(item.id) || 0;
      if (qtyToMove <= 0) {
        updatedSourceItems.push(item);
      } else if (qtyToMove >= item.quantity) {
        transferredItemsToAdd.push(item);
      } else {
        const remainingQty = item.quantity - qtyToMove;
        updatedSourceItems.push({
          ...item,
          quantity: remainingQty,
        });
        transferredItemsToAdd.push({
          ...item,
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          quantity: qtyToMove,
        });
      }
    });

    const updatedTabs = nextTabs.map((tb) => {
      if (tb.tabIndex === sourceTabIndex) {
        const newTotal = deriveTabTotal({ ...tb, items: updatedSourceItems });
        return {
          ...tb,
          items: updatedSourceItems,
          totalAmount: newTotal,
        };
      }
      if (tb.tabIndex === effectiveTargetTabIndex) {
        const mergedItems = [...(tb.items || []), ...transferredItemsToAdd];
        const newTotal = deriveTabTotal({ ...tb, items: mergedItems });
        return {
          ...tb,
          items: mergedItems,
          totalAmount: newTotal,
        };
      }
      return tb;
    });

    const nextActiveTabs = Array.from(
      new Set([...(table.activeTabs || []), effectiveTargetTabIndex])
    );

    const updatedTables = state.tables.map((t) => {
      if (t.id !== tableId) return t;
      return {
        ...t,
        tabs: updatedTabs,
        activeTabs: nextActiveTabs,
      };
    });

    return { tables: updatedTables };
  });

  if (sourceTabUuid) {
    try {
      const res = await tablesApi.transferOrderItemsToTab({
        sourceTabId: sourceTabUuid,
        targetTabId: targetTabUuid && !targetTabUuid.startsWith('tab-') ? targetTabUuid : undefined,
        tableId,
        newTabName,
        itemTransfers,
        staffId: currentStaffId,
      });

      const returnedTargetTabId = (res as any)?.target_tab_id || (res as any)?.targetTabId;
      if (returnedTargetTabId && targetTabIndexCaptured !== undefined) {
        set((state) => ({
          tables: state.tables.map((t) => {
            if (t.id !== tableId) return t;
            return {
              ...t,
              tabs: (t.tabs || []).map((tb) =>
                tb.tabIndex === targetTabIndexCaptured ? { ...tb, id: returnedTargetTabId } : tb
              ),
            };
          }),
        }));
      }
    } catch (err) {
      console.warn('Background transferOrderItemsToTab notice:', err);
    }
  }
};
