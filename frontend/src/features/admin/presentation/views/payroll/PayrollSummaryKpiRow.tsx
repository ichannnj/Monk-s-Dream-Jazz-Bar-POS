import React from 'react';
import { View, Text } from 'react-native';
import type { PayrollHubKpis } from './payroll.types';

interface PayrollSummaryKpiRowProps {
  kpis: PayrollHubKpis;
}

const fmtPhp = (n: number) =>
  `₱${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PayrollSummaryKpiRow: React.FC<PayrollSummaryKpiRowProps> = ({ kpis }) => {
  return (
    <View className="flex-col sm:flex-row flex-wrap gap-2.5">
      <View className="w-full sm:flex-1 sm:min-w-[180px] rounded-xl border border-[#810021]/30 bg-white p-3.5 shadow-xs justify-between">
        <Text className="text-xs font-semibold text-[#810021]">Unpaid Payroll Balance</Text>
        <Text
          className="mt-1 text-xl font-black text-[#810021]"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {fmtPhp(kpis.totalUnpaidBalance)}
        </Text>
        <Text className="text-[11px] text-stone-500 mt-0.5">
          {kpis.unpaidCutoffsCount} cutoff{kpis.unpaidCutoffsCount === 1 ? '' : 's'} awaiting payout
        </Text>
      </View>

      <View className="w-full sm:flex-1 sm:min-w-[180px] rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-xs justify-between">
        <Text className="text-xs font-semibold text-stone-500">Paid This Month</Text>
        <Text
          className="mt-1 text-xl font-black text-stone-900"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {fmtPhp(kpis.totalPaidThisMonth)}
        </Text>
      </View>

      <View className="w-full sm:flex-1 sm:min-w-[180px] rounded-xl border border-stone-200/80 bg-[#EFECE6] p-3.5 shadow-xs justify-between">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-xs font-bold text-stone-800">Paid Year-to-Date</Text>
          <Text className="text-[10px] text-stone-500 font-medium">Excl. Admin</Text>
        </View>
        <Text
          className="mt-1 text-xl font-black text-stone-900"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {fmtPhp(kpis.totalPaidYtd)}
        </Text>
      </View>
    </View>
  );
};
