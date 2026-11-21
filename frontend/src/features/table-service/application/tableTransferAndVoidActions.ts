import type { CustomerTab, OrderLineItem } from '../../../types/floor';
import type { OrderStoreSet } from '../../orders/domain/order.types';
import { tablesApi } from '../data/tables.api';
import { deriveTabTotal, deriveTableStatus } from '../../orders/application/order.helpers';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { useVenueStore } from '../../shared/stores/useVenueStore';
import { awaitPendingTabWrites, trackTabWrite } from '../../orders/application/tabWriteTracker';
import { ensureUuid } from '../../orders/data/durableQueue';
import { toast } from '../../shared/toast/useToastStore';

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
  const isNewTargetTab = targetTabIndex === 'new';
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

    if (isNewTargetTab) {
      const existingIndices = [...(table.activeTabs || []), ...nextTabs.map((tb) => tb.tabIndex)];
      effectiveTargetTabIndex = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 1;
      const finalName = newTabName?.trim() || `Senior Tab #${effectiveTargetTabIndex}`;
      const newLocalTab: CustomerTab = {
        id: ensureUuid(),
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
          id: ensureUuid(),
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
    const nextTableTotal = updatedTabs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
    const nextTableStatus = deriveTableStatus(nextActiveTabs.length > 0, updatedTabs);

    const updatedTables = state.tables.map((t) => {
      if (t.id !== tableId) return t;
      return {
        ...t,
        tabs: updatedTabs,
        activeTabs: nextActiveTabs,
        totalAmount: nextTableTotal,
        status: nextTableStatus,
      };
    });

    return { tables: updatedTables };
  });

  if (sourceTabUuid) {
    const transferPromise = (async () => {
      try {
        await awaitPendingTabWrites([sourceTabUuid, targetTabUuid, tableId]);
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validTransfers = itemTransfers.filter((it) => uuidRegex.test(it.orderItemId));
        if (validTransfers.length === 0) return;

        const res = await tablesApi.transferOrderItemsToTab({
          sourceTabId: sourceTabUuid,
          targetTabId:
            !isNewTargetTab && targetTabUuid && !targetTabUuid.startsWith('tab-')
              ? targetTabUuid
              : undefined,
          tableId,
          newTabName,
          itemTransfers: validTransfers,
          staffId: currentStaffId,
        });

        if (!res?.success) {
          toast.error('Failed to persist item split/transfer to database. Please refresh.');
          return;
        }

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
        toast.error('Item transfer failed to sync with server. Please check table tabs.');
      }
    })();

    trackTabWrite(
      [sourceTabUuid, targetTabUuid, tableId].filter((v): v is string => Boolean(v)),
      transferPromise
    );
    await transferPromise;
  }
};
