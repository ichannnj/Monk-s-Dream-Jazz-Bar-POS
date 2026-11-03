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
  ShoppingBag,
} from 'lucide-react-native';
import { TableItem, CustomerTab, TakeoutOrder } from '@/types/floor';
import { formatCurrency } from '@monks/shared';
import { useAuthStore } from '@/features/auth';
import { toast } from '@/features/shared/toast/useToastStore';
import {
  ConfirmationModal,
  PosDropdown,
  PosDropdownOption,
  useResponsive,
} from '@/features/shared';
import { styles } from './BillSettlementModal.styles';

interface BillSettlementModalProps {
  visible: boolean;
  table?: TableItem | null;
  activeTab?: CustomerTab | null;
  takeoutOrder?: TakeoutOrder | null;
  takeoutCollectAfterPay?: boolean;
  onClose: () => void;
  onDeferTakeoutPayment?: () => void;
  onConfirmPayment: (
    mode: 'single_tab' | 'entire_table' | 'takeout',
    tabIndex: number,
    method: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    tenderedAmount?: number
  ) => void;
}

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
  const { isMobile } = useResponsive();
  const { currentUser } = useAuthStore();
  const [settlementMode, setSettlementMode] = useState<'single_tab' | 'entire_table'>('single_tab');
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'card' | 'digital_wallet' | 'comp'>(
    'cash'
  );
  const [tenderedCash, setTenderedCash] = useState<string>('');
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const isTakeout = Boolean(takeoutOrder);
  if (!table && !takeoutOrder) return null;

  // Determine amount
  const subtotal = isTakeout
    ? takeoutOrder?.total || 0
    : settlementMode === 'single_tab' && activeTab
      ? activeTab.totalAmount
      : table?.totalAmount || 0;

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
        isTakeout ? 'takeout' : settlementMode,
        activeTab?.tabIndex || 1,
        selectedMethod,
        selectedMethod === 'cash' ? numericTendered : undefined
      );
      setTenderedCash('');
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

  const activeTabsCount = isTakeout
    ? 1
    : table?.tabs && table.tabs.length > 0
      ? table.tabs.filter((t) => t.status !== 'closed').length
      : table?.activeTabs.length || 1;

  const scopeOptions: PosDropdownOption<'single_tab' | 'entire_table'>[] = [
    {
      value: 'single_tab',
      label: `Individual Tab (${activeTab?.guestName || 'Selected Guest'})`,
      icon: Receipt,
    },
    {
      value: 'entire_table',
      label: `Entire Table Group (All ${activeTabsCount} Tabs)`,
      icon: Sparkles,
    },
  ];

  const paymentMethodOptions: PosDropdownOption<'cash' | 'card' | 'digital_wallet' | 'comp'>[] = [
    {
      value: 'cash',
      label: 'Cash Tender',
      description: 'Physical bills & coins with change calculation',
      icon: Banknote,
    },
    {
      value: 'card',
      label: 'Credit / Debit Card (Terminal)',
      description: 'External bank POS card terminal settlement',
      icon: CreditCard,
    },
    {
      value: 'digital_wallet',
      label: 'GCash / Maya QR Wallet',
      description: 'Digital QR wallet payment confirmation',
      icon: QrCode,
    },
    {
      value: 'comp',
      label: 'House Comp (100% Complimentary)',
      description: 'Musician or managerial complimentary check',
      icon: Gift,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, isMobile && { padding: 8 }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close modal"
        />
        <View style={[styles.modalCard, isMobile && { padding: 16, maxHeight: '95%' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.badge, isTakeout && { backgroundColor: '#15803d' }]}>
                {isTakeout ? (
                  <ShoppingBag size={18} color="#ffffff" strokeWidth={2.4} />
                ) : (
                  <Receipt size={18} color="#ffffff" strokeWidth={2.4} />
                )}
              </View>
              <View>
                <Text style={styles.title}>
                  {isTakeout
                    ? takeoutCollectAfterPay
                      ? 'Takeout Settlement & Hand-off'
                      : 'Takeout Counter Settlement'
                    : 'Checkout & Bill Settlement'}
                </Text>
                <Text style={styles.subtitle}>
                  {isTakeout
                    ? `Takeout #${takeoutOrder?.ticketNumber} • ${takeoutOrder?.customerName} (${takeoutOrder?.items.length || 0} items)`
                    : table
                      ? `${
                          table.code.toLowerCase().startsWith('cafe') ||
                          table.code.toLowerCase().startsWith('bar')
                            ? table.code
                            : `${table.area === 'bar' ? 'Bar' : 'Cafe'} ${table.code}`
                        } • ${table.area === 'bar' ? 'Bar Area' : 'Cafe Area'}`
                      : ''}
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

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Settlement Scope Dropdown if multiple tabs on Dine-In */}
            {!isTakeout && activeTabsCount > 1 ? (
              <View className="mb-4">
                <PosDropdown
                  options={scopeOptions}
                  value={settlementMode}
                  onChange={setSettlementMode}
                  prefixLabel="Scope:"
                  sheetTitle="Select Settlement Scope"
                  className="w-full"
                />
              </View>
            ) : null}

            {/* Split Content: Left Payment Controls, Right Thermal Receipt Mockup */}
            <View style={[styles.splitRow, isMobile && { flexDirection: 'column', gap: 14 }]}>
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

                {/* Payment Method Dropdown */}
                <View className="mb-4">
                  <PosDropdown
                    options={paymentMethodOptions}
                    value={selectedMethod}
                    onChange={setSelectedMethod}
                    prefixLabel="Tender:"
                    sheetTitle="Select Payment Method"
                    className="w-full"
                  />
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
                  <View
                    style={[styles.checkboxBox, shouldPrintReceipt && styles.checkboxBoxActive]}
                  >
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
                    <Text style={styles.receiptMeta}>
                      {isTakeout
                        ? `TAKEOUT: #${takeoutOrder?.ticketNumber}`
                        : `TABLE: Table ${table?.code || ''}`}
                    </Text>
                    <Text style={styles.receiptMeta}>
                      GUEST:{' '}
                      {isTakeout
                        ? takeoutOrder?.customerName || 'Walk-in'
                        : activeTab?.guestName || 'Table Guest'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptMeta}>
                      DATE: {new Date().toISOString().slice(0, 10)}
                    </Text>
                    <Text style={styles.receiptMeta}>
                      TIME:{' '}
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={styles.receiptMeta}>
                    CASHIER: {currentUser?.displayName || 'Coltrane'}
                  </Text>
                  <Text style={styles.receiptDivider}>--------------------------------</Text>

                  {/* Items */}
                  {(isTakeout ? takeoutOrder?.items || [] : activeTab?.items || [])
                    .filter((item) => item.status !== 'cancelled')
                    .slice(0, 6)
                    .map((item, idx) => (
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
          </ScrollView>

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
        </View>
      </View>

      <ConfirmationModal
        visible={isConfirmModalOpen}
        title={`Confirm Payment of ${formatCurrency(grandTotal)}?`}
        message={
          isTakeout
            ? `Takeout #${takeoutOrder?.ticketNumber} (${takeoutOrder?.customerName}) via ${selectedMethod
                .toUpperCase()
                .replace('_', ' ')}. ${
                takeoutCollectAfterPay
                  ? 'This will record payment, print the receipt, and mark the order as collected.'
                  : 'This will record payment, print the receipt, and keep the ticket active on KDS until collected.'
              }`
            : `Table ${table?.code || ''} • ${
                settlementMode === 'single_tab'
                  ? activeTab?.guestName || `Tab #${activeTab?.tabIndex || 1}`
                  : 'Entire Table'
              } via ${selectedMethod.toUpperCase().replace('_', ' ')}. This will finalize the tab and send the receipt to the printer.`
        }
        confirmText={
          isTakeout && takeoutCollectAfterPay ? 'Pay & Complete Hand-off' : 'Complete Settlement'
        }
        cancelText="Back"
        variant="success"
        onConfirm={handleFinalizePayment}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </Modal>
  );
};
