import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { X, Printer, Download, Receipt, FileText, FileSpreadsheet } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { printHtmlElement } from '@/features/shared';
import { readingsApi, type ReadingData } from '../../../data/readings.api';
import { exportSingleReadingToExcel } from '../../../utils/readingExcelExport';
import { ReadingDocumentSheet } from './components/ReadingDocumentSheet';
import { ReadingThermalSheet } from './components/ReadingThermalSheet';

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
      const targetId =
        viewMode === 'thermal' ? 'monks-reading-thermal-area' : 'monks-reading-print-area';
      const isThermal = viewMode === 'thermal';
      printHtmlElement(targetId, {
        title: `${title} - Monk's Dream POS`,
        isThermal,
        pageSize: isThermal ? '80mm' : 'A4',
      });
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

GROSS SALES:      ${reading.gross_sales.toFixed(2)}
DISCOUNTS:       -${reading.discount_total.toFixed(2)}
NET SALES:        ${reading.net_sales.toFixed(2)}

CASH TENDER:      ${reading.tender_cash.toFixed(2)}
CARD TENDER:      ${reading.tender_card.toFixed(2)}
DIGITAL TENDER:   ${reading.tender_digital.toFixed(2)}
DELIVERY TENDER:  ${reading.tender_delivery.toFixed(2)}
TOTAL TENDER:     ${reading.total_tender.toFixed(2)}

STARTING FLOAT:   ${reading.opening_float.toFixed(2)}
EXPECTED CASH:    ${reading.expected_cash.toFixed(2)}
${reading.counted_cash !== undefined ? `COUNTED CASH:     ${reading.counted_cash.toFixed(2)}\nVARIANCE:         ${(reading.variance || 0).toFixed(2)}` : ''}
================================================`;

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
              <ReadingDocumentSheet
                reading={reading}
                title={title}
                drawerLabel={drawerLabel}
                isYReading={isYReading}
              />
            ) : (
              <ReadingThermalSheet
                reading={reading}
                title={title}
                drawerLabel={drawerLabel}
                isYReading={isYReading}
              />
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
