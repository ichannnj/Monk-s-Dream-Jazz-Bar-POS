import React from 'react';
import { View, Text, Pressable, TextInput, Image, ActivityIndicator } from 'react-native';
import {
  Banknote,
  CreditCard,
  QrCode,
  Gift,
  Maximize2,
  AlertCircle,
  ShieldCheck,
  Printer,
  CheckCircle2,
} from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { QrPaymentChannel } from '../../../data/qrPaymentChannels.api';
import { styles } from '../BillSettlementModal.styles';

interface BillPaymentMethodPaneProps {
  selectedMethod: 'cash' | 'card' | 'digital_wallet' | 'comp';
  setSelectedMethod: (method: 'cash' | 'card' | 'digital_wallet' | 'comp') => void;
  quickCashOptions: number[];
  numericTendered: number;
  tenderedCash: string;
  setTenderedCash: (val: string) => void;
  grandTotal: number;
  isPaymentValid: boolean;
  changeDue: number;
  isLoadingQrChannels: boolean;
  qrChannels: QrPaymentChannel[];
  selectedQrChannel: QrPaymentChannel | null;
  setSelectedQrChannel: (channel: QrPaymentChannel | null) => void;
  setIsFullscreenQrOpen: (open: boolean) => void;
  referenceNumber: string;
  setReferenceNumber: (val: string) => void;
  isRefNumberValid: boolean;
  shouldPrintReceipt: boolean;
  setShouldPrintReceipt: (val: boolean) => void;
}

export const BillPaymentMethodPane: React.FC<BillPaymentMethodPaneProps> = ({
  selectedMethod,
  setSelectedMethod,
  quickCashOptions,
  numericTendered,
  tenderedCash,
  setTenderedCash,
  grandTotal,
  isPaymentValid,
  changeDue,
  isLoadingQrChannels,
  qrChannels,
  selectedQrChannel,
  setSelectedQrChannel,
  setIsFullscreenQrOpen,
  referenceNumber,
  setReferenceNumber,
  isRefNumberValid,
  shouldPrintReceipt,
  setShouldPrintReceipt,
}) => {
  const paymentMethodOptions: PosDropdownOption<'cash' | 'card' | 'digital_wallet' | 'comp'>[] = [
    {
      value: 'cash',
      label: 'Cash Tender',
      icon: Banknote,
    },
    {
      value: 'card',
      label: 'Card Terminal',
      icon: CreditCard,
    },
    {
      value: 'digital_wallet',
      label: 'QR Wallet (GCash/Maya)',
      icon: QrCode,
    },
    {
      value: 'comp',
      label: 'House Comp',
      icon: Gift,
    },
  ];

  return (
    <>
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

      {/* Digital Wallet (QR) Section */}
      {selectedMethod === 'digital_wallet' ? (
        <View style={styles.qrSection}>
          {isLoadingQrChannels ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#810021" />
            </View>
          ) : qrChannels.length > 0 ? (
            <>
              <Text style={styles.refLabel}>Select Digital Wallet / Bank:</Text>
              <View style={styles.channelPillsRow}>
                {qrChannels.map((ch) => {
                  const isSelected =
                    selectedQrChannel?.id === ch.id || (!selectedQrChannel && ch === qrChannels[0]);
                  return (
                    <Pressable
                      key={ch.id}
                      onPress={() => setSelectedQrChannel(ch)}
                      style={[styles.channelPill, isSelected && styles.channelPillActive]}
                    >
                      <Text
                        style={[styles.channelPillText, isSelected && styles.channelPillTextActive]}
                      >
                        {ch.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectedQrChannel ? (
                <View style={styles.qrDisplayCard}>
                  <View style={styles.qrThumbContainer}>
                    <Image
                      source={{ uri: selectedQrChannel.qr_image_url }}
                      style={styles.qrThumbImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.qrDetailsCol}>
                    <Text style={styles.qrChannelName}>{selectedQrChannel.name}</Text>
                    <Text style={styles.qrAccountName} numberOfLines={1}>
                      {selectedQrChannel.account_name}
                    </Text>
                    <Text style={styles.qrAccountNumber}>{selectedQrChannel.account_number}</Text>
                    <Pressable
                      onPress={() => setIsFullscreenQrOpen(true)}
                      style={styles.expandQrBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Show QR full screen for customer to scan"
                    >
                      <Maximize2 size={12} color="#810021" />
                      <Text style={styles.expandQrBtnText}>Show QR (Full Screen)</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <View
              style={{
                padding: 12,
                backgroundColor: '#fef2f2',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#fecdd3',
              }}
            >
              <Text style={{ fontSize: 13, color: '#991b1b', fontWeight: '600' }}>
                No active QR payment methods configured in Admin Settings. Please ask Admin to
                upload a QR code.
              </Text>
            </View>
          )}

          {/* 4-Digit Reference Number Input */}
          <View style={styles.refInputCard}>
            <View style={styles.refLabelRow}>
              <Text style={styles.refLabel}>Reference Number (Last 4 Digits)</Text>
              <Text style={styles.refRequiredBadge}>REQUIRED</Text>
            </View>

            <View style={styles.refInputRow}>
              <Text style={styles.refPrefix}>REF #</Text>
              <TextInput
                style={styles.refInput}
                keyboardType="numeric"
                maxLength={4}
                placeholder="8921"
                placeholderTextColor="#94a3b8"
                value={referenceNumber}
                onChangeText={(val) => setReferenceNumber(val.replace(/[^0-9]/g, '').slice(0, 4))}
              />
            </View>

            {referenceNumber.length > 0 && !isRefNumberValid ? (
              <View style={styles.validationBannerError}>
                <AlertCircle size={14} color="#dc2626" />
                <Text style={styles.validationTextError}>
                  Enter exactly 4 numeric digits ({referenceNumber.length}/4)
                </Text>
              </View>
            ) : isRefNumberValid ? (
              <View style={styles.validationBannerSuccess}>
                <ShieldCheck size={14} color="#16a34a" />
                <Text style={styles.validationTextSuccess}>
                  Verified Reference: #{referenceNumber}
                </Text>
              </View>
            ) : (
              <Text style={styles.refHelperText}>
                Input the last 4 digits shown on the customer's payment confirmation slip.
              </Text>
            )}
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
        <Text style={styles.printCheckboxText}>Print Receipt (ESC/POS)</Text>
      </Pressable>
    </>
  );
};
