import type { TableItem, DrawerEntry } from '../../../types/floor';
import { supabase } from '../../shared/infrastructure/supabase';
import { ordersApi } from '../data/orders.api';
import { tablesApi } from '../../table-service/data/tables.api';
import type { OrderStoreSet, OrderStoreGet, QueuedMutation } from '../domain/order.types';
import { mapHydratedTables, mapHydratedOffPremiseTabs } from './hydrationMappers';
import {
  loadDurableQueue,
  dequeueDurableMutation,
  recordMutationFailure,
  isItemReadyForRetry,
  markMutationInFlight,
  clearMutationInFlight,
  isMutationInFlight,
} from '../data/durableQueue';
import { saveAuthoritativeSnapshot } from '../data/venueSnapshot';
import { hasPendingTabWrite } from './tabWriteTracker';
import { getLatest6AmCutoff } from '../../admin/data/admin.api';

export const createHydrationSlice = (set: OrderStoreSet, get: OrderStoreGet) => {
  let activeDrainPromise: Promise<void> | null = null;

  return {
    hydrateFromSupabase: async () => {
      try {
        let dbTables: any[] | null = null;
        let error: any = null;

        // First try hydrating with normalized order_item_variant_selections
        const fullRes = await supabase
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
            bill_number,
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
                  event_id,
                  variant_id,
                  temperature,
                  size_label,
                  quantity,
                  unit_price,
                  status,
                  station_target,
                  modifiers,
                  notes,
                  created_at,
                  preparing_at,
                  ready_at,
                  delivered_at,
                  state_changed_at,
                  order_item_variant_selections (
                    group_id,
                    option_id,
                    group_name_snapshot,
                    option_name_snapshot,
                    price_delta_snapshot
                  ),
                  products (
                    name,
                    base_price,
                    station_target,
                    image_url,
                    categories (
                      slug
                    )
                  )
                )
            )
          )
        `
          )
          .order('table_number', { ascending: true });

        if (fullRes.error && fullRes.error.message?.includes('order_item_variant_selections')) {
          // Fallback query without order_item_variant_selections if table is not yet in schema cache
          const fallbackRes = await supabase
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
              bill_number,
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
                  event_id,
                  variant_id,
                  temperature,
                  size_label,
                  quantity,
                  unit_price,
                  status,
                  station_target,
                  modifiers,
                  notes,
                  created_at,
                  preparing_at,
                  ready_at,
                  delivered_at,
                  state_changed_at,
                  products (
                    name,
                    base_price,
                    station_target,
                    image_url,
                    categories (
                      slug
                    )
                  )
                )
              )
            )
          `
            )
            .order('table_number', { ascending: true });
          dbTables = fallbackRes.data;
          error = fallbackRes.error;
        } else {
          dbTables = fullRes.data;
          error = fullRes.error;
        }

        if (error || !dbTables || dbTables.length === 0) {
          console.warn(
            'Hydration skipped / database empty, keeping baseline state:',
            error?.message
          );
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

        let nonDineInTabs: any[] | null = null;
        const fullNonDineIn = await (supabase.from as any)('tabs')
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
              event_id,
              variant_id,
              temperature,
              size_label,
              quantity,
              unit_price,
              status,
              station_target,
              modifiers,
              notes,
              created_at,
              preparing_at,
              ready_at,
              delivered_at,
              state_changed_at,
              order_item_variant_selections (
                group_id,
                option_id,
                group_name_snapshot,
                option_name_snapshot,
                price_delta_snapshot
              ),
              products (
                name,
                base_price,
                station_target,
                image_url,
                categories (
                  slug
                )
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

        if (
          fullNonDineIn.error &&
          fullNonDineIn.error.message?.includes('order_item_variant_selections')
        ) {
          const fallbackNonDineIn = await (supabase.from as any)('tabs')
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
                event_id,
                variant_id,
                temperature,
                size_label,
                quantity,
                unit_price,
                status,
                station_target,
                modifiers,
                notes,
                created_at,
                preparing_at,
                ready_at,
                delivered_at,
                state_changed_at,
                products (
                  name,
                  base_price,
                  station_target,
                  image_url,
                  categories (
                    slug
                  )
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
          nonDineInTabs = fallbackNonDineIn.data;
        } else {
          nonDineInTabs = fullNonDineIn.data;
        }

        const { dbTakeout, dbOnline } = mapHydratedOffPremiseTabs(
          nonDineInTabs || [],
          get().takeoutOrders,
          nowMs
        );

        // Preserve any in-flight optimistic local Takeout/Online orders not yet returned by DB
        const pendingLocalTakeout = get().takeoutOrders.filter(
          (lo) =>
            lo.status !== 'completed' &&
            !dbTakeout.some((dbo) => dbo.id === lo.id || dbo.tabId === lo.id) &&
            (hasPendingTabWrite(lo.id) ||
              (lo.id.startsWith('to-') &&
                nowMs - new Date(lo.createdAt || nowMs).getTime() < 15000))
        );
        const pendingLocalOnline = get().onlineOrders.filter(
          (lo) =>
            lo.status !== 'completed' &&
            !dbOnline.some(
              (dbo) =>
                dbo.id === lo.id ||
                dbo.tabId === lo.id ||
                dbo.platformOrderRef === lo.platformOrderRef
            ) &&
            (hasPendingTabWrite(lo.id) ||
              (lo.id.startsWith('od-') &&
                nowMs - new Date(lo.createdAt || nowMs).getTime() < 15000))
        );

        // Fetch active cash drawer transactions scoped to the active shift / business day
        let mappedDrawer: DrawerEntry[] = [];
        let drawerQuerySucceeded = false;
        try {
          const businessCutoffIso = getLatest6AmCutoff().toISOString();
          const { data: latestZ } = await supabase
            .from('pos_z_readings')
            .select('closed_at')
            .eq('drawer_target', 'consolidated')
            .order('closed_at', { ascending: false })
            .limit(1);

          const zClosedAt = latestZ?.[0]?.closed_at;
          const useStrictAfter = Boolean(zClosedAt);
          const sinceIso = zClosedAt || businessCutoffIso;

          let drawerQuery = supabase
            .from('cash_drawer_transactions')
            .select(
              'id, action_type, amount, reason, performed_by_id, drawer_target, created_at, users:performed_by_id(display_name)'
            );
          drawerQuery = useStrictAfter
            ? drawerQuery.gt('created_at', sinceIso)
            : drawerQuery.gte('created_at', sinceIso);

          const { data: dbDrawer, error: drawerError } = await drawerQuery
            .order('created_at', { ascending: false })
            .limit(200);

          if (!drawerError && Array.isArray(dbDrawer)) {
            drawerQuerySucceeded = true;
            mappedDrawer = dbDrawer
              .filter(
                (d: any) =>
                  !(
                    d.action_type === 'DROP' &&
                    String(d.reason || '')
                      .toLowerCase()
                      .includes('variance')
                  )
              )
              .map((d: any) => ({
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

        const nextTakeout = [...pendingLocalTakeout, ...dbTakeout];
        const nextOnline = [...pendingLocalOnline, ...dbOnline];
        const recentOptimisticDrawer = drawerQuerySucceeded
          ? get().drawerEntries.filter((entry) => {
              if (!entry.id.startsWith('drw-')) return false;
              const ts = Number(entry.id.slice(4));
              if (!Number.isFinite(ts) || nowMs - ts >= 10000) return false;
              return !mappedDrawer.some(
                (m) =>
                  m.type === entry.type &&
                  Math.abs(m.amount - entry.amount) < 0.01 &&
                  m.reason === entry.reason
              );
            })
          : [];
        const nextDrawer = drawerQuerySucceeded
          ? [...recentOptimisticDrawer, ...mappedDrawer]
          : get().drawerEntries;

        // Persist authoritative venue snapshot to durable storage on successful hydration
        saveAuthoritativeSnapshot({
          tables: mappedTables,
          takeoutOrders: nextTakeout,
          onlineOrders: nextOnline,
          drawerEntries: nextDrawer,
        });

        set({
          tables: mappedTables,
          takeoutOrders: nextTakeout,
          onlineOrders: nextOnline,
          drawerEntries: nextDrawer,
          isHydrated: true,
          offlineQueue: loadDurableQueue(),
        });
      } catch (err) {
        console.warn('hydrateFromSupabase error:', err);
      }
    },

    drainOfflineQueue: async () => {
      if (activeDrainPromise) {
        return activeDrainPromise;
      }

      activeDrainPromise = (async () => {
        const queue = loadDurableQueue();
        if (queue.length === 0) {
          if (get().offlineQueue.length > 0) {
            set({ offlineQueue: [] });
          }
          return;
        }

        const now = Date.now();

        for (const item of queue) {
          // Never duplicate an in-flight primary dispatch or concurrent retry
          if (isMutationInFlight(item.id)) {
            continue;
          }

          // Respect exponential backoff cool-down
          if (!isItemReadyForRetry(item, now)) {
            continue;
          }

          markMutationInFlight(item.id);
          try {
            if (item.type === 'create_order') {
              const payload = item.payload || {};

              // Reconstruct/heal missing fields for legacy or sparse mutations
              const currentTables = get().tables;
              const currentTable = currentTables.find(
                (t) => t.id === payload.tableId || t.code === payload.tableId
              );
              const currentTab = currentTable?.tabs?.find((tb) =>
                payload.tabIndex ? tb.tabIndex === payload.tabIndex : true
              );

              const resolvedTabId =
                payload.tabId ||
                currentTab?.id ||
                (payload.tableId ? `tab-${payload.tableId}-${payload.tabIndex || 1}` : undefined);
              const resolvedCustomerName =
                payload.customerName ||
                currentTab?.guestName ||
                (payload.tabIndex ? `Guest ${payload.tabIndex}` : 'Guest');
              const resolvedRound = payload.roundNumber || 1;
              const resolvedOrderNumber =
                payload.orderNumber ||
                `#${currentTable?.code || 'T'}-${payload.tabIndex || 1}-R${resolvedRound}-${item.id.slice(-4)}`;

              const resolvedItems = (payload.items || []).map((i: any, idx: number) => ({
                id: i.id || `item-${item.id}-${idx}`,
                productId: i.productId || i.id,
                productName: i.productName,
                quantity: Number(i.quantity) || 1,
                unitPrice: Number(i.unitPrice) || 0,
                stationTarget: i.stationTarget || 'bar',
                status: i.status || 'pending',
                categorySlug: i.categorySlug,
                eventId: i.eventId,
                variantId: i.variantId,
                temperature: i.temperature,
                sizeLabel: i.sizeLabel,
                modifiers: i.modifiers,
                notes: i.notes,
                variantSelections: i.variantSelections,
              }));

              const orderPayload = {
                ...payload,
                tabId: resolvedTabId,
                tableId: payload.tableId,
                customerName: resolvedCustomerName,
                orderNumber: resolvedOrderNumber,
                orderType: payload.orderType || 'DINE_IN',
                roundNumber: resolvedRound,
                items: resolvedItems,
                externalOrderRef: payload.externalOrderRef || item.id,
              };

              await ordersApi.createOrderWithItems(orderPayload);
            } else if (item.type === 'transfer_table') {
              await tablesApi.transferTableTab(item.payload);
            } else if (item.type === 'settle_tab') {
              await tablesApi.settleTabAndRecordPayment(item.payload);
            } else if (item.type === 'update_status') {
              await ordersApi.updateOrderItemStatus(item.payload.itemId, item.payload.status);
            }

            // Successfully drained: atomically remove from durable storage and update store state
            const remaining = dequeueDurableMutation(item.id);
            set({ offlineQueue: remaining });
          } catch (err: any) {
            console.warn(`drainOfflineQueue item [${item.id}] execution failed:`, err);
            const isConstraintViolation = err?.code === '23502' || err?.code === '23503';
            const retryCount = item.retryCount || 0;
            if (isConstraintViolation && retryCount >= 3) {
              console.error(
                `drainOfflineQueue dropping permanently unrecoverable mutation [${item.id}]:`,
                err?.message
              );
              const remaining = dequeueDurableMutation(item.id);
              set({ offlineQueue: remaining });
            } else {
              const remaining = recordMutationFailure(
                item.id,
                err?.message || 'Network / execution error',
                Date.now()
              );
              set({ offlineQueue: remaining });
            }
          } finally {
            clearMutationInFlight(item.id);
          }
        }
      })();

      try {
        await activeDrainPromise;
      } finally {
        activeDrainPromise = null;
      }
    },
  };
};
