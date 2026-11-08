import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '@monks/shared';
import type { ReadingData } from '../../../../data/readings.api';

interface ReadingDocumentSheetProps {
  reading: ReadingData;
  title: string;
  drawerLabel: string;
  isYReading: boolean;
}

export const ReadingDocumentSheet: React.FC<ReadingDocumentSheetProps> = ({
  reading,
  title,
  drawerLabel,
  isYReading,
}) => {
  return (
    <View
      nativeID="monks-reading-print-area"
      {...({ id: 'monks-reading-print-area' } as any)}
      className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-5 shadow-xs max-w-4xl mx-auto w-full"
    >
      {/* Brand Header */}
      <View className="items-center pb-2.5 border-b-2 border-stone-800 mb-3 print-avoid-break">
        <Text className="text-[11px] font-bold tracking-widest text-[#800020] uppercase">
          Monk's Dream Jazz Bar &amp; Bistro
        </Text>
        <Text className="text-xl sm:text-2xl font-black text-stone-900 mt-0.5">{title}</Text>
        <Text className="text-xs sm:text-sm font-medium text-stone-500 mt-0.5">
          Official POS Terminal Audit &amp; Fiscal Balancing Slip
        </Text>

        <View className="flex-row items-center gap-2.5 mt-1.5 flex-wrap justify-center">
          <Text className="text-xs sm:text-sm text-stone-700 font-bold">Scope: {drawerLabel}</Text>
          <Text className="text-xs text-stone-400">•</Text>
          <Text className="text-xs sm:text-sm text-stone-700 font-bold">
            Staff: {reading.outgoing_staff_name || reading.performed_by_name || 'Shift Cashier'}
          </Text>
          <Text className="text-xs text-stone-400">•</Text>
          <Text className="text-xs sm:text-sm text-stone-500 font-medium">
            Period:{' '}
            {new Date(reading.opened_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            -{' '}
            {new Date(reading.generated_at || reading.closed_at || Date.now()).toLocaleTimeString(
              [],
              { hour: '2-digit', minute: '2-digit' }
            )}
          </Text>
        </View>
      </View>

      {/* 2-Column Responsive / Print Grid */}
      <View className="report-grid-2col flex-col md:flex-row gap-3 mb-3">
        {/* Column 1: Sales, Operating Mode, Tax */}
        <View className="flex-1 space-y-3">
          {/* Section 1: Financial Summary */}
          <View className="print-avoid-break bg-stone-50/60 p-3 rounded-xl border border-stone-200">
            <Text className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#800020] mb-1.5">
              1. Sales &amp; Revenue
            </Text>
            <View className="divide-y divide-stone-200">
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-stone-600">Gross Sales</Text>
                <Text className="text-sm font-bold text-stone-900">
                  {formatCurrency(reading.gross_sales)}
                </Text>
              </View>
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-stone-600">Discounts &amp; Comps</Text>
                <Text className="text-sm font-bold text-amber-700">
                  -{formatCurrency(reading.discount_total)}
                </Text>
              </View>
              <View className="flex-row justify-between py-2 bg-stone-100 px-2 rounded-lg mt-1">
                <Text className="text-sm font-black text-stone-900">Net Sales</Text>
                <Text className="text-base font-black text-[#800020]">
                  {formatCurrency(reading.net_sales)}
                </Text>
              </View>
            </View>

            {/* Operating Mode Split */}
            {(reading.cafe_sales !== undefined || reading.event_sales !== undefined) && (
              <View className="mt-2.5 pt-2 border-t border-dashed border-stone-300">
                <Text className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Operating Mode Revenue Split
                </Text>
                <View className="space-y-1">
                  <View className="flex-row justify-between py-1">
                    <View className="flex-row items-center gap-1.5">
                      <View className="w-2 h-2 rounded-full bg-amber-500" />
                      <Text className="text-xs text-stone-700 font-semibold">☀️ Cafe Mode</Text>
                      {reading.cafe_tx_count !== undefined && (
                        <Text className="text-[11px] text-stone-400">
                          ({reading.cafe_tx_count})
                        </Text>
                      )}
                    </View>
                    <Text className="text-xs font-bold text-stone-900">
                      {formatCurrency(reading.cafe_sales || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-1">
                    <View className="flex-row items-center gap-1.5">
                      <View className="w-2 h-2 rounded-full bg-[#800020]" />
                      <Text className="text-xs text-stone-700 font-semibold">🎷 Event Mode</Text>
                      {reading.event_tx_count !== undefined && (
                        <Text className="text-[11px] text-stone-400">
                          ({reading.event_tx_count})
                        </Text>
                      )}
                    </View>
                    <Text className="text-xs font-bold text-stone-900">
                      {formatCurrency(reading.event_sales || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Section 2: Tax & Surcharges */}
          <View className="print-avoid-break bg-stone-50/60 p-3.5 rounded-xl border border-stone-200">
            <Text className="text-sm font-extrabold uppercase tracking-wider text-[#800020] mb-2">
              2. Tax &amp; Service Charge (BIR)
            </Text>
            <View className="divide-y divide-stone-200">
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-stone-600">VATable Sales</Text>
                <Text className="text-sm font-bold text-stone-900">
                  {formatCurrency(reading.vatable_sales)}
                </Text>
              </View>
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-stone-600">12% VAT</Text>
                <Text className="text-sm font-bold text-stone-900">
                  {formatCurrency(reading.vat_amount)}
                </Text>
              </View>
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-stone-600">House Service Charge</Text>
                <Text className="text-sm font-bold text-stone-900">
                  {formatCurrency(reading.service_charge)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Column 2: Tender Breakdown & Cash Drawer */}
        <View className="flex-1 space-y-4">
          {/* Section 3: Tender Breakdown */}
          <View className="print-avoid-break bg-stone-50/60 p-3.5 rounded-xl border border-stone-200">
            <Text className="text-sm font-extrabold uppercase tracking-wider text-[#800020] mb-2">
              3. Payment Tender Breakdown
            </Text>
            <View className="divide-y divide-stone-200">
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-stone-600">Cash Payments</Text>
                <Text className="text-sm font-bold text-stone-900">
                  {formatCurrency(reading.tender_cash)}
                </Text>
              </View>
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-stone-600">Credit / Debit Card</Text>
                <Text className="text-sm font-bold text-stone-900">
                  {formatCurrency(reading.tender_card)}
                </Text>
              </View>
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-stone-600">GCash / Maya Digital</Text>
                <Text className="text-sm font-bold text-stone-900">
                  {formatCurrency(reading.tender_digital)}
                </Text>
              </View>
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-stone-600">Grab / Foodpanda</Text>
                <Text className="text-sm font-bold text-stone-900">
                  {formatCurrency(reading.tender_delivery)}
                </Text>
              </View>
              <View className="flex-row justify-between py-2 bg-stone-100 px-2 rounded-lg mt-1">
                <Text className="text-sm font-black text-stone-900">Total Tender</Text>
                <Text className="text-base font-black text-stone-900">
                  {formatCurrency(reading.total_tender)}
                </Text>
              </View>
            </View>
          </View>

          {/* Section 4: Cash Drawer Audit */}
          <View className="print-avoid-break bg-stone-50/60 p-3.5 rounded-xl border border-stone-200">
            <Text className="text-sm font-extrabold uppercase tracking-wider text-[#800020] mb-2">
              4. Cash Drawer Reconciliation
            </Text>
            <View className="divide-y divide-stone-200">
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-stone-600">Starting Float</Text>
                <Text className="text-sm font-bold text-stone-900">
                  {formatCurrency(reading.opening_float)}
                </Text>
              </View>
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-stone-600">Cash Sales Intake (+)</Text>
                <Text className="text-sm font-bold text-emerald-700">
                  +{formatCurrency(reading.tender_cash)}
                </Text>
              </View>
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-stone-600">Cash In / Out / Safe</Text>
                <Text className="text-sm font-bold text-stone-700">
                  {formatCurrency(reading.cash_in - reading.cash_out - reading.safe_drops)}
                </Text>
              </View>
              <View className="flex-row justify-between py-2 bg-stone-100 px-2 rounded-lg mt-1">
                <Text className="text-sm font-black text-stone-900">Expected Cash</Text>
                <Text className="text-base font-black text-stone-900">
                  {formatCurrency(reading.expected_cash)}
                </Text>
              </View>

              {reading.counted_cash !== undefined && (
                <View className="mt-2 pt-2 border-t border-stone-300">
                  <View className="flex-row justify-between py-1">
                    <Text className="text-sm font-bold text-stone-800">Physical Counted Cash</Text>
                    <Text className="text-sm font-black text-stone-900">
                      {formatCurrency(reading.counted_cash)}
                    </Text>
                  </View>
                  <View
                    className={`flex-row justify-between py-1.5 px-2.5 rounded-lg mt-1 ${
                      reading.variance === 0
                        ? 'bg-emerald-50 text-emerald-800'
                        : reading.variance && reading.variance > 0
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-red-50 text-red-800'
                    }`}
                  >
                    <Text className="text-xs font-black">
                      {reading.variance === 0
                        ? '✓ Balanced'
                        : reading.variance && reading.variance > 0
                          ? '▲ Surplus (Over)'
                          : '▼ Discrepancy (Short)'}
                    </Text>
                    <Text className="text-xs font-black">
                      {reading.variance && reading.variance > 0 ? '+' : ''}
                      {formatCurrency(reading.variance || 0)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Audit Reference Trailer */}
      <View className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex-row justify-between items-center mb-4 print-avoid-break">
        <View>
          <Text className="text-xs font-bold text-stone-600">
            Invoice Reference Range:{' '}
            <Text className="text-stone-900 font-semibold">
              {reading.first_receipt_no || 'N/A'} - {reading.last_receipt_no || 'N/A'}
            </Text>
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs font-bold text-stone-600">
            Total Settled Transactions:{' '}
            <Text className="text-stone-900 font-black">{reading.transaction_count} tabs</Text>
          </Text>
        </View>
      </View>

      {/* Handover Signatures */}
      <View className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 print-avoid-break">
        <Text className="text-xs font-extrabold uppercase tracking-wider text-[#800020] mb-2.5">
          {isYReading ? 'Staff Handover Acknowledgment' : 'Fiscal Closeout Acknowledgment'}
        </Text>
        <View className="report-grid-2col flex-col sm:flex-row gap-3">
          <View className="flex-1 p-2.5 bg-white rounded-lg border border-stone-200">
            <Text className="text-xs font-semibold text-stone-500">
              {isYReading ? 'Handed Over By (Outgoing Cashier):' : 'Prepared By (Cashier):'}
            </Text>
            <Text className="text-sm font-bold text-stone-900 mt-0.5">
              {reading.outgoing_staff_name || reading.performed_by_name || 'Shift Cashier'}
            </Text>
            <View className="mt-5 pt-1 border-t border-stone-300">
              <Text className="text-[11px] text-stone-400">
                Signature: __________________________
              </Text>
            </View>
          </View>
          <View className="flex-1 p-2.5 bg-white rounded-lg border border-stone-200">
            <Text className="text-xs font-semibold text-stone-500">
              {isYReading ? 'Received By (Incoming Cashier):' : 'Verified By (Duty Manager):'}
            </Text>
            <Text className="text-sm font-bold text-stone-900 mt-0.5">
              {reading.incoming_staff_name || 'Duty Manager'}
            </Text>
            <View className="mt-5 pt-1 border-t border-stone-300">
              <Text className="text-[11px] text-stone-400">
                Signature: __________________________
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};
