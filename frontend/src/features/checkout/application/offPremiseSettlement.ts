import { TakeoutOrder } from '../../../types/floor';
import { tablesApi } from '../../table-service/data/tables.api';
import { supabase } from '../../shared/infrastructure/supabase';
import { realtimeGateway } from '../../shared/infrastructure/realtime';
import { mapPaymentMethodToDb, SettlementBillingDetails } from './settlementHelpers';
import {
  enqueueDurableMutation,
  dequeueDurableMutation,
  loadDurableQueue,
} from '../../orders/data/durableQueue';
import { posHlc } from '../../orders/application/order.helpers';
import { useOrderStore } from '../../orders/application/useOrderStore';

export async function backgroundSettleTakeoutDb({
  takeoutId,
  targetOrderRef,
  paymentMethod,
  grandTotalPaid,
  discountAmount,
  effectiveStaffId,
  effectiveCashierName,
  completeOrder,
  paymentChannel,
  referenceNumber,
  options,
  getTakeoutOrders,
}: {
  takeoutId: string;
  targetOrderRef?: TakeoutOrder;
  paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp';
  grandTotalPaid: number;
  discountAmount: number;
  effectiveStaffId?: string;
  effectiveCashierName: string;
  completeOrder: boolean;
  paymentChannel?: string;
  referenceNumber?: string;
  options?: SettlementBillingDetails;
  getTakeoutOrders: () => TakeoutOrder[];
}) {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let tabUuid = targetOrderRef?.tabId || targetOrderRef?.id;

    for (let attempt = 0; attempt < 12 && (!tabUuid || !uuidRegex.test(tabUuid)); attempt++) {
      await new Promise((r) => setTimeout(r, 250));
      const liveOrder = getTakeoutOrders().find(
        (o) =>
          o.id === takeoutId ||
          o.tabId === takeoutId ||
          (targetOrderRef && o.ticketNumber === targetOrderRef.ticketNumber)
      );
      if (liveOrder?.tabId && uuidRegex.test(liveOrder.tabId)) {
        tabUuid = liveOrder.tabId;
        break;
      }
      if (liveOrder?.id && uuidRegex.test(liveOrder.id)) {
        tabUuid = liveOrder.id;
        break;
      }
    }

    if (!tabUuid || !uuidRegex.test(tabUuid)) {
      const { data: openTakeoutTabs } = await supabase
        .from('tabs')
        .select('id')
        .eq('order_type', 'TAKEOUT')
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false })
        .limit(1);
      if (openTakeoutTabs && openTakeoutTabs.length > 0) {
        tabUuid = openTakeoutTabs[0].id;
      }
    }

    if (tabUuid && uuidRegex.test(tabUuid)) {
      const settlementPayload = {
        tabId: tabUuid,
        paymentMethod: mapPaymentMethodToDb(paymentMethod),
        amount: grandTotalPaid,
        discountAmount,
        staffId: effectiveStaffId,
        notes: `Takeout #${targetOrderRef?.ticketNumber || ''} settled by ${effectiveCashierName}`,
        keepOpenForPrep: !completeOrder,
        paymentChannel,
        referenceNumber,
        serviceCharge: options?.serviceCharge,
        vatableSales: options?.vatableSales,
        vatAmount: options?.vatAmount,
        vatExemptSales: options?.vatExemptSales,
        discountType: options?.discountType,
        seniorPwdId: options?.seniorPwdId,
        seniorPwdName: options?.seniorPwdName,
        tenderedAmount: options?.tenderedAmount,
        drawerTarget: 'main' as const,
        shouldPrintReceipt: options?.shouldPrintReceipt,
      };

      const mutationId = `mut-takeout-settle-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      enqueueDurableMutation({
        id: mutationId,
        hlc: posHlc.now(),
        type: 'settle_tab',
        payload: settlementPayload,
      });
      useOrderStore.setState({ offlineQueue: loadDurableQueue() });

      try {
        await tablesApi.settleTabAndRecordPayment(settlementPayload);
        dequeueDurableMutation(mutationId);
        useOrderStore.setState({ offlineQueue: loadDurableQueue() });
        realtimeGateway.broadcastPosSync('takeout_settled');
      } catch (networkErr) {
        console.warn(
          'Background settleTakeoutOrder offline notice (retained in durable queue):',
          networkErr
        );
      }
    }
  } catch (err) {
    console.warn('Background settleTakeoutOrder notice:', err);
  }
}
