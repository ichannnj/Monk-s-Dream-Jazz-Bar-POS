import { supabase } from '@/features/shared/infrastructure/supabase';
import type { SettledCheckItem, CheckFilterParams, CheckLineItem } from '../domain/check.types';
import { mapRawPaymentToCheck, filterSettledChecks } from './checkMapper';

export * from './checkMapper';

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
          payment_channel,
          reference_number,
          amount,
          corkage_amount,
          discount_amount,
          tip_amount,
          service_charge,
          vatable_sales,
          vat_amount,
          vat_exempt_sales,
          discount_type,
          senior_pwd_id,
          senior_pwd_name,
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
            opened_by:opened_by_id (display_name)
          ),
          users:staff_id (display_name)
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

      const tabIds = Array.from(new Set(paymentsData.map((p: any) => p.tab_id).filter(Boolean)));
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
                modifiers,
                notes,
                status,
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
                if (it.status === 'CANCELLED') continue;
                const prodName = it.products?.name || 'Item';
                const qty = Number(it.quantity) || 1;
                const price = Number(it.unit_price) || 0;
                let parsedMods: string[] | undefined = undefined;
                if (Array.isArray(it.modifiers)) {
                  parsedMods = it.modifiers;
                } else if (typeof it.modifiers === 'string') {
                  try {
                    const parsed = JSON.parse(it.modifiers);
                    if (Array.isArray(parsed)) parsedMods = parsed;
                  } catch (_e) {
                    // ignore malformed JSON
                  }
                }
                currentList.push({
                  id: it.id,
                  name: prodName,
                  quantity: qty,
                  unitPrice: price,
                  subtotal: qty * price,
                  modifiers: parsedMods,
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

      const checks = paymentsData.map((p: any) => mapRawPaymentToCheck(p, itemsByTab));
      return filterSettledChecks(checks, filter);
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
          receiptNumber: check.checkNumber,
          checkNumber: check.checkNumber,
          guestName: check.guestName,
          customerName: check.guestName,
          tabName: check.guestName,
          tableLabel: check.tableOrRef,
          cashierName: check.cashierName,
          waiterName: check.cashierName,
          settledAt: check.settledAt,
          timestamp: check.timestamp || check.settledAt,
          items: check.items,
          subtotal: check.subtotal,
          corkageFee: check.corkageFee || 0,
          corkageAmount: check.corkageFee || 0,
          discount: check.discountAmount,
          discountAmount: check.discountAmount,
          serviceCharge: check.serviceCharge,
          vatableSales: check.vatableSales,
          vatAmount: check.vatAmount,
          vatExemptSales: check.vatExemptSales || 0,
          discountType: check.discountType,
          seniorPwdId: check.seniorPwdId,
          seniorPwdName: check.seniorPwdName,
          total: check.total,
          amount: check.total,
          tendered: check.total,
          change: 0,
          paymentMethod: check.paymentMethod,
          paymentChannel: check.paymentChannel,
          referenceNumber: check.referenceNumber,
          operatingMode: check.operatingMode || 'CAFE',
          rawItems: (check.items || []).map((it) => ({
            name: it.name,
            quantity: it.quantity,
            price: it.unitPrice,
            lineTotal: it.subtotal,
            notes: it.notes,
          })),
          isReprint: true,
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
