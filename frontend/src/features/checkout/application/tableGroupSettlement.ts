import { CustomerTab } from '../../../types/floor';
import { tablesApi } from '../../table-service/data/tables.api';
import { supabase } from '../../shared/infrastructure/supabase';
import { realtimeGateway } from '../../shared/infrastructure/realtime';
import { resolveTableUuid } from '../../floor/data/resolver';
import { mapPaymentMethodToDb, SettlementBillingDetails } from './settlementHelpers';

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
  paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp';
  groupGrandTotal: number;
  effectiveStaffId?: string;
  effectiveCashierName: string;
  paymentChannel?: string;
  referenceNumber?: string;
  billingDetails?: SettlementBillingDetails;
  computedDrawerTarget: 'main' | 'bar';
}) {
  const dbMethod = mapPaymentMethodToDb(paymentMethod);
  try {
    const validTableId = await resolveTableUuid(tableId);

    // Settle primary tab with full group billing and single receipt/drawer trigger, secondary tabs with 0 amount
    for (let i = 0; i < tabsToSettle.length; i++) {
      const tab = tabsToSettle[i];
      const isUuid =
        tab.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tab.id);
      const isPrimary = i === 0;

      if (isUuid) {
        await tablesApi
          .settleTabAndRecordPayment({
            tabId: tab.id,
            paymentMethod: dbMethod,
            amount: isPrimary ? groupGrandTotal : 0,
            staffId: effectiveStaffId,
            notes: `Group Settle by ${effectiveCashierName}${isPrimary ? ' (Primary Group Bill)' : ' (Secondary Tab)'}`,
            paymentChannel: isPrimary ? paymentChannel : undefined,
            referenceNumber: isPrimary ? referenceNumber : undefined,
            serviceCharge: isPrimary ? billingDetails?.serviceCharge : 0,
            vatableSales: isPrimary ? billingDetails?.vatableSales : 0,
            vatAmount: isPrimary ? billingDetails?.vatAmount : 0,
            vatExemptSales: isPrimary ? billingDetails?.vatExemptSales : 0,
            discountType: isPrimary ? billingDetails?.discountType : undefined,
            seniorPwdId: isPrimary ? billingDetails?.seniorPwdId : undefined,
            seniorPwdName: isPrimary ? billingDetails?.seniorPwdName : undefined,
            corkageAmount: isPrimary ? billingDetails?.corkageAmount : 0,
            tenderedAmount: isPrimary ? billingDetails?.tenderedAmount : undefined,
            drawerTarget: computedDrawerTarget,
            shouldPrintReceipt: isPrimary ? (billingDetails?.shouldPrintReceipt ?? true) : false,
          })
          .catch((e) => console.warn('[settleTableGroup] tab settle warn:', e));
      }
    }

    // If there are any remaining open tabs on this table in Supabase, close or settle them
    if (validTableId) {
      const { data: remainingOpenTabs } = await supabase
        .from('tabs')
        .select('id, customer_name')
        .eq('table_id', validTableId)
        .eq('status', 'OPEN');

      if (remainingOpenTabs && remainingOpenTabs.length > 0) {
        for (const rem of remainingOpenTabs) {
          await tablesApi
            .settleTabAndRecordPayment({
              tabId: rem.id,
              paymentMethod: dbMethod,
              amount: 0,
              staffId: effectiveStaffId,
              notes: `Group Settle cleanup (${rem.customer_name})`,
            })
            .catch(() => {
              supabase
                .from('tabs')
                .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
                .eq('id', rem.id);
            });
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
