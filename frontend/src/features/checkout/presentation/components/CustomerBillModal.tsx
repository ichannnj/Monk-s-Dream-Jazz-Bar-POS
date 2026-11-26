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
import { isDoorChargeItem, roundPhp } from '../../utils/taxAndDiscountCalculator';
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
  serviceChargeRate?: number;
  discountAmount?: number;
  discountLabel?: string;
  grandTotal: number;
  onPrintBill?: (previewWithServiceCharge?: boolean) => void;
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
  corkageAmount = 0,
  serviceCharge = 0,
  serviceChargeRate = 10,
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
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [previewWithSc, setPreviewWithSc] = useState<boolean>(false);

  const displayItems = useMemo(() => aggregateReceiptItems(rawItems), [rawItems]);

  const eligibleFnbGross = useMemo(() => {
    return roundPhp(
      (rawItems || [])
        .filter((it) => !isDoorChargeItem(it))
        .reduce(
          (sum, it) => sum + Number(it.unitPrice ?? it.price ?? 0) * Number(it.quantity ?? 1),
          0
        )
    );
  }, [rawItems]);

  const effectiveServiceCharge = previewWithSc
    ? roundPhp(eligibleFnbGross * (Math.max(0, serviceChargeRate) / 100))
    : serviceCharge;

  const effectiveGrandTotal = previewWithSc
    ? Math.max(0, roundPhp(subtotal - discountAmount + corkageAmount + effectiveServiceCharge))
    : grandTotal;

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
              <X size={20} color="#1A1617" />
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
                  const parsedMods: Array<{ label: string; unitDelta: number }> = (
                    item.modifiers ?? []
                  ).map((mod: string) => {
                    const match = String(mod).match(
                      /^(.*?)\s*\(\+?(?:₱|P|PHP\s*)?([\d,]+(?:\.\d+)?)\)\s*$/i
                    );
                    if (!match) return { label: String(mod), unitDelta: 0 };
                    return {
                      label: match[1].trim(),
                      unitDelta: parseFloat(match[2].replace(/,/g, '')) || 0,
                    };
                  });
                  const qty = Number(item.quantity || 1);
                  const lineTotal = qty * Number(item.unitPrice || 0);
                  const modUnitSum = parsedMods.reduce((s, m) => s + m.unitDelta, 0);
                  const baseUnitPrice =
                    modUnitSum > 0 && Number(item.unitPrice || 0) >= modUnitSum
                      ? Number(item.unitPrice || 0) - modUnitSum
                      : Number(item.unitPrice || 0);
                  const baseLineTotal = roundPhp(baseUnitPrice * qty);

                  return (
                    <View key={`${item.id}-${idx}`} style={styles.itemRow}>
                      <View style={{ flex: 2, paddingRight: 8 }}>
                        <Text style={styles.itemName}>{item.productName}</Text>
                        {item.variantDescription ? (
                          <Text style={styles.itemNotes}>{item.variantDescription}</Text>
                        ) : null}
                        {parsedMods.map((m, mIdx) => (
                          <Text key={mIdx} style={[styles.itemNotes, { color: '#810021' }]}>
                            + {m.label}
                            {m.unitDelta > 0 ? ` (@${formatCurrency(m.unitDelta)})` : ''}
                          </Text>
                        ))}
                        {item.notes ? (
                          <Text style={styles.itemNotes}>Note: {item.notes}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.itemQty, { width: 44, textAlign: 'center' }]}>
                        {qty}×
                      </Text>
                      <Text style={[styles.itemPrice, { width: 70, textAlign: 'right' }]}>
                        {formatCurrency(baseUnitPrice)}
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
                {/* Service Charge Preview Toggle for Guest Check */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#E2DED6',
                    gap: 8,
                  }}
                >
                  <Text style={[styles.summaryLabel, { fontWeight: '700' }]}>
                    Service Charge Preview
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pressable
                      onPress={() => setPreviewWithSc(false)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: !previewWithSc ? '#810021' : '#D6CFC7',
                        backgroundColor: !previewWithSc ? '#810021' : '#FFFFFF',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: !previewWithSc ? '#F7F5F2' : '#1A1617',
                        }}
                      >
                        No SC (0%)
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPreviewWithSc(true)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: previewWithSc ? '#810021' : '#D6CFC7',
                        backgroundColor: previewWithSc ? '#810021' : '#FFFFFF',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: previewWithSc ? '#F7F5F2' : '#1A1617',
                        }}
                      >
                        With SC ({serviceChargeRate}%)
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Items Subtotal</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
                </View>

                {discountAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: '#810021' }]}>
                      {discountLabel || 'Applied Discount'}
                    </Text>
                    <Text style={[styles.summaryValue, { color: '#810021' }]}>
                      -{formatCurrency(discountAmount)}
                    </Text>
                  </View>
                )}

                {corkageAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Corkage Fee (20%)</Text>
                    <Text style={styles.summaryValue}>+{formatCurrency(corkageAmount)}</Text>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Service Charge ({previewWithSc ? `${serviceChargeRate}%` : 'None'})
                  </Text>
                  <Text style={styles.summaryValue}>
                    {effectiveServiceCharge > 0
                      ? `+${formatCurrency(effectiveServiceCharge)}`
                      : formatCurrency(0)}
                  </Text>
                </View>

                {/* TODO(BIR): Uncomment Statutory Tax Breakdown once BIR VAT-registered
                <View style={styles.taxSubCard}>
                  <View style={styles.taxRow}>
                    <Text style={styles.taxLabel}>VATable Sales (12%)</Text>
                    <Text style={styles.taxValue}>{formatCurrency(vatableSales ?? 0)}</Text>
                  </View>
                  <View style={styles.taxRow}>
                    <Text style={styles.taxLabel}>VAT Amount (12%)</Text>
                    <Text style={styles.taxValue}>{formatCurrency(vatAmount ?? 0)}</Text>
                  </View>
                </View>
                */}

                {/* Grand Total Due */}
                <View style={styles.totalDueRow}>
                  <Text style={styles.totalDueLabel}>TOTAL DUE</Text>
                  <Text style={styles.totalDueAmount}>{formatCurrency(effectiveGrandTotal)}</Text>
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
                onPress={() => onPrintBill(previewWithSc)}
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
                accessibilityLabel={`Proceed to settle payment for ${formatCurrency(effectiveGrandTotal)}`}
              >
                <CreditCard size={18} color="#F7F5F2" strokeWidth={2.4} />
                <Text style={styles.payBtnText}>
                  Settle Tab · {formatCurrency(effectiveGrandTotal)}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
