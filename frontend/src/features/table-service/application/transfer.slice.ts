import { CustomerTab, FloorAlert } from '../../../types/floor';
import { tablesApi } from '../data/tables.api';
import { deriveTableStatus } from '../../orders/application/order.helpers';
import { OrderStoreSet, OrderStoreGet } from '../../orders/domain/order.types';

export const createTransferSlice = (set: OrderStoreSet, get: OrderStoreGet) => ({
  transferTableOrTab: (
    originId: string,
    targetId: string,
    mode: 'entire' | 'tab',
    tabIndex?: number,
    reason?: string
  ) => {
    // 1. Capture origin, target, and tab references BEFORE state mutation for async RPC
    const initialOriginTable = get().tables.find((t) => t.id === originId);
    const initialTargetTable = get().tables.find((t) => t.id === targetId);
    const initialTabToMove =
      initialOriginTable?.tabs?.find((t) => t.tabIndex === tabIndex) ||
      initialOriginTable?.tabs?.[0];
    const isTabUuid = Boolean(
      initialTabToMove?.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(initialTabToMove.id)
    );
    const tabUuidForRpc = isTabUuid ? initialTabToMove?.id : undefined;

    set((state) => {
      const origin = state.tables.find((t) => t.id === originId);
      const target = state.tables.find((t) => t.id === targetId);
      if (!origin || !target) return state;

      // Ensure origin has populated tabs array
      const originTabs =
        origin.tabs && origin.tabs.length > 0
          ? origin.tabs
          : origin.activeTabs.map((num) => ({
              id: `tab-${origin.id}-${num}`,
              tabIndex: num,
              guestName: `Guest ${num}`,
              status: 'open' as const,
              totalAmount: (origin.totalAmount || 0) / (origin.activeTabs.length || 1),
              items: [],
            }));

      if (mode === 'entire') {
        const targetWasEmpty = target.status === 'empty';
        const targetExistingTabs = targetWasEmpty ? [] : target.tabs || [];
        const targetExistingMax =
          targetExistingTabs.length > 0
            ? Math.max(...targetExistingTabs.map((t) => t.tabIndex))
            : 0;

        const reindexedTransferredTabs = originTabs.map((t, idx) => {
          const newTabIndex = targetExistingMax + idx + 1;
          const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            t.id
          );
          return {
            ...t,
            id: isRealUuid ? t.id : `tab-${target.id}-${newTabIndex}`,
            tabIndex: newTabIndex,
            transferredFrom: {
              tableCode: origin.code,
              transferredAt: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
            items: (t.items || []).map((item) => ({
              ...item,
              tabIndex: newTabIndex,
            })),
          };
        });

        const combinedTabs = [...targetExistingTabs, ...reindexedTransferredTabs];
        const combinedActiveTabs = combinedTabs.map((t) => t.tabIndex);
        const combinedAmount = combinedTabs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
        const nextTargetStatus = deriveTableStatus(combinedActiveTabs.length > 0, combinedTabs);

        const updatedTables = state.tables.map((t) => {
          if (t.id === originId) {
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
          }
          if (t.id === targetId) {
            return {
              ...t,
              status: nextTargetStatus,
              guests: targetWasEmpty ? origin.guests : target.guests + origin.guests,
              hasOpenCheck: true,
              totalAmount: combinedAmount,
              activeTabs: combinedActiveTabs,
              maxTabs: Math.max(
                target.maxTabs || 1,
                combinedActiveTabs.length,
                ...combinedActiveTabs,
                99
              ),
              tabs: combinedTabs,
              assignedStaff: target.assignedStaff || origin.assignedStaff,
              elapsedTime: targetWasEmpty ? origin.elapsedTime : target.elapsedTime,
            };
          }
          return t;
        });

        const newAlert: FloorAlert = {
          id: `alt-${Date.now()}`,
          title: `🔁 Table Transferred: ${origin.code} ➔ ${target.code}`,
          description: `All open tabs re-routed to Table ${target.code}. Reason: ${
            reason || 'Party relocation'
          }`,
          type: 'transfer',
          time: 'Just now',
          isRead: false,
          targetRef: target.code,
        };

        return {
          tables: updatedTables,
          alerts: [newAlert, ...state.alerts],
        };
      } else {
        // Specific Tab Transfer
        const effectiveTabIndex = tabIndex ?? originTabs[0]?.tabIndex ?? 1;
        const tabToMove = originTabs.find((t) => t.tabIndex === effectiveTabIndex) || originTabs[0];

        if (!tabToMove) return state;

        const remainingOriginTabs = originTabs.filter(
          (t) => t.tabIndex !== effectiveTabIndex && t.id !== tabToMove.id
        );
        const remainingOriginActiveTabs = remainingOriginTabs.map((t) => t.tabIndex);
        const remainingOriginAmount = remainingOriginTabs.reduce(
          (acc, cur) => acc + (cur.totalAmount || 0),
          0
        );
        const nextOriginStatus = deriveTableStatus(
          remainingOriginActiveTabs.length > 0,
          remainingOriginTabs
        );

        const targetWasEmpty = target.status === 'empty';
        const targetExistingTabs = targetWasEmpty ? [] : target.tabs || [];
        const nextTargetTabIndex =
          targetExistingTabs.length > 0
            ? Math.max(...targetExistingTabs.map((t) => t.tabIndex)) + 1
            : 1;

        const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          tabToMove.id
        );
        const movedTabAdjusted: CustomerTab = {
          ...tabToMove,
          id: isRealUuid ? tabToMove.id : `tab-${target.id}-${nextTargetTabIndex}`,
          tabIndex: nextTargetTabIndex,
          transferredFrom: {
            tableCode: origin.code,
            transferredAt: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
          items: (tabToMove.items || []).map((item) => ({
            ...item,
            tabIndex: nextTargetTabIndex,
          })),
        };

        const nextTargetTabs = [...targetExistingTabs, movedTabAdjusted];
        const nextTargetActiveTabs = nextTargetTabs.map((t) => t.tabIndex);
        const nextTargetAmount = nextTargetTabs.reduce(
          (acc, cur) => acc + (cur.totalAmount || 0),
          0
        );
        const nextTargetStatus = deriveTableStatus(nextTargetActiveTabs.length > 0, nextTargetTabs);

        const updatedTables = state.tables.map((t) => {
          if (t.id === originId) {
            const isEmptyNow =
              remainingOriginTabs.length === 0 || remainingOriginActiveTabs.length === 0;
            return {
              ...t,
              status: isEmptyNow ? ('empty' as const) : nextOriginStatus,
              guests: isEmptyNow ? 0 : Math.max(1, t.guests - 1),
              hasOpenCheck: !isEmptyNow,
              totalAmount: isEmptyNow ? undefined : remainingOriginAmount,
              activeTabs: isEmptyNow ? [] : remainingOriginActiveTabs,
              tabs: isEmptyNow ? [] : remainingOriginTabs,
              elapsedTime: isEmptyNow ? '0m' : t.elapsedTime,
            };
          }
          if (t.id === targetId) {
            return {
              ...t,
              status: nextTargetStatus,
              guests: targetWasEmpty ? 1 : target.guests + 1,
              hasOpenCheck: true,
              totalAmount: nextTargetAmount,
              activeTabs: nextTargetActiveTabs,
              maxTabs: Math.max(
                target.maxTabs || 1,
                nextTargetTabIndex,
                nextTargetActiveTabs.length,
                99
              ),
              tabs: nextTargetTabs,
              assignedStaff: target.assignedStaff || origin.assignedStaff,
              elapsedTime: targetWasEmpty ? '1m' : target.elapsedTime,
            };
          }
          return t;
        });

        const newAlert: FloorAlert = {
          id: `alt-${Date.now()}`,
          title: `🔁 Tab Moved: "${tabToMove.guestName}" (${origin.code} ➔ ${target.code})`,
          description: `Guest tab transferred. Station tickets re-routed. Reason: ${
            reason || 'Guest relocation request'
          }`,
          type: 'transfer',
          time: 'Just now',
          isRead: false,
          targetRef: target.code,
        };

        return {
          tables: updatedTables,
          alerts: [newAlert, ...state.alerts],
        };
      }
    });

    // Background asynchronous Supabase RPC execution
    tablesApi
      .transferTableTab({
        originTableId: originId,
        targetTableId: targetId,
        tabId: mode === 'entire' ? undefined : tabUuidForRpc,
        originTableCode: initialOriginTable?.code,
        targetTableCode: initialTargetTable?.code,
        staffId: '00000000-0000-0000-0000-000000000001',
        reason: reason || 'Guest relocation request',
      })
      .catch((err) => {
        console.warn('Background transferTableTab offline notice:', err);
      });
  },
});
