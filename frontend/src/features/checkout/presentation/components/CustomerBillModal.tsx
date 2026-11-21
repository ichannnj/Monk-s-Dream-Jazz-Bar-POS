import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { X, Printer, CreditCard, QrCode, Receipt, CheckCircle2 } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { aggregateReceiptItems } from '@/features/printer';
import type { QrPaymentChannel } from '../../data/qrPaymentChannels.api';
import { styles } from './CustomerBillModal.styles';

const MONKS_DREAM_LOGO = require('../../../../../assets/Monks Dream Logo files-02.png');

export interface CustomerBillModalProps {
  visible: boolean;
  onClose: () => void;
  tableName?: string;
  tabLabel?: string;
  serverName?: string;
  rawItems: any[];
  subtotal: number;
  vatableSales?: number;
  vatAmount?: number;
  vatExemptSales?: number;
  corkageAmount?: number;
  serviceCharge?: number;
  discountAmount?: number;
  discountLabel?: string;
  grandTotal: number;
  onPrintBill?: () => void;
  isPrintingBill?: boolean;
  onProceedToPay?: () => void;
  qrChannels?: QrPaymentChannel[];
}

export const CustomerBillModal: React.FC<CustomerBillModalProps> = ({
  visible,
  onClose,
  tableName = 'Floor',
  tabLabel = 'Guest Tab',
  serverName,
  rawItems,
  subtotal,
  vatableSales,
  vatAmount,
  vatExemptSales,
  corkageAmount = 0,
  serviceCharge = 0,
  discountAmount = 0,
  discountLabel,
  grandTotal,
  onPrintBill,
  isPrintingBill = false,
  onProceedToPay,
  qrChannels = [],
}) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height && width >= 700;
  const isCompactHeight = height < 520;
  const [showQrPay, setShowQrPay] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');

  const displayItems = useMemo(() => aggregateReceiptItems(rawItems), [rawItems]);

  const activeChannel = useMemo(() => {
    if (!qrChannels || qrChannels.length === 0) return null;
    return qrChannels.find((ch) => ch.id === selectedChannelId) || qrChannels[0];
  }, [qrChannels, selectedChannelId]);

  if (!visible) return null;

  const nowFormatted = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, isCompactHeight && { padding: 8 }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss customer bill"
        />

        <View
          style={[
            styles.card,
            isCompactHeight && { maxHeight: '98%', padding: 12 },
            isLandscape && { maxWidth: 860 },
          ]}
        >
          {/* Top Navigation Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tableName}</Text>
              </View>
              <View>
                <Text style={styles.title}>{tabLabel}</Text>
                <Text style={styles.subtitle}>
                  Guest Bill Statement {serverName ? `• Server: ${serverName}` : ''}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close customer bill view"
            >
              <X size={20} color="#1C1917" />
            </Pressable>
          </View>

          {/* Main Body */}
          <View style={[styles.bodyRow, isLandscape && { flexDirection: 'row', gap: 16, flex: 1 }]}>
            {/* Left Column (Brand & Quick QR on landscape) */}
            {isLandscape ? (
              <View style={styles.brandCol}>
                <View style={styles.brandCard}>
                  <Image source={MONKS_DREAM_LOGO} style={styles.logoImage} resizeMode="contain" />
                  <Text style={styles.brandTitle}>MONK'S DREAM</Text>
                  <Text style={styles.brandSub}>JAZZ BAR & CAFE</Text>
                  <View style={styles.divider} />
                  <Text style={styles.metaLine}>Table: {tableName}</Text>
                  <Text style={styles.metaLine}>Tab: {tabLabel}</Text>
                  <Text style={styles.metaLine}>Time: {nowFormatted}</Text>
                </View>

                {/* Instant QR Scan Card for table-side customer payment */}
                {activeChannel && (
                  <View style={styles.instantQrCard}>
                    <View style={styles.instantQrHeader}>
                      <QrCode size={16} color="#810021" />
                      <Text style={styles.instantQrTitle}>Scan to Pay</Text>
                    </View>
                    <Image
                      source={{ uri: activeChannel.qr_image_url }}
                      style={styles.instantQrImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.instantQrChannel}>{activeChannel.name}</Text>
                    <Text style={styles.instantQrAccount} numberOfLines={1}>
                      {activeChannel.account_name}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {/* Right Column: Itemized Order List & Financial Summary */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Items List */}
              <View style={styles.itemsSection}>
                <View style={styles.itemsHeaderRow}>
                  <Text style={[styles.colHeader, { flex: 2 }]}>ITEM</Text>
                  <Text style={[styles.colHeader, { width: 44, textAlign: 'center' }]}>QTY</Text>
                  <Text style={[styles.colHeader, { width: 70, textAlign: 'right' }]}>PRICE</Text>
                  <Text style={[styles.colHeader, { width: 80, textAlign: 'right' }]}>TOTAL</Text>
                </View>

                {displayItems.map((item, idx) => {
                  const lineTotal = item.quantity * item.unitPrice;
                  return (
                    <View key={`${item.id}-${idx}`} style={styles.itemRow}>
                      <View style={{ flex: 2, paddingRight: 8 }}>
                        <Text style={styles.itemName}>{item.productName}</Text>
                        {item.variantDescription ? (
                          <Text style={styles.itemNotes}>{item.variantDescription}</Text>
                        ) : null}
                        {item.notes ? (
                          <Text style={styles.itemNotes}>Note: {item.notes}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.itemQty, { width: 44, textAlign: 'center' }]}>
                        {item.quantity}×
                      </Text>
                      <Text style={[styles.itemPrice, { width: 70, textAlign: 'right' }]}>
                        {formatCurrency(item.unitPrice)}
                      </Text>
                      <Text style={[styles.itemLineTotal, { width: 80, textAlign: 'right' }]}>
                        {formatCurrency(lineTotal)}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Financial Calculation Breakdown */}
              <View style={styles.breakdownCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal (Gross Sales)</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
                </View>

                {corkageAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Corkage Fee (20%)</Text>
                    <Text style={styles.summaryValue}>+{formatCurrency(corkageAmount)}</Text>
                  </View>
                )}

                {serviceCharge > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Service Charge (10%)</Text>
                    <Text style={styles.summaryValue}>+{formatCurrency(serviceCharge)}</Text>
                  </View>
                )}

                {discountAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: '#810021' }]}>
                      {discountLabel || 'Statutory / Applied Discount'}
                    </Text>
                    <Text style={[styles.summaryValue, { color: '#810021' }]}>
                      -{formatCurrency(discountAmount)}
                    </Text>
                  </View>
                )}

                {/* Statutory Tax Breakdown */}
                <View style={styles.taxSubCard}>
                  <View style={styles.taxRow}>
                    <Text style={styles.taxLabel}>VATable Sales (12%)</Text>
                    <Text style={styles.taxValue}>
                      {formatCurrency(vatableSales ?? Number((subtotal / 1.12).toFixed(2)))}
                    </Text>
                  </View>
                  <View style={styles.taxRow}>
                    <Text style={styles.taxLabel}>VAT Amount (12%)</Text>
                    <Text style={styles.taxValue}>
                      {formatCurrency(vatAmount ?? Number((subtotal - subtotal / 1.12).toFixed(2)))}
                    </Text>
                  </View>
                  {(vatExemptSales || 0) > 0 && (
                    <View style={styles.taxRow}>
                      <Text style={styles.taxLabel}>VAT-Exempt Sales</Text>
                      <Text style={styles.taxValue}>{formatCurrency(vatExemptSales || 0)}</Text>
                    </View>
                  )}
                </View>

                {/* Grand Total Due */}
                <View style={styles.totalDueRow}>
                  <Text style={styles.totalDueLabel}>TOTAL DUE</Text>
                  <Text style={styles.totalDueAmount}>{formatCurrency(grandTotal)}</Text>
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Bottom Action Footer */}
          <View style={[styles.footer, isCompactHeight && { paddingTop: 8 }]}>
            <Pressable
              onPress={onClose}
              style={styles.cancelBtn}
              accessibilityRole="button"
              accessibilityLabel="Back to table view"
            >
              <Text style={styles.cancelBtnText}>Back</Text>
            </Pressable>

            {onPrintBill && (
              <Pressable
                onPress={onPrintBill}
                disabled={isPrintingBill}
                style={[styles.printBtn, isPrintingBill && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Print customer bill statement slip"
              >
                <Printer size={16} color="#810021" strokeWidth={2.2} />
                <Text style={styles.printBtnText}>
                  {isPrintingBill ? 'Printing...' : 'Print Slip'}
                </Text>
              </Pressable>
            )}

            {onProceedToPay && (
              <Pressable
                onPress={() => {
                  onClose();
                  onProceedToPay();
                }}
                style={styles.payBtn}
                accessibilityRole="button"
                accessibilityLabel={`Proceed to settle payment for ${formatCurrency(grandTotal)}`}
              >
                <CreditCard size={18} color="#ffffff" strokeWidth={2.4} />
                <Text style={styles.payBtnText}>Settle Tab · {formatCurrency(grandTotal)}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
