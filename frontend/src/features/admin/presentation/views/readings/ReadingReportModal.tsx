import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { X, Printer, Download, Receipt, FileText, CheckCircle2 } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { readingsApi, type ReadingData } from '../../../data/readings.api';

interface ReadingReportModalProps {
  visible: boolean;
  reading: ReadingData | null;
  onClose: () => void;
}

export const ReadingReportModal: React.FC<ReadingReportModalProps> = ({
  visible,
  reading,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'document' | 'thermal'>('document');
  const [isSendingToThermal, setIsSendingToThermal] = useState(false);

  if (!reading) return null;

  const isZReading = reading.reading_type === 'Z_READING';
  const isYReading = reading.reading_type === 'Y_READING';
  const title = isZReading
    ? `Shift Z-Reading #${reading.z_number || 1}`
    : isYReading
      ? `Shift Handover Y-Reading #${reading.y_number || 1}`
      : 'Mid-Shift X-Reading (Interim)';

  const drawerLabel =
    reading.drawer_target === 'bar'
      ? 'Bar Station Till'
      : reading.drawer_target === 'main'
        ? 'Main Floor Till'
        : 'Consolidated Venue (All Tills)';

  const handleBrowserPrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    } else {
      toast.info('Printing is supported in web desktop view.');
    }
  };

  const handleSendToThermal = async () => {
    setIsSendingToThermal(true);
    try {
      await readingsApi.enqueueThermalPrintJob(reading);
      toast.success(`${title} sent to POS thermal printer!`, {
        title: 'Thermal Slip Enqueued',
      });
    } catch {
      toast.error('Failed to enqueue thermal print job', { title: 'Printer Error' });
    } finally {
      setIsSendingToThermal(false);
    }
  };

  const handleDownload = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const reportText = `================================================
MONK'S DREAM JAZZ BAR & BISTRO
${title.toUpperCase()}
================================================
Drawer Scope: ${drawerLabel}
Opened At:    ${new Date(reading.opened_at).toLocaleString()}
Generated At: ${new Date(reading.generated_at || reading.closed_at || Date.now()).toLocaleString()}
Manager:      ${reading.performed_by_name || 'Manager'}
Invoice Range: ${reading.first_receipt_no} - ${reading.last_receipt_no}
Transactions: ${reading.transaction_count}

------------------------------------------------
FINANCIAL SUMMARY
------------------------------------------------
Gross Sales:        ${formatCurrency(reading.gross_sales)}
Discounts & Comps: -${formatCurrency(reading.discount_total)}
Net Sales:          ${formatCurrency(reading.net_sales)}

------------------------------------------------
TAX & CHARGES BREAKDOWN
------------------------------------------------
VATable Sales (12%): ${formatCurrency(reading.vatable_sales)}
12% VAT Amount:      ${formatCurrency(reading.vat_amount)}
VAT-Exempt Sales:    ${formatCurrency(reading.vat_exempt_sales)}
10% Service Charge:  ${formatCurrency(reading.service_charge)}

------------------------------------------------
TENDER SUMMARY
------------------------------------------------
Cash Sales:         ${formatCurrency(reading.tender_cash)}
Credit/Debit Card:  ${formatCurrency(reading.tender_card)}
Digital Wallets:    ${formatCurrency(reading.tender_digital)}
Delivery Apps:      ${formatCurrency(reading.tender_delivery)}
Total Tender:       ${formatCurrency(reading.total_tender)}

------------------------------------------------
CASH DRAWER RECONCILIATION
------------------------------------------------
Opening Float:      ${formatCurrency(reading.opening_float)}
Cash In (+):        ${formatCurrency(reading.cash_in)}
Petty Cash Out (-): ${formatCurrency(reading.cash_out)}
Safe Drops (-):     ${formatCurrency(reading.safe_drops)}
Expected System Cash: ${formatCurrency(reading.expected_cash)}
${
  reading.counted_cash !== undefined
    ? `Actual Counted Cash:  ${formatCurrency(reading.counted_cash)}
Variance:             ${reading.variance && reading.variance > 0 ? '+' : ''}${formatCurrency(reading.variance || 0)}`
    : ''
}
================================================
Official POS Audit Document
`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reading.reading_type}_${reading.drawer_target}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Reading report downloaded successfully', { title: 'Downloaded' });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/75 justify-center items-center p-4">
        <Pressable className="absolute inset-0" onPress={onClose} />

        <View className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden flex-col border border-stone-200">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-[#800020] items-center justify-center">
                {isZReading ? (
                  <Receipt size={20} color="#ffffff" />
                ) : (
                  <FileText size={20} color="#ffffff" />
                )}
              </View>
              <View>
                <Text className="text-xl font-extrabold text-stone-900">{title}</Text>
                <Text className="text-base text-stone-500 font-medium">
                  {drawerLabel} • Non-resettable Fiscal Audit
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              {/* Format Toggle */}
              <View className="flex-row bg-stone-200/80 p-1 rounded-xl mr-2">
                <Pressable
                  onPress={() => setViewMode('document')}
                  className={`px-3 py-1.5 rounded-lg min-h-[36px] flex-row items-center ${
                    viewMode === 'document' ? 'bg-white shadow-xs' : ''
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${
                      viewMode === 'document' ? 'text-stone-900' : 'text-stone-600'
                    }`}
                  >
                    A4 Report
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setViewMode('thermal')}
                  className={`px-3 py-1.5 rounded-lg min-h-[36px] flex-row items-center ${
                    viewMode === 'thermal' ? 'bg-white shadow-xs' : ''
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${
                      viewMode === 'thermal' ? 'text-stone-900' : 'text-stone-600'
                    }`}
                  >
                    80mm Thermal
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={onClose}
                className="w-10 h-10 rounded-xl bg-stone-200/60 items-center justify-center active:bg-stone-300"
              >
                <X size={20} color="#57534e" />
              </Pressable>
            </View>
          </View>

          {/* Report Body */}
          <ScrollView className="flex-1 p-6 bg-[#fcf9f9]" showsVerticalScrollIndicator={false}>
            {viewMode === 'document' ? (
              /* Minimalist Document Sheet View */
              <View className="bg-white rounded-2xl border border-stone-200 p-8 shadow-xs max-w-2xl mx-auto w-full">
                {/* Brand Header */}
                <View className="items-center pb-6 border-b border-stone-200 mb-6">
                  <Text className="text-xs font-bold tracking-widest text-[#800020] uppercase">
                    Monk's Dream Jazz Bar & Bistro
                  </Text>
                  <Text className="text-2xl font-black text-stone-900 mt-1">{title}</Text>
                  <Text className="text-base text-stone-500 mt-1">Official POS Terminal Audit</Text>

                  <View className="flex-row items-center gap-4 mt-3 text-base text-stone-500">
                    <Text className="text-base text-stone-600 font-semibold">
                      Scope: {drawerLabel}
                    </Text>
                    <Text className="text-base text-stone-400">•</Text>
                    <Text className="text-base text-stone-600 font-semibold">
                      Manager: {reading.performed_by_name || 'Manager'}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-4 mt-1 text-base text-stone-500">
                    <Text className="text-base text-stone-500">
                      Period:{' '}
                      {new Date(reading.opened_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(
                        reading.generated_at || reading.closed_at || Date.now()
                      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>

                {/* Section 1: Financial Summary */}
                <View className="mb-6">
                  <Text className="text-base font-extrabold uppercase tracking-wider text-[#800020] mb-3">
                    1. Sales & Revenue
                  </Text>
                  <View className="border-t border-b border-stone-200 divide-y divide-stone-100">
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">Gross Sales</Text>
                      <Text className="text-base font-bold text-stone-900">
                        {formatCurrency(reading.gross_sales)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">Discounts & Comps</Text>
                      <Text className="text-base font-bold text-amber-700">
                        -{formatCurrency(reading.discount_total)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-3 bg-stone-50 px-2 rounded-lg">
                      <Text className="text-base font-black text-stone-900">Net Sales</Text>
                      <Text className="text-lg font-black text-[#800020]">
                        {formatCurrency(reading.net_sales)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Section 2: Tax & Surcharges */}
                <View className="mb-6">
                  <Text className="text-base font-extrabold uppercase tracking-wider text-[#800020] mb-3">
                    2. Tax & Service Charge (PH BIR Standard)
                  </Text>
                  <View className="border-t border-b border-stone-200 divide-y divide-stone-100">
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">
                        VATable Sales (Net of VAT & SC)
                      </Text>
                      <Text className="text-base font-bold text-stone-900">
                        {formatCurrency(reading.vatable_sales)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">12% Value-Added Tax (VAT)</Text>
                      <Text className="text-base font-bold text-stone-900">
                        {formatCurrency(reading.vat_amount)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">10% House Service Charge</Text>
                      <Text className="text-base font-bold text-stone-900">
                        {formatCurrency(reading.service_charge)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Section 3: Tender Breakdown */}
                <View className="mb-6">
                  <Text className="text-base font-extrabold uppercase tracking-wider text-[#800020] mb-3">
                    3. Payment Tender Breakdown
                  </Text>
                  <View className="border-t border-b border-stone-200 divide-y divide-stone-100">
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">Cash Payments</Text>
                      <Text className="text-base font-bold text-stone-900">
                        {formatCurrency(reading.tender_cash)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">Credit / Debit Card</Text>
                      <Text className="text-base font-bold text-stone-900">
                        {formatCurrency(reading.tender_card)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">
                        Digital Wallets (GCash / Maya)
                      </Text>
                      <Text className="text-base font-bold text-stone-900">
                        {formatCurrency(reading.tender_digital)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">
                        In-App Delivery (Grab / Foodpanda)
                      </Text>
                      <Text className="text-base font-bold text-stone-900">
                        {formatCurrency(reading.tender_delivery)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-3 bg-stone-50 px-2 rounded-lg">
                      <Text className="text-base font-black text-stone-900">
                        Total Tender Collected
                      </Text>
                      <Text className="text-lg font-black text-stone-900">
                        {formatCurrency(reading.total_tender)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Section 4: Cash Drawer Audit */}
                <View className="mb-6">
                  <Text className="text-base font-extrabold uppercase tracking-wider text-[#800020] mb-3">
                    4. Cash Drawer Reconciliation
                  </Text>
                  <View className="border-t border-b border-stone-200 divide-y divide-stone-100">
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">Opening Starting Float</Text>
                      <Text className="text-base font-bold text-stone-900">
                        {formatCurrency(reading.opening_float)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">Cash Sales Intake (+)</Text>
                      <Text className="text-base font-bold text-emerald-700">
                        +{formatCurrency(reading.tender_cash)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">Cash In (+)</Text>
                      <Text className="text-base font-bold text-emerald-700">
                        +{formatCurrency(reading.cash_in)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">Petty Cash Out (-)</Text>
                      <Text className="text-base font-bold text-amber-700">
                        -{formatCurrency(reading.cash_out)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">Safe Drops (-)</Text>
                      <Text className="text-base font-bold text-stone-700">
                        -{formatCurrency(reading.safe_drops)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-3 bg-stone-100 px-2 rounded-lg">
                      <Text className="text-base font-black text-stone-900">
                        Expected System Cash
                      </Text>
                      <Text className="text-lg font-black text-stone-900">
                        {formatCurrency(reading.expected_cash)}
                      </Text>
                    </View>

                    {reading.counted_cash !== undefined && (
                      <>
                        <View className="flex-row justify-between py-3">
                          <Text className="text-base font-bold text-stone-800">
                            Physical Counted Cash
                          </Text>
                          <Text className="text-lg font-black text-stone-900">
                            {formatCurrency(reading.counted_cash)}
                          </Text>
                        </View>
                        <View
                          className={`flex-row justify-between py-3 px-3 rounded-xl ${
                            reading.variance === 0
                              ? 'bg-emerald-50 text-emerald-800'
                              : reading.variance && reading.variance > 0
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-red-50 text-red-800'
                          }`}
                        >
                          <Text className="text-base font-black">
                            {reading.variance === 0
                              ? '✓ Cash Drawer Balanced'
                              : reading.variance && reading.variance > 0
                                ? '▲ Cash Surplus (Over)'
                                : '▼ Cash Discrepancy (Short)'}
                          </Text>
                          <Text className="text-lg font-black">
                            {reading.variance && reading.variance > 0 ? '+' : ''}
                            {formatCurrency(reading.variance || 0)}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>

                {/* Audit Trailer */}
                <View className="bg-stone-50 rounded-xl p-4 border border-stone-200 flex-row justify-between text-base">
                  <View>
                    <Text className="text-base font-bold text-stone-700">
                      Invoice Reference Range
                    </Text>
                    <Text className="text-base text-stone-500">
                      {reading.first_receipt_no} - {reading.last_receipt_no}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-bold text-stone-700">Settled Transactions</Text>
                    <Text className="text-base text-stone-500 font-bold">
                      {reading.transaction_count} tabs
                    </Text>
                  </View>
                </View>

                {/* Handover Signatures for Y-Reading */}
                {isYReading && (
                  <View className="mt-6 p-5 rounded-xl border border-stone-200 bg-stone-50">
                    <Text className="text-base font-extrabold uppercase tracking-wider text-[#800020] mb-3">
                      Staff Handover Acknowledgment
                    </Text>
                    <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <View className="p-3 bg-white rounded-lg border border-stone-200">
                        <Text className="text-sm font-semibold text-stone-500">
                          Handed Over By (Outgoing Cashier):
                        </Text>
                        <Text className="text-base font-bold text-stone-900 mt-1">
                          {reading.outgoing_staff_name ||
                            reading.performed_by_name ||
                            'Outgoing Staff'}
                        </Text>
                        <View className="mt-6 pt-1 border-t border-stone-300">
                          <Text className="text-xs text-stone-400">
                            Signature: __________________________
                          </Text>
                        </View>
                      </View>
                      <View className="p-3 bg-white rounded-lg border border-stone-200">
                        <Text className="text-sm font-semibold text-stone-500">
                          Received By (Incoming Cashier):
                        </Text>
                        <Text className="text-base font-bold text-stone-900 mt-1">
                          {reading.incoming_staff_name || 'Incoming Staff'}
                        </Text>
                        <View className="mt-6 pt-1 border-t border-stone-300">
                          <Text className="text-xs text-stone-400">
                            Signature: __________________________
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              /* 80mm Thermal Monospace View */
              <View className="bg-white rounded-2xl border border-stone-300 p-6 shadow-md max-w-sm mx-auto w-full font-mono">
                <View className="items-center border-b border-dashed border-stone-400 pb-4 mb-4">
                  <Text className="text-base font-black tracking-widest text-center">
                    MONK'S DREAM JAZZ BAR
                  </Text>
                  <Text className="text-xs text-stone-600 text-center">POS TERMINAL REPORT</Text>
                  <Text className="text-base font-black mt-2 text-center">{title}</Text>
                  <Text className="text-xs text-stone-500 mt-1">{drawerLabel}</Text>
                  <Text className="text-xs text-stone-500">
                    {new Date(
                      reading.generated_at || reading.closed_at || Date.now()
                    ).toLocaleString()}
                  </Text>
                </View>

                <View className="border-b border-dashed border-stone-400 pb-3 mb-3 text-xs space-y-1">
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-mono">GROSS SALES</Text>
                    <Text className="text-xs font-mono font-bold">
                      {formatCurrency(reading.gross_sales)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-mono">DISCOUNTS</Text>
                    <Text className="text-xs font-mono font-bold">
                      -{formatCurrency(reading.discount_total)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between border-t border-stone-200 pt-1">
                    <Text className="text-xs font-mono font-bold">NET SALES</Text>
                    <Text className="text-xs font-mono font-bold">
                      {formatCurrency(reading.net_sales)}
                    </Text>
                  </View>
                </View>

                <View className="border-b border-dashed border-stone-400 pb-3 mb-3 text-xs space-y-1">
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-mono">VATABLE SALES</Text>
                    <Text className="text-xs font-mono">
                      {formatCurrency(reading.vatable_sales)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-mono">12% VAT</Text>
                    <Text className="text-xs font-mono">{formatCurrency(reading.vat_amount)}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-mono">10% SERV CHG</Text>
                    <Text className="text-xs font-mono">
                      {formatCurrency(reading.service_charge)}
                    </Text>
                  </View>
                </View>

                <View className="border-b border-dashed border-stone-400 pb-3 mb-3 text-xs space-y-1">
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-mono">CASH TENDER</Text>
                    <Text className="text-xs font-mono font-bold">
                      {formatCurrency(reading.tender_cash)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-mono">CARD TENDER</Text>
                    <Text className="text-xs font-mono font-bold">
                      {formatCurrency(reading.tender_card)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-mono">DIGITAL WALLET</Text>
                    <Text className="text-xs font-mono font-bold">
                      {formatCurrency(reading.tender_digital)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between border-t border-stone-200 pt-1">
                    <Text className="text-xs font-mono font-bold">TOTAL TENDER</Text>
                    <Text className="text-xs font-mono font-bold">
                      {formatCurrency(reading.total_tender)}
                    </Text>
                  </View>
                </View>

                <View className="pb-3 text-xs space-y-1">
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-mono">EXPECTED CASH</Text>
                    <Text className="text-xs font-mono font-bold">
                      {formatCurrency(reading.expected_cash)}
                    </Text>
                  </View>
                  {reading.counted_cash !== undefined && (
                    <>
                      <View className="flex-row justify-between">
                        <Text className="text-xs font-mono">COUNTED CASH</Text>
                        <Text className="text-xs font-mono font-bold">
                          {formatCurrency(reading.counted_cash)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between border-t border-stone-300 pt-1">
                        <Text className="text-xs font-mono font-bold">VARIANCE</Text>
                        <Text className="text-xs font-mono font-bold">
                          {reading.variance && reading.variance > 0 ? '+' : ''}
                          {formatCurrency(reading.variance || 0)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {isYReading && (
                  <View className="border-t border-dashed border-stone-400 pt-3 pb-2 text-xs space-y-2">
                    <Text className="text-xs font-mono font-bold">STAFF HANDOVER</Text>
                    <Text className="text-[10px] font-mono">
                      OUT: {reading.outgoing_staff_name || reading.performed_by_name || 'Staff'}
                    </Text>
                    <Text className="text-[10px] font-mono">SIG: _____________________</Text>
                    <Text className="text-[10px] font-mono">
                      IN: {reading.incoming_staff_name || 'Incoming Staff'}
                    </Text>
                    <Text className="text-[10px] font-mono">SIG: _____________________</Text>
                  </View>
                )}

                <View className="items-center border-t border-dashed border-stone-400 pt-3 mt-2">
                  <Text className="text-[10px] text-stone-500 uppercase tracking-widest text-center">
                    *** END OF REPORT ***
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View className="flex-row items-center justify-between px-6 py-4 border-t border-stone-200 bg-white">
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={handleBrowserPrint}
                className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 min-h-[48px]"
              >
                <Printer size={18} color="#44403c" />
                <Text className="text-base font-bold text-stone-800">Print Document</Text>
              </Pressable>

              <Pressable
                onPress={handleSendToThermal}
                disabled={isSendingToThermal}
                className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-[#800020] active:bg-[#600018] min-h-[48px]"
              >
                <Receipt size={18} color="#ffffff" />
                <Text className="text-base font-bold text-white">
                  {isSendingToThermal ? 'Sending...' : 'Thermal 80mm Print'}
                </Text>
              </Pressable>
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={handleDownload}
                className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 active:bg-stone-50 min-h-[48px]"
              >
                <Download size={18} color="#44403c" />
                <Text className="text-base font-bold text-stone-800">Download Text/PDF</Text>
              </Pressable>

              <Pressable
                onPress={onClose}
                className="px-5 py-2.5 rounded-xl bg-stone-900 active:bg-black min-h-[48px] items-center justify-center"
              >
                <Text className="text-base font-bold text-white">Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
