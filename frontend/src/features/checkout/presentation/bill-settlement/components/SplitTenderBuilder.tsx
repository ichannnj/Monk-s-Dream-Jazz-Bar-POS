import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Plus, Trash2, Banknote, CreditCard, QrCode, Gift, Sparkles } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type { PaymentTender } from '../../../domain/splitTender.types';
import type {
  SplitTenderBalance,
  SplitTenderValidationResult,
} from '../../../domain/splitTender.types';
import type { QrPaymentChannel } from '../../../data/qrPaymentChannels.api';

interface SplitTenderBuilderProps {
  tenders: PaymentTender[];
  grandTotal: number;
  balance: SplitTenderBalance;
  validation: SplitTenderValidationResult;
  qrChannels: QrPaymentChannel[];
  onAddTender: (tender: PaymentTender) => void;
  onUpdateTender: (id: string, updated: Partial<PaymentTender>) => void;
  onRemoveTender: (id: string) => void;
  onFillRemaining: (id: string) => void;
}

export const SplitTenderBuilder: React.FC<SplitTenderBuilderProps> = ({
  tenders,
  grandTotal,
  balance,
  validation,
  qrChannels,
  onAddTender,
  onUpdateTender,
  onRemoveTender,
  onFillRemaining,
}) => {
  const addTenderWithMethod = (method: 'cash' | 'card' | 'digital_wallet' | 'comp') => {
    const id = `tnd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const remaining = Math.max(0, balance.remainingBalance);

    if (method === 'cash') {
      onAddTender({
        id,
        method: 'cash',
        amount: remaining,
        tendered: remaining,
      });
    } else if (method === 'digital_wallet') {
      const channelName = qrChannels[0]?.name || 'GCash';
      onAddTender({
        id,
        method: 'digital_wallet',
        channel: channelName,
        referenceNumber: '',
        amount: remaining,
      });
    } else if (method === 'card') {
      onAddTender({
        id,
        method: 'card',
        last4Digits: '',
        amount: remaining,
      });
    } else {
      onAddTender({
        id,
        method: 'comp',
        reason: 'VIP / House Privilege',
        amount: remaining,
      });
    }
  };

  return (
    <View className="mb-4">
      {/* Allocation Progress Card */}
      <View
        style={{
          backgroundColor: '#FAF8F5',
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
          borderWidth: 1.5,
          borderColor: balance.isFullyAllocated
            ? '#86efac'
            : balance.isOverAllocated
              ? '#fca5a5'
              : '#e7e5e4',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: '#57534e',
              textTransform: 'uppercase',
            }}
          >
            Allocated: {formatCurrency(balance.allocatedAmount)} / {formatCurrency(grandTotal)}
          </Text>
          <View
            style={{
              paddingVertical: 2,
              paddingHorizontal: 8,
              borderRadius: 6,
              backgroundColor: balance.isFullyAllocated
                ? '#dcfce7'
                : balance.isOverAllocated
                  ? '#fee2e2'
                  : '#fef3c7',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: balance.isFullyAllocated
                  ? '#15803d'
                  : balance.isOverAllocated
                    ? '#b91c1c'
                    : '#b45309',
              }}
            >
              {balance.isFullyAllocated
                ? 'Balanced'
                : balance.isOverAllocated
                  ? `Over: ${formatCurrency(balance.allocatedAmount - grandTotal)}`
                  : `Remaining: ${formatCurrency(balance.remainingBalance)}`}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: '#e7e5e4',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${Math.min(100, grandTotal > 0 ? (balance.allocatedAmount / grandTotal) * 100 : 0)}%`,
              backgroundColor: balance.isFullyAllocated
                ? '#16a34a'
                : balance.isOverAllocated
                  ? '#dc2626'
                  : '#810021',
            }}
          />
        </View>

        {balance.totalCashChange > 0 && (
          <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803d' }}>
              Cash Change Due:
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803d' }}>
              {formatCurrency(balance.totalCashChange)}
            </Text>
          </View>
        )}
      </View>

      {/* Tender List */}
      {tenders.map((tender, index) => {
        const isCash = tender.method === 'cash';
        const isWallet = tender.method === 'digital_wallet';
        const isCard = tender.method === 'card';
        const isComp = tender.method === 'comp';

        return (
          <View
            key={tender.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
              borderWidth: 1.5,
              borderColor: '#e5e7eb',
            }}
          >
            {/* Header: Title & Remove */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {isCash ? (
                  <Banknote size={16} color="#15803d" />
                ) : isWallet ? (
                  <QrCode size={16} color="#810021" />
                ) : isCard ? (
                  <CreditCard size={16} color="#2563eb" />
                ) : (
                  <Gift size={16} color="#9333ea" />
                )}
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1f2937' }}>
                  Tender #{index + 1}: {tender.method.toUpperCase().replace('_', ' ')}
                </Text>
              </View>

              <Pressable
                onPress={() => onRemoveTender(tender.id)}
                style={{
                  padding: 8,
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                hitSlop={12}
                accessibilityLabel="Remove tender"
              >
                <Trash2 size={16} color="#dc2626" />
              </Pressable>
            </View>

            {/* Amount & Fill Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f9fafb',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  minHeight: 48,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#4b5563', marginRight: 4 }}>
                  Amount: ₱
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: '800',
                    color: '#111827',
                    paddingVertical: 8,
                  }}
                  keyboardType="numeric"
                  value={tender.amount > 0 ? tender.amount.toString() : ''}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  onChangeText={(val) => {
                    const numeric = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
                    onUpdateTender(tender.id, { amount: numeric });
                  }}
                />
              </View>

              <Pressable
                onPress={() => onFillRemaining(tender.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#FAF8F5',
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#810021',
                  minHeight: 48,
                }}
                accessibilityLabel="Fill remaining balance for this tender"
              >
                <Sparkles size={14} color="#810021" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#810021' }}>Fill Rem.</Text>
              </Pressable>
            </View>

            {/* Method-specific inputs */}
            {isCash && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f0fdf4',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: '#bbf7d0',
                  minHeight: 40,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534', marginRight: 4 }}>
                  Cash Tendered: ₱
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: '800',
                    color: '#14532d',
                    paddingVertical: 6,
                  }}
                  keyboardType="numeric"
                  value={
                    tender.tendered !== undefined && tender.tendered > 0
                      ? tender.tendered.toString()
                      : ''
                  }
                  placeholder={tender.amount.toString()}
                  placeholderTextColor="#86efac"
                  onChangeText={(val) => {
                    const numeric = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
                    onUpdateTender(tender.id, { tendered: numeric });
                  }}
                />
              </View>
            )}

            {isWallet && (
              <View style={{ gap: 6 }}>
                {/* Channel Pill Selector */}
                {qrChannels.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {qrChannels.map((ch) => {
                      const isSel = (tender.channel || 'GCash') === ch.name;
                      return (
                        <Pressable
                          key={ch.id}
                          onPress={() => onUpdateTender(tender.id, { channel: ch.name })}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: isSel ? '#810021' : '#f3f4f6',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: isSel ? '#ffffff' : '#374151',
                            }}
                          >
                            {ch.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* 4-Digit Ref Input */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#fff1f2',
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    borderWidth: 1,
                    borderColor: /^\d{4}$/.test(tender.referenceNumber || '')
                      ? '#86efac'
                      : '#fecdd3',
                    minHeight: 40,
                  }}
                >
                  <Text
                    style={{ fontSize: 12, fontWeight: '800', color: '#810021', marginRight: 4 }}
                  >
                    REF # (4 DIGITS):
                  </Text>
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: '800',
                      color: '#810021',
                      paddingVertical: 6,
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                    value={tender.referenceNumber || ''}
                    placeholder="e.g. 8921"
                    placeholderTextColor="#fca5a5"
                    onChangeText={(val) => {
                      const sanitized = val.replace(/[^0-9]/g, '').slice(0, 4);
                      onUpdateTender(tender.id, { referenceNumber: sanitized });
                    }}
                  />
                  {/^\d{4}$/.test(tender.referenceNumber || '') && (
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#16a34a' }}>✓ OK</Text>
                  )}
                </View>
              </View>
            )}

            {isCard && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#eff6ff',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: '#bfdbfe',
                  minHeight: 40,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e40af', marginRight: 4 }}>
                  Card Last 4 Digits (Optional):
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: '800',
                    color: '#1e3a8a',
                    paddingVertical: 6,
                  }}
                  keyboardType="numeric"
                  maxLength={4}
                  value={tender.last4Digits || ''}
                  placeholder="e.g. 4022"
                  placeholderTextColor="#93c5fd"
                  onChangeText={(val) => {
                    const sanitized = val.replace(/[^0-9]/g, '').slice(0, 4);
                    onUpdateTender(tender.id, { last4Digits: sanitized });
                  }}
                />
              </View>
            )}

            {isComp && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#faf5ff',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: '#e9d5ff',
                  minHeight: 40,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b21a8', marginRight: 4 }}>
                  Reason:
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#581c87',
                    paddingVertical: 6,
                  }}
                  value={tender.reason || ''}
                  placeholder="VIP, Management, or House"
                  placeholderTextColor="#d8b4fe"
                  onChangeText={(val) => {
                    onUpdateTender(tender.id, { reason: val });
                  }}
                />
              </View>
            )}
          </View>
        );
      })}

      {/* Add Tender Buttons */}
      <View style={{ marginTop: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 6 }}>
          + Add Payment Tender:
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Pressable
            onPress={() => addTenderWithMethod('cash')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#f0fdf4',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#86efac',
            }}
          >
            <Banknote size={14} color="#15803d" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803d' }}>+ Cash</Text>
          </Pressable>

          <Pressable
            onPress={() => addTenderWithMethod('digital_wallet')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#fff1f2',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#fecdd3',
            }}
          >
            <QrCode size={14} color="#810021" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#810021' }}>+ QR Wallet</Text>
          </Pressable>

          <Pressable
            onPress={() => addTenderWithMethod('card')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#eff6ff',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#bfdbfe',
            }}
          >
            <CreditCard size={14} color="#2563eb" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563eb' }}>+ Card</Text>
          </Pressable>

          <Pressable
            onPress={() => addTenderWithMethod('comp')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#faf5ff',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#e9d5ff',
            }}
          >
            <Gift size={14} color="#9333ea" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#9333ea' }}>+ Comp</Text>
          </Pressable>
        </View>
      </View>

      {/* Validation Errors banner */}
      {!validation.isValid && validation.errors.length > 0 && (
        <View
          style={{
            marginTop: 10,
            padding: 8,
            backgroundColor: '#fef2f2',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#fecdd3',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626' }}>
            ⚠️ {validation.errors[0]}
          </Text>
        </View>
      )}
    </View>
  );
};
