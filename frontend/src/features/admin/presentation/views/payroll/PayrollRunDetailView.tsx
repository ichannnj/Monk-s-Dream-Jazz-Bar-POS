import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  ArrowLeft,
  RefreshCw,
  Lock,
  DollarSign,
  SlidersHorizontal,
  FileText,
  Download,
  RotateCcw,
  Ban,
  AlertTriangle,
} from 'lucide-react-native';
import type {
  PayrollRunItem,
  PayrollRunSummary,
  PayrollUnresolvedShiftWarning,
} from './payroll.types';

interface PayrollRunDetailViewProps {
  run: PayrollRunSummary;
  items: PayrollRunItem[];
  totals: {
    grossTotal: number;
    additionsTotal: number;
    deductionsTotal: number;
    netTotal: number;
    paidTotal: number;
    remainingTotal: number;
    paidCount: number;
    pendingCount: number;
  };
  unresolvedWarnings?: PayrollUnresolvedShiftWarning[];
  onBack: () => void;
  onRefreshDraft: () => void;
  onFinalize?: () => void;
  onOpenAdjust?: (item: PayrollRunItem) => void;
  onOpenPayoutSingle?: (item: PayrollRunItem) => void;
  onOpenPayoutAll?: () => void;
  onOpenReopen?: () => void;
  onOpenVoid?: () => void;
  onOpenPayslip?: (item: PayrollRunItem) => void;
  onOpenRegisterPrint?: () => void;
  onExportExcel?: () => void;
  onFixShift?: (warning: PayrollUnresolvedShiftWarning) => void;
}

const fmtPhp = (n: number) =>
  `₱${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PayrollRunDetailView: React.FC<PayrollRunDetailViewProps> = ({
  run,
  items,
  totals,
  unresolvedWarnings = [],
  onBack,
  onRefreshDraft,
  onFinalize,
  onOpenAdjust,
  onOpenPayoutSingle,
  onOpenPayoutAll,
  onOpenReopen,
  onOpenVoid,
  onOpenPayslip,
  onOpenRegisterPrint,
  onExportExcel,
  onFixShift,
}) => {
  const isDraft = run.status === 'DRAFT';
  const canPay = run.status === 'FINALIZED' || run.status === 'PARTIALLY_PAID';
  const isVoided = run.status === 'VOIDED';

  return (
    <View className="space-y-4">
      {/* Header Bar */}
      <View className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-3">
        <View className="flex-col md:flex-row md:items-center justify-between gap-3">
          <View className="flex-row items-center gap-3 min-w-0">
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back to Cutoffs"
              className="h-11 px-3 rounded-xl border border-stone-200 bg-[#F7F5F2] flex-row items-center gap-1.5"
            >
              <ArrowLeft size={16} color="#1A1617" />
              <Text className="text-xs font-bold text-stone-900">Cutoffs</Text>
            </Pressable>
            <View className="flex-1 min-w-0">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-base font-black text-stone-900 truncate">{run.title}</Text>
                <View className="rounded-full bg-[#EFECE6] border border-stone-300 px-2.5 py-0.5">
                  <Text className="text-[10px] font-bold text-[#810021]">{run.status}</Text>
                </View>
              </View>
              <Text className="text-xs text-stone-500 mt-0.5">
                {run.run_code} · {run.period_start} to {run.period_end} · Payday {run.payday_date}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row flex-wrap items-center gap-2">
            {isDraft && (
              <>
                <Pressable
                  onPress={onRefreshDraft}
                  className="h-10 px-3 rounded-xl border border-stone-200 bg-[#F7F5F2] flex-row items-center gap-1.5"
                >
                  <RefreshCw size={14} color="#1A1617" />
                  <Text className="text-xs font-bold text-stone-800">Sync Attendance</Text>
                </Pressable>
                {onFinalize && (
                  <Pressable
                    onPress={onFinalize}
                    className="h-10 px-3.5 rounded-xl bg-[#810021] flex-row items-center gap-1.5"
                  >
                    <Lock size={14} color="#FFFFFF" />
                    <Text className="text-xs font-bold text-white">Finalize &amp; Lock</Text>
                  </Pressable>
                )}
              </>
            )}

            {canPay && onOpenPayoutAll && totals.pendingCount > 0 && (
              <Pressable
                onPress={onOpenPayoutAll}
                className="h-10 px-3.5 rounded-xl bg-[#810021] flex-row items-center gap-1.5"
              >
                <DollarSign size={14} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">
                  Pay All Pending ({totals.pendingCount})
                </Text>
              </Pressable>
            )}

            {run.status === 'FINALIZED' && totals.paidTotal === 0 && onOpenReopen && (
              <Pressable
                onPress={onOpenReopen}
                className="h-10 px-3 rounded-xl border border-stone-200 bg-white flex-row items-center gap-1.5"
              >
                <RotateCcw size={14} color="#1A1617" />
                <Text className="text-xs font-bold text-stone-800">Reopen</Text>
              </Pressable>
            )}

            {!isDraft && !isVoided && onOpenVoid && (
              <Pressable
                onPress={onOpenVoid}
                className="h-10 px-3 rounded-xl border border-stone-200 bg-white flex-row items-center gap-1.5"
              >
                <Ban size={14} color="#810021" />
                <Text className="text-xs font-bold text-[#810021]">Void</Text>
              </Pressable>
            )}

            {onOpenRegisterPrint && (
              <Pressable
                onPress={onOpenRegisterPrint}
                accessibilityLabel="Print Cutoff Register"
                className="h-10 px-3 rounded-xl border border-stone-200 bg-white flex-row items-center gap-1.5"
              >
                <FileText size={14} color="#1A1617" />
                <Text className="text-xs font-bold text-stone-800">Print</Text>
              </Pressable>
            )}

            {onExportExcel && (
              <Pressable
                onPress={onExportExcel}
                accessibilityLabel="Export Cutoff to Excel"
                className="h-10 px-3 rounded-xl border border-stone-200 bg-white flex-row items-center gap-1.5"
              >
                <Download size={14} color="#1A1617" />
                <Text className="text-xs font-bold text-stone-800">Excel</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Summary Strip */}
        <View className="flex-row flex-wrap gap-2 pt-2 border-t border-stone-100">
          <View className="flex-1 min-w-[120px] rounded-xl bg-[#F7F5F2] p-2.5">
            <Text className="text-[11px] font-semibold text-stone-500">Gross Attendance</Text>
            <Text
              className="text-sm font-black text-stone-900"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {fmtPhp(totals.grossTotal)}
            </Text>
          </View>
          <View className="flex-1 min-w-[120px] rounded-xl bg-[#F7F5F2] p-2.5">
            <Text className="text-[11px] font-semibold text-stone-500">Additions / Deductions</Text>
            <Text
              className="text-sm font-black text-stone-900"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              +{fmtPhp(totals.additionsTotal)} / -{fmtPhp(totals.deductionsTotal)}
            </Text>
          </View>
          <View className="flex-1 min-w-[120px] rounded-xl bg-[#EFECE6] p-2.5">
            <Text className="text-[11px] font-semibold text-stone-700">Net Payroll</Text>
            <Text
              className="text-sm font-black text-stone-900"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {fmtPhp(totals.netTotal)}
            </Text>
          </View>
          <View className="flex-1 min-w-[120px] rounded-xl bg-[#810021]/10 p-2.5">
            <Text className="text-[11px] font-semibold text-[#810021]">Remaining Unpaid</Text>
            <Text
              className="text-sm font-black text-[#810021]"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {fmtPhp(totals.remainingTotal)}
            </Text>
          </View>
        </View>
      </View>

      {/* Unresolved Attendance Warning Banner */}
      {isDraft && unresolvedWarnings.length > 0 && (
        <View className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 space-y-2">
          <View className="flex-row items-center gap-2">
            <AlertTriangle size={16} color="#92400e" />
            <Text className="text-xs font-bold text-amber-900">
              {unresolvedWarnings.length} unresolved or open shift(s) in this cutoff period
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {unresolvedWarnings.slice(0, 6).map((w) => (
              <View
                key={w.recordId}
                className="flex-row items-center gap-2 rounded-lg bg-white border border-amber-200 px-2.5 py-1.5"
              >
                <Text className="text-xs font-semibold text-stone-800">
                  {w.displayName} ({w.date})
                </Text>
                {onFixShift && (
                  <Pressable
                    onPress={() => onFixShift(w)}
                    className="px-2 py-0.5 rounded bg-amber-100"
                  >
                    <Text className="text-[11px] font-bold text-amber-900">Fix Shift</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Employee Line Items */}
      <View className="rounded-2xl border border-stone-200/80 bg-white p-3 sm:p-4 shadow-xs space-y-2">
        {items.map((item) => {
          const additions =
            Number(item.cutoff_bonus || 0) +
            Number(item.service_charge_share || 0) +
            Number(item.other_additions || 0);
          const deductions =
            Number(item.cash_advance_deduction || 0) +
            Number(item.sss_deduction || 0) +
            Number(item.philhealth_deduction || 0) +
            Number(item.pagibig_deduction || 0) +
            Number(item.tax_deduction || 0) +
            Number(item.other_deductions || 0);

          return (
            <View
              key={item.id}
              className="flex-col md:flex-row md:items-center justify-between rounded-xl border border-stone-200 p-3 gap-2.5 bg-[#F7F5F2]/50"
            >
              <View className="flex-1 min-w-0">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-sm font-bold text-stone-900 truncate">
                    {item.employee_name}
                  </Text>
                  <View className="rounded-full bg-white border border-stone-200 px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-stone-600 capitalize">
                      {item.job_title || item.employee_role}
                    </Text>
                  </View>
                  {item.is_payroll_exempt ? (
                    <View className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5">
                      <Text className="text-[10px] font-bold text-stone-600">Payroll Exempt</Text>
                    </View>
                  ) : item.payout_status === 'PAID' ? (
                    <View className="rounded-full bg-stone-900 px-2.5 py-0.5">
                      <Text className="text-[10px] font-bold text-white">
                        PAID · {item.payment_method || 'CASH'}
                        {item.payment_reference ? ` #${item.payment_reference}` : ''}
                      </Text>
                    </View>
                  ) : (
                    <View className="rounded-full bg-[#810021]/10 border border-[#810021]/30 px-2.5 py-0.5">
                      <Text className="text-[10px] font-bold text-[#810021]">PENDING</Text>
                    </View>
                  )}
                </View>
                <Text
                  className="text-xs text-stone-500 mt-1"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {item.shifts_worked} shifts · {Number(item.hours_worked || 0).toFixed(1)}h (OT{' '}
                  {Number(item.overtime_hours || 0).toFixed(1)}h) · Gross {fmtPhp(item.gross_pay)}
                  {additions > 0 ? ` · +${fmtPhp(additions)}` : ''}
                  {deductions > 0 ? ` · -${fmtPhp(deductions)}` : ''}
                </Text>
              </View>

              <View className="flex-row items-center justify-between md:justify-end gap-2.5">
                {!item.is_payroll_exempt && (
                  <Text
                    className="text-base font-black text-stone-900 mr-1"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {fmtPhp(item.net_pay)}
                  </Text>
                )}

                <View className="flex-row items-center gap-1.5 flex-wrap">
                  {isDraft && !item.is_payroll_exempt && onOpenAdjust && (
                    <Pressable
                      onPress={() => onOpenAdjust(item)}
                      className="h-11 px-3 rounded-xl border border-stone-200 bg-white flex-row items-center gap-1.5"
                    >
                      <SlidersHorizontal size={14} color="#1A1617" />
                      <Text className="text-xs font-bold text-stone-800">Adjust</Text>
                    </Pressable>
                  )}

                  {canPay &&
                    !item.is_payroll_exempt &&
                    item.payout_status === 'PENDING' &&
                    onOpenPayoutSingle && (
                      <Pressable
                        onPress={() => onOpenPayoutSingle(item)}
                        className="h-11 px-3.5 rounded-xl bg-[#810021] flex-row items-center gap-1.5"
                      >
                        <DollarSign size={14} color="#FFFFFF" />
                        <Text className="text-xs font-bold text-white">Pay</Text>
                      </Pressable>
                    )}

                  {!item.is_payroll_exempt && onOpenPayslip && (
                    <Pressable
                      onPress={() => onOpenPayslip(item)}
                      className="h-11 px-3 rounded-xl border border-stone-200 bg-white flex-row items-center gap-1.5"
                    >
                      <FileText size={14} color="#1A1617" />
                      <Text className="text-xs font-bold text-stone-800">Payslip</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};
