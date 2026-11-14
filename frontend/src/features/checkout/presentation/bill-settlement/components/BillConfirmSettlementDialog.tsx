import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { CheckCircle2, Printer } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { ConfirmationModal } from '@/features/shared';
import { FullscreenQrModal } from '../../components/FullscreenQrModal';
import { QrPaymentChannel } from '../../../data/qrPaymentChannels.api';
import { styles } from '../BillSettlementModal.styles';
import type { PaymentTender } from '../../../domain/splitTender.types';

interface BillConfirmSettlementDialogProps {
  isTakeout: boolean;
  takeoutOrder?: any;
  takeoutCollectAfterPay: boolean;
  onDeferTakeoutPayment?: () => void;
  onClose: () => void;
  handleOpenConfirm: () => void;
  isPaymentValid: boolean;
  grandTotal: number;
  isConfirmModalOpen: boolean;
  setIsConfirmModalOpen: (open: boolean) => void;
  isSubmitting?: boolean;
  handleFinalizePayment: () => void;
  tenderTabMode?: 'single' | 'split';
  splitTenders?: PaymentTender[];
  selectedMethod: string;
  selectedQrChannel: QrPaymentChannel | null;
  referenceNumber: string;
  table?: any;
  settlementMode: string;
  activeTab?: any;
  isFullscreenQrOpen: boolean;
  setIsFullscreenQrOpen: (open: boolean) => void;
  handlePrintBillStatement?: () => void;
  isPrintingBill?: boolean;
}

export const BillConfirmSettlementDialog: React.FC<BillConfirmSettlementDialogProps> = ({
  isTakeout,
  takeoutOrder,
  takeoutCollectAfterPay,
  onDeferTakeoutPayment,
  onClose,
  handleOpenConfirm,
  isPaymentValid,
  grandTotal,
  isConfirmModalOpen,
  setIsConfirmModalOpen,
  isSubmitting = false,
  handleFinalizePayment,
  tenderTabMode = 'single',
  splitTenders = [],
  selectedMethod,
  selectedQrChannel,
  referenceNumber,
  table,
  settlementMode,
  activeTab,
  isFullscreenQrOpen,
  setIsFullscreenQrOpen,
  handlePrintBillStatement,
  isPrintingBill = false,
}) => {
  const paymentSummaryText =
    tenderTabMode === 'split'
      ? `SPLIT-TENDER (${splitTenders.length} payment lines: ${splitTenders.map((t) => `${t.method.toUpperCase()} ₱${t.amount}`).join(', ')})`
      : selectedMethod === 'digital_wallet' && selectedQrChannel
        ? `${selectedQrChannel.name} (Ref: #${referenceNumber})`
        : selectedMethod.toUpperCase().replace('_', ' ');

  return (
    <>
      {/* Actions */}
      <View style={styles.footerRow}>
        {isTakeout && onDeferTakeoutPayment && !takeoutCollectAfterPay ? (
          <Pressable
            onPress={() => {
              onDeferTakeoutPayment();
              onClose();
            }}
            style={styles.cancelBtn}
            accessibilityRole="button"
            accessibilityLabel="Defer takeout payment to pickup"
          >
            <Text style={styles.cancelBtnText}>Pay on Pickup (DUE)</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Back</Text>
          </Pressable>
        )}

        {handlePrintBillStatement && (
          <Pressable
            onPress={handlePrintBillStatement}
            disabled={isPrintingBill}
            style={[styles.printBillBtn, isPrintingBill && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Print pre-payment bill statement"
          >
            <Printer size={18} color="#810021" strokeWidth={2.4} />
            <Text style={styles.printBillBtnText}>
              {isPrintingBill ? 'Printing...' : 'Print Bill'}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleOpenConfirm}
          disabled={!isPaymentValid}
          style={[
            styles.confirmPayBtn,
            !isPaymentValid && { opacity: 0.5, backgroundColor: '#9ca3af' },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Confirm payment of ${formatCurrency(grandTotal)}`}
        >
          <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.4} />
          <Text style={styles.confirmPayBtnText}>
            {isTakeout && takeoutCollectAfterPay
              ? `Confirm & Hand Off · ${formatCurrency(grandTotal)}`
              : `Confirm & Settle · ${formatCurrency(grandTotal)}`}
          </Text>
        </Pressable>
      </View>

      <ConfirmationModal
        visible={isConfirmModalOpen}
        title={`Confirm Payment of ${formatCurrency(grandTotal)}?`}
        message={
          isTakeout
            ? `Takeout #${takeoutOrder?.ticketNumber} (${takeoutOrder?.customerName}) via ${paymentSummaryText}. ${
                takeoutCollectAfterPay
                  ? 'This will record payment, print the receipt, and mark the order as collected.'
                  : 'This will record payment, print the receipt, and keep the ticket active on KDS until collected.'
              }`
            : `Table ${table?.code || ''} • ${
                settlementMode === 'single_tab'
                  ? activeTab?.guestName || `Tab #${activeTab?.tabIndex || 1}`
                  : 'Entire Table'
              } via ${paymentSummaryText}. This will finalize the tab and send the receipt to the printer.`
        }
        confirmText={
          isTakeout && takeoutCollectAfterPay ? 'Pay & Complete Hand-off' : 'Complete Settlement'
        }
        cancelText="Back"
        variant="success"
        isLoading={isSubmitting}
        onConfirm={handleFinalizePayment}
        onCancel={() => setIsConfirmModalOpen(false)}
      />

      {/* Guest Fullscreen QR Scan Modal */}
      <FullscreenQrModal
        visible={isFullscreenQrOpen}
        channel={selectedQrChannel}
        amount={grandTotal}
        onClose={() => setIsFullscreenQrOpen(false)}
      />
    </>
  );
};
