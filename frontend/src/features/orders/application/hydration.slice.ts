import { TableItem, DrawerEntry } from '../../../types/floor';
import { supabase } from '../../shared/infrastructure/supabase';
import { ordersApi } from '../data/orders.api';
import { tablesApi } from '../../table-service/data/tables.api';
import { OrderStoreSet, OrderStoreGet, QueuedMutation } from '../domain/order.types';
import { mapHydratedTables, mapHydratedOffPremiseTabs } from './hydrationMappers';

export const createHydrationSlice = (set: OrderStoreSet, get: OrderStoreGet) => ({
  hydrateFromSupabase: async () => {
    try {
      const { data: dbTables, error } = await supabase
        .from('tables')
        .select(
          `
          id,
          table_number,
          zone,
          capacity,
          is_occupied,
          tabs (
            id,
            customer_name,
            status,
            order_type,
            operating_mode,
            corkage_amount,
            has_corkage_fee,
            transferred_from_table_code,
            transferred_at,
            created_at,
            orders (
              id,
              order_number,
              round_number,
              status,
              created_at,
              order_items (
                id,
                product_id,
                quantity,
                unit_price,
                status,
                station_target,
                modifiers,
                notes,
                created_at,
                products (
                  name,
                  base_price,
                  station_target,
                  image_url
                )
              )
            )
          )
        `
        )
        .order('table_number', { ascending: true });

      if (error || !dbTables || dbTables.length === 0) {
        console.warn('Hydration skipped / database empty, keeping baseline state:', error?.message);
        return;
      }

      const allOpenDbTabIds = new Set<string>();
      dbTables.forEach((dt: any) => {
        (dt.tabs || []).forEach((tb: any) => {
          if (tb.id) allOpenDbTabIds.add(tb.id);
        });
      });

      const nowMs = Date.now();
      const mappedTables: TableItem[] = mapHydratedTables(
        dbTables,
        get().tables,
        allOpenDbTabIds,
        nowMs
      );

      const { data: nonDineInTabs } = await (supabase.from as any)('tabs')
        .select(
          `
          *,
          orders (
            id,
            order_number,
            round_number,
            status,
            created_at,
            order_items (
              id,
              product_id,
              quantity,
              unit_price,
              status,
              station_target,
              modifiers,
              notes,
              created_at,
              products (
                name,
                base_price,
                station_target,
                image_url
              )
            )
          ),
          payments (
            id,
            payment_method
          )
        `
        )
        .in('order_type', ['TAKEOUT', 'ONLINE_DELIVERY'])
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false });

      const { dbTakeout, dbOnline } = mapHydratedOffPremiseTabs(
        nonDineInTabs,
        get().takeoutOrders,
        nowMs
      );

      // Preserve any in-flight optimistic local Takeout/Online orders (< 8s old) not yet in DB
      const pendingLocalTakeout = get().takeoutOrders.filter(
        (lo) =>
          lo.id.startsWith('to-') &&
          lo.status !== 'completed' &&
          !dbTakeout.some((dbo) => dbo.ticketNumber === lo.ticketNumber) &&
          nowMs - new Date(lo.createdAt || nowMs).getTime() < 8000
      );
      const pendingLocalOnline = get().onlineOrders.filter(
        (lo) =>
          lo.id.startsWith('od-') &&
          lo.status !== 'completed' &&
          !dbOnline.some((dbo) => dbo.platformOrderRef === lo.platformOrderRef) &&
          nowMs - new Date(lo.createdAt || nowMs).getTime() < 8000
      );

      // Fetch active cash drawer transactions for today
      let mappedDrawer: DrawerEntry[] = [];
      try {
        const { data: dbDrawer } = await supabase
          .from('cash_drawer_transactions')
          .select(
            'id, action_type, amount, reason, performed_by_id, drawer_target, created_at, users:performed_by_id(display_name)'
          )
          .order('created_at', { ascending: false })
          .limit(100);

        if (dbDrawer && dbDrawer.length > 0) {
          mappedDrawer = dbDrawer.map((d: any) => ({
            id: d.id,
            type: (d.action_type || 'sale').toLowerCase() as any,
            amount: parseFloat(d.amount) || 0,
            reason: d.reason || 'Cash movement',
            performedBy: d.users?.display_name || 'Staff',
            timestamp: new Date(d.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            drawerTarget: (d.drawer_target || 'main') as 'main' | 'bar',
          }));
        }
      } catch (drawerErr) {
        console.warn('Hydration cash drawer notice:', drawerErr);
      }

      set({
        tables: mappedTables,
        takeoutOrders: [...pendingLocalTakeout, ...dbTakeout],
        onlineOrders: [...pendingLocalOnline, ...dbOnline],
        drawerEntries: mappedDrawer.length > 0 ? mappedDrawer : get().drawerEntries,
        isHydrated: true,
      });
    } catch (err) {
      console.warn('hydrateFromSupabase error:', err);
    }
  },

  drainOfflineQueue: async () => {
    const queue = get().offlineQueue;
    if (queue.length === 0) return;

    const remainingQueue: QueuedMutation[] = [];

    for (const item of queue) {
      try {
        if (item.type === 'create_order') {
          await ordersApi.createOrderWithItems(item.payload);
        } else if (item.type === 'transfer_table') {
          await tablesApi.transferTableTab(item.payload);
        } else if (item.type === 'settle_tab') {
          await tablesApi.settleTabAndRecordPayment(item.payload);
        } else if (item.type === 'update_status') {
          await ordersApi.updateOrderItemStatus(item.payload.itemId, item.payload.status);
        }
      } catch {
        remainingQueue.push(item);
      }
    }

    set({ offlineQueue: remainingQueue });
  },
});
