import type { CustomerTab } from '../../../types/floor';
import { tablesApi } from '../../table-service/data/tables.api';
import { supabase } from '../../shared/infrastructure/supabase';
import { realtimeGateway } from '../../shared/infrastructure/realtime';
import { resolveTableUuid } from '../../floor/data/resolver';
import { mapPaymentMethodToDb } from './settlementHelpers';
import type { SettlementBillingDetails } from './settlementHelpers';
import { mapTendersToDbPayload } from '../domain/splitTenderCalculator';
import {
  enqueueDurableMutation,
  dequeueDurableMutation,
  markMutationInFlight,
  clearMutationInFlight,
} from '../../orders/data/durableQueue';
import { posHlc } from '../../orders/application/order.helpers';
import {
  awaitPendingTabWrites,
  isLikelyNetworkError,
} from '../../orders/application/tabWriteTracker';
import { toast } from '../../shared/toast/useToastStore';

export async function backgroundSettleTableGroupDb({
  tableId,
  tabsToSettle,
  paymentMethod,
  groupGrandTotal,
  effectiveStaffId,
  effectiveCashierName,
  paymentChannel,
  referenceNumber,
  billingDetails,
  computedDrawerTarget,
}: {
  tableId: string;
  tabsToSettle: CustomerTab[];
  paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp' | 'split';
  groupGrandTotal: number;
  effectiveStaffId?: string;
  effectiveCashierName: string;
  paymentChannel?: string;
  referenceNumber?: string;
  billingDetails?: SettlementBillingDetails;
  computedDrawerTarget: 'main' | 'bar';
}) {
  const dbMethod = mapPaymentMethodToDb(paymentMethod);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  try {
    await awaitPendingTabWrites([tableId, ...tabsToSettle.map((t) => t.id)]);

    const validTableId = await resolveTableUuid(tableId);
    const uuidTabs = tabsToSettle.filter((t) => t.id && uuidRegex.test(t.id));

    // Prefer a tab that has active items as the primary tab anchor
    const primaryTab =
      uuidTabs.find((t) => (t.items || []).some((it) => it.status !== 'cancelled')) || uuidTabs[0];

    if (primaryTab) {
      const secondaryTabIds = uuidTabs.filter((t) => t.id !== primaryTab.id).map((t) => t.id);

      const settlePayload = {
        tabId: primaryTab.id,
        paymentMethod: dbMethod,
        amount: groupGrandTotal,
        discountAmount: billingDetails?.totalDiscountAmount || 0,
        staffId: effectiveStaffId,
        notes: `Group Settle by ${effectiveCashierName} (${uuidTabs.length} tabs)`,
        paymentChannel,
        referenceNumber,
        serviceCharge: billingDetails?.serviceCharge,
        vatableSales: billingDetails?.vatableSales,
        vatAmount: billingDetails?.vatAmount,
        vatExemptSales: billingDetails?.vatExemptSales,
        discountType: billingDetails?.discountType,
        seniorPwdId: billingDetails?.seniorPwdId,
        seniorPwdName: billingDetails?.seniorPwdName,
        corkageAmount: billingDetails?.corkageAmount,
        tenderedAmount: billingDetails?.tenderedAmount,
        drawerTarget: computedDrawerTarget,
        shouldPrintReceipt: billingDetails?.shouldPrintReceipt ?? true,
        tenders: billingDetails?.tenders
          ? mapTendersToDbPayload(billingDetails.tenders)
          : undefined,
        groupTabIds: secondaryTabIds.length > 0 ? secondaryTabIds : undefined,
      };

      const mutationId = `mut-grp-settle-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      markMutationInFlight(mutationId);
      enqueueDurableMutation({
        id: mutationId,
        hlc: posHlc.now(),
        type: 'settle_tab',
        payload: settlePayload,
      });

      try {
        await tablesApi.settleTabAndRecordPayment(settlePayload);
        dequeueDurableMutation(mutationId);
      } catch (e: any) {
        if (isLikelyNetworkError(e)) {
          console.warn('[settleTableGroup] tab settle offline (retained in durable queue):', e);
        } else {
          dequeueDurableMutation(mutationId);
          console.error('[settleTableGroup] database rejection:', e);
          toast.error(
            e?.message || 'Database failed to save table settlement. Please verify in Checks.',
            { title: 'Group Settlement Sync Error' }
          );
        }
      } finally {
        clearMutationInFlight(mutationId);
      }
    }

    // Close any stray open tabs on this table in Supabase that were not part of local state
    if (validTableId) {
      const { data: remainingOpenTabs } = await supabase
        .from('tabs')
        .select('id')
        .eq('table_id', validTableId)
        .eq('status', 'OPEN');

      if (remainingOpenTabs && remainingOpenTabs.length > 0) {
        const remIds = remainingOpenTabs.map((r) => r.id);
        const closedAtIso = new Date().toISOString();
        await supabase
          .from('tabs')
          .update({ status: 'BILLED', is_prepaid: true, updated_at: closedAtIso })
          .in('id', remIds);

        const { data: remOrders } = await supabase
          .from('orders')
          .select('id')
          .in('tab_id', remIds)
          .neq('status', 'CANCELLED');

        if (remOrders && remOrders.length > 0) {
          const remOrderIds = remOrders.map((o) => o.id);
          await supabase
            .from('orders')
            .update({ status: 'COMPLETED', updated_at: closedAtIso })
            .in('id', remOrderIds);
          await (supabase.from as any)('order_items')
            .update({
              status: 'SERVED',
              delivered_at: closedAtIso,
              state_changed_at: closedAtIso,
              updated_at: closedAtIso,
            })
            .in('order_id', remOrderIds)
            .not('status', 'in', '(CANCELLED,SERVED)');
        }
      }

      await supabase
        .from('tables')
        .update({ is_occupied: false, updated_at: new Date().toISOString() })
        .eq('id', validTableId);
    }
    realtimeGateway.broadcastPosSync('table_group_settled');
  } catch (err) {
    console.warn('[settleTableGroup] Background database error:', err);
  }
}
