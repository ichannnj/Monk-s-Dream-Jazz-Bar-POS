import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { X, Printer, FileSpreadsheet } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { printHtmlElement } from '@/features/shared/utils/printHelpers';
import {
  exportAttendancePayrollToExcel,
  type AttendanceExportItem,
  type AttendanceExportTotals,
} from '../../../utils/readingExcelExport';

export interface AttendanceReportModalProps {
  visible: boolean;
  onClose: () => void;
  dateRangeLabel: string;
  isSingleDay: boolean;
  items: AttendanceExportItem[];
  totals: AttendanceExportTotals;
}

export const AttendanceReportModal: React.FC<AttendanceReportModalProps> = ({
  visible,
  onClose,
  dateRangeLabel,
  isSingleDay,
  items,
  totals,
}) => {
  if (!visible) return null;

  const handleBrowserPrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      printHtmlElement('monks-attendance-printable-doc', {
        title: `Attendance & Payroll Report (${dateRangeLabel}) - Monk's Dream POS`,
        pageSize: 'A4',
      });
    } else {
      toast.info('Printing is supported on desktop web browsers.');
    }
  };

  const handleExportExcel = () => {
    try {
      exportAttendancePayrollToExcel({
        dateRangeLabel,
        isSingleDay,
        items,
        totals,
      });
      toast.success('Attendance report exported to Excel (.xls)', {
        title: 'Excel Export Ready',
      });
    } catch (err: any) {
      console.error('[AttendanceReportModal] Excel export error:', err);
      toast.error('Failed to export report to Excel', { title: 'Export Error' });
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 backdrop-blur-xs justify-center items-center p-2 sm:p-4 md:p-6">
        <View className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex-col overflow-hidden shadow-2xl border border-stone-200">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-stone-200 bg-stone-50">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 items-center justify-center">
                <Printer size={20} color="#800020" />
              </View>
              <View>
                <Text className="text-xl font-extrabold text-stone-900">
                  Attendance &amp; Payroll Document
                </Text>
                <Text className="text-sm text-stone-500 font-medium">
                  {dateRangeLabel} · {totals.presentCount} Staff Active
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="w-10 h-10 rounded-xl bg-stone-200/60 items-center justify-center active:bg-stone-300"
              accessibilityLabel="Close report modal"
            >
              <X size={20} color="#57534e" />
            </Pressable>
          </View>

          {/* Modal Scrollable Body */}
          <ScrollView className="flex-1 p-4 sm:p-6 bg-[#fcf9f9]" showsVerticalScrollIndicator>
            {/* PRINTABLE DOCUMENT AREA */}
            <View
              nativeID="monks-attendance-printable-doc"
              {...({ id: 'monks-attendance-printable-doc' } as any)}
              className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs max-w-4xl mx-auto w-full"
            >
              {/* Document Letterhead */}
              <View className="items-center pb-3 border-b-2 border-stone-800 mb-4 print-avoid-break">
                <Text className="text-xs font-bold tracking-widest text-[#800020] uppercase">
                  MONK'S DREAM JAZZ BAR &amp; BISTRO
                </Text>
                <Text className="text-2xl font-black text-stone-900 mt-0.5">
                  ATTENDANCE &amp; PAYROLL REPORT
                </Text>
                <Text className="text-sm font-medium text-stone-500 mt-0.5">
                  Official Workforce Attendance Audit &amp; Compensation Ledger
                </Text>

                <View className="flex-row items-center gap-2 mt-2 flex-wrap justify-center">
                  <Text className="text-sm text-stone-700 font-bold">Period: {dateRangeLabel}</Text>
                  <Text className="text-stone-300">•</Text>
                  <Text className="text-sm text-stone-600 font-medium">
                    Printed: {new Date().toLocaleString()}
                  </Text>
                  <Text className="text-stone-300">•</Text>
                  <Text className="text-sm text-stone-700 font-bold">
                    Staff Count: {items.length} total ({totals.presentCount} present)
                  </Text>
                </View>
              </View>

              {/* 4-Metric Summary KPI Strip */}
              <View className="flex-row flex-wrap gap-2.5 mb-5 print-avoid-break">
                <View className="flex-1 min-w-[150px] p-3 rounded-xl border border-stone-200 bg-stone-50">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Staff Present
                  </Text>
                  <Text className="text-xl font-black text-stone-900 mt-1">
                    {totals.presentCount}
                  </Text>
                </View>

                <View className="flex-1 min-w-[150px] p-3 rounded-xl border border-stone-200 bg-stone-50">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Base Wages
                  </Text>
                  <Text className="text-xl font-black text-stone-800 mt-1">
                    ₱{totals.baseTotal.toFixed(2)}
                  </Text>
                </View>

                <View className="flex-1 min-w-[150px] p-3 rounded-xl border border-emerald-200 bg-emerald-50/60">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                    OT / Shift Bonuses
                  </Text>
                  <Text className="text-xl font-black text-emerald-700 mt-1">
                    +₱{totals.bonusTotal.toFixed(2)}
                  </Text>
                </View>

                <View className="flex-1 min-w-[150px] p-3 rounded-xl border border-[#800020]/20 bg-rose-50/50">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-[#800020]">
                    Total Shift Payroll
                  </Text>
                  <Text className="text-xl font-black text-[#800020] mt-1">
                    ₱{totals.grandTotal.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Tabular Printable Workforce Roster */}
              <View className="border border-stone-200 rounded-xl overflow-hidden mb-4">
                {/* Table Header */}
                <View className="flex-row bg-stone-100/90 border-b border-stone-200 px-3 py-2.5">
                  <Text className="flex-2 text-xs font-extrabold uppercase tracking-wider text-stone-700">
                    Staff Member
                  </Text>
                  <Text className="flex-1 text-xs font-extrabold uppercase tracking-wider text-stone-700">
                    Role / Type
                  </Text>
                  <Text className="flex-1 text-xs font-extrabold uppercase tracking-wider text-stone-700">
                    Status
                  </Text>
                  {isSingleDay && (
                    <>
                      <Text className="w-20 text-xs font-extrabold uppercase tracking-wider text-stone-700 text-center">
                        In
                      </Text>
                      <Text className="w-20 text-xs font-extrabold uppercase tracking-wider text-stone-700 text-center">
                        Out
                      </Text>
                    </>
                  )}
                  <Text className="w-16 text-xs font-extrabold uppercase tracking-wider text-stone-700 text-right">
                    Hours
                  </Text>
                  <Text className="w-24 text-xs font-extrabold uppercase tracking-wider text-stone-700 text-right">
                    Base
                  </Text>
                  <Text className="w-24 text-xs font-extrabold uppercase tracking-wider text-stone-700 text-right">
                    OT / Bonus
                  </Text>
                  <Text className="w-24 text-xs font-extrabold uppercase tracking-wider text-[#800020] text-right">
                    Total
                  </Text>
                </View>

                {/* Table Rows */}
                {items.length === 0 ? (
                  <View className="p-8 items-center justify-center">
                    <Text className="text-base text-stone-500 font-medium">
                      No attendance records found for this period.
                    </Text>
                  </View>
                ) : (
                  items.map((item, idx) => (
                    <View
                      key={`${item.username}-${idx}`}
                      className={`flex-row items-center px-3 py-2 border-b border-stone-100 ${
                        idx % 2 === 1 ? 'bg-stone-50/40' : 'bg-white'
                      }`}
                    >
                      <View className="flex-2 pr-2">
                        <Text className="text-sm font-bold text-stone-900" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text className="text-xs text-stone-500">@{item.username}</Text>
                      </View>

                      <View className="flex-1 pr-2">
                        <Text className="text-sm font-medium text-stone-700" numberOfLines={1}>
                          {item.role}
                        </Text>
                        <Text className="text-xs text-stone-400">
                          {item.isPosUser ? 'POS' : 'Support'}
                        </Text>
                      </View>

                      <View className="flex-1 pr-2">
                        <Text
                          className={`text-xs font-bold ${
                            item.status === 'Clocked In'
                              ? 'text-emerald-700'
                              : item.status === 'Completed' || item.status.includes('shifts')
                                ? 'text-blue-700'
                                : 'text-stone-400'
                          }`}
                        >
                          {item.status}
                        </Text>
                      </View>

                      {isSingleDay && (
                        <>
                          <Text className="w-20 text-xs font-medium text-stone-600 text-center">
                            {item.clockIn || '—'}
                          </Text>
                          <Text className="w-20 text-xs font-medium text-stone-600 text-center">
                            {item.clockOut || '—'}
                          </Text>
                        </>
                      )}

                      <Text className="w-16 text-xs font-medium text-stone-700 text-right">
                        {item.hoursWorked > 0 ? `${item.hoursWorked.toFixed(1)}h` : '—'}
                      </Text>

                      <Text className="w-24 text-xs font-medium text-stone-800 text-right">
                        {item.status.includes('Exempt') || item.role.toLowerCase().includes('admin')
                          ? 'Exempt'
                          : `₱${item.basePay.toFixed(2)}`}
                      </Text>

                      <Text
                        className={`w-24 text-xs font-medium text-right ${
                          item.addonPay > 0 ? 'text-emerald-700 font-bold' : 'text-stone-400'
                        }`}
                      >
                        {item.status.includes('Exempt') || item.role.toLowerCase().includes('admin')
                          ? '—'
                          : item.addonPay > 0
                            ? `+₱${item.addonPay.toFixed(2)}`
                            : '₱0.00'}
                      </Text>

                      <Text className="w-24 text-xs font-bold text-[#800020] text-right">
                        {item.status.includes('Exempt') || item.role.toLowerCase().includes('admin')
                          ? 'Exempt'
                          : `₱${item.totalPay.toFixed(2)}`}
                      </Text>
                    </View>
                  ))
                )}

                {/* Table Footer / Summary Totals */}
                <View className="flex-row items-center px-3 py-2.5 bg-stone-100/90 border-t-2 border-stone-300">
                  <Text
                    className={`${isSingleDay ? 'flex-4' : 'flex-3'} text-sm font-extrabold text-stone-900`}
                  >
                    Total Shift Payroll ({totals.presentCount} staff present)
                  </Text>
                  <Text className="w-16 text-xs text-stone-400 text-right">—</Text>
                  <Text className="w-24 text-sm font-bold text-stone-900 text-right">
                    ₱{totals.baseTotal.toFixed(2)}
                  </Text>
                  <Text className="w-24 text-sm font-bold text-emerald-800 text-right">
                    +₱{totals.bonusTotal.toFixed(2)}
                  </Text>
                  <Text className="w-24 text-sm font-black text-[#800020] text-right">
                    ₱{totals.grandTotal.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Document Signatures Strip */}
              <View className="mt-8 pt-4 border-t border-stone-200 flex-row justify-between print-avoid-break">
                <View className="items-center">
                  <View className="w-44 border-b border-stone-400 mb-1" />
                  <Text className="text-xs text-stone-500 font-medium">
                    Prepared By / Shift Manager
                  </Text>
                </View>
                <View className="items-center">
                  <View className="w-44 border-b border-stone-400 mb-1" />
                  <Text className="text-xs text-stone-500 font-medium">
                    Approved By / General Manager
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Modal Action Footer */}
          <View className="flex-row items-center justify-between px-5 py-3 border-t border-stone-200 bg-stone-50 gap-3">
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={handleBrowserPrint}
                className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 active:bg-black min-h-[48px]"
                accessibilityLabel="Print Attendance Report to A4"
              >
                <Printer size={18} color="#ffffff" />
                <Text className="text-base font-bold text-white">Print Document (A4)</Text>
              </Pressable>

              <Pressable
                onPress={handleExportExcel}
                className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 active:bg-emerald-100 min-h-[48px]"
                accessibilityLabel="Export Attendance to Excel"
              >
                <FileSpreadsheet size={18} color="#047857" />
                <Text className="text-base font-bold text-emerald-800">Export Excel (.xls)</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={onClose}
              className="px-5 py-2.5 rounded-xl border border-stone-300 active:bg-stone-200 min-h-[48px] items-center justify-center"
            >
              <Text className="text-base font-bold text-stone-700">Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
