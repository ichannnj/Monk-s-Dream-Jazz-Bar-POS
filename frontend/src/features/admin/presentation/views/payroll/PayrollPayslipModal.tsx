import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Printer, Receipt } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { printHtmlElement } from '@/features/shared';
import { printerApi } from '@/features/printer/data/printer.api';
import { AdminModal } from '../../components/AdminModal';
import type { PayrollRunItem, PayrollRunSummary } from './payroll.types';

interface PayrollPayslipModalProps {
  visible: boolean;
  onClose: () => void;
  run: PayrollRunSummary | null;
  item: PayrollRunItem | null;
}

const fmtPhp = (n: number) =>
  `₱${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PayrollPayslipModal: React.FC<PayrollPayslipModalProps> = ({
  visible,
  onClose,
  run,
  item,
}) => {
  const [isSendingThermal, setIsSendingThermal] = useState(false);

  if (!run || !item) return null;

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

  const handlePrintA4 = () => {
    printHtmlElement('monks-payslip-printable-doc', {
      title: `Payslip_${item.employee_username}_${run.run_code}`,
    });
  };

  const handlePrintThermal = async () => {
    setIsSendingThermal(true);
    try {
      await printerApi.enqueuePayslipVoucher({
        runCode: run.run_code,
        title: run.title,
        periodStart: run.period_start,
        periodEnd: run.period_end,
        paydayDate: run.payday_date,
        employeeName: item.employee_name,
        employeeRole: item.job_title || item.employee_role,
        shiftsWorked: item.shifts_worked,
        hoursWorked: Number(item.hours_worked || 0),
        basePay: Number(item.base_pay_total || 0),
        overtimePay: Number(item.overtime_pay_total || 0),
        shiftBonus: Number(item.shift_bonus_total || 0),
        additions,
        deductions,
        netPay: Number(item.net_pay || 0),
        payoutStatus: item.payout_status,
        paymentMethod: item.payment_method || null,
        paymentReference: item.payment_reference || null,
      });
      toast.success('Payslip voucher sent to thermal printer');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to enqueue thermal payslip');
    } finally {
      setIsSendingThermal(false);
    }
  };

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title="Employee Payslip"
      subtitle={`${run.title} · ${run.run_code}`}
    >
      <View className="space-y-4">
        <View
          nativeID="monks-payslip-printable-doc"
          {...({ id: 'monks-payslip-printable-doc' } as any)}
          className="rounded-xl border border-stone-300 bg-white p-4 space-y-3"
        >
          <View className="border-b border-stone-200 pb-2">
            <Text className="text-sm font-black text-[#810021] uppercase">
              MONK&apos;S DREAM JAZZ BAR &amp; CAFE
            </Text>
            <Text className="text-xs font-bold text-stone-900">
              PAYSLIP · {run.period_start} to {run.period_end} (Payday: {run.payday_date})
            </Text>
          </View>

          <View className="flex-row justify-between">
            <View>
              <Text className="text-sm font-black text-stone-900">{item.employee_name}</Text>
              <Text className="text-xs text-stone-500 capitalize">
                {item.job_title || item.employee_role} (@{item.employee_username})
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs font-bold text-stone-800">{item.payout_status}</Text>
              {item.payment_method && (
                <Text className="text-[11px] text-stone-500">
                  {item.payment_method}
                  {item.payment_reference ? ` #${item.payment_reference}` : ''}
                </Text>
              )}
            </View>
          </View>

          <View className="border-t border-b border-stone-200 py-2 space-y-1">
            <View className="flex-row justify-between">
              <Text className="text-xs text-stone-600">
                Base Pay ({item.shifts_worked} shifts · {Number(item.hours_worked || 0).toFixed(1)}
                h)
              </Text>
              <Text
                className="text-xs font-bold text-stone-900"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {fmtPhp(item.base_pay_total)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-stone-600">
                Overtime ({Number(item.overtime_hours || 0).toFixed(1)}h) + Shift Bonuses
              </Text>
              <Text
                className="text-xs font-bold text-stone-900"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {fmtPhp(Number(item.overtime_pay_total || 0) + Number(item.shift_bonus_total || 0))}
              </Text>
            </View>
            {additions > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-stone-600">Cutoff Additions / SC Share</Text>
                <Text
                  className="text-xs font-bold text-stone-900"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  +{fmtPhp(additions)}
                </Text>
              </View>
            )}
            {deductions > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-[#810021]">Deductions (Vale / Statutory)</Text>
                <Text
                  className="text-xs font-bold text-[#810021]"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  -{fmtPhp(deductions)}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row justify-between items-center pt-1">
            <Text className="text-sm font-black text-stone-900">NET TAKE-HOME PAY</Text>
            <Text
              className="text-lg font-black text-[#810021]"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {fmtPhp(item.net_pay)}
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap justify-end gap-2">
          <Pressable
            onPress={handlePrintThermal}
            disabled={isSendingThermal}
            className="h-11 px-4 rounded-xl border border-stone-300 bg-white flex-row items-center gap-1.5"
          >
            <Receipt size={15} color="#1A1617" />
            <Text className="text-xs font-bold text-stone-800">
              {isSendingThermal ? 'Sending…' : 'Thermal Voucher'}
            </Text>
          </Pressable>
          <Pressable
            onPress={handlePrintA4}
            className="h-11 px-4 rounded-xl bg-[#810021] flex-row items-center gap-1.5"
          >
            <Printer size={15} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">Print A4 Payslip</Text>
          </Pressable>
        </View>
      </View>
    </AdminModal>
  );
};
