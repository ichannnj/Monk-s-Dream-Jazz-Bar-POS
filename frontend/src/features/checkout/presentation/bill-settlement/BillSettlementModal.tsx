import React, { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  Gift,
  Printer,
  CheckCircle2,
  Receipt,
  Sparkles,
} from 'lucide-react-native';
import { TableItem, CustomerTab } from '../../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { toast } from '../../../shared/toast/useToastStore';
import { ConfirmationModal } from '../../../../components/shared/ConfirmationModal';
import { styles } from './BillSettlementModal.styles';

interface BillSettlementModalProps {
  visible: boolean;
  table: TableItem | null;
  activeTab?: CustomerTab | null;
  onClose: () => void;
  onConfirmPayment: (
    mode: 'single_tab' | 'entire_table',
    tabIndex: number,
    method: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    tenderedAmount?: number
  ) => void;
}

export const BillSettlementModal: React.FC<BillSettlementModalProps> = ({
  visible,
  table,
  activeTab,
  onClose,
  onConfirmPayment,
}) => {
  const [settlementMode, setSettlementMode] = useState<'single_tab' | 'entire_table'>('single_tab');
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'card' | 'digital_wallet' | 'comp'>(
    'cash'
  );
  const [tenderedCash, setTenderedCash] = useState<string>('');
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  if (!table) return null;

  // Determine amount
  const subtotal =
    settlementMode === 'single_tab' && activeTab ? activeTab.totalAmount : table.totalAmount || 0;

  const tax = subtotal * 0.1;
  const grandTotal = subtotal + tax;

  // Tendered cash calculation
  const numericTendered = parseFloat(tenderedCash) || 0;
  const changeDue = Math.max(0, numericTendered - grandTotal);

  // Strict payment validation guard
  const isPaymentValid =
    selectedMethod === 'cash' ? numericTendered >= grandTotal && numericTendered > 0 : true;

  const handleOpenConfirm = () => {
    if (!isPaymentValid) {
      if (selectedMethod === 'cash') {
        toast.warning(
          numericTendered === 0
            ? `Please enter cash tendered (min. ${formatCurrency(grandTotal)})`
            : `Tendered amount (${formatCurrency(numericTendered)}) is less than total due (${formatCurrency(grandTotal)})`,
          { title: 'Invalid Cash Input' }
        );
      }
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleFinalizePayment = () => {
    try {
      onConfirmPayment(
        settlementMode,
        activeTab?.tabIndex || 1,
        selectedMethod,
        selectedMethod === 'cash' ? numericTendered : undefined
      );
      setIsConfirmModalOpen(false);
      onClose();
    } catch (err: any) {
      toast.error(
        err?.message || 'Payment processing failed. Please check cash drawer or printer.',
        {
          title: 'Payment Error',
        }
      );
    }
  };

  const quickCashOptions = [
    grandTotal,
    Math.ceil(grandTotal / 100) * 100,
    Math.ceil(grandTotal / 500) * 500,
    Math.ceil(grandTotal / 1000) * 1000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= grandTotal);

  const activeTabsCount =
    table.tabs && table.tabs.length > 0
      ? table.tabs.filter((t) => t.status !== 'closed').length
      : table.activeTabs.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close modal"
        />
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.badge}>
                <Receipt size={18} color="#ffffff" strokeWidth={2.4} />
              </View>
              <View>
                <Text style={styles.title}>Checkout & Bill Settlement</Text>
                <Text style={styles.subtitle}>
                  {table.code.toLowerCase().startsWith('cafe') ||
                  table.code.toLowerCase().startsWith('bar')
                    ? table.code
                    : `${table.area === 'bar' ? 'Bar' : 'Cafe'} ${table.code}`}{' '}
                  • {table.area === 'bar' ? 'Bar Area' : 'Cafe Area'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close bill settlement"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Settlement Scope Toggle if multiple tabs */}
          {activeTabsCount > 1 ? (
            <View style={styles.scopeToggleRow}>
              <Pressable
                onPress={() => setSettlementMode('single_tab')}
                style={[
                  styles.scopeOption,
                  settlementMode === 'single_tab' && styles.scopeOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.scopeOptionText,
                    settlementMode === 'single_tab' && styles.scopeOptionTextActive,
                  ]}
                >
                  Individual Tab ({activeTab?.guestName || 'Selected Guest'})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSettlementMode('entire_table')}
                style={[
                  styles.scopeOption,
                  settlementMode === 'entire_table' && styles.scopeOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.scopeOptionText,
                    settlementMode === 'entire_table' && styles.scopeOptionTextActive,
                  ]}
                >
                  Table Group Settle (All {activeTabsCount} Tabs)
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Split Content: Left Payment Controls, Right Thermal Receipt Mockup */}
          <View style={styles.splitRow}>
            {/* LEFT COLUMN: PAYMENT METHOD & CASH CALCULATOR */}
            <View style={styles.leftCol}>
              {/* Total Display Card */}
              <View style={styles.totalDisplayCard}>
                <Text style={styles.totalCardLabel}>Balance Due</Text>
                <Text style={styles.totalCardAmount}>{formatCurrency(grandTotal)}</Text>
                <Text style={styles.totalCardSub}>
                  Subtotal: {formatCurrency(subtotal)} + VAT (10%): {formatCurrency(tax)}
                </Text>
              </View>

              {/* Payment Methods */}
              <Text style={styles.sectionLabel}>Select Payment Method:</Text>
              <View style={styles.methodGrid}>
                {/* Cash */}
                <Pressable
                  onPress={() => setSelectedMethod('cash')}
                  style={[styles.methodBtn, selectedMethod === 'cash' && styles.methodBtnActive]}
                >
                  <Banknote size={18} color={selectedMethod === 'cash' ? '#ffffff' : '#15803d'} />
                  <Text
                    style={[
                      styles.methodBtnText,
                      selectedMethod === 'cash' && styles.methodBtnTextActive,
                    ]}
                  >
                    Cash
                  </Text>
                </Pressable>

                {/* Card */}
                <Pressable
                  onPress={() => setSelectedMethod('card')}
                  style={[styles.methodBtn, selectedMethod === 'card' && styles.methodBtnActive]}
                >
                  <CreditCard size={18} color={selectedMethod === 'card' ? '#ffffff' : '#2563eb'} />
                  <Text
                    style={[
                      styles.methodBtnText,
                      selectedMethod === 'card' && styles.methodBtnTextActive,
                    ]}
                  >
                    Card (Terminal)
                  </Text>
                </Pressable>

                {/* Digital Wallet */}
                <Pressable
                  onPress={() => setSelectedMethod('digital_wallet')}
                  style={[
                    styles.methodBtn,
                    selectedMethod === 'digital_wallet' && styles.methodBtnActive,
                  ]}
                >
                  <QrCode
                    size={18}
                    color={selectedMethod === 'digital_wallet' ? '#ffffff' : '#7c3aed'}
                  />
                  <Text
                    style={[
                      styles.methodBtnText,
                      selectedMethod === 'digital_wallet' && styles.methodBtnTextActive,
                    ]}
                  >
                    QR Wallet
                  </Text>
                </Pressable>

                {/* Comp */}
                <Pressable
                  onPress={() => setSelectedMethod('comp')}
                  style={[styles.methodBtn, selectedMethod === 'comp' && styles.methodBtnActive]}
                >
                  <Gift size={18} color={selectedMethod === 'comp' ? '#ffffff' : '#d97706'} />
                  <Text
                    style={[
                      styles.methodBtnText,
                      selectedMethod === 'comp' && styles.methodBtnTextActive,
                    ]}
                  >
                    House Comp
                  </Text>
                </Pressable>
              </View>

              {/* Cash Denominations Pad if Cash Selected */}
              {selectedMethod === 'cash' ? (
                <View style={styles.cashSection}>
                  <Text style={styles.sectionLabel}>Quick Cash Denominations:</Text>
                  <View style={styles.quickCashRow}>
                    {quickCashOptions.map((opt, i) => (
                      <Pressable
                        key={i}
                        onPress={() => setTenderedCash(opt.toString())}
                        style={[
                          styles.quickCashChip,
                          numericTendered === opt && styles.quickCashChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.quickCashText,
                            numericTendered === opt && styles.quickCashTextActive,
                          ]}
                        >
                          {formatCurrency(opt)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.tenderedInputRow}>
                    <Text style={styles.inputPrefix}>Tendered: ₱</Text>
                    <TextInput
                      style={styles.tenderedInput}
                      keyboardType="numeric"
                      placeholder={grandTotal.toFixed(2)}
                      placeholderTextColor="#9ca3af"
                      value={tenderedCash}
                      onChangeText={setTenderedCash}
                    />
                  </View>

                  {/* Cash Validation Warning */}
                  {!isPaymentValid ? (
                    <View
                      style={{
                        backgroundColor: '#fef2f2',
                        borderWidth: 1,
                        borderColor: '#fecdd3',
                        borderRadius: 10,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        marginBottom: 10,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#dc2626' }}>
                        {numericTendered === 0
                          ? `⚠️ Cash tendered required (min. ${formatCurrency(grandTotal)})`
                          : `⚠️ Tendered amount is less than total due (${formatCurrency(grandTotal)})`}
                      </Text>
                    </View>
                  ) : null}

                  {/* Change Due Banner */}
                  <View style={styles.changeDueBanner}>
                    <Text style={styles.changeDueLabel}>Change Due to Guest:</Text>
                    <Text style={styles.changeDueAmount}>{formatCurrency(changeDue)}</Text>
                  </View>
                </View>
              ) : null}

              {/* Print Receipt Toggle */}
              <Pressable
                onPress={() => setShouldPrintReceipt(!shouldPrintReceipt)}
                style={styles.printCheckboxRow}
              >
                <View style={[styles.checkboxBox, shouldPrintReceipt && styles.checkboxBoxActive]}>
                  {shouldPrintReceipt ? <CheckCircle2 size={14} color="#ffffff" /> : null}
                </View>
                <Printer size={16} color="#4b5563" />
                <Text style={styles.printCheckboxText}>
                  Send Print Trigger to USB Printer PC (ESC/POS Receipt)
                </Text>
              </Pressable>
            </View>

            {/* RIGHT COLUMN: THERMAL RECEIPT MOCKUP PREVIEW */}
            <View style={styles.rightCol}>
              <View style={styles.receiptPaper}>
                {/* Receipt Header */}
                <Text style={styles.receiptLogo}>MONK'S DREAM JAZZ BAR</Text>
                <Text style={styles.receiptTagline}>Specialty Coffee & Jazz Bar</Text>
                <Text style={styles.receiptDivider}>--------------------------------</Text>

                {/* Meta */}
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptMeta}>TABLE: Table {table.code}</Text>
                  <Text style={styles.receiptMeta}>
                    GUEST: {activeTab?.guestName || 'Table Guest'}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptMeta}>DATE: 2026-10-17</Text>
                  <Text style={styles.receiptMeta}>TIME: 21:15</Text>
                </View>
                <Text style={styles.receiptMeta}>CASHIER: Coltrane</Text>
                <Text style={styles.receiptDivider}>--------------------------------</Text>

                {/* Items */}
                {(activeTab?.items || []).slice(0, 4).map((item, idx) => (
                  <View key={idx} style={styles.receiptRow}>
                    <Text style={styles.receiptItemName}>
                      {item.quantity}x {item.productName.slice(0, 18)}
                    </Text>
                    <Text style={styles.receiptItemPrice}>
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </Text>
                  </View>
                ))}
                <Text style={styles.receiptDivider}>--------------------------------</Text>

                {/* Totals */}
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptMeta}>SUBTOTAL:</Text>
                  <Text style={styles.receiptMeta}>{formatCurrency(subtotal)}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptMeta}>TAX (10%):</Text>
                  <Text style={styles.receiptMeta}>{formatCurrency(tax)}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptBold}>TOTAL PAID:</Text>
                  <Text style={styles.receiptBold}>{formatCurrency(grandTotal)}</Text>
                </View>
                <Text style={styles.receiptDivider}>================================</Text>
                <Text style={styles.receiptFooter}>Thank you for jamming with us!</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.footerRow}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Back</Text>
            </Pressable>

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
                Confirm Payment & Print Receipt ({formatCurrency(grandTotal)})
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ConfirmationModal
        visible={isConfirmModalOpen}
        title={`Confirm Payment of ${formatCurrency(grandTotal)}?`}
        message={`Table ${table.code} • ${
          settlementMode === 'single_tab'
            ? activeTab?.guestName || `Tab #${activeTab?.tabIndex || 1}`
            : 'Entire Table'
        } via ${selectedMethod.toUpperCase().replace('_', ' ')}. This will finalize the tab and send the receipt to the printer.`}
        confirmText="Complete Settlement"
        cancelText="Back"
        variant="success"
        onConfirm={handleFinalizePayment}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </Modal>
  );
};
