import { supabase } from '@/features/shared/infrastructure/supabase';
import type {
  SettledCheckItem,
  CheckFilterParams,
  CheckLineItem,
  CheckOrderType,
} from '../domain/check.types';

export const checksApi = {
  /**
   * Fetches settled checks directly from live PostgreSQL database
   * joining payments, tabs, tables, staff, and line items.
   */
  async fetchSettledChecks(filter: CheckFilterParams = {}): Promise<SettledCheckItem[]> {
    try {
      let paymentsQuery = (supabase.from as any)('payments')
        .select(
          `
          id,
          tab_id,
          staff_id,
          payment_method,
          amount,
          corkage_amount,
          discount_amount,
          tip_amount,
          notes,
          drawer_target,
          created_at,
          tabs:tab_id (
            id,
            customer_name,
            table_id,
            order_channel,
            operating_mode,
            corkage_amount,
            tables:table_id (table_number),
            opened_by:opened_by_id (name)
          ),
          users:staff_id (name)
        `
        )
        .order('created_at', { ascending: false });

      if (filter.startDate) {
        paymentsQuery = paymentsQuery.gte('created_at', filter.startDate);
      }
      if (filter.endDate) {
        paymentsQuery = paymentsQuery.lt('created_at', filter.endDate);
      }

      const { data: paymentsData, error: paymentsError } = await paymentsQuery;

      if (paymentsError) {
        console.error('[checksApi] Error fetching payments:', paymentsError);
        throw paymentsError;
      }

      if (!paymentsData || paymentsData.length === 0) {
        return [];
      }

      // Collect all tabIds to fetch order items in bulk
      const tabIds = Array.from(new Set(paymentsData.map((p: any) => p.tab_id).filter(Boolean)));

      // Fetch all orders & order items for these tabs
      const itemsByTab = new Map<string, CheckLineItem[]>();
      if (tabIds.length > 0) {
        try {
          const { data: ordersData, error: ordersError } = await (supabase.from as any)('orders')
            .select(
              `
              id,
              tab_id,
              order_items (
                id,
                product_id,
                quantity,
                unit_price,
                notes,
                products:product_id (name)
              )
            `
            )
            .in('tab_id', tabIds);

          if (!ordersError && ordersData) {
            for (const order of ordersData) {
              const currentList = itemsByTab.get(order.tab_id) || [];
              const rawItems = order.order_items || [];
              for (const it of rawItems) {
                const prodName = it.products?.name || 'Item';
                const qty = Number(it.quantity) || 1;
                const price = Number(it.unit_price) || 0;
                currentList.push({
                  id: it.id,
                  name: prodName,
                  quantity: qty,
                  unitPrice: price,
                  subtotal: qty * price,
                  notes: it.notes || undefined,
                });
              }
              itemsByTab.set(order.tab_id, currentList);
            }
          }
        } catch (itemErr) {
          console.warn('[checksApi] Could not fetch detailed line items, using summary:', itemErr);
        }
      }

      const checks: SettledCheckItem[] = paymentsData.map((p: any) => {
        const tab = p.tabs || {};
        const tableNumber = tab.tables?.table_number;
        const channelRaw = (tab.order_channel || '').toLowerCase();

        let orderType: CheckOrderType = 'dine_in';
        if (channelRaw.includes('takeout') || channelRaw.includes('counter')) {
          orderType = 'takeout';
        } else if (
          channelRaw.includes('grab') ||
          channelRaw.includes('delivery') ||
          channelRaw.includes('panda')
        ) {
          orderType = 'online_delivery';
        }

        let tableOrRef = 'Bar / Quick Till';
        if (tableNumber) {
          tableOrRef = `Table ${tableNumber}`;
        } else if (orderType === 'takeout') {
          tableOrRef = 'Takeout Counter';
        } else if (orderType === 'online_delivery') {
          tableOrRef = channelRaw.includes('panda') ? 'Foodpanda Delivery' : 'GrabFood Delivery';
        }

        const guestName = tab.customer_name || tab.guest_name || 'Guest Tab';
        const cashierName = p.users?.name || tab.opened_by?.name || 'Cashier';
        const total = Number(p.amount) || 0;
        const discountAmount = Number(p.discount_amount || 0);
        const corkageFee = Number(p.corkage_amount || 0);

        // PH Fiscal Standard: 10% Service Charge on Dine-In, 12% VAT inclusive
        const netBase = Math.max(0, total - corkageFee);
        const serviceCharge =
          orderType === 'dine_in' && total > 0 ? Number(((netBase * 0.1) / 1.1).toFixed(2)) : 0;
        const vatableSales = Number(((netBase - serviceCharge) / 1.12).toFixed(2));
        const vatAmount = Number((netBase - serviceCharge - vatableSales).toFixed(2));
        const subtotal = netBase + discountAmount;

        const dateObj = new Date(p.created_at);
        const timestamp = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const shortId = p.id.substring(0, 8).toUpperCase();
        const checkNumber = `#${shortId}`;

        const items = itemsByTab.get(p.tab_id) || [];

        return {
          id: p.id,
          paymentId: p.id,
          tabId: p.tab_id,
          checkNumber,
          orderType,
          tableOrRef,
          guestName,
          itemsCount: items.length > 0 ? items.reduce((sum, it) => sum + it.quantity, 0) : 1,
          items,
          subtotal,
          discountAmount,
          corkageFee,
          vatableSales,
          vatAmount,
          serviceCharge,
          total,
          paymentMethod: p.payment_method || 'CASH',
          drawerTarget: (p.drawer_target || 'main') as 'main' | 'bar' | 'consolidated',
          cashierName,
          settledAt: p.created_at,
          timestamp,
          orderChannel: tab.order_channel || 'CAFE_AREA',
          operatingMode: tab.operating_mode || p.operating_mode || 'CAFE',
          notes: p.notes || tab.notes || undefined,
        };
      });

      // Apply client-side filters (channel, station, mode, search)
      return checks.filter((chk) => {
        if (filter.mode && filter.mode !== 'all' && chk.operatingMode !== filter.mode) {
          return false;
        }

        if (filter.channel && filter.channel !== 'all' && chk.orderType !== filter.channel) {
          return false;
        }

        if (filter.station && filter.station !== 'ALL') {
          const st = filter.station.toUpperCase();
          if (
            st === 'CAFE_AREA' &&
            !chk.orderChannel.includes('CAFE') &&
            chk.drawerTarget !== 'main'
          )
            return false;
          if (st === 'BAR_AREA' && !chk.orderChannel.includes('BAR') && chk.drawerTarget !== 'bar')
            return false;
          if (st === 'TAKEOUT_COUNTER' && chk.orderType !== 'takeout') return false;
          if (st === 'GRAB_FOOD' && chk.orderType !== 'online_delivery') return false;
        }

        if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
          const q = filter.searchQuery.toLowerCase().trim();
          const matchCheck = chk.checkNumber.toLowerCase().includes(q);
          const matchGuest = chk.guestName.toLowerCase().includes(q);
          const matchRef = chk.tableOrRef.toLowerCase().includes(q);
          const matchCashier = chk.cashierName.toLowerCase().includes(q);
          const matchItem = chk.items.some((it) => it.name.toLowerCase().includes(q));
          return matchCheck || matchGuest || matchRef || matchCashier || matchItem;
        }

        return true;
      });
    } catch (err: any) {
      console.error('[checksApi] Error in fetchSettledChecks:', err);
      throw err;
    }
  },

  /**
   * Enqueues a thermal print job for customer receipt reprinting.
   */
  async reprintReceipt(check: SettledCheckItem): Promise<void> {
    try {
      const { error } = await supabase.from('print_jobs').insert({
        job_type: 'CUSTOMER_RECEIPT',
        receipt_data: {
          checkNumber: check.checkNumber,
          guestName: check.guestName,
          tableOrRef: check.tableOrRef,
          cashierName: check.cashierName,
          settledAt: check.settledAt,
          items: check.items,
          subtotal: check.subtotal,
          discountAmount: check.discountAmount,
          serviceCharge: check.serviceCharge,
          vatableSales: check.vatableSales,
          vatAmount: check.vatAmount,
          total: check.total,
          paymentMethod: check.paymentMethod,
        } as any,
        status: 'PENDING',
      });

      if (error) {
        console.error('[checksApi] Error enqueuing thermal print job:', error);
        throw error;
      }
    } catch (err) {
      console.error('[checksApi] reprintReceipt exception:', err);
      throw err;
    }
  },
};
