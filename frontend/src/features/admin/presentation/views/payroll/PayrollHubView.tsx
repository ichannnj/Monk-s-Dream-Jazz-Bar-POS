import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Plus, Search, Wallet, ArrowRight } from 'lucide-react-native';
import { PosDropdown } from '@/features/shared/ui/PosDropdown';
import { useResponsive } from '@/features/shared/hooks/useResponsive';
import { PayrollSummaryKpiRow } from './PayrollSummaryKpiRow';
import type { PayrollHubKpis, PayrollRunStatus, PayrollRunSummary } from './payroll.types';
import type { PayrollStatusFilter } from './usePayrollController';

interface PayrollHubViewProps {
  kpis: PayrollHubKpis;
  runs: PayrollRunSummary[];
  statusFilter: PayrollStatusFilter;
  setStatusFilter: (v: PayrollStatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onOpenCreate: () => void;
  onSelectRun: (runId: string) => void;
}

const STATUS_BADGE: Record<PayrollRunStatus, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: 'bg-stone-100 border-stone-300', text: 'text-stone-700', label: 'DRAFT' },
  FINALIZED: {
    bg: 'bg-[#810021]/10 border-[#810021]/30',
    text: 'text-[#810021]',
    label: 'UNPAID · FINALIZED',
  },
  PARTIALLY_PAID: {
    bg: 'bg-amber-100 border-amber-300',
    text: 'text-amber-900',
    label: 'PARTIALLY PAID',
  },
  PAID: { bg: 'bg-stone-900 border-stone-900', text: 'text-white', label: 'PAID' },
  VOIDED: { bg: 'bg-stone-100 border-stone-200', text: 'text-stone-400', label: 'VOIDED' },
};

const fmtPhp = (n: number) =>
  `₱${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PayrollHubView: React.FC<PayrollHubViewProps> = ({
  kpis,
  runs,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  onOpenCreate,
  onSelectRun,
}) => {
  const { isMobile } = useResponsive();

  return (
    <View className="space-y-4">
      <PayrollSummaryKpiRow kpis={kpis} />

      {/* Toolbar */}
      <View className="flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-xs">
        <View
          className={`flex-1 items-stretch gap-2 min-w-0 ${isMobile ? 'flex-col' : 'flex-row items-center'}`}
        >
          <View className="flex-1 min-w-0 flex-row items-center rounded-xl border border-stone-200 bg-[#F7F5F2] px-3 h-12">
            <Search size={16} color="#706864" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search cutoff…"
              placeholderTextColor="#706864"
              accessibilityLabel="Search payroll cutoffs"
              className="flex-1 ml-2 text-base text-stone-900 min-w-0"
              style={{ fontSize: 16 }}
            />
          </View>
          <View className={isMobile ? 'w-full' : 'w-44'}>
            <PosDropdown
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as PayrollStatusFilter)}
              options={[
                { value: 'all', label: 'All Cutoffs' },
                { value: 'unpaid', label: 'Unpaid / Action' },
                { value: 'DRAFT', label: 'Drafts' },
                { value: 'PAID', label: 'Paid' },
                { value: 'VOIDED', label: 'Voided' },
              ]}
            />
          </View>
        </View>

        <Pressable
          onPress={onOpenCreate}
          accessibilityRole="button"
          accessibilityLabel="New Payroll Cutoff"
          className="h-12 px-4 rounded-xl bg-[#810021] active:bg-[#600018] flex-row items-center justify-center gap-2"
        >
          <Plus size={16} color="#FFFFFF" />
          <Text className="text-sm font-bold text-white">New Payroll Cutoff</Text>
        </Pressable>
      </View>

      {/* Cutoffs List */}
      <View className="rounded-2xl border border-stone-200/80 bg-white p-3 sm:p-4 shadow-xs">
        {runs.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <Wallet size={36} color="#a8a29e" />
            <Text className="mt-3 text-sm font-bold text-stone-800">No payroll cutoffs yet</Text>
            <Text className="mt-1 text-xs text-stone-500 text-center max-w-xs">
              Create your first cutoff run to calculate employee pay from attendance and track
              payouts.
            </Text>
            <Pressable
              onPress={onOpenCreate}
              className="mt-4 h-11 px-4 rounded-xl bg-[#810021] flex-row items-center gap-1.5"
            >
              <Plus size={15} color="#FFFFFF" />
              <Text className="text-xs font-bold text-white">Create First Cutoff</Text>
            </Pressable>
          </View>
        ) : (
          <View className="space-y-2.5">
            {runs.map((run) => {
              const badge = STATUS_BADGE[run.status] || STATUS_BADGE.DRAFT;
              const net = Number(run.net_pay_total || 0);
              const paid = Number(run.paid_amount_total || 0);
              const remaining = Math.max(0, net - paid);
              const pct =
                net > 0
                  ? Math.min(100, Math.round((paid / net) * 100))
                  : run.status === 'PAID'
                    ? 100
                    : 0;

              return (
                <Pressable
                  key={run.id}
                  onPress={() => onSelectRun(run.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open cutoff ${run.title}`}
                  className="rounded-xl border border-stone-200 bg-[#F7F5F2]/60 p-3.5 active:bg-[#EFECE6]"
                >
                  <View className="flex-col md:flex-row md:items-center justify-between gap-2.5">
                    <View className="flex-1 min-w-0">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-sm font-black text-stone-900 truncate">
                          {run.title}
                        </Text>
                        <View className={`rounded-full border px-2.5 py-0.5 ${badge.bg}`}>
                          <Text className={`text-[10px] font-bold ${badge.text}`}>
                            {badge.label}
                          </Text>
                        </View>
                        <Text className="text-[11px] font-mono text-stone-500">{run.run_code}</Text>
                      </View>
                      <Text className="mt-1 text-xs text-stone-600">
                        Period: {run.period_start} to {run.period_end} · Payday: {run.payday_date} ·{' '}
                        {run.staff_count} staff
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between md:justify-end gap-4">
                      <View className="items-start md:items-end">
                        <Text
                          className="text-base font-black text-stone-900"
                          style={{ fontVariant: ['tabular-nums'] }}
                        >
                          {fmtPhp(net)}
                        </Text>
                        {remaining > 0 && run.status !== 'VOIDED' && run.status !== 'DRAFT' ? (
                          <Text
                            className="text-xs font-bold text-[#810021]"
                            style={{ fontVariant: ['tabular-nums'] }}
                          >
                            {fmtPhp(remaining)} unpaid
                          </Text>
                        ) : (
                          <Text
                            className="text-xs text-stone-500"
                            style={{ fontVariant: ['tabular-nums'] }}
                          >
                            Paid: {fmtPhp(paid)}
                          </Text>
                        )}
                      </View>

                      <View className="h-9 w-9 rounded-lg bg-white border border-stone-200 items-center justify-center">
                        <ArrowRight size={15} color="#810021" />
                      </View>
                    </View>
                  </View>

                  {run.status !== 'VOIDED' && (
                    <View className="mt-2.5 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
                      <View
                        className="h-full rounded-full bg-[#810021]"
                        style={{ width: `${pct}%` }}
                      />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};
