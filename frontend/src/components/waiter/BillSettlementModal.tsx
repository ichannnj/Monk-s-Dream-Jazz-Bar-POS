import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
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
import { TableItem, CustomerTab } from '../../mockData';

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
  if (!table) return null;

  const [settlementMode, setSettlementMode] = useState<
    'single_tab' | 'entire_table'
  >('single_tab');
  const [selectedMethod, setSelectedMethod] = useState<
    'cash' | 'card' | 'digital_wallet' | 'comp'
  >('cash');
  const [tenderedCash, setTenderedCash] = useState<string>('');
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(true);

  // Determine amount
  const subtotal =
    settlementMode === 'single_tab' && activeTab
      ? activeTab.totalAmount
      : table.totalAmount || 0;

  const tax = subtotal * 0.1;
  const grandTotal = subtotal + tax;

  // Tendered cash calculation
  const numericTendered = parseFloat(tenderedCash) || 0;
  const changeDue = Math.max(0, numericTendered - grandTotal);

  const handleConfirm = () => {
    onConfirmPayment(
      settlementMode,
      activeTab?.tabIndex || 1,
      selectedMethod,
      selectedMethod === 'cash' ? numericTendered : undefined
    );
    onClose();
  };

  const quickCashOptions = [
    grandTotal,
    Math.ceil(grandTotal / 10) * 10,
    Math.ceil(grandTotal / 50) * 50,
    100,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= grandTotal);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
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
                  Table {table.code} • {table.area === 'bar' ? 'Bar Area' : 'Cafe Area'}
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Settlement Scope Toggle if multiple tabs */}
          {table.activeTabs.length > 1 ? (
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
                  Table Group Settle (All {table.activeTabs.length} Tabs)
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
                <Text style={styles.totalCardAmount}>
                  ${grandTotal.toFixed(2)}
                </Text>
                <Text style={styles.totalCardSub}>
                  Subtotal: ${subtotal.toFixed(2)} + VAT (10%): ${tax.toFixed(2)}
                </Text>
              </View>

              {/* Payment Methods */}
              <Text style={styles.sectionLabel}>Select Payment Method:</Text>
              <View style={styles.methodGrid}>
                {/* Cash */}
                <Pressable
                  onPress={() => setSelectedMethod('cash')}
                  style={[
                    styles.methodBtn,
                    selectedMethod === 'cash' && styles.methodBtnActive,
                  ]}
                >
                  <Banknote
                    size={18}
                    color={selectedMethod === 'cash' ? '#ffffff' : '#15803d'}
                  />
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
                  style={[
                    styles.methodBtn,
                    selectedMethod === 'card' && styles.methodBtnActive,
                  ]}
                >
                  <CreditCard
                    size={18}
                    color={selectedMethod === 'card' ? '#ffffff' : '#2563eb'}
                  />
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
                      selectedMethod === 'digital_wallet' &&
                        styles.methodBtnTextActive,
                    ]}
                  >
                    QR Wallet
                  </Text>
                </Pressable>

                {/* Comp */}
                <Pressable
                  onPress={() => setSelectedMethod('comp')}
                  style={[
                    styles.methodBtn,
                    selectedMethod === 'comp' && styles.methodBtnActive,
                  ]}
                >
                  <Gift
                    size={18}
                    color={selectedMethod === 'comp' ? '#ffffff' : '#d97706'}
                  />
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
                          ${opt.toFixed(2)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.tenderedInputRow}>
                    <Text style={styles.inputPrefix}>Tendered: $</Text>
                    <TextInput
                      style={styles.tenderedInput}
                      keyboardType="numeric"
                      placeholder={grandTotal.toFixed(2)}
                      placeholderTextColor="#9ca3af"
                      value={tenderedCash}
                      onChangeText={setTenderedCash}
                    />
                  </View>

                  {/* Change Due Banner */}
                  <View style={styles.changeDueBanner}>
                    <Text style={styles.changeDueLabel}>Change Due to Guest:</Text>
                    <Text style={styles.changeDueAmount}>
                      ${changeDue.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Print Receipt Toggle */}
              <Pressable
                onPress={() => setShouldPrintReceipt(!shouldPrintReceipt)}
                style={styles.printCheckboxRow}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    shouldPrintReceipt && styles.checkboxBoxActive,
                  ]}
                >
                  {shouldPrintReceipt ? (
                    <CheckCircle2 size={14} color="#ffffff" />
                  ) : null}
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
                  <Text style={styles.receiptMeta}>
                    TABLE: Table {table.code}
                  </Text>
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
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
                <Text style={styles.receiptDivider}>--------------------------------</Text>

                {/* Totals */}
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptMeta}>SUBTOTAL:</Text>
                  <Text style={styles.receiptMeta}>${subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptMeta}>TAX (10%):</Text>
                  <Text style={styles.receiptMeta}>${tax.toFixed(2)}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptBold}>TOTAL PAID:</Text>
                  <Text style={styles.receiptBold}>
                    ${grandTotal.toFixed(2)}
                  </Text>
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

            <Pressable onPress={handleConfirm} style={styles.confirmPayBtn}>
              <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.4} />
              <Text style={styles.confirmPayBtnText}>
                Confirm Payment & Print Receipt (${grandTotal.toFixed(2)})
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 30, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 820,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#641b2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  scopeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  scopeOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  scopeOptionActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  scopeOptionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#6b7280',
  },
  scopeOptionTextActive: {
    color: '#641b2a',
  },
  splitRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  leftCol: {
    flex: 1.4,
  },
  rightCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalDisplayCard: {
    backgroundColor: '#fceeed',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fad4db',
  },
  totalCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#832238',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalCardAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#641b2a',
    marginVertical: 4,
  },
  totalCardSub: {
    fontSize: 11.5,
    color: '#832238',
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  methodBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  methodBtnActive: {
    backgroundColor: '#641b2a',
    borderColor: '#641b2a',
  },
  methodBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  methodBtnTextActive: {
    color: '#ffffff',
  },
  cashSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  quickCashRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickCashChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  quickCashChipActive: {
    backgroundColor: '#15803d',
    borderColor: '#15803d',
  },
  quickCashText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#374151',
  },
  quickCashTextActive: {
    color: '#ffffff',
  },
  tenderedInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  inputPrefix: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4b5563',
  },
  tenderedInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    paddingVertical: 8,
  },
  changeDueBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  changeDueLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#065f46',
  },
  changeDueAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#047857',
  },
  printCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: '#641b2a',
    borderColor: '#641b2a',
  },
  printCheckboxText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
    flex: 1,
  },
  receiptPaper: {
    backgroundColor: '#fffdfa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  receiptLogo: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    color: '#1f2937',
    letterSpacing: 0.5,
  },
  receiptTagline: {
    fontSize: 9.5,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 4,
  },
  receiptDivider: {
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'center',
    marginVertical: 2,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1,
  },
  receiptMeta: {
    fontSize: 10,
    color: '#4b5563',
    fontWeight: '600',
  },
  receiptItemName: {
    fontSize: 10,
    color: '#1f2937',
    fontWeight: '600',
  },
  receiptItemPrice: {
    fontSize: 10,
    color: '#1f2937',
    fontWeight: '700',
  },
  receiptBold: {
    fontSize: 11,
    fontWeight: '900',
    color: '#111827',
  },
  receiptFooter: {
    fontSize: 9.5,
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563',
  },
  confirmPayBtn: {
    flex: 2.5,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#641b2a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmPayBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
