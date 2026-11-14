import React from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { Printer, X } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type { SettledCheckItem } from '../../domain/check.types';

export interface CheckMobileDetailSheetProps {
  visible: boolean;
  selectedCheck: SettledCheckItem | null;
  isReprinting: boolean;
  onClose: () => void;
  onBrowserPrint: () => void;
  onReprintThermal: () => void;
}

export const CheckMobileDetailSheet: React.FC<CheckMobileDetailSheetProps> = ({
  visible,
  selectedCheck,
  isReprinting,
  onClose,
  onBrowserPrint,
  onReprintThermal,
}) => {
  if (!selectedCheck) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-wine-950/75 justify-end">
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityLabel="Close mobile check details"
        />
        <View className="bg-white rounded-t-3xl max-h-[88%] p-5 shadow-2xl flex-col">
          <View className="flex-row items-center justify-between pb-3 border-b border-stone-200">
            <View>
              <View className="flex-row items-center gap-2">
                <Text className="text-xl font-black text-stone-900 tracking-tight">
                  Check {selectedCheck.checkNumber}
                </Text>
                <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                  <Text className="text-sm font-bold text-emerald-800">SETTLED</Text>
                </View>
              </View>
              <Text className="text-sm text-stone-500 mt-0.5">
                {selectedCheck.tableOrRef} • {selectedCheck.guestName}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-stone-100 items-center justify-center active:bg-stone-200"
              accessibilityLabel="Close"
            >
              <X size={20} color="#57534e" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 py-3" showsVerticalScrollIndicator={false}>
            {/* Items */}
            <View className="mb-4">
              <Text className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-2">
                Line Items ({selectedCheck.itemsCount})
              </Text>
              {selectedCheck.items.map((it) => (
                <View
                  key={it.id}
                  className="flex-row items-center justify-between py-2 border-b border-stone-100"
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-medium text-stone-900">
                      {it.quantity}x {it.name}
                    </Text>
                    {it.modifiers && it.modifiers.length > 0 && (
                      <Text className="text-xs text-[#800020] font-semibold mt-0.5">
                        + {it.modifiers.join(', ')}
                      </Text>
                    )}
                  </View>
                  <Text className="text-base font-bold text-stone-900">
                    {formatCurrency(it.subtotal)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Financial Breakdown */}
            <View className="space-y-1.5 pt-3 border-t border-stone-300">
              <View className="flex-row justify-between">
                <Text className="text-base text-stone-600">Subtotal</Text>
                <Text className="text-base font-semibold text-stone-900">
                  {formatCurrency(selectedCheck.subtotal)}
                </Text>
              </View>
              {selectedCheck.discountAmount > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-base text-rose-600">Discounts &amp; Promos</Text>
                  <Text className="text-base font-bold text-rose-600">
                    -{formatCurrency(selectedCheck.discountAmount)}
                  </Text>
                </View>
              )}
              {selectedCheck.serviceCharge > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-base text-stone-600">Service Charge</Text>
                  <Text className="text-base font-semibold text-stone-900">
                    {formatCurrency(selectedCheck.serviceCharge)}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between">
                <Text className="text-base text-stone-500">VATable Sales</Text>
                <Text className="text-base text-stone-700">
                  {formatCurrency(selectedCheck.vatableSales)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-base text-stone-500">12% VAT Included</Text>
                <Text className="text-base text-stone-700">
                  {formatCurrency(selectedCheck.vatAmount)}
                </Text>
              </View>
              <View className="flex-row justify-between pt-2 border-t border-stone-200">
                <Text className="text-lg font-black text-stone-900">Total Settled</Text>
                <Text className="text-xl font-black text-[#800020]">
                  {formatCurrency(selectedCheck.total)}
                </Text>
              </View>

              {/* Multi-Tender Breakdown */}
              {selectedCheck.tenders && selectedCheck.tenders.length > 0 ? (
                <View className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <Text className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    Split Tender Breakdown
                  </Text>
                  {selectedCheck.tenders.map((t, idx) => {
                    const m = (t.method || '').toLowerCase();
                    let label = m.toUpperCase();
                    if (m === 'cash') label = 'Cash';
                    else if (m === 'digital_wallet' || m === 'wallet') {
                      label = `${t.channel || 'Wallet'}${t.referenceNumber ? ` (#${t.referenceNumber})` : ''}`;
                    } else if (m === 'card') {
                      label = t.last4Digits ? `Card (**** ${t.last4Digits})` : 'Card';
                    } else if (m === 'comp') {
                      label = t.reason ? `Comp (${t.reason})` : 'Comp';
                    }
                    return (
                      <View key={t.id || idx} className="flex-row justify-between py-0.5">
                        <Text className="text-sm font-semibold text-stone-700">{label}</Text>
                        <Text className="text-sm font-bold text-stone-900">
                          {formatCurrency(t.amount)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="pt-3 border-t border-stone-200 flex-row gap-2">
            <Pressable
              onPress={onBrowserPrint}
              className="flex-1 min-h-[48px] rounded-xl border border-stone-300 bg-white items-center justify-center active:bg-stone-50 flex-row gap-2"
            >
              <Printer size={18} color="#44403c" />
              <Text className="text-base font-bold text-stone-800">Print</Text>
            </Pressable>
            <Pressable
              onPress={onReprintThermal}
              disabled={isReprinting}
              className="flex-1 min-h-[48px] rounded-xl bg-[#800020] items-center justify-center active:bg-[#600018] flex-row gap-2"
            >
              <Printer size={18} color="#ffffff" />
              <Text className="text-base font-bold text-white">
                {isReprinting ? 'Sending...' : 'Reprint'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
