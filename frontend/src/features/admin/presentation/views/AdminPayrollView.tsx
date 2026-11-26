import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi } from '../../data/admin.api';
import { exportPayrollCutoffToExcel } from '../../utils/excel/exportPayrollCutoff';
import { usePayrollController } from './payroll/usePayrollController';
import { PayrollHubView } from './payroll/PayrollHubView';
import { PayrollRunDetailView } from './payroll/PayrollRunDetailView';
import { CreatePayrollCutoffModal } from './payroll/CreatePayrollCutoffModal';
import { PayrollAdjustmentModal } from './payroll/PayrollAdjustmentModal';
import { PayrollPayoutModal } from './payroll/PayrollPayoutModal';
import { PayrollReopenVoidModal } from './payroll/PayrollReopenVoidModal';
import { PayrollPayslipModal } from './payroll/PayrollPayslipModal';
import { PayrollRegisterReportModal } from './payroll/PayrollRegisterReportModal';
import type { PayrollRunItem } from './payroll/payroll.types';

export interface AdminPayrollViewProps {
  onRefresh?: () => void;
}

export const AdminPayrollView: React.FC<AdminPayrollViewProps> = ({ onRefresh }) => {
  const {
    currentUser,
    todayStr,
    filteredRuns,
    hubKpis,
    selectedRunId,
    setSelectedRunId,
    selectedRun,
    runItems,
    selectedRunTotals,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isCreateModalOpen,
    setIsCreateModalOpen,
    venuePayrollSettings,
    refreshAll,
    handleRefreshDraft,
  } = usePayrollController(onRefresh);

  const [adjustingItem, setAdjustingItem] = useState<PayrollRunItem | null>(null);
  const [payoutTargets, setPayoutTargets] = useState<PayrollRunItem[]>([]);
  const [reopenVoidMode, setReopenVoidMode] = useState<'reopen' | 'void' | null>(null);
  const [payslipItem, setPayslipItem] = useState<PayrollRunItem | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const handleFinalize = async () => {
    if (!selectedRun) return;
    try {
      const res = await adminApi.finalizePayrollRun(selectedRun.id, currentUser?.id, false);
      if (!res.success && res.code === 'UNRESOLVED_SHIFTS') {
        const confirmed =
          typeof window !== 'undefined'
            ? window.confirm(
                `${res.unresolvedCount} unresolved or open shift(s) exist in this cutoff. Finalize anyway?`
              )
            : true;
        if (!confirmed) return;
        const forced = await adminApi.finalizePayrollRun(selectedRun.id, currentUser?.id, true);
        if (!forced.success) {
          toast.error(forced.error || 'Failed to finalize cutoff');
          return;
        }
      } else if (!res.success) {
        toast.error(res.error || 'Failed to finalize cutoff');
        return;
      }
      toast.success('Payroll cutoff finalized and locked');
      await refreshAll();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to finalize cutoff');
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-[#EFECE6] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      <View className="pb-10">
        {selectedRun && selectedRunTotals ? (
          <PayrollRunDetailView
            run={selectedRun}
            items={runItems}
            totals={selectedRunTotals}
            onBack={() => setSelectedRunId(null)}
            onRefreshDraft={handleRefreshDraft}
            onFinalize={handleFinalize}
            onOpenAdjust={(item) => setAdjustingItem(item)}
            onOpenPayoutSingle={(item) => setPayoutTargets([item])}
            onOpenPayoutAll={() =>
              setPayoutTargets(
                runItems.filter((i) => !i.is_payroll_exempt && i.payout_status === 'PENDING')
              )
            }
            onOpenReopen={() => setReopenVoidMode('reopen')}
            onOpenVoid={() => setReopenVoidMode('void')}
            onOpenPayslip={(item) => setPayslipItem(item)}
            onOpenRegisterPrint={() => setIsRegisterModalOpen(true)}
            onExportExcel={() => {
              exportPayrollCutoffToExcel({ run: selectedRun, items: runItems });
              toast.success('Payroll cutoff exported to Excel (.xls)');
            }}
          />
        ) : (
          <PayrollHubView
            kpis={hubKpis}
            runs={filteredRuns}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenCreate={() => setIsCreateModalOpen(true)}
            onSelectRun={(id) => setSelectedRunId(id)}
          />
        )}
      </View>

      <CreatePayrollCutoffModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        todayStr={todayStr}
        defaultCadence={venuePayrollSettings.cadence}
        cutoffDay1={venuePayrollSettings.day1}
        cutoffDay2={venuePayrollSettings.day2}
        paydayLagDays={venuePayrollSettings.lagDays}
        actorId={currentUser?.id}
        onCreated={(runId) => {
          setSelectedRunId(runId);
          refreshAll();
        }}
      />

      <PayrollAdjustmentModal
        visible={Boolean(adjustingItem)}
        onClose={() => setAdjustingItem(null)}
        item={adjustingItem}
        actorId={currentUser?.id}
        onSaved={refreshAll}
      />

      <PayrollPayoutModal
        visible={payoutTargets.length > 0}
        onClose={() => setPayoutTargets([])}
        run={selectedRun}
        targetItems={payoutTargets}
        actorId={currentUser?.id}
        onPaid={refreshAll}
      />

      <PayrollReopenVoidModal
        visible={Boolean(reopenVoidMode)}
        mode={reopenVoidMode || 'reopen'}
        onClose={() => setReopenVoidMode(null)}
        run={selectedRun}
        actorId={currentUser?.id}
        onSuccess={refreshAll}
      />

      <PayrollPayslipModal
        visible={Boolean(payslipItem)}
        onClose={() => setPayslipItem(null)}
        run={selectedRun}
        item={payslipItem}
      />

      <PayrollRegisterReportModal
        visible={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        run={selectedRun}
        items={runItems}
      />
    </ScrollView>
  );
};

export default AdminPayrollView;
