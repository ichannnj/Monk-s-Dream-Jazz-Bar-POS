export type PayrollCadence = 'SEMI_MONTHLY' | 'WEEKLY' | 'CUSTOM';

export type PayrollRunStatus = 'DRAFT' | 'FINALIZED' | 'PARTIALLY_PAID' | 'PAID' | 'VOIDED';

export type PayrollPayoutStatus = 'PENDING' | 'PAID' | 'EXEMPT';

export type PayrollPaymentMethod = 'CASH' | 'GCASH' | 'BANK_TRANSFER' | 'OTHER';

export interface PayrollUnresolvedShiftWarning {
  recordId: string;
  userId: string;
  displayName: string;
  date: string;
  shiftStatus: string;
  needsReview: boolean;
  reviewReason?: string | null;
}

export interface PayrollRunItem {
  id: string;
  payroll_run_id: string;
  user_id: string;
  employee_name: string;
  employee_username: string;
  employee_role: string;
  job_title?: string | null;
  is_workflow_staff: boolean;
  is_payroll_exempt: boolean;
  shifts_worked: number;
  regular_hours: number;
  overtime_hours: number;
  hours_worked: number;
  base_pay_total: number;
  overtime_pay_total: number;
  shift_bonus_total: number;
  cutoff_bonus: number;
  service_charge_share: number;
  other_additions: number;
  additions_notes?: string | null;
  cash_advance_deduction: number;
  sss_deduction: number;
  philhealth_deduction: number;
  pagibig_deduction: number;
  tax_deduction: number;
  other_deductions: number;
  deductions_notes?: string | null;
  gross_pay: number;
  net_pay: number;
  payout_status: PayrollPayoutStatus;
  paid_amount: number;
  payment_method?: PayrollPaymentMethod | null;
  payment_reference?: string | null;
  payment_notes?: string | null;
  paid_at?: string | null;
  paid_by_id?: string | null;
  cash_drawer_tx_id?: string | null;
}

export interface PayrollRunSummary {
  id: string;
  run_code: string;
  title: string;
  cadence: PayrollCadence;
  period_start: string;
  period_end: string;
  payday_date: string;
  status: PayrollRunStatus;
  staff_count: number;
  total_shifts: number;
  total_hours: number;
  gross_pay_total: number;
  additions_total: number;
  deductions_total: number;
  net_pay_total: number;
  paid_amount_total: number;
  notes?: string | null;
  created_at: string;
  finalized_at?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
}

export interface PayrollDraftPreview {
  success: boolean;
  error?: string;
  unresolvedWarnings: PayrollUnresolvedShiftWarning[];
  items: Array<{
    user_id: string;
    employee_name: string;
    employee_username: string;
    employee_role: string;
    job_title?: string | null;
    is_workflow_staff: boolean;
    is_payroll_exempt: boolean;
    shifts_worked: number;
    regular_hours: number;
    overtime_hours: number;
    hours_worked: number;
    base_pay_total: number;
    overtime_pay_total: number;
    shift_bonus_total: number;
    gross_pay: number;
  }>;
}

export interface PayrollCutoffPreset {
  id: string;
  label: string;
  cadence: PayrollCadence;
  periodStart: string;
  periodEnd: string;
  paydayDate: string;
}

export interface PayrollHubKpis {
  totalUnpaidBalance: number;
  unpaidCutoffsCount: number;
  pendingPayoutsCount: number;
  totalPaidThisMonth: number;
  totalPaidYtd: number;
}

export interface PayrollDateLockInfo {
  locked: boolean;
  runId?: string;
  runCode?: string;
  title?: string;
  periodStart?: string;
  periodEnd?: string;
  status?: PayrollRunStatus;
}
