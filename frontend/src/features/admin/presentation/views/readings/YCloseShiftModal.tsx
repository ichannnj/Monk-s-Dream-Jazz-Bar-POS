import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Calculator,
  Zap,
  Printer,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { useAuthStore } from '@/features/auth/application/useAuthStore';
import { readingsApi, type ReadingData, type YReadingRecord } from '../../../data/readings.api';
import { exportSingleReadingToExcel } from '../../../utils/readingExcelExport';
import { CashDenominationCounter } from './CashDenominationCounter';
import { AdminModal, AdminInput, AdminNumberInput } from '../../components';

interface YCloseShiftModalProps {
  visible: boolean;
  activeReading: ReadingData | null;
  drawerScope: 'consolidated' | 'main' | 'bar';
  onClose: () => void;
  onYReadingSuccess: (record: YReadingRecord) => void;
}

export const YCloseShiftModal: React.FC<YCloseShiftModalProps> = ({
  visible,
  activeReading,
  drawerScope,
  onClose,
  onYReadingSuccess,
}) => {
  const { currentUser } = useAuthStore();
  const [countedCashInput, setCountedCashInput] = useState('');
  const [incomingStaff, setIncomingStaff] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDenominationCounter, setShowDenominationCounter] = useState(false);

  // Safety Guard & Open Tabs checking
  const [openTabCount, setOpenTabCount] = useState(0);

  // Auto-Actions Toggles
  const [autoPrintThermal, setAutoPrintThermal] = useState(true);
  const [autoDownloadExcel, setAutoDownloadExcel] = useState(true);

  useEffect(() => {
    if (visible) {
      readingsApi
        .checkUnsettledTabs(drawerScope)
        .then((res) => {
          setOpenTabCount(res.open_tab_count);
        })
        .catch((err) => {
          console.error('[YCloseShiftModal] Error checking open tabs:', err);
        });
    }
  }, [visible, drawerScope]);

  if (!activeReading) return null;

  const expectedCash = activeReading.expected_cash || 0;
  const countedCash = parseFloat(countedCashInput) || 0;
  const hasEnteredCash = countedCashInput.trim().length > 0;
  const variance = countedCash - expectedCash;

  const drawerLabel =
    drawerScope === 'bar'
      ? 'Bar Station Till'
      : drawerScope === 'main'
        ? 'Main Floor Till'
        : 'Consolidated Venue (All Tills)';

  const outgoingStaffName = currentUser?.displayName || 'Shift Cashier';

  const handleClose = () => {
    setCountedCashInput('');
    setIncomingStaff('');
    setNotes('');
    setShowDenominationCounter(false);
    onClose();
  };

  const handleQuickMatchExpected = () => {
    setCountedCashInput(expectedCash.toFixed(2));
    toast.info('Applied exact system expected cash (₱0.00 variance)', {
      title: 'Auto-Matched Till',
    });
  };

  const handleApplyDenominationTotal = (total: number) => {
    setCountedCashInput(total.toFixed(2));
    setShowDenominationCounter(false);
    toast.success(`Applied denomination count: ${formatCurrency(total)}`, {
      title: 'Counter Applied',
    });
  };

  const handleConfirmHandover = async () => {
    if (!hasEnteredCash) {
      toast.error('Please enter the counted cash amount before handing over.', {
        title: 'Missing Cash Count',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const yRecord = await readingsApi.closeShiftAndGenerateYReading({
        drawer: drawerScope,
        countedCash,
        outgoingStaffId: currentUser?.id || null,
        incomingStaffName: incomingStaff.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      const readingData: ReadingData = {
        reading_type: 'Y_READING',
        y_number: yRecord.y_number,
        drawer_target: yRecord.drawer_target,
        opened_at: yRecord.opened_at,
        closed_at: yRecord.closed_at,
        performed_by_name: yRecord.outgoing_staff_name,
        gross_sales: yRecord.gross_sales,
        discount_total: yRecord.discount_total,
        net_sales: yRecord.net_sales,
        vatable_sales: yRecord.vatable_sales,
        vat_amount: yRecord.vat_amount,
        vat_exempt_sales: (yRecord as any).vat_exempt_sales || 0,
        service_charge: yRecord.service_charge,
        tender_cash: yRecord.tender_cash,
        tender_card: yRecord.tender_card,
        tender_digital: yRecord.tender_digital,
        tender_delivery: yRecord.tender_delivery,
        total_tender: yRecord.total_tender,
        opening_float: yRecord.opening_float,
        cash_in: yRecord.cash_in,
        cash_out: yRecord.cash_out,
        safe_drops: yRecord.safe_drops,
        expected_cash: yRecord.expected_cash,
        counted_cash: yRecord.counted_cash,
        variance: yRecord.variance,
        transaction_count: yRecord.transaction_count,
        first_receipt_no: yRecord.first_receipt_no || 'N/A',
        last_receipt_no: yRecord.last_receipt_no || 'N/A',
        notes: yRecord.notes || undefined,
      };

      // Auto-Print Thermal Slip
      if (autoPrintThermal) {
        try {
          await readingsApi.enqueueThermalPrintJob(readingData);
          toast.info('80mm thermal handover slip enqueued successfully.', {
            title: 'Slip Enqueued',
          });
        } catch (printErr: any) {
          console.warn('[YCloseShiftModal] Thermal auto-print error:', printErr);
        }
      }

      // Auto-Download Excel
      if (autoDownloadExcel) {
        try {
          exportSingleReadingToExcel(readingData);
          toast.info('Excel handover workbook downloaded.', {
            title: 'Excel Exported',
          });
        } catch (excelErr: any) {
          console.warn('[YCloseShiftModal] Excel export error:', excelErr);
        }
      }

      toast.success(`Shift handover Y-Reading #${yRecord.y_number} recorded for ${drawerLabel}.`, {
        title: 'Handover Completed',
      });

      handleClose();
      onYReadingSuccess(yRecord);
    } catch (err: any) {
      console.error('[YCloseShiftModal] Error performing handover:', err);
      toast.error(err.message || 'Failed to complete shift handover', {
        title: 'Handover Failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      visible={visible}
      onClose={handleClose}
      title="Cashier Shift Handover (Y-Reading)"
      subtitle={`${drawerLabel} • Staff Till Rotation`}
      icon={<ArrowRightLeft size={22} color="#800020" />}
      size="md"
      footer={
        <View className="flex-row gap-3 w-full">
          <Pressable
            onPress={handleClose}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl bg-stone-100 items-center justify-center active:bg-stone-200 min-h-[48px]"
          >
            <Text className="text-base font-bold text-stone-700">Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleConfirmHandover}
            disabled={isSubmitting || !hasEnteredCash}
            className={`flex-1 py-3 rounded-xl items-center justify-center min-h-[48px] ${
              isSubmitting || !hasEnteredCash
                ? 'bg-stone-300 opacity-60'
                : 'bg-amber-600 active:bg-amber-700'
            }`}
          >
            <Text className="text-base font-extrabold text-white">
              {isSubmitting ? 'Recording Handover...' : 'Confirm Shift Handover'}
            </Text>
          </Pressable>
        </View>
      }
    >
      <View className="flex-col">
        {/* Safety Guard: Open Tabs Warning */}
        {openTabCount > 0 && (
          <View className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 flex-row items-start gap-3">
            <AlertCircle size={22} color="#b45309" className="mt-0.5" />
            <View className="flex-1">
              <Text className="text-base font-black text-amber-900">
                Notice: {openTabCount} Active Tab{openTabCount > 1 ? 's' : ''} Open on Floor
              </Text>
              <Text className="text-base text-amber-800 mt-1">
                Unsettled tables remain open. Ensure incoming cashier is briefed on active customer
                tabs.
              </Text>
            </View>
          </View>
        )}

        {/* Expected System Cash */}
        <View className="bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-4 items-center">
          <Text className="text-base text-stone-500 font-bold uppercase tracking-wider">
            System Calculated Cash Expected:
          </Text>
          <Text className="text-3xl font-black text-stone-900 mt-1">
            {formatCurrency(expectedCash)}
          </Text>
          <Text className="text-base text-stone-500 mt-1">
            Outgoing Cashier: <Text className="font-bold text-stone-800">{outgoingStaffName}</Text>
          </Text>

          {/* 1-Click Match Expected Button */}
          <Pressable
            onPress={handleQuickMatchExpected}
            className="mt-3 flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 active:bg-emerald-700 shadow-xs min-h-[48px]"
          >
            <Zap size={18} color="#ffffff" />
            <Text className="text-base font-extrabold text-white">
              1-Click Match Expected (₱0.00 Variance)
            </Text>
          </Pressable>
        </View>

        {/* Physical Cash Count & Denomination Toggle */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-base font-bold text-stone-700">
              Actual Physical Cash Counted in Drawer:
            </Text>
            <Pressable
              onPress={() => setShowDenominationCounter(!showDenominationCounter)}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 active:bg-stone-200 min-h-[48px]"
            >
              <Calculator size={18} color="#800020" />
              <Text className="text-base font-bold text-[#800020]">
                {showDenominationCounter ? 'Hide Counter' : 'Bill & Coin Breakdown'}
              </Text>
            </Pressable>
          </View>

          <AdminNumberInput
            mode="currency"
            placeholder="0.00"
            value={countedCashInput}
            onChangeText={setCountedCashInput}
            autoFocus={!showDenominationCounter}
          />
        </View>

        {/* Expandable Denomination Counter */}
        {showDenominationCounter && (
          <CashDenominationCounter
            onApplyTotal={handleApplyDenominationTotal}
            expectedCash={expectedCash}
          />
        )}

        {/* Live Variance Calculation */}
        {hasEnteredCash && (
          <View
            className={`p-4 rounded-xl border mb-4 flex-row items-center justify-between ${
              variance === 0
                ? 'bg-emerald-50 border-emerald-200'
                : variance > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
            }`}
          >
            <View className="flex-row items-center gap-2">
              {variance === 0 ? (
                <CheckCircle2 size={20} color="#059669" />
              ) : (
                <AlertTriangle size={20} color={variance > 0 ? '#d97706' : '#dc2626'} />
              )}
              <Text
                className={`text-base font-black ${
                  variance === 0
                    ? 'text-emerald-800'
                    : variance > 0
                      ? 'text-amber-800'
                      : 'text-red-800'
                }`}
              >
                {variance === 0
                  ? '✓ PERFECT BALANCE'
                  : variance > 0
                    ? '▲ CASH SURPLUS (OVER)'
                    : '▼ CASH SHORTAGE (DEFICIT)'}
              </Text>
            </View>
            <Text
              className={`text-xl font-black ${
                variance === 0
                  ? 'text-emerald-800'
                  : variance > 0
                    ? 'text-amber-800'
                    : 'text-red-800'
              }`}
            >
              {variance > 0 ? '+' : ''}
              {formatCurrency(variance)}
            </Text>
          </View>
        )}

        {/* Incoming Cashier Handover Recipient */}
        <View className="mb-4">
          <AdminInput
            label="Incoming Staff Receiving Till:"
            placeholder="Enter incoming cashier / manager name..."
            value={incomingStaff}
            onChangeText={setIncomingStaff}
            leftElement={<UserCheck size={18} color="#78716c" />}
          />
        </View>

        {/* Handover Audit Notes */}
        <View className="mb-4">
          <AdminInput
            label="Handover Notes (Optional):"
            placeholder="E.g., Counted together with night cashier, drawer balanced..."
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Automated Actions */}
        <View className="bg-stone-50 rounded-2xl border border-stone-200 p-4 mb-2">
          <Text className="text-base font-extrabold text-stone-500 uppercase tracking-wider mb-2">
            Automated Closeout Actions:
          </Text>

          <View className="flex-row items-center justify-between py-2 border-b border-stone-200/60 min-h-[48px]">
            <View className="flex-row items-center gap-2.5">
              <Printer size={18} color="#44403c" />
              <Text className="text-base font-bold text-stone-800">
                Auto-print 80mm Handover Y-Slip
              </Text>
            </View>
            <Pressable
              onPress={() => setAutoPrintThermal(!autoPrintThermal)}
              className={`w-8 h-8 rounded-lg items-center justify-center border min-h-[48px] min-w-[48px] ${
                autoPrintThermal ? 'bg-amber-600 border-amber-600' : 'bg-white border-stone-300'
              }`}
            >
              {autoPrintThermal && <CheckCircle2 size={18} color="#ffffff" />}
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between py-2 min-h-[48px]">
            <View className="flex-row items-center gap-2.5">
              <FileSpreadsheet size={18} color="#059669" />
              <Text className="text-base font-bold text-stone-800">
                Auto-download Styled Excel Report (.xls)
              </Text>
            </View>
            <Pressable
              onPress={() => setAutoDownloadExcel(!autoDownloadExcel)}
              className={`w-8 h-8 rounded-lg items-center justify-center border min-h-[48px] min-w-[48px] ${
                autoDownloadExcel ? 'bg-amber-600 border-amber-600' : 'bg-white border-stone-300'
              }`}
            >
              {autoDownloadExcel && <CheckCircle2 size={18} color="#ffffff" />}
            </Pressable>
          </View>
        </View>
      </View>
    </AdminModal>
  );
};
