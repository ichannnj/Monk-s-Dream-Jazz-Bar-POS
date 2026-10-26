import {
  TableItem,
  CustomerTab,
  TakeoutOrder,
  OnlineDeliveryOrder,
  OrderLineItem,
} from '../../../types/floor';
import { supabase } from '../../shared/infrastructure/supabase';
import { ordersApi } from '../data/orders.api';
import { tablesApi } from '../../table-service/data/tables.api';
import { deriveTableStatus } from './order.helpers';
import { OrderStoreSet, OrderStoreGet, QueuedMutation } from '../domain/order.types';

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
              order_items (
                id,
                product_id,
                quantity,
                unit_price,
                status,
                station_target,
                modifiers,
                notes,
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

      // Index all open DB tab IDs to prevent ghost retention on origin tables when tabs transfer
      const allOpenDbTabIds = new Set<string>();
      dbTables.forEach((dt: any) => {
        (dt.tabs || []).forEach((tb: any) => {
          if (tb.id) allOpenDbTabIds.add(tb.id);
        });
      });

      const mappedTables: TableItem[] = dbTables.map((dbt: any) => {
        const rawTabs = dbt.tabs || [];
        const openTabs = rawTabs
          .filter((tb: any) => tb.status === 'OPEN')
          .sort(
            (a: any, b: any) =>
              new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          );

        const customerTabs: CustomerTab[] = openTabs.map((tb: any, idx: number) => {
          const rawOrders = (tb.orders || []).sort(
            (a: any, b: any) => (a.round_number || 1) - (b.round_number || 1)
          );
          const lineItems: OrderLineItem[] = rawOrders.flatMap((o: any) =>
            (o.order_items || []).map((oi: any) => ({
              id: oi.id,
              productId: oi.product_id,
              productName: oi.products?.name || 'Menu Item',
              unitPrice: parseFloat(oi.unit_price) || 0,
              quantity: oi.quantity || 1,
              stationTarget: (oi.station_target || oi.products?.station_target || 'bar') as
                'bar' | 'kitchen',
              modifiers: Array.isArray(oi.modifiers) ? oi.modifiers : [],
              notes: oi.notes || undefined,
              status: (oi.status || 'PENDING').toLowerCase() as any,
              roundNumber: o.round_number || 1,
            }))
          );

          const itemsSum = lineItems.reduce((acc, cur) => acc + cur.unitPrice * cur.quantity, 0);
          const corkage = parseFloat(tb.corkage_amount) || 0;

          const localTabMatch = get()
            .tables.flatMap((t) => t.tabs || [])
            .find((lt) => lt.id === tb.id);

          const transferredFrom = tb.transferred_from_table_code
            ? {
                tableCode: tb.transferred_from_table_code,
                transferredAt: tb.transferred_at
                  ? new Date(tb.transferred_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : undefined,
              }
            : localTabMatch?.transferredFrom;

          return {
            id: tb.id,
            tabIndex: idx + 1,
            guestName: tb.customer_name || `Guest ${idx + 1}`,
            status: 'open',
            hasCorkageFee: tb.has_corkage_fee,
            corkageAmount: corkage,
            items: lineItems,
            totalAmount: itemsSum + corkage,
            transferredFrom,
            openedAt: tb.created_at
              ? new Date(tb.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Open',
          };
        });

        // Preserve only truly pending optimistic local tabs not yet written to DB or transferred
        const currentLocalTable = get().tables.find(
          (t) => t.id === dbt.id || t.code === dbt.table_number
        );
        const pendingLocalTabs = (currentLocalTable?.tabs || []).filter(
          (lt) =>
            lt.status === 'open' &&
            !customerTabs.some((ct) => ct.id === lt.id) &&
            !allOpenDbTabIds.has(lt.id)
        );
        const combinedTabs = [...customerTabs, ...pendingLocalTabs];
        const activeTabsIndices = combinedTabs.map((tb, idx) => tb.tabIndex || idx + 1);

        const totalTableAmount = combinedTabs.reduce((acc, cur) => acc + cur.totalAmount, 0);

        const tableStatus = deriveTableStatus(
          dbt.is_occupied || combinedTabs.length > 0,
          combinedTabs
        );

        const isBar = dbt.zone === 'BAR_AREA' || dbt.table_number.toLowerCase().includes('bar');

        return {
          id: dbt.id,
          code: dbt.table_number,
          area: isBar ? 'bar' : 'cafe',
          seats: dbt.capacity || 4,
          guests: dbt.is_occupied ? Math.max(1, combinedTabs.length) : 0,
          status: tableStatus,
          elapsedTime: dbt.is_occupied ? '10m' : '0m',
          hasOpenCheck: dbt.is_occupied || combinedTabs.length > 0,
          activeTabs: activeTabsIndices,
          maxTabs: 99,
          isMyTable: false,
          tabs: combinedTabs,
          totalAmount: dbt.is_occupied || combinedTabs.length > 0 ? totalTableAmount : undefined,
        };
      });

      // Also fetch Takeout and Online Delivery tabs
      const { data: nonDineInTabs } = await supabase
        .from('tabs')
        .select(
          `
          id,
          customer_name,
          status,
          order_type,
          order_channel,
          rider_name,
          external_order_ref,
          corkage_amount,
          has_corkage_fee,
          created_at,
          orders (
            id,
            order_number,
            round_number,
            status,
            order_items (
              id,
              product_id,
              quantity,
              unit_price,
              status,
              station_target,
              modifiers,
              notes,
              products (
                name,
                base_price,
                station_target,
                image_url
              )
            )
          )
        `
        )
        .in('order_type', ['TAKEOUT', 'ONLINE_DELIVERY']);

      const dbTakeout: TakeoutOrder[] = [];
      const dbOnline: OnlineDeliveryOrder[] = [];

      (nonDineInTabs || []).forEach((t: any) => {
        const rawOrders = t.orders || [];
        const lineItems: OrderLineItem[] = rawOrders.flatMap((o: any) =>
          (o.order_items || []).map((oi: any) => ({
            id: oi.id,
            productId: oi.product_id,
            productName: oi.products?.name || 'Menu Item',
            unitPrice: parseFloat(oi.unit_price) || 0,
            quantity: oi.quantity || 1,
            stationTarget: (oi.station_target || oi.products?.station_target || 'bar') as
              'bar' | 'kitchen',
            modifiers: Array.isArray(oi.modifiers) ? oi.modifiers : [],
            notes: oi.notes || undefined,
            status: (oi.status || 'PENDING').toLowerCase() as any,
            roundNumber: o.round_number || 1,
          }))
        );

        const itemsTotal = lineItems.reduce((acc, cur) => acc + cur.unitPrice * cur.quantity, 0);
        const orderStatus =
          lineItems.every((i) => i.status === 'ready' || i.status === 'served') &&
          lineItems.length > 0
            ? 'ready'
            : lineItems.every((i) => i.status === 'served') && lineItems.length > 0
              ? 'completed'
              : 'preparing';

        if (t.order_type === 'TAKEOUT') {
          dbTakeout.push({
            id: t.id,
            ticketNumber: t.orders?.[0]?.order_number || 'T-100',
            customerName: t.customer_name || 'Takeout Customer',
            items: lineItems,
            total: itemsTotal,
            status: orderStatus as any,
            elapsedTime: '5m',
            isPrepaid: true,
          });
        } else if (t.order_type === 'ONLINE_DELIVERY') {
          const platform = t.order_channel === 'FOODPANDA' ? 'foodpanda' : 'grabfood';
          dbOnline.push({
            id: t.id,
            platform,
            platformOrderRef: t.external_order_ref || t.orders?.[0]?.order_number || 'ONL-101',
            riderName: t.rider_name || 'Assigned Driver',
            customerName: t.customer_name || 'Delivery Customer',
            items: lineItems,
            total: itemsTotal,
            status: orderStatus as any,
            elapsedTime: '7m',
            paymentStatus: platform === 'foodpanda' ? 'PAID_ONLINE_FOODPANDA' : 'PAID_ONLINE_GRAB',
          });
        }
      });

      set({
        tables: mappedTables,
        takeoutOrders: dbTakeout,
        onlineOrders: dbOnline,
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
