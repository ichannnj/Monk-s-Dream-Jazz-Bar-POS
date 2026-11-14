import type { TableItem } from '../../../types/floor';
import type { TableTransferPayload } from '../../shared/infrastructure/realtime';

export const applyTableTransferToLocalTables = (
  tables: TableItem[],
  payload: TableTransferPayload
): TableItem[] => {
  const originTbl = tables.find(
    (t) => t.id === payload.originTableId || t.code === payload.originTableCode
  );
  const targetTbl = tables.find(
    (t) => t.id === payload.targetTableId || t.code === payload.targetTableCode
  );

  if (!originTbl || !targetTbl || (originTbl.tabs || []).length === 0) {
    return tables;
  }

  const tabsToMove =
    payload.mode === 'tab' && payload.tabIndex
      ? (originTbl.tabs || []).filter((tb) => tb.tabIndex === payload.tabIndex)
      : originTbl.tabs || [];

  if (tabsToMove.length === 0) {
    return tables;
  }

  const nowTime = new Date(payload.timestamp || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const adjustedTabs = tabsToMove.map((tb) => ({
    ...tb,
    transferredFrom: {
      tableCode: originTbl.code,
      transferredAt: nowTime,
    },
  }));

  const remainingOriginTabs = (originTbl.tabs || []).filter(
    (tb) => !tabsToMove.some((mt) => mt.id === tb.id)
  );

  return tables.map((t) => {
    if (t.id === originTbl.id || t.code === originTbl.code) {
      const isEmptyNow = remainingOriginTabs.length === 0;
      return {
        ...t,
        status: isEmptyNow ? ('empty' as const) : t.status,
        guests: isEmptyNow ? 0 : t.guests,
        hasOpenCheck: !isEmptyNow,
        activeTabs: remainingOriginTabs.map((tb) => tb.tabIndex),
        tabs: remainingOriginTabs,
        elapsedTime: isEmptyNow ? '0m' : t.elapsedTime,
      };
    }
    if (t.id === targetTbl.id || t.code === targetTbl.code) {
      return {
        ...t,
        status: 'occupied' as const,
        hasOpenCheck: true,
        tabs: [...(t.tabs || []), ...adjustedTabs],
        activeTabs: [...t.activeTabs, ...adjustedTabs.map((tb) => tb.tabIndex)],
      };
    }
    return t;
  });
};
