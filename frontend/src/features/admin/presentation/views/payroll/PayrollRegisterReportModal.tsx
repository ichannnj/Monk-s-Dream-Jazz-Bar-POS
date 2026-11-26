import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Printer } from 'lucide-react-native';
import { printHtmlElement } from '@/features/shared';
import { AdminModal } from '../../components/AdminModal';
import type { PayrollRunItem, PayrollRunSummary } from './payroll.types';

interface PayrollRegisterReportModalProps {
  visible: boolean;
  onClose: () => void;
  run: PayrollRunSummary | null;
  items: PayrollRunItem[];
}

const fmtPhp = (n: number) =>
  `₱${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PayrollRegisterReportModal: React.FC<PayrollRegisterReportModalProps> = ({
  visible,
  onClose,
  run,
  items,
}) => {
  if (!run) return null;

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title="Payroll Cutoff Register"
      subtitle={`${run.title} · ${run.run_code}`}
    >
      <View className="space-y-4">
        <View
          nativeID="monks-payroll-register-doc"
          {...({ id: 'monks-payroll-register-doc' } as any)}
          className="rounded-xl border border-stone-300 bg-white p-4 space-y-3"
        >
          <View className="border-b-2 border-stone-800 pb-2">
            <Text className="text-base font-black text-[#810021] uppercase">
              MONK&apos;S DREAM JAZZ BAR · PAYROLL REGISTER
            </Text>
            <Text className="text-xs text-stone-600">
              {run.title} ({run.period_start} to {run.period_end}) · Status: {run.status}
            </Text>
          </View>

          <View className="space-y-1.5">
            {items.map((item) => (
              <View
                key={item.id}
                className="flex-row items-center justify-between border-b border-stone-100 py-1.5"
              >
                <View className="flex-1 min-w-0">
                  <Text className="text-xs font-bold text-stone-900 truncate">
                    {item.employee_name}
                  </Text>
                  <Text className="text-[11px] text-stone-500">
                    {item.shifts_worked} shifts · {Number(item.hours_worked || 0).toFixed(1)}h ·{' '}
                    {item.payout_status}
                  </Text>
                </View>
                <Text
                  className="text-xs font-black text-stone-900"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {item.is_payroll_exempt ? 'Exempt' : fmtPhp(item.net_pay)}
                </Text>
              </View>
            ))}
          </View>

          <View className="flex-row justify-between pt-2 border-t border-stone-300">
            <Text className="text-xs font-black text-stone-900">
              TOTAL NET PAYROLL (Paid: {fmtPhp(run.paid_amount_total)})
            </Text>
            <Text
              className="text-sm font-black text-[#810021]"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {fmtPhp(run.net_pay_total)}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-end">
          <Pressable
            onPress={() =>
              printHtmlElement('monks-payroll-register-doc', {
                title: `Payroll_Register_${run.run_code}`,
              })
            }
            className="h-11 px-4 rounded-xl bg-[#810021] flex-row items-center gap-1.5"
          >
            <Printer size={15} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">Print A4 Register</Text>
          </Pressable>
        </View>
      </View>
    </AdminModal>
  );
};
