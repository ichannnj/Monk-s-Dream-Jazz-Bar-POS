import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Lock, Calculator } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { useAuthStore } from '@/features/auth/application/useAuthStore';
import { readingsApi, type ReadingData, type ZReadingRecord } from '../../../data/readings.api';
import { exportSingleReadingToExcel } from '../../../utils/readingExcelExport';
import { CashDenominationCounter } from './CashDenominationCounter';
import { AdminModal, AdminInput, AdminNumberInput } from '../../components';
import { ShiftExpectedCashHero } from './components/ShiftExpectedCashHero';
import { ShiftReconciliationControls } from './components/ShiftReconciliationControls';

interface ZCloseShiftModalProps {
  visible: boolean;
  activeReading: ReadingData | null;
  drawerScope: 'consolidated' | 'main' | 'bar';
  onClose: () => void;
  onZReadingSuccess: (record: ZReadingRecord) => void;
}

export const ZCloseShiftModal: React.FC<ZCloseShiftModalProps> = ({
  visible,
  activeReading,
  drawerScope,
  onClose,
  onZReadingSuccess,
}) => {
  const { currentUser } = useAuthStore();
  const [countedCashInput, setCountedCashInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDenominationCounter, setShowDenominationCounter] = useState(false);
  const [openTabCount, setOpenTabCount] = useState(0);
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
          console.error('[ZCloseShiftModal] Error checking open tabs:', err);
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

  const handleClose = () => {
    setCountedCashInput('');
    setNotes('');
    setShowDenominationCounter(false);
    onClose();
  };

  const handleQuickMatchExpected = () => {
    setCountedCashInput(expectedCash.toFixed(2));
    toast.info('Applied exact system expected cash (₱0.00 variance)', {
      title: 'Quick Fill Applied',
    });
  };

  const handleApplyDenominationTotal = (total: number) => {
    setCountedCashInput(total.toFixed(2));
    setShowDenominationCounter(false);
    toast.success(`Counted cash updated to ${formatCurrency(total)}`, {
      title: 'Denomination Applied',
    });
  };

  const handleConfirmCloseShift = async () => {
    if (!hasEnteredCash) {
      toast.warning('Please enter or quick-match the physical cash counted in drawer', {
        title: 'Cash Count Required',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const zRecord = await readingsApi.closeShiftAndGenerateZReading({
        drawer: drawerScope,
        countedCash,
        performedBy: currentUser?.id || null,
        notes: notes.trim() || undefined,
      });

      const readingData: ReadingData = {
        reading_type: 'Z_READING',
        z_number: zRecord.z_number,
        drawer_target: zRecord.drawer_target,
        opened_at: zRecord.opened_at,
        closed_at: zRecord.closed_at,
        performed_by_name: zRecord.performed_by_name,
        gross_sales: zRecord.gross_sales,
        discount_total: zRecord.discount_total,
        net_sales: zRecord.net_sales,
        vatable_sales: zRecord.vatable_sales,
        vat_amount: zRecord.vat_amount,
        vat_exempt_sales: zRecord.vat_exempt_sales,
        service_charge: zRecord.service_charge,
        tender_cash: zRecord.tender_cash,
        tender_card: zRecord.tender_card,
        tender_digital: zRecord.tender_digital,
        tender_delivery: zRecord.tender_delivery,
        total_tender: zRecord.total_tender,
        opening_float: zRecord.opening_float,
        cash_in: zRecord.cash_in,
        cash_out: zRecord.cash_out,
        safe_drops: zRecord.safe_drops,
        expected_cash: zRecord.expected_cash,
        counted_cash: zRecord.counted_cash,
        variance: zRecord.variance,
        transaction_count: zRecord.transaction_count,
        first_receipt_no: zRecord.first_receipt_no || 'N/A',
        last_receipt_no: zRecord.last_receipt_no || 'N/A',
        notes: zRecord.notes || undefined,
      };

      if (autoDownloadExcel) {
        try {
          exportSingleReadingToExcel(readingData);
        } catch (exportErr) {
          console.error('[ZCloseShiftModal] Auto-export Excel failed:', exportErr);
        }
      }

      toast.success(
        `Business day closed! Z-Reading #${zRecord.z_number} locked (${formatCurrency(variance)} variance).${autoDownloadExcel ? ' Excel report downloaded.' : ''}`,
        { title: 'Z-Close Completed' }
      );

      handleClose();
      onZReadingSuccess(zRecord);
    } catch (err: any) {
      console.error('[ZCloseShiftModal] error closing shift:', err);
      toast.error(err.message || 'Failed to complete Z-reading shift close', {
        title: 'Closing Error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      visible={visible}
      onClose={handleClose}
      title="Perform Z-Reading & Shift Close"
      subtitle={`${drawerLabel} • Permanent Fiscal Audit`}
      icon={<Lock size={22} color="#800020" />}
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
            onPress={handleConfirmCloseShift}
            disabled={isSubmitting || !hasEnteredCash}
            className={`flex-1 py-3 rounded-xl items-center justify-center min-h-[48px] ${
              isSubmitting || !hasEnteredCash
                ? 'bg-stone-300 opacity-60'
                : 'bg-[#800020] active:bg-[#600018]'
            }`}
          >
            <Text className="text-base font-extrabold text-white">
              {isSubmitting ? 'Closing Day...' : 'Confirm & Lock Z-Close'}
            </Text>
          </Pressable>
        </View>
      }
    >
      <View className="flex-col">
        <ShiftExpectedCashHero
          expectedCash={expectedCash}
          outgoingStaffName={currentUser?.displayName || 'Floor Supervisor'}
          openTabCount={openTabCount}
          onQuickMatch={handleQuickMatchExpected}
        />

        <View className="mb-4">
          <View className="flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
            <Text className="text-base font-bold text-stone-700">
              Actual Counted Cash in Drawer:
            </Text>
            <Pressable
              onPress={() => setShowDenominationCounter(!showDenominationCounter)}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 active:bg-stone-200 min-h-[48px] self-start sm:self-auto"
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

        {showDenominationCounter && (
          <CashDenominationCounter
            onApplyTotal={handleApplyDenominationTotal}
            expectedCash={expectedCash}
          />
        )}

        <ShiftReconciliationControls
          variance={variance}
          hasEnteredCash={hasEnteredCash}
          autoPrintThermal={autoPrintThermal}
          autoDownloadExcel={autoDownloadExcel}
          onTogglePrintThermal={() => setAutoPrintThermal(!autoPrintThermal)}
          onToggleDownloadExcel={() => setAutoDownloadExcel(!autoDownloadExcel)}
        />

        <View className="mb-4">
          <AdminInput
            label="Closing Audit Notes (Optional):"
            placeholder="E.g., Verified by Manager, safe drop executed..."
            value={notes}
            onChangeText={setNotes}
          />
        </View>
      </View>
    </AdminModal>
  );
};
