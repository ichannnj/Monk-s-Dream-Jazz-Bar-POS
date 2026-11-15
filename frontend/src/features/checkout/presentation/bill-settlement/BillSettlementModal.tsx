import React, { useState } from 'react';
import { View, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useResponsive, useVirtualKeyboard } from '@/features/shared';
import { styles } from './BillSettlementModal.styles';
import { BillSettlementModalProps } from './components/billSettlement.types';
import { useBillSettlementController } from './components/useBillSettlementController';
import { BillModalHeaderAndScope } from './components/BillModalHeaderAndScope';
import { BillSeniorPwdDiscountSection } from './components/BillSeniorPwdDiscountSection';
import { BillPaymentMethodPane } from './components/BillPaymentMethodPane';
import { BillThermalReceiptMockup } from './components/BillThermalReceiptMockup';
import { BillConfirmSettlementDialog } from './components/BillConfirmSettlementDialog';
import type { QrPaymentChannel } from '../../data/qrPaymentChannels.api';

export const BillSettlementModal: React.FC<BillSettlementModalProps> = ({
  visible,
  table,
  activeTab,
  takeoutOrder,
  takeoutCollectAfterPay = false,
  onClose,
  onDeferTakeoutPayment,
  onConfirmPayment,
}) => {
  const { isMobile, width, height } = useResponsive();
  const isShortHeight = height < 520;
  const showReceiptMockup = !isMobile && width >= 900 && height >= 520;
  const isStackedLayout = isMobile || width < 900;
  const { isKeyboardOpen, keyboardHeight, viewportHeight, dismissKeyboard } = useVirtualKeyboard();
  const [fullscreenQrTarget, setFullscreenQrTarget] = useState<{
    channel: QrPaymentChannel;
    amount: number;
  } | null>(null);

  const ctrl = useBillSettlementController({
    visible,
    table,
    activeTab,
    takeoutOrder,
    onClose,
    onConfirmPayment,
  });

  if (!table && !takeoutOrder) return null;

  const activeTabsCount = table?.tabs ? table.tabs.filter((t) => t.status === 'open').length : 1;

  const handleBackdropPress = () => {
    if (isKeyboardOpen) {
      dismissKeyboard();
    }
    onClose();
  };

  const handleOpenSplitQr = (channel: QrPaymentChannel, amount: number) => {
    setFullscreenQrTarget({ channel, amount });
    ctrl.setIsFullscreenQrOpen(true);
  };

  const handleCloseFullscreenQr = (open: boolean) => {
    ctrl.setIsFullscreenQrOpen(open);
    if (!open) {
      setFullscreenQrTarget(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          (isMobile || isShortHeight) && { padding: 8 },
          isKeyboardOpen && {
            justifyContent: 'flex-start',
            paddingTop: 8,
            paddingBottom: Math.min(keyboardHeight, 320) + 16,
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleBackdropPress}
          accessibilityLabel="Close modal"
        />
        <View
          style={[
            styles.modalCard,
            (isMobile || isShortHeight) && { padding: 12 },
            isShortHeight && { maxHeight: '98%' },
            isKeyboardOpen
              ? { maxHeight: Math.max(260, viewportHeight - 20) }
              : isMobile && { maxHeight: '95%' },
          ]}
        >
          <BillModalHeaderAndScope
            isTakeout={ctrl.isTakeout}
            takeoutOrder={takeoutOrder}
            table={table}
            activeTab={activeTab}
            activeTabsCount={activeTabsCount}
            settlementMode={ctrl.settlementMode}
            setSettlementMode={ctrl.setSettlementMode}
            grandTotal={ctrl.grandTotal}
            onClose={onClose}
            isShortHeight={isShortHeight}
          />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={isKeyboardOpen ? { paddingBottom: 48 } : { paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[styles.splitRow, isStackedLayout && { flexDirection: 'column', gap: 14 }]}
            >
              {/* Left Column: Discounts & Payment Method */}
              <View style={[styles.leftCol, !showReceiptMockup && { flex: 1 }]}>
                <BillSeniorPwdDiscountSection
                  discountType={ctrl.discountType}
                  setDiscountType={ctrl.setDiscountType}
                  totalDiscountAmount={ctrl.billing.totalDiscountAmount}
                  seniorPwdId={ctrl.seniorPwdId}
                  setSeniorPwdId={ctrl.setSeniorPwdId}
                  seniorPwdName={ctrl.seniorPwdName}
                  setSeniorPwdName={ctrl.setSeniorPwdName}
                  seniorItemSelectionMode={ctrl.seniorItemSelectionMode}
                  setSeniorItemSelectionMode={ctrl.setSeniorItemSelectionMode}
                  selectedSeniorItemIds={ctrl.selectedSeniorItemIds}
                  setSelectedSeniorItemIds={ctrl.setSelectedSeniorItemIds}
                  customDiscountValue={ctrl.customDiscountValue}
                  setCustomDiscountValue={ctrl.setCustomDiscountValue}
                  customDiscountMode={ctrl.customDiscountMode}
                  setCustomDiscountMode={ctrl.setCustomDiscountMode}
                  rawItems={ctrl.rawItems}
                />

                <BillPaymentMethodPane
                  tenderTabMode={ctrl.tenderTabMode}
                  setTenderTabMode={ctrl.setTenderTabMode}
                  selectedMethod={ctrl.selectedMethod}
                  setSelectedMethod={ctrl.setSelectedMethod}
                  splitTenders={ctrl.splitTenders}
                  splitBalance={ctrl.splitBalance}
                  splitValidation={ctrl.splitValidation}
                  onAddTender={ctrl.handleAddTender}
                  onUpdateTender={ctrl.handleUpdateTender}
                  onRemoveTender={ctrl.handleRemoveTender}
                  onFillRemaining={ctrl.handleFillRemaining}
                  onOpenFullscreenQr={handleOpenSplitQr}
                  quickCashOptions={ctrl.quickCashOptions}
                  numericTendered={ctrl.numericTendered}
                  tenderedCash={ctrl.tenderedCash}
                  setTenderedCash={ctrl.setTenderedCash}
                  grandTotal={ctrl.grandTotal}
                  isPaymentValid={ctrl.isPaymentValid}
                  changeDue={ctrl.changeDue}
                  isLoadingQrChannels={ctrl.isLoadingQrChannels}
                  qrChannels={ctrl.qrChannels}
                  selectedQrChannel={ctrl.selectedQrChannel}
                  setSelectedQrChannel={ctrl.setSelectedQrChannel}
                  setIsFullscreenQrOpen={ctrl.setIsFullscreenQrOpen}
                  referenceNumber={ctrl.referenceNumber}
                  setReferenceNumber={ctrl.setReferenceNumber}
                  isRefNumberValid={ctrl.isRefNumberValid}
                  shouldPrintReceipt={ctrl.shouldPrintReceipt}
                  setShouldPrintReceipt={ctrl.setShouldPrintReceipt}
                />
              </View>

              {/* Right Column: Thermal Receipt Preview (Desktop & Tall Tablets Only) */}
              {showReceiptMockup ? (
                <BillThermalReceiptMockup
                  isTakeout={ctrl.isTakeout}
                  takeoutOrder={takeoutOrder}
                  activeTab={activeTab}
                  table={table}
                  operatingMode={ctrl.effectiveOperatingMode}
                  currentUserDisplayName={ctrl.currentUser?.displayName}
                  rawItems={ctrl.rawItems}
                  subtotal={ctrl.subtotal}
                  billing={ctrl.billing}
                  discountType={ctrl.discountType}
                  serviceCharge={ctrl.serviceCharge}
                  grandTotal={ctrl.grandTotal}
                  tenderTabMode={ctrl.tenderTabMode}
                  splitTenders={ctrl.splitTenders}
                  selectedMethod={ctrl.selectedMethod}
                  selectedQrChannel={ctrl.selectedQrChannel}
                  isRefNumberValid={ctrl.isRefNumberValid}
                  referenceNumber={ctrl.referenceNumber}
                  numericTendered={ctrl.numericTendered}
                  changeDue={ctrl.changeDue}
                  vatableSales={ctrl.vatableSales}
                  vatAmount={ctrl.vatAmount}
                  vatExemptSales={ctrl.vatExemptSales}
                  seniorPwdId={ctrl.seniorPwdId}
                  seniorPwdName={ctrl.seniorPwdName}
                />
              ) : null}
            </View>
          </ScrollView>

          {/* Dialogs and Actions */}
          <BillConfirmSettlementDialog
            isTakeout={ctrl.isTakeout}
            takeoutOrder={takeoutOrder}
            takeoutCollectAfterPay={takeoutCollectAfterPay}
            onDeferTakeoutPayment={onDeferTakeoutPayment}
            onClose={onClose}
            handleOpenConfirm={ctrl.handleOpenConfirm}
            isPaymentValid={ctrl.isPaymentValid}
            grandTotal={ctrl.grandTotal}
            isConfirmModalOpen={ctrl.isConfirmModalOpen}
            setIsConfirmModalOpen={ctrl.setIsConfirmModalOpen}
            isSubmitting={ctrl.isSubmitting}
            handleFinalizePayment={ctrl.handleFinalizePayment}
            tenderTabMode={ctrl.tenderTabMode}
            splitTenders={ctrl.splitTenders}
            selectedMethod={ctrl.selectedMethod}
            selectedQrChannel={ctrl.selectedQrChannel}
            referenceNumber={ctrl.referenceNumber}
            table={table}
            settlementMode={ctrl.settlementMode}
            activeTab={activeTab}
            isFullscreenQrOpen={ctrl.isFullscreenQrOpen}
            setIsFullscreenQrOpen={handleCloseFullscreenQr}
            fullscreenQrTarget={fullscreenQrTarget}
            handlePrintBillStatement={ctrl.handlePrintBillStatement}
            isPrintingBill={ctrl.isPrintingBill}
          />
        </View>
      </View>
    </Modal>
  );
};
export default BillSettlementModal;
