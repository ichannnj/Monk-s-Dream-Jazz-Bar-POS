import React, { useMemo } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { TableItem, CustomerTab, TakeoutOrder } from '@/types/floor';
import { formatCurrency } from '@monks/shared';
import { DiscountType } from '../../../utils/taxAndDiscountCalculator';
import { QrPaymentChannel } from '../../../data/qrPaymentChannels.api';
import { aggregateReceiptItems, usePrinterStationStore } from '@/features/printer';
import { styles } from '../BillSettlementModal.styles';
import type { PaymentTender } from '../../../domain/splitTender.types';

const MONKS_DREAM_LOGO = require('../../../../../../assets/monks-dream-logo-lockup.png');

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
}) => {
  const displayItems = useMemo(() => aggregateReceiptItems(rawItems), [rawItems]);
  const { paperWidth, setPaperWidth } = usePrinterStationStore();
  const is58mm = paperWidth === '58mm' || paperWidth === '57mm';
  const is57mm = is58mm; // Alias for backward compatibility across slip layout computations

  const dividerDash = is58mm
    ? '--------------------------------'
    : '------------------------------------------------';
  const dividerEqual = is58mm
    ? '================================'
    : '================================================';

  return (
    <View style={styles.rightCol}>
      {/* Paper Width Switcher */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginBottom: 10,
        }}
      >
        <Pressable
          onPress={() => setPaperWidth('58mm')}
          style={{
            paddingVertical: 5,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: is58mm ? '#810021' : '#f5f5f4',
            borderWidth: 1,
            borderColor: is58mm ? '#810021' : '#e7e5e4',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: is58mm ? '#ffffff' : '#78716c',
            }}
          >
            58mm Compact (Default)
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setPaperWidth('80mm')}
          style={{
            paddingVertical: 5,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: !is58mm ? '#810021' : '#f5f5f4',
            borderWidth: 1,
            borderColor: !is58mm ? '#810021' : '#e7e5e4',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: !is58mm ? '#ffffff' : '#78716c',
            }}
          >
            80mm Standard
          </Text>
        </Pressable>
      </View>

      <View style={[styles.receiptPaper, { maxWidth: is58mm ? 300 : 380, width: '100%' }]}>
        {/* Receipt Header with Combined Logo Lockup */}
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <Image
            source={MONKS_DREAM_LOGO}
            style={{
              width: is57mm ? 165 : 200,
              height: is57mm ? 55 : 67,
              resizeMode: 'contain',
              marginBottom: 4,
            }}
          />
          <Text style={styles.receiptSubLogo}>Jazz Cafe and Bar</Text>
          <Text style={styles.receiptMeta}>Craft Cocktails & Fine Jazz</Text>
          <Text style={styles.receiptMeta}>Mobile: +63 917 833 3445</Text>
        </View>
        <Text style={styles.receiptDivider} numberOfLines={1}>
          {dividerDash}
        </Text>

        {/* Metadata */}
        <View style={styles.receiptRow}>
          <Text style={[styles.receiptMeta, { fontWeight: '800' }]}>
            {isTakeout
              ? `CHECK: #${takeoutOrder?.ticketNumber || 'T-001'}`
              : `CHECK: #${(activeTab?.id || 'REC-001').slice(0, 8).toUpperCase()}`}
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

        {is57mm ? (
          <>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptMeta}>
                {isTakeout
                  ? `TAKEOUT: #${takeoutOrder?.ticketNumber}`
                  : `TABLE: ${table?.code ? `Table ${table.code}` : 'Floor'}`}
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptMeta}>
                TAB:{' '}
                {isTakeout
                  ? takeoutOrder?.customerName || 'Walk-in'
                  : activeTab?.guestName || 'Table Guest'}
              </Text>
            </View>
          </>
        ) : (
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
        )}

        <View style={styles.receiptRow}>
          <Text style={styles.receiptMeta}>STAFF: {currentUserDisplayName || 'Cashier'}</Text>
          {!is57mm && <Text style={styles.receiptMeta}>TERMINAL: TILL-1</Text>}
        </View>

        <Text style={styles.receiptDivider} numberOfLines={1}>
          {dividerEqual}
        </Text>
        <View style={styles.receiptRow}>
          <Text style={[styles.receiptMeta, { fontWeight: '800' }]}>QTY DESCRIPTION</Text>
          <Text style={[styles.receiptMeta, { fontWeight: '800' }]}>AMOUNT (PHP)</Text>
        </View>
        <Text style={styles.receiptDivider} numberOfLines={1}>
          {dividerEqual}
        </Text>

        {/* Itemized Line Items (Aggregated across rounds) */}
        {displayItems.map((item, idx) => {
          const parsedMods: Array<{ label: string; unitDelta: number }> = (
            item.modifiers ?? []
          ).map((mod: string) => {
            const match = mod.match(/^(.*?)\s*\(\+(?:₱|P)?(\d+(?:\.\d+)?)\)\s*$/i);
            if (!match) return { label: mod, unitDelta: 0 };
            return { label: match[1].trim(), unitDelta: parseFloat(match[2]) || 0 };
          });
          const lineTotal = item.unitPrice * item.quantity;
          const modTotal = parsedMods.reduce(
            (sum: number, m: { label: string; unitDelta: number }) =>
              sum + m.unitDelta * item.quantity,
            0
          );
          const baseLineTotal =
            modTotal > 0 && lineTotal >= modTotal ? lineTotal - modTotal : lineTotal;

          return (
            <View key={idx} style={{ marginBottom: 4 }}>
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptItemName, is57mm && { maxWidth: 180 }]}>
                  {item.quantity}x {item.productName}
                </Text>
                <Text style={styles.receiptItemPrice}>{formatCurrency(baseLineTotal)}</Text>
              </View>
              {parsedMods.map((mod, mIdx) => (
                <View key={mIdx} style={styles.receiptRow}>
                  <Text style={[styles.receiptItemNote, { color: '#810021', fontWeight: '600' }]}>
                    {'   '}+ {mod.label}
                  </Text>
                  {mod.unitDelta > 0 ? (
                    <Text style={[styles.receiptItemNote, { color: '#810021', fontWeight: '600' }]}>
                      +{formatCurrency(mod.unitDelta * item.quantity)}
                    </Text>
                  ) : null}
                </View>
              ))}
              {item.notes ? (
                <Text style={styles.receiptItemNote}> &gt;&gt; Note: {item.notes}</Text>
              ) : null}
            </View>
          );
        })}

        <Text style={styles.receiptDivider} numberOfLines={1}>
          {dividerDash}
        </Text>

        {/* Financial Summary */}
        <View style={styles.receiptRow}>
          <Text style={styles.receiptMeta}>
            {is57mm ? 'SUBTOTAL (Gross):' : 'SUBTOTAL (Gross Sales):'}
          </Text>
          <Text style={styles.receiptMeta}>{formatCurrency(subtotal)}</Text>
        </View>

        {billing.seniorDiscountAmount > 0 ||
        billing.customDiscountAmount > 0 ||
        billing.vatExemptSales > 0 ? (
          <View style={styles.receiptRow}>
            <Text style={styles.receiptMeta}>LESS: DISCOUNT:</Text>
            <Text style={[styles.receiptMeta, { color: '#b91c1c' }]}>
              -
              {formatCurrency(
                billing.seniorDiscountAmount +
                  billing.customDiscountAmount +
                  (billing.vatExemptSales > 0
                    ? Math.max(0, billing.seniorItemsGross - billing.vatExemptSales)
                    : 0)
              )}
            </Text>
          </View>
        ) : null}

        {serviceCharge > 0 ? (
          <View style={styles.receiptRow}>
            <Text style={styles.receiptMeta}>
              SERVICE CHARGE ({operatingMode === 'EVENT' ? '10%' : 'FOOD 10%'}):
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
        <Text style={styles.receiptDivider} numberOfLines={1}>
          {dividerEqual}
        </Text>
        <View style={styles.receiptRow}>
          <Text style={[styles.receiptBold, { fontSize: 16 }]}>
            {is57mm ? 'TOTAL DUE:' : 'TOTAL AMOUNT DUE:'}
          </Text>
          <Text style={[styles.receiptBold, { fontSize: 16, color: '#810021' }]}>
            {formatCurrency(grandTotal)}
          </Text>
        </View>
        <Text style={styles.receiptDivider} numberOfLines={1}>
          {dividerEqual}
        </Text>

        {/* Payment Details */}
        {tenderTabMode === 'split' ? (
          <>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptMeta}>PAYMENT METHOD:</Text>
              <Text style={[styles.receiptMeta, { fontWeight: '800', color: '#810021' }]}>
                SPLIT ({splitTenders.length})
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
                  ? `${(selectedQrChannel?.name || 'WALLET').toUpperCase()} QR`
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

        {billing.vatExemptSales > 0 ? (
          <>
            <Text style={styles.receiptDivider} numberOfLines={1}>
              {dividerDash}
            </Text>
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

        {/* Jazz Club Cultural Notice */}
        <Text style={styles.receiptDivider} numberOfLines={1}>
          {dividerDash}
        </Text>
        <View style={{ alignItems: 'center', marginVertical: 4 }}>
          <Text style={styles.receiptNotOfficial}>THIS IS NOT AN OFFICIAL RECEIPT</Text>
          <Text style={styles.receiptNotOfficial}>YET</Text>
        </View>
      </View>
    </View>
  );
};
