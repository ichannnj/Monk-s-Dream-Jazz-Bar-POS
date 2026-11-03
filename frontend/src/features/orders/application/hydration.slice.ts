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
import { getElapsedSeconds, formatElapsedTimer } from '../../shared/utils/elapsedTime';
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

      // Index all open DB tab IDs to prevent ghost retention on origin tables when tabs transfer
      const allOpenDbTabIds = new Set<string>();
      dbTables.forEach((dt: any) => {
        (dt.tabs || []).forEach((tb: any) => {
          if (tb.id) allOpenDbTabIds.add(tb.id);
        });
      });

      const nowMs = Date.now();

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
              createdAt: oi.created_at || o.created_at || tb.created_at,
            }))
          );

          const activeItems = lineItems.filter((i) => i.status !== 'cancelled');
          const itemsSum = activeItems.reduce((acc, cur) => acc + cur.unitPrice * cur.quantity, 0);
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
            operatingMode: tb.operating_mode || 'CAFE',
            openedAtIso: tb.created_at || undefined,
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
            !allOpenDbTabIds.has(lt.id) &&
            lt.id.startsWith('tab-')
        );
        const combinedTabs = [...customerTabs, ...pendingLocalTabs];
        const activeTabsIndices = combinedTabs.map((tb, idx) => tb.tabIndex || idx + 1);

        const totalTableAmount = combinedTabs.reduce((acc, cur) => acc + cur.totalAmount, 0);
        const hasActiveTabs = combinedTabs.length > 0;

        const tableStatus = deriveTableStatus(hasActiveTabs, combinedTabs);
        const isBar = dbt.zone === 'BAR_AREA' || dbt.table_number.toLowerCase().includes('bar');

        const earliestTabIso = combinedTabs
          .map((tb) => tb.openedAtIso)
          .filter(Boolean)
          .sort()[0];

        const liveElapsed =
          hasActiveTabs && earliestTabIso
            ? formatElapsedTimer(getElapsedSeconds(earliestTabIso, undefined, nowMs))
            : '00:00';

        return {
          id: dbt.id,
          code: dbt.table_number,
          area: isBar ? 'bar' : 'cafe',
          seats: dbt.capacity || 4,
          guests: hasActiveTabs ? Math.max(1, combinedTabs.length) : 0,
          status: tableStatus,
          elapsedTime: liveElapsed,
          occupiedSinceIso: hasActiveTabs ? earliestTabIso : undefined,
          hasOpenCheck: hasActiveTabs,
          activeTabs: activeTabsIndices,
          maxTabs: 99,
          isMyTable: false,
          tabs: combinedTabs,
          totalAmount: hasActiveTabs ? totalTableAmount : undefined,
        };
      });

      // Also fetch Takeout and Online Delivery tabs
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

      const dbTakeout: TakeoutOrder[] = [];
      const dbOnline: OnlineDeliveryOrder[] = [];

      (nonDineInTabs || []).forEach((t: any) => {
        const rawOrders = (t.orders || []).sort(
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
            createdAt: oi.created_at || o.created_at || t.created_at,
          }))
        );

        const activeItems = lineItems.filter((i) => i.status !== 'cancelled');
        const itemsTotal = activeItems.reduce((acc, cur) => acc + cur.unitPrice * cur.quantity, 0);
        const hasPayments = Array.isArray(t.payments) && t.payments.length > 0;
        const isPrepaidFlag = Boolean(t.is_prepaid || hasPayments);

        const allServed = activeItems.length > 0 && activeItems.every((i) => i.status === 'served');
        const allReadyOrServed =
          activeItems.length > 0 &&
          activeItems.every((i) => i.status === 'ready' || i.status === 'served');

        // Keep unpaid takeout visible as 'ready' until settled & collected
        const orderStatus =
          allServed && (t.order_type !== 'TAKEOUT' || isPrepaidFlag)
            ? 'completed'
            : allReadyOrServed
              ? 'ready'
              : 'preparing';

        if (orderStatus === 'completed') return;

        const createdAtIso = t.created_at || rawOrders[0]?.created_at || new Date().toISOString();
        const liveElapsed = formatElapsedTimer(getElapsedSeconds(createdAtIso, undefined, nowMs));

        if (t.order_type === 'TAKEOUT') {
          const localMatch = get().takeoutOrders.find((lo) => lo.id === t.id || lo.tabId === t.id);
          const ticketNum =
            t.ticket_number ||
            rawOrders[0]?.order_number?.split('-R')[0] ||
            localMatch?.ticketNumber ||
            'T-107';

          dbTakeout.push({
            id: t.id,
            tabId: t.id,
            ticketNumber: ticketNum,
            customerName: t.customer_name || 'Takeout Customer',
            items: lineItems,
            total: itemsTotal,
            status: orderStatus as any,
            elapsedTime: liveElapsed,
            createdAt: createdAtIso,
            isPrepaid:
              t.is_prepaid !== undefined && t.is_prepaid !== null
                ? Boolean(t.is_prepaid || hasPayments)
                : (localMatch?.isPrepaid ?? hasPayments),
            operatingMode: t.operating_mode || 'CAFE',
            notes: t.notes || localMatch?.notes || undefined,
          });
        } else if (t.order_type === 'ONLINE_DELIVERY') {
          const platform = t.order_channel === 'FOODPANDA' ? 'foodpanda' : 'grabfood';
          const ref =
            t.external_order_ref ||
            t.ticket_number ||
            rawOrders[0]?.order_number?.split('-R')[0] ||
            'ONL-101';

          dbOnline.push({
            id: t.id,
            tabId: t.id,
            platform,
            platformOrderRef: ref,
            riderName: t.rider_name || 'Assigned Driver',
            customerName: t.customer_name || 'Delivery Customer',
            items: lineItems,
            total: itemsTotal,
            status: orderStatus as any,
            elapsedTime: liveElapsed,
            createdAt: createdAtIso,
            operatingMode: t.operating_mode || 'CAFE',
            paymentStatus: platform === 'foodpanda' ? 'PAID_ONLINE_FOODPANDA' : 'PAID_ONLINE_GRAB',
          });
        }
      });

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

      set({
        tables: mappedTables,
        takeoutOrders: [...pendingLocalTakeout, ...dbTakeout],
        onlineOrders: [...pendingLocalOnline, ...dbOnline],
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
