import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Printer, CheckCircle2 } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type { SettledCheckItem } from '../../domain/check.types';

export interface CheckReceiptInspectorProps {
  selectedCheck: SettledCheckItem;
  isReprinting: boolean;
  reprintSuccess: boolean;
  onBrowserPrint: () => void;
  onReprintThermal: () => void;
}

export const CheckReceiptInspector: React.FC<CheckReceiptInspectorProps> = ({
  selectedCheck,
  isReprinting,
  reprintSuccess,
  onBrowserPrint,
  onReprintThermal,
}) => {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View
        {...({ id: 'monks-check-receipt-printable' } as any)}
        className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs max-w-2xl mx-auto w-full"
      >
        {/* Top Bar with Reprint & PDF Actions */}
        <View className="flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-stone-200 gap-4 print:hidden">
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-black text-stone-900 tracking-tight">
                Check {selectedCheck.checkNumber}
              </Text>
              <View className="bg-emerald-100 px-2.5 py-0.5 rounded-full">
                <Text className="text-base font-bold text-emerald-800">SETTLED</Text>
              </View>
            </View>
            <Text className="text-base text-stone-500 mt-1">
              Settled on {new Date(selectedCheck.settledAt).toLocaleDateString()} at{' '}
              {selectedCheck.timestamp}
            </Text>
          </View>

          <View className="flex-row items-center gap-2.5">
            <Pressable
              onPress={onBrowserPrint}
              className="min-h-[48px] px-4 py-2.5 rounded-xl border border-stone-300 bg-white active:bg-stone-50 flex-row items-center gap-2 shadow-xs"
            >
              <Printer size={18} color="#44403c" />
              <Text className="text-base font-bold text-stone-800">Print / PDF</Text>
            </Pressable>

            <Pressable
              onPress={onReprintThermal}
              disabled={isReprinting}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#800020] active:bg-[#600018] flex-row items-center gap-2 shadow-xs"
            >
              <Printer size={18} color="#ffffff" />
              <Text className="text-base font-bold text-white">
                {isReprinting ? 'Sending...' : 'Thermal Reprint'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Print-only Official Header */}
        <View className="hidden print:block text-center pb-4 mb-4 border-b border-dashed border-stone-400">
          <Text className="text-xl font-bold text-center">MONK'S DREAM JAZZ BAR AND CAFE</Text>
          <Text className="text-xs text-center text-stone-500">
            Craft Cocktails &amp; Fine Jazz
          </Text>
          <Text className="text-xs text-center text-stone-500">
            Tel: +63 917 555 1957 · @monksdreamjazz
          </Text>
          <Text className="text-xs text-center mt-1">
            Check: {selectedCheck.checkNumber} · Date:{' '}
            {new Date(selectedCheck.settledAt).toLocaleString()}
          </Text>
        </View>

        {reprintSuccess && (
          <View className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex-row items-center gap-2 print:hidden">
            <CheckCircle2 size={18} color="#059669" />
            <Text className="text-base font-bold text-emerald-800">
              Signal sent! Receipt enqueued to 80mm POS Thermal Printer queue.
            </Text>
          </View>
        )}

        {/* Metadata Grid */}
        <View className="grid grid-cols-2 gap-4 my-6 p-4 rounded-2xl bg-stone-50/80 border border-stone-200/80">
          <View>
            <Text className="text-base font-semibold text-stone-500">Guest / Customer</Text>
            <Text className="text-base font-bold text-stone-900 mt-0.5">
              {selectedCheck.guestName}
            </Text>
          </View>
          <View>
            <Text className="text-base font-semibold text-stone-500">Destination</Text>
            <Text className="text-base font-bold text-stone-900 mt-0.5">
              {selectedCheck.tableOrRef}
            </Text>
          </View>
          <View>
            <Text className="text-base font-semibold text-stone-500">Cashier in Charge</Text>
            <Text className="text-base font-bold text-stone-900 mt-0.5">
              {selectedCheck.cashierName}
            </Text>
          </View>
          <View>
            <Text className="text-base font-semibold text-stone-500">Tender Captured</Text>
            {selectedCheck.tenders && selectedCheck.tenders.length > 0 ? (
              <View className="mt-1 flex-col gap-1">
                <Text className="text-base font-black text-[#800020]">SPLIT PAYMENT</Text>
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
                    <Text key={t.id || idx} className="text-sm font-semibold text-stone-700">
                      • {label}: {formatCurrency(t.amount)}
                    </Text>
                  );
                })}
              </View>
            ) : (
              <Text className="text-base font-bold text-[#800020] mt-0.5">
                {(
                  selectedCheck.paymentChannel || selectedCheck.paymentMethod.replace('_', ' ')
                ).toUpperCase()}
                {selectedCheck.referenceNumber ? ` · REF #${selectedCheck.referenceNumber}` : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View className="mb-6">
          <Text className="text-base font-extrabold text-stone-900 mb-3 uppercase tracking-wider">
            Ordered Items &amp; Servings ({selectedCheck.itemsCount})
          </Text>
          {selectedCheck.items.length === 0 ? (
            <View className="py-4 border-y border-stone-100 flex-row justify-between items-center">
              <Text className="text-base font-medium text-stone-700">Settled Customer Bill</Text>
              <Text className="text-base font-bold text-stone-900">
                {formatCurrency(selectedCheck.subtotal)}
              </Text>
            </View>
          ) : (
            <View className="divide-y divide-stone-100 border-y border-stone-200">
              {selectedCheck.items.map((it, idx) => (
                <View key={it.id || idx} className="py-3 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-7 h-7 rounded-lg bg-stone-100 items-center justify-center">
                      <Text className="text-base font-bold text-stone-800">{it.quantity}x</Text>
                    </View>
                    <View>
                      <Text className="text-base font-bold text-stone-900">{it.name}</Text>
                      {it.modifiers && it.modifiers.length > 0 && (
                        <Text className="text-xs text-[#800020] font-semibold">
                          + {it.modifiers.join(', ')}
                        </Text>
                      )}
                      {it.notes && (
                        <Text className="text-base text-amber-800 italic">{it.notes}</Text>
                      )}
                    </View>
                  </View>
                  <Text className="text-base font-black text-stone-900">
                    {formatCurrency(it.subtotal)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Financial Breakdown */}
        <View className="space-y-2.5 pt-4 border-t-2 border-stone-900">
          <View className="flex-row justify-between items-center">
            <Text className="text-base font-semibold text-stone-600">Items Subtotal</Text>
            <Text className="text-base font-bold text-stone-900">
              {formatCurrency(selectedCheck.subtotal)}
            </Text>
          </View>

          {selectedCheck.discountAmount > 0 && (
            <View className="flex-row justify-between items-center">
              <Text className="text-base font-semibold text-rose-600">Discounts &amp; Promos</Text>
              <Text className="text-base font-bold text-rose-600">
                -{formatCurrency(selectedCheck.discountAmount)}
              </Text>
            </View>
          )}

          {selectedCheck.corkageFee > 0 && (
            <View className="flex-row justify-between items-center">
              <Text className="text-base font-semibold text-stone-600">Corkage Fee</Text>
              <Text className="text-base font-bold text-stone-900">
                {formatCurrency(selectedCheck.corkageFee)}
              </Text>
            </View>
          )}

          {selectedCheck.serviceCharge > 0 && (
            <View className="flex-row justify-between items-center">
              <Text className="text-base font-semibold text-stone-600">Service Charge</Text>
              <Text className="text-base font-bold text-stone-900">
                {formatCurrency(selectedCheck.serviceCharge)}
              </Text>
            </View>
          )}

          {Boolean(selectedCheck.vatExemptSales && selectedCheck.vatExemptSales > 0) && (
            <View className="flex-row justify-between items-center">
              <Text className="text-base font-semibold text-amber-700">
                VAT-Exempt Sales (Senior/PWD)
              </Text>
              <Text className="text-base font-bold text-amber-800">
                {formatCurrency(selectedCheck.vatExemptSales || 0)}
              </Text>
            </View>
          )}

          {Boolean(selectedCheck.seniorPwdId) && (
            <View className="flex-row justify-between items-center py-1 px-2.5 bg-amber-50 rounded-lg border border-amber-200">
              <Text className="text-sm font-semibold text-amber-900">
                ID: {selectedCheck.seniorPwdId}
              </Text>
              <Text className="text-sm font-bold text-amber-900">
                {selectedCheck.seniorPwdName || 'Cardholder'}
              </Text>
            </View>
          )}

          <View className="flex-row justify-between items-center">
            <Text className="text-base font-semibold text-stone-500">VATable Sales (Net)</Text>
            <Text className="text-base font-medium text-stone-600">
              {formatCurrency(selectedCheck.vatableSales)}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-base font-semibold text-stone-500">12% VAT Included</Text>
            <Text className="text-base font-medium text-stone-600">
              {formatCurrency(selectedCheck.vatAmount)}
            </Text>
          </View>

          <View className="flex-row justify-between items-center pt-3 border-t border-stone-200">
            <Text className="text-xl font-black text-stone-900">Grand Total Settled</Text>
            <Text className="text-2xl font-black text-[#800020]">
              {formatCurrency(selectedCheck.total)}
            </Text>
          </View>
        </View>

        {/* Print Footer */}
        <View className="hidden print:block text-center pt-6 mt-6 border-t border-dashed border-stone-400">
          <Text className="text-xs font-bold text-stone-800 tracking-wider">
            "WRITING ABOUT MUSIC IS LIKE DANCING ABOUT ARCHITECTURE"
          </Text>
          <Text className="text-xs text-stone-500 italic mt-0.5">— THELONIOUS MONK —</Text>
          <Text className="text-xs font-bold text-stone-900 tracking-widest mt-3">
            *** THIS IS NOT AN OFFICIAL RECEIPT ***
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};
