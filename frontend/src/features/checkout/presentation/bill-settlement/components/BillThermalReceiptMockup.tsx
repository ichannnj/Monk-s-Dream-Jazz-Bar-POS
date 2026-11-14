import React, { useMemo } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Printer } from 'lucide-react-native';
import { TableItem, CustomerTab, TakeoutOrder } from '@/types/floor';
import { formatCurrency } from '@monks/shared';
import { DiscountType } from '../../../utils/taxAndDiscountCalculator';
import { QrPaymentChannel } from '../../../data/qrPaymentChannels.api';
import { aggregateReceiptItems } from '@/features/printer';
import { styles } from '../BillSettlementModal.styles';
import type { PaymentTender } from '../../../domain/splitTender.types';

const MONKS_DREAM_LOGO = require('../../../../../../assets/Monks Dream Logo files-02.png');

interface BillThermalReceiptMockupProps {
  isTakeout: boolean;
  takeoutOrder?: TakeoutOrder | null;
  activeTab?: CustomerTab | null;
  table?: TableItem | null;
  operatingMode?: string;
  currentUserDisplayName?: string;
  rawItems: any[];
  subtotal: number;
  billing: any;
  discountType: DiscountType;
  serviceCharge: number;
  grandTotal: number;
  tenderTabMode?: 'single' | 'split';
  splitTenders?: PaymentTender[];
  selectedMethod: string;
  selectedQrChannel: QrPaymentChannel | null;
  isRefNumberValid: boolean;
  referenceNumber: string;
  numericTendered: number;
  changeDue: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  seniorPwdId: string;
  seniorPwdName: string;
  onPrintBill?: () => void;
  isPrintingBill?: boolean;
}

export const BillThermalReceiptMockup: React.FC<BillThermalReceiptMockupProps> = ({
  isTakeout,
  takeoutOrder,
  activeTab,
  table,
  operatingMode,
  currentUserDisplayName,
  rawItems,
  subtotal,
  billing,
  discountType,
  serviceCharge,
  grandTotal,
  tenderTabMode = 'single',
  splitTenders = [],
  selectedMethod,
  selectedQrChannel,
  isRefNumberValid,
  referenceNumber,
  numericTendered,
  changeDue,
  vatableSales,
  vatAmount,
  vatExemptSales,
  seniorPwdId,
  seniorPwdName,
  onPrintBill,
  isPrintingBill = false,
}) => {
  const displayItems = useMemo(() => aggregateReceiptItems(rawItems), [rawItems]);

  return (
    <View style={styles.rightCol}>
      {onPrintBill && (
        <Pressable
          onPress={onPrintBill}
          disabled={isPrintingBill}
          style={[styles.receiptQuickPrintBtn, isPrintingBill && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Quick print pre-payment bill"
        >
          <Printer size={15} color="#810021" strokeWidth={2.2} />
          <Text style={styles.receiptQuickPrintBtnText}>
            {isPrintingBill ? 'Printing Bill...' : 'Quick Print Bill (Guest Check)'}
          </Text>
        </Pressable>
      )}

      <View style={styles.receiptPaper}>
        {/* Receipt Header with Logo */}
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <Image
            source={MONKS_DREAM_LOGO}
            style={{ width: 54, height: 54, resizeMode: 'contain', marginBottom: 4 }}
          />
          <Text style={styles.receiptLogo}>MONK'S DREAM</Text>
          <Text style={styles.receiptSubLogo}>JAZZ BAR AND CAFE</Text>
          <Text style={styles.receiptTagline}>Craft Cocktails &amp; Fine Jazz</Text>
          <Text style={styles.receiptContact}>Tel: +63 917 555 1957 • IG/FB: @monksdreamjazz</Text>
        </View>
        <Text style={styles.receiptDivider}>--------------------------------</Text>

        {/* Metadata */}
        <View style={styles.receiptRow}>
          <Text style={[styles.receiptMeta, { fontWeight: '800' }]}>
            {isTakeout
              ? `CHECK: #${takeoutOrder?.ticketNumber || 'T-001'}`
              : `CHECK: #${(activeTab?.id || 'REC-001').slice(0, 8).toUpperCase()}`}
          </Text>
          <Text style={[styles.receiptMeta, { fontWeight: '800' }]}>
            MODE: {operatingMode === 'EVENT' ? 'EVENT NIGHT' : 'DAYTIME CAFE'}
          </Text>
        </View>

        <View style={styles.receiptRow}>
          <Text style={styles.receiptMeta}>
            DATE:{' '}
            {new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <Text style={styles.receiptMeta}>
            TIME: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={styles.receiptRow}>
          <Text style={styles.receiptMeta}>
            {isTakeout
              ? `TAKEOUT: #${takeoutOrder?.ticketNumber}`
              : `TABLE: ${table?.code ? `Table ${table.code}` : 'Floor'}`}
          </Text>
          <Text style={styles.receiptMeta}>
            TAB:{' '}
            {isTakeout
              ? takeoutOrder?.customerName || 'Walk-in'
              : activeTab?.guestName || 'Table Guest'}
          </Text>
        </View>

        <View style={styles.receiptRow}>
          <Text style={styles.receiptMeta}>STAFF: {currentUserDisplayName || 'Cashier'}</Text>
          <Text style={styles.receiptMeta}>TERMINAL: TILL-1</Text>
        </View>

        <Text style={styles.receiptDivider}>================================</Text>
        <View style={styles.receiptRow}>
          <Text style={[styles.receiptMeta, { fontWeight: '800' }]}>QTY DESCRIPTION</Text>
          <Text style={[styles.receiptMeta, { fontWeight: '800' }]}>AMOUNT (PHP)</Text>
        </View>
        <Text style={styles.receiptDivider}>================================</Text>

        {/* Itemized Line Items (Aggregated across rounds) */}
        {displayItems.map((item, idx) => (
          <View key={idx} style={{ marginBottom: 4 }}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptItemName}>
                {item.quantity}x {item.productName}
              </Text>
              <Text style={styles.receiptItemPrice}>
                {formatCurrency(item.unitPrice * item.quantity)}
              </Text>
            </View>
            {item.modifiers && item.modifiers.length > 0 ? (
              <Text style={[styles.receiptItemNote, { color: '#810021', fontWeight: '600' }]}>
                {'   '}+ {item.modifiers.join(', ')}
              </Text>
            ) : null}
            {item.notes ? (
              <Text style={styles.receiptItemNote}> &gt;&gt; Note: {item.notes}</Text>
            ) : null}
          </View>
        ))}

        <Text style={styles.receiptDivider}>--------------------------------</Text>

        {/* Financial Summary */}
        <View style={styles.receiptRow}>
          <Text style={styles.receiptMeta}>SUBTOTAL (Gross Sales):</Text>
          <Text style={styles.receiptMeta}>{formatCurrency(subtotal)}</Text>
        </View>

        {billing.vatExemptSales > 0 ? (
          <View style={styles.receiptRow}>
            <Text style={styles.receiptMeta}>LESS: VAT EXEMPTION (12%):</Text>
            <Text style={[styles.receiptMeta, { color: '#b91c1c' }]}>
              -{formatCurrency(billing.seniorItemsGross - billing.vatExemptSales)}
            </Text>
          </View>
        ) : null}

        {billing.seniorDiscountAmount > 0 ? (
          <View style={styles.receiptRow}>
            <Text style={styles.receiptMeta}>
              LESS: {discountType === 'SENIOR_CITIZEN' ? 'SC' : 'PWD'} DISCOUNT (20%):
            </Text>
            <Text style={[styles.receiptMeta, { color: '#b91c1c' }]}>
              -{formatCurrency(billing.seniorDiscountAmount)}
            </Text>
          </View>
        ) : null}

        {billing.customDiscountAmount > 0 ? (
          <View style={styles.receiptRow}>
            <Text style={styles.receiptMeta}>LESS: PROMO DISCOUNT:</Text>
            <Text style={[styles.receiptMeta, { color: '#b91c1c' }]}>
              -{formatCurrency(billing.customDiscountAmount)}
            </Text>
          </View>
        ) : null}

        {serviceCharge > 0 ? (
          <View style={styles.receiptRow}>
            <Text style={styles.receiptMeta}>
              SERVICE CHARGE ({operatingMode === 'EVENT' ? 'EVENT 10%' : 'CAFE FOOD 10%'}):
            </Text>
            <Text style={styles.receiptMeta}>{formatCurrency(serviceCharge)}</Text>
          </View>
        ) : null}

        {billing.corkageAmount > 0 ? (
          <View style={styles.receiptRow}>
            <Text style={styles.receiptMeta}>CORKAGE FEE:</Text>
            <Text style={styles.receiptMeta}>{formatCurrency(billing.corkageAmount)}</Text>
          </View>
        ) : null}

        {/* Bold Grand Total */}
        <Text style={styles.receiptDivider}>================================</Text>
        <View style={styles.receiptRow}>
          <Text style={[styles.receiptBold, { fontSize: 16 }]}>TOTAL AMOUNT DUE:</Text>
          <Text style={[styles.receiptBold, { fontSize: 16, color: '#810021' }]}>
            {formatCurrency(grandTotal)}
          </Text>
        </View>
        <Text style={styles.receiptDivider}>================================</Text>

        {/* Payment Details */}
        {tenderTabMode === 'split' ? (
          <>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptMeta}>PAYMENT METHOD:</Text>
              <Text style={[styles.receiptMeta, { fontWeight: '800', color: '#810021' }]}>
                SPLIT-TENDER ({splitTenders.length})
              </Text>
            </View>
            {splitTenders.map((t, idx) => (
              <View key={t.id || idx} style={styles.receiptRow}>
                <Text style={styles.receiptTaxSub}>
                  • {t.method.toUpperCase()}
                  {t.method === 'digital_wallet'
                    ? ` (${t.channel || 'Wallet'}${t.referenceNumber ? ` #${t.referenceNumber}` : ''})`
                    : t.method === 'card' && t.last4Digits
                      ? ` (*${t.last4Digits})`
                      : ''}
                  :
                </Text>
                <Text style={styles.receiptTaxSub}>{formatCurrency(t.amount)}</Text>
              </View>
            ))}
            {changeDue > 0 && (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptMeta}>CASH CHANGE DUE:</Text>
                <Text style={[styles.receiptMeta, { fontWeight: '800', color: '#16a34a' }]}>
                  {formatCurrency(changeDue)}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptMeta}>PAYMENT METHOD:</Text>
              <Text style={[styles.receiptMeta, { fontWeight: '800' }]}>
                {selectedMethod === 'digital_wallet'
                  ? `${(selectedQrChannel?.name || 'DIGITAL WALLET').toUpperCase()} QR`
                  : selectedMethod.toUpperCase()}
              </Text>
            </View>

            {selectedMethod === 'digital_wallet' ? (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptMeta}>REFERENCE NO:</Text>
                <Text
                  style={[
                    styles.receiptMeta,
                    !isRefNumberValid && { color: '#dc2626', fontWeight: '800' },
                  ]}
                >
                  {isRefNumberValid ? `#${referenceNumber}` : 'REQUIRED (4-DIGIT)'}
                </Text>
              </View>
            ) : null}

            {selectedMethod === 'cash' ? (
              <>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptMeta}>CASH TENDERED:</Text>
                  <Text style={styles.receiptMeta}>{formatCurrency(numericTendered)}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptMeta}>CHANGE DUE:</Text>
                  <Text style={[styles.receiptMeta, { fontWeight: '800', color: '#16a34a' }]}>
                    {formatCurrency(changeDue)}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptMeta}>AMOUNT PAID:</Text>
                <Text style={styles.receiptMeta}>{formatCurrency(grandTotal)}</Text>
              </View>
            )}
          </>
        )}

        {/* Philippine VAT Breakdown */}
        <Text style={styles.receiptDivider}>--------------------------------</Text>
        <Text style={[styles.receiptMeta, { fontWeight: '700', marginBottom: 2 }]}>
          TAX &amp; STATUTORY BREAKDOWN:
        </Text>
        <View style={styles.receiptRow}>
          <Text style={styles.receiptTaxSub}> VATable Sales (12%):</Text>
          <Text style={styles.receiptTaxSub}>{formatCurrency(vatableSales)}</Text>
        </View>
        <View style={styles.receiptRow}>
          <Text style={styles.receiptTaxSub}> VAT Amount (12%):</Text>
          <Text style={styles.receiptTaxSub}>{formatCurrency(vatAmount)}</Text>
        </View>
        <View style={styles.receiptRow}>
          <Text style={styles.receiptTaxSub}> VAT-Exempt Sales:</Text>
          <Text style={styles.receiptTaxSub}>{formatCurrency(vatExemptSales)}</Text>
        </View>
        <View style={styles.receiptRow}>
          <Text style={styles.receiptTaxSub}> Zero-Rated Sales:</Text>
          <Text style={styles.receiptTaxSub}>₱0.00</Text>
        </View>

        {billing.vatExemptSales > 0 ? (
          <>
            <Text style={styles.receiptDivider}>--------------------------------</Text>
            <Text style={[styles.receiptMeta, { fontWeight: '700', marginBottom: 2 }]}>
              BENEFICIARY INFORMATION:
            </Text>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptTaxSub}> TYPE / ID NO:</Text>
              <Text style={[styles.receiptTaxSub, { fontWeight: '700' }]}>
                {discountType === 'SENIOR_CITIZEN' ? 'OSCA' : 'PWD'} #{seniorPwdId || 'REQUIRED'}
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptTaxSub}> NAME:</Text>
              <Text style={[styles.receiptTaxSub, { fontWeight: '700' }]}>
                {(seniorPwdName || 'REQUIRED').toUpperCase()}
              </Text>
            </View>
            <View style={[styles.receiptRow, { marginTop: 4 }]}>
              <Text style={styles.receiptTaxSub}> SIGNATURE:</Text>
              <Text style={styles.receiptTaxSub}>______________________</Text>
            </View>
          </>
        ) : null}

        {/* Jazz Club Cultural Quote & Notice */}
        <Text style={styles.receiptDivider}>--------------------------------</Text>
        <View style={{ alignItems: 'center', marginVertical: 4 }}>
          <Text style={styles.receiptQuote}>"Writing about music is like dancing</Text>
          <Text style={styles.receiptQuote}>about architecture."</Text>
          <Text style={[styles.receiptQuote, { fontWeight: '700', marginTop: 1 }]}>
            - Thelonious Monk
          </Text>
          <Text style={[styles.receiptFooter, { marginTop: 4 }]}>
            Thank you for supporting live music!
          </Text>
          <Text style={styles.receiptFooter}>Please come back for the next set.</Text>
        </View>
        <Text style={styles.receiptDivider}>--------------------------------</Text>
        <Text style={styles.receiptNotOfficial}>THIS IS NOT AN OFFICIAL RECEIPT</Text>
      </View>
    </View>
  );
};
