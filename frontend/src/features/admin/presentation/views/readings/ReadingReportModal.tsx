import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Platform } from 'react-native';
import {
  X,
  Printer,
  Download,
  Receipt,
  FileText,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { readingsApi, type ReadingData } from '../../../data/readings.api';
import { exportSingleReadingToExcel } from '../../../utils/readingExcelExport';

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
      const printStyleId = 'monks-pos-reading-print-styles';
      let styleEl = document.getElementById(printStyleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = printStyleId;
        document.head.appendChild(styleEl);
      }
      const targetId =
        viewMode === 'thermal' ? 'monks-reading-thermal-area' : 'monks-reading-print-area';
      const pageSize = viewMode === 'thermal' ? '80mm auto' : 'A4 portrait';
      const targetWidth = viewMode === 'thermal' ? '80mm' : '100%';

      styleEl.innerHTML = `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #${targetId}, #${targetId} * {
            visibility: visible !important;
          }
          #${targetId} {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${targetWidth} !important;
            max-width: ${targetWidth} !important;
            margin: 0 auto !important;
            padding: ${viewMode === 'thermal' ? '12px' : '24px'} !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            color: #000000 !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: ${pageSize};
            margin: ${viewMode === 'thermal' ? '3mm' : '12mm'};
          }
        }
      `;
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

  const handleExportExcel = () => {
    try {
      exportSingleReadingToExcel(reading);
      toast.success('Reading report exported to Excel (.xls)', { title: 'Excel Export Ready' });
    } catch (err: any) {
      console.error('[ReadingReportModal] Excel export error:', err);
      toast.error('Failed to export report to Excel', { title: 'Export Error' });
    }
  };

  const handleDownloadText = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const reportText = `================================================
MONK'S DREAM JAZZ BAR & BISTRO
${title.toUpperCase()}
================================================
Drawer Scope: ${drawerLabel}
Opened At:    ${new Date(reading.opened_at).toLocaleString()}
Generated At: ${new Date(reading.generated_at || reading.closed_at || Date.now()).toLocaleString()}
Staff:        ${reading.outgoing_staff_name || reading.performed_by_name || 'Manager'}
Invoice Range: ${reading.first_receipt_no} - ${reading.last_receipt_no}
Transactions: ${reading.transaction_count}

------------------------------------------------
1. FINANCIAL SUMMARY
------------------------------------------------
Gross Sales:        ${formatCurrency(reading.gross_sales)}
Discounts & Comps: -${formatCurrency(reading.discount_total)}
Net Sales:          ${formatCurrency(reading.net_sales)}
Operating Mode Split:
  • Cafe Mode:      ${formatCurrency(reading.cafe_sales || 0)} (${reading.cafe_tx_count || 0} tabs)
  • Event Mode:     ${formatCurrency(reading.event_sales || 0)} (${reading.event_tx_count || 0} tabs)

------------------------------------------------
2. TAX & CHARGES BREAKDOWN
------------------------------------------------
VATable Sales (12%): ${formatCurrency(reading.vatable_sales)}
12% VAT Amount:      ${formatCurrency(reading.vat_amount)}
VAT-Exempt Sales:    ${formatCurrency(reading.vat_exempt_sales)}
10% Service Charge:  ${formatCurrency(reading.service_charge)}

------------------------------------------------
3. TENDER SUMMARY
------------------------------------------------
Cash Sales:         ${formatCurrency(reading.tender_cash)}
Credit/Debit Card:  ${formatCurrency(reading.tender_card)}
Digital Wallets:    ${formatCurrency(reading.tender_digital)}
Delivery Apps:      ${formatCurrency(reading.tender_delivery)}
Total Tender:       ${formatCurrency(reading.total_tender)}

------------------------------------------------
4. CASH DRAWER RECONCILIATION
------------------------------------------------
Opening Float:      ${formatCurrency(reading.opening_float)}
Cash Sales Intake:  +${formatCurrency(reading.tender_cash)}
Cash In (+):        ${formatCurrency(reading.cash_in)}
Petty Cash Out (-): ${formatCurrency(reading.cash_out)}
Safe Drops (-):     ${formatCurrency(reading.safe_drops)}
Expected Cash:      ${formatCurrency(reading.expected_cash)}
${
  reading.counted_cash !== undefined
    ? `Actual Counted Cash: ${formatCurrency(reading.counted_cash)}
Variance:            ${reading.variance && reading.variance > 0 ? '+' : ''}${formatCurrency(reading.variance || 0)}`
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

    toast.success('Reading report downloaded as text file', { title: 'Downloaded' });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/75 justify-center items-center p-2 sm:p-4">
        <Pressable className="absolute inset-0" onPress={onClose} />

        <View
          onStartShouldSetResponder={() => true}
          className="bg-white rounded-3xl w-full max-w-4xl max-h-[94vh] shadow-2xl overflow-hidden flex-col border border-stone-200"
        >
          {/* Header */}
          <View className="flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-stone-200 bg-stone-50">
            <View className="flex-row items-center gap-3">
              <View className="w-11 h-11 rounded-xl bg-[#800020] items-center justify-center">
                {isZReading ? (
                  <Receipt size={22} color="#ffffff" />
                ) : (
                  <FileText size={22} color="#ffffff" />
                )}
              </View>
              <View>
                <Text className="text-xl font-extrabold text-stone-900">{title}</Text>
                <Text className="text-base text-stone-500 font-medium">
                  {drawerLabel} • Non-resettable Fiscal Audit
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              {/* Format Toggle */}
              <View className="flex-row bg-stone-200/80 p-1 rounded-xl">
                <Pressable
                  onPress={() => setViewMode('document')}
                  className={`px-3.5 py-1.5 rounded-lg min-h-[48px] flex-row items-center ${
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
                  className={`px-3.5 py-1.5 rounded-lg min-h-[48px] flex-row items-center ${
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
                className="w-12 h-12 min-h-[48px] min-w-[48px] rounded-xl bg-stone-200/60 items-center justify-center active:bg-stone-300"
                accessibilityRole="button"
                accessibilityLabel="Close report modal"
              >
                <X size={22} color="#57534e" />
              </Pressable>
            </View>
          </View>

          {/* Report Body */}
          <ScrollView
            className="flex-1 p-3 sm:p-6 bg-[#fcf9f9]"
            showsVerticalScrollIndicator={false}
          >
            {viewMode === 'document' ? (
              /* Minimalist Document Sheet View - Printable Area */
              <View
                nativeID="monks-reading-print-area"
                {...({ id: 'monks-reading-print-area' } as any)}
                className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-8 shadow-xs max-w-2xl mx-auto w-full"
              >
                {/* Brand Header */}
                <View className="items-center pb-6 border-b border-stone-200 mb-6 print-avoid-break">
                  <Text className="text-xs font-bold tracking-widest text-[#800020] uppercase">
                    Monk's Dream Jazz Bar &amp; Bistro
                  </Text>
                  <Text className="text-2xl font-black text-stone-900 mt-1">{title}</Text>
                  <Text className="text-base text-stone-500 mt-1">Official POS Terminal Audit</Text>

                  <View className="flex-row items-center gap-4 mt-3">
                    <Text className="text-base text-stone-700 font-bold">Scope: {drawerLabel}</Text>
                    <Text className="text-base text-stone-400">•</Text>
                    <Text className="text-base text-stone-700 font-bold">
                      Staff: {reading.outgoing_staff_name || reading.performed_by_name || 'Manager'}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-4 mt-1">
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
                <View className="mb-6 print-avoid-break">
                  <Text className="text-base font-extrabold uppercase tracking-wider text-[#800020] mb-3">
                    1. Sales &amp; Revenue
                  </Text>
                  <View className="border-t border-b border-stone-200 divide-y divide-stone-100">
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">Gross Sales</Text>
                      <Text className="text-base font-bold text-stone-900">
                        {formatCurrency(reading.gross_sales)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">Discounts &amp; Comps</Text>
                      <Text className="text-base font-bold text-amber-700">
                        -{formatCurrency(reading.discount_total)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-3 bg-stone-50 px-2.5 rounded-lg">
                      <Text className="text-base font-black text-stone-900">Net Sales</Text>
                      <Text className="text-lg font-black text-[#800020]">
                        {formatCurrency(reading.net_sales)}
                      </Text>
                    </View>
                  </View>

                  {/* Operating Mode Split */}
                  {(reading.cafe_sales !== undefined || reading.event_sales !== undefined) && (
                    <View className="mt-4 pt-3 border-t border-dashed border-stone-200">
                      <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                        Operating Mode Revenue Split
                      </Text>
                      <View className="bg-stone-50 rounded-xl p-3 border border-stone-200 divide-y divide-stone-100">
                        <View className="flex-row justify-between py-2">
                          <View className="flex-row items-center gap-2">
                            <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <Text className="text-base text-stone-700 font-semibold">
                              ☀️ Cafe Mode Sales
                            </Text>
                            {reading.cafe_tx_count !== undefined && (
                              <Text className="text-sm text-stone-400 font-medium">
                                ({reading.cafe_tx_count} tabs)
                              </Text>
                            )}
                          </View>
                          <Text className="text-base font-bold text-stone-900">
                            {formatCurrency(reading.cafe_sales || 0)}
                          </Text>
                        </View>
                        <View className="flex-row justify-between py-2">
                          <View className="flex-row items-center gap-2">
                            <View className="w-2.5 h-2.5 rounded-full bg-[#800020]" />
                            <Text className="text-base text-stone-700 font-semibold">
                              🎷 Event Mode Sales
                            </Text>
                            {reading.event_tx_count !== undefined && (
                              <Text className="text-sm text-stone-400 font-medium">
                                ({reading.event_tx_count} tabs)
                              </Text>
                            )}
                          </View>
                          <Text className="text-base font-bold text-stone-900">
                            {formatCurrency(reading.event_sales || 0)}
                          </Text>
                        </View>
                        <View className="flex-row justify-between py-2.5 bg-stone-100/70 px-2 rounded-lg mt-1">
                          <Text className="text-base font-bold text-stone-900">
                            Consolidated Net Total
                          </Text>
                          <Text className="text-base font-black text-[#800020]">
                            {formatCurrency(reading.net_sales)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* Section 2: Tax & Surcharges */}
                <View className="mb-6 print-avoid-break">
                  <Text className="text-base font-extrabold uppercase tracking-wider text-[#800020] mb-3">
                    2. Tax &amp; Service Charge (PH BIR Standard)
                  </Text>
                  <View className="border-t border-b border-stone-200 divide-y divide-stone-100">
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-base text-stone-600">
                        VATable Sales (Net of VAT &amp; SC)
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
                <View className="mb-6 print-avoid-break">
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
                    <View className="flex-row justify-between py-3 bg-stone-50 px-2.5 rounded-lg">
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
                <View className="mb-6 print-avoid-break">
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
                    <View className="flex-row justify-between py-3 bg-stone-100 px-2.5 rounded-lg">
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

                {/* Audit Reference Trailer */}
                <View className="bg-stone-50 rounded-xl p-4 border border-stone-200 flex-row justify-between print-avoid-break">
                  <View>
                    <Text className="text-base font-bold text-stone-700">
                      Invoice Reference Range
                    </Text>
                    <Text className="text-base text-stone-500">
                      {reading.first_receipt_no || 'N/A'} - {reading.last_receipt_no || 'N/A'}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-bold text-stone-700">Settled Transactions</Text>
                    <Text className="text-base text-stone-900 font-black">
                      {reading.transaction_count} tabs
                    </Text>
                  </View>
                </View>

                {/* Handover Signatures for Y-Reading / Z-Reading */}
                <View className="mt-6 p-5 rounded-xl border border-stone-200 bg-stone-50 print-avoid-break">
                  <Text className="text-base font-extrabold uppercase tracking-wider text-[#800020] mb-3">
                    {isYReading
                      ? 'Staff Handover Acknowledgment'
                      : 'Fiscal Closeout Acknowledgment'}
                  </Text>
                  <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <View className="p-3 bg-white rounded-lg border border-stone-200">
                      <Text className="text-sm font-semibold text-stone-500">
                        {isYReading
                          ? 'Handed Over By (Outgoing Cashier):'
                          : 'Prepared By (Cashier):'}
                      </Text>
                      <Text className="text-base font-bold text-stone-900 mt-1">
                        {reading.outgoing_staff_name ||
                          reading.performed_by_name ||
                          'Shift Cashier'}
                      </Text>
                      <View className="mt-8 pt-1 border-t border-stone-300">
                        <Text className="text-xs text-stone-400">
                          Signature: __________________________
                        </Text>
                      </View>
                    </View>
                    <View className="p-3 bg-white rounded-lg border border-stone-200">
                      <Text className="text-sm font-semibold text-stone-500">
                        {isYReading
                          ? 'Received By (Incoming Cashier):'
                          : 'Verified By (Duty Manager):'}
                      </Text>
                      <Text className="text-base font-bold text-stone-900 mt-1">
                        {reading.incoming_staff_name || 'Duty Manager'}
                      </Text>
                      <View className="mt-8 pt-1 border-t border-stone-300">
                        <Text className="text-xs text-stone-400">
                          Signature: __________________________
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              /* 80mm Thermal Monospace View */
              <View
                nativeID="monks-reading-thermal-area"
                {...({ id: 'monks-reading-thermal-area' } as any)}
                className="bg-white rounded-2xl border border-stone-300 p-6 shadow-md max-w-sm mx-auto w-full font-mono"
              >
                <View className="items-center border-b border-dashed border-stone-400 pb-4 mb-4">
                  <Text className="text-base font-black tracking-widest text-center">
                    MONK'S DREAM JAZZ BAR
                  </Text>
                  <Text className="text-xs text-stone-600 text-center uppercase tracking-wider">
                    POS TERMINAL FISCAL REPORT
                  </Text>
                  <Text className="text-base font-black mt-2 text-center">{title}</Text>
                  <Text className="text-xs text-stone-500 mt-1">{drawerLabel}</Text>
                  <Text className="text-xs text-stone-500">
                    {new Date(
                      reading.generated_at || reading.closed_at || Date.now()
                    ).toLocaleString()}
                  </Text>
                </View>

                <View className="border-b border-dashed border-stone-400 pb-3 mb-3 space-y-1">
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
                  {(reading.cafe_sales !== undefined || reading.event_sales !== undefined) && (
                    <View className="border-t border-stone-200 pt-1 mt-1 space-y-0.5">
                      <View className="flex-row justify-between">
                        <Text className="text-[10px] font-mono text-stone-600">
                          CAFE MODE SALES
                        </Text>
                        <Text className="text-[10px] font-mono font-bold">
                          {formatCurrency(reading.cafe_sales || 0)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-[10px] font-mono text-stone-600">
                          EVENT MODE SALES
                        </Text>
                        <Text className="text-[10px] font-mono font-bold">
                          {formatCurrency(reading.event_sales || 0)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                <View className="border-b border-dashed border-stone-400 pb-3 mb-3 space-y-1">
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

                <View className="border-b border-dashed border-stone-400 pb-3 mb-3 space-y-1">
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

                <View className="pb-3 space-y-1">
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
                  <View className="border-t border-dashed border-stone-400 pt-3 pb-2 space-y-2">
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
          <View className="flex-col md:flex-row items-stretch md:items-center justify-between px-4 sm:px-6 py-4 border-t border-stone-200 bg-white gap-3">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Pressable
                onPress={handleBrowserPrint}
                className="flex-1 sm:flex-initial flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 min-h-[48px]"
              >
                <Printer size={18} color="#44403c" />
                <Text className="text-base font-bold text-stone-800">Print A4</Text>
              </Pressable>

              <Pressable
                onPress={handleSendToThermal}
                disabled={isSendingToThermal}
                className="flex-1 sm:flex-initial flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#800020] active:bg-[#600018] min-h-[48px]"
              >
                <Receipt size={18} color="#ffffff" />
                <Text className="text-base font-bold text-white">
                  {isSendingToThermal ? 'Sending...' : 'Thermal 80mm'}
                </Text>
              </Pressable>
            </View>

            <View className="flex-row items-center gap-2 flex-wrap">
              <Pressable
                onPress={handleExportExcel}
                className="flex-1 sm:flex-initial flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 active:bg-emerald-100 min-h-[48px]"
              >
                <FileSpreadsheet size={18} color="#047857" />
                <Text className="text-base font-bold text-emerald-800">Excel (.xls)</Text>
              </Pressable>

              <Pressable
                onPress={handleDownloadText}
                className="flex-row items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-stone-300 active:bg-stone-50 min-h-[48px]"
              >
                <Download size={18} color="#44403c" />
                <Text className="text-base font-bold text-stone-700">Text</Text>
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
