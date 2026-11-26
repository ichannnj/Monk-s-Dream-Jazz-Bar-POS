import { tablesApi } from '../../table-service/data/tables.api';
import { supabase } from '../../shared/infrastructure/supabase';
import { realtimeGateway } from '../../shared/infrastructure/realtime';
import { resolveTableUuid } from '../../floor/data/resolver';
import {
  enqueueDurableMutation,
  dequeueDurableMutation,
  loadDurableQueue,
  markMutationInFlight,
  clearMutationInFlight,
} from '../../orders/data/durableQueue';
import { posHlc } from '../../orders/application/order.helpers';
import {
  awaitPendingTabWrites,
  isLikelyNetworkError,
} from '../../orders/application/tabWriteTracker';
import { toast } from '../../shared/toast/useToastStore';

import type { PaymentTender } from '../domain/splitTender.types';
import { mapTendersToDbPayload } from '../domain/splitTenderCalculator';

export interface SettlementBillingDetails {
  serviceCharge?: number;
  serviceChargeRate?: number;
  vatableSales?: number;
  vatAmount?: number;
  vatExemptSales?: number;
  discountType?: string;
  discountLabel?: string;
  seniorPwdId?: string;
  seniorPwdName?: string;
  grossSubtotal?: number;
  totalDiscountAmount?: number;
  netAfterDiscount?: number;
  totalAmountDue?: number;
  corkageAmount?: number;
  tenderedAmount?: number;
  shouldPrintReceipt?: boolean;
  tenders?: PaymentTender[];
}

export function mapPaymentMethodToDb(
  method: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp' | 'split'
): 'CASH' | 'CARD' | 'DIGITAL_WALLET' | 'COMP' {
  if (method === 'card') return 'CARD';
  if (method === 'digital_wallet' || method === 'platform_prepaid') return 'DIGITAL_WALLET';
  if (method === 'comp') return 'COMP';
  return 'CASH';
}

export async function backgroundSettleTabDb({
  targetTabId,
  tableId,
  paymentMethod,
  grandTotalPaid,
  discountAmount,
  effectiveStaffId,
  effectiveCashierName,
  paymentChannel,
  referenceNumber,
  billingDetails,
  computedDrawerTarget,
}: {
  targetTabId?: string;
  tableId: string;
  paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp' | 'split';
  grandTotalPaid: number;
  discountAmount: number;
  effectiveStaffId?: string;
  effectiveCashierName: string;
  paymentChannel?: string;
  referenceNumber?: string;
  billingDetails?: SettlementBillingDetails;
  computedDrawerTarget: 'main' | 'bar';
}) {
  try {
    await awaitPendingTabWrites([targetTabId, tableId]);

    let tabUuid = targetTabId;
    const isUuid =
      tabUuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tabUuid);

    if (!isUuid) {
      const validTableId = await resolveTableUuid(tableId);
      if (validTableId) {
        const { data: openTabs } = await supabase
          .from('tabs')
          .select('id')
          .eq('table_id', validTableId)
          .eq('status', 'OPEN')
          .order('created_at', { ascending: true })
          .limit(1);
        if (openTabs && openTabs.length > 0) {
          tabUuid = openTabs[0].id;
        }
      }
    }

    if (
      tabUuid &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tabUuid)
    ) {
      const settlementPayload = {
        tabId: tabUuid,
        paymentMethod: mapPaymentMethodToDb(paymentMethod),
        amount: grandTotalPaid,
        discountAmount,
        staffId: effectiveStaffId,
        notes: `Settled by ${effectiveCashierName}`,
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
        shouldPrintReceipt: billingDetails?.shouldPrintReceipt,
        tenders: billingDetails?.tenders
          ? mapTendersToDbPayload(billingDetails.tenders)
          : undefined,
      };

      const mutationId = `mut-settle-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      markMutationInFlight(mutationId);
      enqueueDurableMutation({
        id: mutationId,
        hlc: posHlc.now(),
        type: 'settle_tab',
        payload: settlementPayload,
      });

      try {
        await tablesApi.settleTabAndRecordPayment(settlementPayload);
        dequeueDurableMutation(mutationId);
        realtimeGateway.broadcastPosSync('tab_settled');
      } catch (networkErr: any) {
        if (isLikelyNetworkError(networkErr)) {
          console.warn(
            'Background settleTab offline notice (retained in durable queue):',
            networkErr
          );
        } else {
          dequeueDurableMutation(mutationId);
          console.error('Background settleTab database rejection:', networkErr);
          toast.error(
            networkErr?.message || 'Database failed to save payment. Please verify in Checks.',
            { title: 'Settlement Sync Error' }
          );
        }
      } finally {
        clearMutationInFlight(mutationId);
      }
    }
  } catch (err) {
    console.warn('Background settleTab error:', err);
  }
}
