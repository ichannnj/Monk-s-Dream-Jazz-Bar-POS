import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from '@/features/shared/toast/useToastStore';
import { realtimeGateway, useWindowVisibilitySync } from '@/features/shared';
import { useAuthStore } from '@/features/auth';
import { adminApi, getManilaBusinessDateString } from '../../../data/admin.api';
import { computeHubKpis, computePayrollRunTotals } from './payrollEngine';
import type {
  PayrollCadence,
  PayrollRunItem,
  PayrollRunStatus,
  PayrollRunSummary,
} from './payroll.types';

export type PayrollStatusFilter = 'all' | 'unpaid' | 'DRAFT' | 'PAID' | 'VOIDED';

export function usePayrollController(onRefresh?: () => void) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const todayStr = useMemo(() => getManilaBusinessDateString(), []);

  const [runs, setRuns] = useState<PayrollRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<PayrollRunSummary | null>(null);
  const [runItems, setRunItems] = useState<PayrollRunItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<PayrollStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [venuePayrollSettings, setVenuePayrollSettings] = useState<{
    cadence: PayrollCadence;
    day1: number;
    day2: number;
    lagDays: number;
  }>({ cadence: 'SEMI_MONTHLY', day1: 15, day2: 30, lagDays: 0 });

  const loadRuns = useCallback(async () => {
    setIsLoading(true);
    try {
      const [runsData, settings] = await Promise.all([
        adminApi.getPayrollRuns(),
        adminApi.getVenueSettings().catch(() => null),
      ]);
      setRuns(runsData);
      if (settings) {
        const s = settings as any;
        setVenuePayrollSettings({
          cadence:
            s.payroll_cadence === 'WEEKLY' || s.payroll_cadence === 'CUSTOM'
              ? s.payroll_cadence
              : 'SEMI_MONTHLY',
          day1: Number(s.payroll_cutoff_day_1 || 15),
          day2: Number(s.payroll_cutoff_day_2 || 30),
          lagDays: Number(s.payroll_payday_lag_days || 0),
        });
      }
    } catch (e: any) {
      console.warn('Failed to load payroll runs:', e);
      toast.error(e?.message || 'Failed to load payroll runs', { title: 'Payroll' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRunDetail = useCallback(async (runId: string) => {
    setIsLoading(true);
    try {
      const detail = await adminApi.getPayrollRunDetail(runId);
      setSelectedRun(detail.run);
      setRunItems(detail.items);
    } catch (e: any) {
      console.warn('Failed to load payroll run detail:', e);
      toast.error(e?.message || 'Failed to load cutoff details', { title: 'Payroll' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await loadRuns();
    if (selectedRunId) {
      await loadRunDetail(selectedRunId);
    }
    onRefresh?.();
  }, [loadRuns, loadRunDetail, selectedRunId, onRefresh]);

  useWindowVisibilitySync(refreshAll);

  useEffect(() => {
    loadRuns();
    const interval = setInterval(refreshAll, 15000);
    const unsub = realtimeGateway.subscribeGlobalPOSRealtime({
      onAttendanceChange: () => refreshAll(),
      onPosSyncNeeded: () => refreshAll(),
    });
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [loadRuns, refreshAll]);

  useEffect(() => {
    if (selectedRunId) {
      loadRunDetail(selectedRunId);
    } else {
      setSelectedRun(null);
      setRunItems([]);
    }
  }, [selectedRunId, loadRunDetail]);

  const hubKpis = useMemo(() => computeHubKpis(runs, todayStr), [runs, todayStr]);

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      if (statusFilter === 'unpaid' && r.status !== 'FINALIZED' && r.status !== 'PARTIALLY_PAID') {
        return false;
      }
      if (
        statusFilter !== 'all' &&
        statusFilter !== 'unpaid' &&
        r.status !== (statusFilter as PayrollRunStatus)
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.run_code.toLowerCase().includes(q) ||
          r.period_start.includes(q) ||
          r.period_end.includes(q)
        );
      }
      return true;
    });
  }, [runs, statusFilter, searchQuery]);

  const selectedRunTotals = useMemo(() => {
    if (!selectedRun) return null;
    return computePayrollRunTotals(runItems, selectedRun.status);
  }, [selectedRun, runItems]);

  const handleRefreshDraft = async () => {
    if (!selectedRun) return;
    try {
      const res = await adminApi.refreshDraftRun(selectedRun.id, currentUser?.id);
      if (!res.success) {
        toast.error(res.error || 'Unable to sync attendance');
        return;
      }
      toast.success('Synced latest attendance records into Draft');
      await refreshAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to sync attendance');
    }
  };

  return {
    currentUser,
    todayStr,
    runs,
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
    isLoading,
    isCreateModalOpen,
    setIsCreateModalOpen,
    venuePayrollSettings,
    refreshAll,
    handleRefreshDraft,
  };
}
