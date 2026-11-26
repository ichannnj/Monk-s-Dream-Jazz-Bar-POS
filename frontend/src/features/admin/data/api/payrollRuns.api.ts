import { supabase } from '@/features/shared/infrastructure/supabase';
import type {
  PayrollCadence,
  PayrollDateLockInfo,
  PayrollDraftPreview,
  PayrollPaymentMethod,
  PayrollRunItem,
  PayrollRunSummary,
} from '../../presentation/views/payroll/payroll.types';

export const payrollRunsApi = {
  async getPayrollRuns(): Promise<PayrollRunSummary[]> {
    const { data, error } = await (supabase.from as any)('payroll_runs')
      .select('*')
      .order('period_start', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as PayrollRunSummary[];
  },

  async getPayrollRunDetail(
    runId: string
  ): Promise<{ run: PayrollRunSummary; items: PayrollRunItem[] }> {
    const [runRes, itemsRes] = await Promise.all([
      (supabase.from as any)('payroll_runs').select('*').eq('id', runId).single(),
      (supabase.from as any)('payroll_run_items')
        .select('*')
        .eq('payroll_run_id', runId)
        .order('is_payroll_exempt', { ascending: true })
        .order('employee_name', { ascending: true }),
    ]);

    if (runRes.error) throw runRes.error;
    if (itemsRes.error) throw itemsRes.error;

    return {
      run: runRes.data as PayrollRunSummary,
      items: (itemsRes.data || []) as PayrollRunItem[],
    };
  },

  async previewPayrollRun(params: {
    periodStart: string;
    periodEnd: string;
    cadence?: PayrollCadence;
  }): Promise<PayrollDraftPreview> {
    const { data, error } = await (supabase.rpc as any)('preview_or_create_payroll_run', {
      p_period_start: params.periodStart,
      p_period_end: params.periodEnd,
      p_cadence: params.cadence || 'SEMI_MONTHLY',
      p_title: null,
      p_payday_date: null,
      p_actor_id: null,
      p_preview_only: true,
    });
    if (error) throw error;
    return data as PayrollDraftPreview;
  },

  async createPayrollRun(params: {
    periodStart: string;
    periodEnd: string;
    cadence: PayrollCadence;
    title?: string;
    paydayDate?: string;
    actorId?: string | null;
  }): Promise<{ success: boolean; runId?: string; runCode?: string; error?: string }> {
    const { data, error } = await (supabase.rpc as any)('preview_or_create_payroll_run', {
      p_period_start: params.periodStart,
      p_period_end: params.periodEnd,
      p_cadence: params.cadence,
      p_title: params.title || null,
      p_payday_date: params.paydayDate || null,
      p_actor_id: params.actorId || null,
      p_preview_only: false,
    });
    if (error) throw error;
    return data as { success: boolean; runId?: string; runCode?: string; error?: string };
  },

  async refreshDraftRun(
    runId: string,
    actorId?: string | null
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await (supabase.rpc as any)('refresh_draft_payroll_run', {
      p_run_id: runId,
      p_actor_id: actorId || null,
    });
    if (error) throw error;
    return data;
  },

  async updateItemAdjustments(params: {
    itemId: string;
    cutoffBonus: number;
    serviceChargeShare: number;
    otherAdditions: number;
    additionsNotes?: string | null;
    cashAdvanceDeduction: number;
    sssDeduction: number;
    philhealthDeduction: number;
    pagibigDeduction: number;
    taxDeduction: number;
    otherDeductions: number;
    deductionsNotes?: string | null;
    actorId?: string | null;
  }): Promise<{ success: boolean; netPay?: number; error?: string }> {
    const { data, error } = await (supabase.rpc as any)('update_payroll_run_item_adjustments', {
      p_item_id: params.itemId,
      p_cutoff_bonus: params.cutoffBonus,
      p_service_charge_share: params.serviceChargeShare,
      p_other_additions: params.otherAdditions,
      p_additions_notes: params.additionsNotes || null,
      p_cash_advance_deduction: params.cashAdvanceDeduction,
      p_sss_deduction: params.sssDeduction,
      p_philhealth_deduction: params.philhealthDeduction,
      p_pagibig_deduction: params.pagibigDeduction,
      p_tax_deduction: params.taxDeduction,
      p_other_deductions: params.otherDeductions,
      p_deductions_notes: params.deductionsNotes || null,
      p_actor_id: params.actorId || null,
    });
    if (error) throw error;
    return data;
  },

  async finalizePayrollRun(
    runId: string,
    actorId?: string | null,
    allowUnresolved = false
  ): Promise<{ success: boolean; code?: string; unresolvedCount?: number; error?: string }> {
    const { data, error } = await (supabase.rpc as any)('finalize_payroll_run', {
      p_run_id: runId,
      p_actor_id: actorId || null,
      p_allow_unresolved: allowUnresolved,
    });
    if (error) throw error;
    return data;
  },

  async reopenPayrollRun(
    runId: string,
    reason: string,
    actorId?: string | null
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await (supabase.rpc as any)('reopen_payroll_run_to_draft', {
      p_run_id: runId,
      p_actor_id: actorId || null,
      p_reason: reason,
    });
    if (error) throw error;
    return data;
  },

  async recordPayrollPayout(params: {
    runId: string;
    itemIds: string[];
    paymentMethod: PayrollPaymentMethod;
    reference?: string | null;
    notes?: string | null;
    deductCashDrawer: boolean;
    drawerTarget: 'main' | 'bar';
    actorId?: string | null;
  }): Promise<{ success: boolean; paidCount?: number; totalDisbursed?: number; error?: string }> {
    const { data, error } = await (supabase.rpc as any)('record_payroll_payout', {
      p_run_id: params.runId,
      p_item_ids: params.itemIds,
      p_payment_method: params.paymentMethod,
      p_reference: params.reference || null,
      p_notes: params.notes || null,
      p_deduct_cash_drawer: params.deductCashDrawer,
      p_drawer_target: params.drawerTarget,
      p_actor_id: params.actorId || null,
    });
    if (error) throw error;
    return data;
  },

  async voidPayrollRun(params: {
    runId: string;
    reason: string;
    managerPin?: string | null;
    actorId?: string | null;
  }): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await (supabase.rpc as any)('void_payroll_run', {
      p_run_id: params.runId,
      p_actor_id: params.actorId || null,
      p_manager_pin: params.managerPin || null,
      p_reason: params.reason,
    });
    if (error) throw error;
    return data;
  },

  async getPayrollLockForDate(dateStr: string): Promise<PayrollDateLockInfo> {
    const { data, error } = await (supabase.rpc as any)('check_date_payroll_lock', {
      p_date: dateStr,
    });
    if (error) return { locked: false };
    return (data || { locked: false }) as PayrollDateLockInfo;
  },
};
