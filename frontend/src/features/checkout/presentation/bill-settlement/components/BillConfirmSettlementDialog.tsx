import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { ConfirmationModal } from '@/features/shared';
import { FullscreenQrModal } from '../../components/FullscreenQrModal';
import { QrPaymentChannel } from '../../../data/qrPaymentChannels.api';
import { styles } from '../BillSettlementModal.styles';

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
  handleFinalizePayment: () => void;
  selectedMethod: string;
  selectedQrChannel: QrPaymentChannel | null;
  referenceNumber: string;
  table?: any;
  settlementMode: string;
  activeTab?: any;
  isFullscreenQrOpen: boolean;
  setIsFullscreenQrOpen: (open: boolean) => void;
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
  handleFinalizePayment,
  selectedMethod,
  selectedQrChannel,
  referenceNumber,
  table,
  settlementMode,
  activeTab,
  isFullscreenQrOpen,
  setIsFullscreenQrOpen,
}) => {
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

        <Pressable
          onPress={handleOpenConfirm}
          disabled={!isPaymentValid}
          style={[
            styles.confirmPayBtn,
            isTakeout && { backgroundColor: '#15803d' },
            !isPaymentValid && { opacity: 0.5, backgroundColor: '#9ca3af' },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Confirm payment of ${formatCurrency(grandTotal)}`}
        >
          <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.4} />
          <Text style={styles.confirmPayBtnText}>
            {isTakeout && takeoutCollectAfterPay
              ? `Confirm Payment & Hand Off (${formatCurrency(grandTotal)})`
              : `Confirm Payment & Print Receipt (${formatCurrency(grandTotal)})`}
          </Text>
        </Pressable>
      </View>

      <ConfirmationModal
        visible={isConfirmModalOpen}
        title={`Confirm Payment of ${formatCurrency(grandTotal)}?`}
        message={
          isTakeout
            ? `Takeout #${takeoutOrder?.ticketNumber} (${takeoutOrder?.customerName}) via ${
                selectedMethod === 'digital_wallet' && selectedQrChannel
                  ? `${selectedQrChannel.name} (Ref: #${referenceNumber})`
                  : selectedMethod.toUpperCase().replace('_', ' ')
              }. ${
                takeoutCollectAfterPay
                  ? 'This will record payment, print the receipt, and mark the order as collected.'
                  : 'This will record payment, print the receipt, and keep the ticket active on KDS until collected.'
              }`
            : `Table ${table?.code || ''} • ${
                settlementMode === 'single_tab'
                  ? activeTab?.guestName || `Tab #${activeTab?.tabIndex || 1}`
                  : 'Entire Table'
              } via ${
                selectedMethod === 'digital_wallet' && selectedQrChannel
                  ? `${selectedQrChannel.name} (Ref: #${referenceNumber})`
                  : selectedMethod.toUpperCase().replace('_', ' ')
              }. This will finalize the tab and send the receipt to the printer.`
        }
        confirmText={
          isTakeout && takeoutCollectAfterPay ? 'Pay & Complete Hand-off' : 'Complete Settlement'
        }
        cancelText="Back"
        variant="success"
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
