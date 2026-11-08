import { CustomerTab } from '../../../types/floor';
import { supabase } from '../../shared/infrastructure/supabase';
import { realtimeGateway } from '../../shared/infrastructure/realtime';
import { resolveTableUuid } from '../../floor/data/resolver';
import { deriveTableStatus } from '../../orders/application/order.helpers';
import { OrderStoreSet } from '../../orders/domain/order.types';

export const closeEmptyTabAction = (set: OrderStoreSet, tableId: string, tabIndex: number) => {
  let targetTabRef: CustomerTab | undefined;
  let isTableEmptyResult = false;

  set((state) => {
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) return state;

    targetTabRef = (table.tabs || []).find((t) => t.tabIndex === tabIndex);
    const remainingTabs = (table.tabs || []).filter((t) => t.tabIndex !== tabIndex);
    const remainingActiveTabs = (table.activeTabs || []).filter((num) => num !== tabIndex);
    const remainingAmount = remainingTabs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
    const isTableEmpty = remainingActiveTabs.length === 0 || remainingTabs.length === 0;
    isTableEmptyResult = isTableEmpty;
    const nextTableStatus = isTableEmpty ? 'empty' : deriveTableStatus(true, remainingTabs);

    const updatedTables = state.tables.map((t) => {
      if (t.id !== tableId) return t;

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

    return { tables: updatedTables };
  });

  (async () => {
    try {
      const validTableId = await resolveTableUuid(tableId);
      const isUuid =
        targetTabRef?.id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetTabRef.id);

      if (isUuid && targetTabRef) {
        await supabase
          .from('tabs')
          .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
          .eq('id', targetTabRef.id);
      } else if (validTableId) {
        const { data: openTabs } = await supabase
          .from('tabs')
          .select('id')
          .eq('table_id', validTableId)
          .eq('status', 'OPEN')
          .limit(1);
        if (openTabs && openTabs.length > 0) {
          await supabase
            .from('tabs')
            .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
            .eq('id', openTabs[0].id);
        }
      }

      if (isTableEmptyResult && validTableId) {
        await supabase
          .from('tables')
          .update({ is_occupied: false, updated_at: new Date().toISOString() })
          .eq('id', validTableId);
      }
      realtimeGateway.broadcastPosSync('tab_closed');
    } catch (err) {
      console.warn('[closeEmptyTab] Background database close notice:', err);
    }
  })();
};
