import { describe, it, expect } from 'vitest';
import {
  computeHubKpis,
  computePayrollItemTotals,
  computePayrollRunTotals,
  generateSemiMonthlyCutoffPresets,
  generateWeeklyCutoffPresets,
} from '../payrollEngine';
import type { PayrollRunItem, PayrollRunSummary } from '../payroll.types';

const makeItem = (overrides: Partial<PayrollRunItem> = {}): PayrollRunItem => ({
  id: 'item-1',
  payroll_run_id: 'run-1',
  user_id: 'user-1',
  employee_name: 'Maria Santos',
  employee_username: 'maria',
  employee_role: 'waiter',
  is_workflow_staff: true,
  is_payroll_exempt: false,
  shifts_worked: 10,
  regular_hours: 80,
  overtime_hours: 4,
  hours_worked: 84,
  base_pay_total: 6450,
  overtime_pay_total: 403.12,
  shift_bonus_total: 200,
  cutoff_bonus: 500,
  service_charge_share: 1200,
  other_additions: 0,
  cash_advance_deduction: 1000,
  sss_deduction: 0,
  philhealth_deduction: 0,
  pagibig_deduction: 0,
  tax_deduction: 0,
  other_deductions: 150,
  gross_pay: 7053.12,
  net_pay: 7603.12,
  payout_status: 'PENDING',
  paid_amount: 0,
  ...overrides,
});

describe('payrollEngine (Seam 1)', () => {
  it('computes item gross, additions, deductions, and net pay accurately', () => {
    const res = computePayrollItemTotals(makeItem());
    expect(res.grossPay).toBe(7053.12);
    expect(res.totalAdditions).toBe(1700);
    expect(res.totalDeductions).toBe(1150);
    expect(res.netPay).toBe(7603.12);
    expect(res.deductionsExceedGross).toBe(false);
  });

  it('strictly enforces ₱0.00 for Payroll Exempt admin accounts', () => {
    const res = computePayrollItemTotals(
      makeItem({
        is_payroll_exempt: true,
        base_pay_total: 1000,
        cutoff_bonus: 500,
      })
    );
    expect(res.grossPay).toBe(0);
    expect(res.netPay).toBe(0);
  });

  it('clamps negative net pay to 0 and flags deductionsExceedGross', () => {
    const res = computePayrollItemTotals(
      makeItem({
        base_pay_total: 645,
        overtime_pay_total: 0,
        shift_bonus_total: 0,
        cutoff_bonus: 0,
        service_charge_share: 0,
        cash_advance_deduction: 1000,
        other_deductions: 0,
      })
    );
    expect(res.netPay).toBe(0);
    expect(res.deductionsExceedGross).toBe(true);
  });

  it('derives PARTIALLY_PAID and PAID statuses from item payout states', () => {
    const partial = computePayrollRunTotals(
      [
        makeItem({ id: '1', payout_status: 'PAID', paid_amount: 7603.12 }),
        makeItem({ id: '2', payout_status: 'PENDING', paid_amount: 0 }),
        makeItem({ id: '3', is_payroll_exempt: true, payout_status: 'EXEMPT', net_pay: 0 }),
      ],
      'FINALIZED'
    );
    expect(partial.derivedStatus).toBe('PARTIALLY_PAID');
    expect(partial.paidCount).toBe(1);
    expect(partial.pendingCount).toBe(1);
    expect(partial.remainingTotal).toBe(7603.12);

    const paid = computePayrollRunTotals(
      [
        makeItem({ id: '1', payout_status: 'PAID', paid_amount: 7603.12 }),
        makeItem({ id: '2', payout_status: 'PAID', paid_amount: 7603.12 }),
      ],
      'PARTIALLY_PAID'
    );
    expect(paid.derivedStatus).toBe('PAID');
    expect(paid.remainingTotal).toBe(0);
  });

  it('generates accurate semi-monthly cutoff presets including leap-year February', () => {
    const presets = generateSemiMonthlyCutoffPresets('2024-02-20', 15, 30, 0);
    expect(presets[0].periodStart).toBe('2024-02-16');
    expect(presets[0].periodEnd).toBe('2024-02-29');
    expect(presets[1].periodStart).toBe('2024-02-01');
    expect(presets[1].periodEnd).toBe('2024-02-15');
  });

  it('generates weekly Mon-Sun cutoff presets', () => {
    const presets = generateWeeklyCutoffPresets('2026-11-27', 2); // Friday
    expect(presets[0].periodStart).toBe('2026-11-23');
    expect(presets[0].periodEnd).toBe('2026-11-29');
    expect(presets[0].paydayDate).toBe('2026-12-01');
  });

  it('computes Hub KPIs excluding VOIDED runs', () => {
    const runs: PayrollRunSummary[] = [
      {
        id: 'r1',
        run_code: 'PAY-1',
        title: 'Nov 1-15',
        cadence: 'SEMI_MONTHLY',
        period_start: '2026-11-01',
        period_end: '2026-11-15',
        payday_date: '2026-11-15',
        status: 'PARTIALLY_PAID',
        staff_count: 2,
        total_shifts: 10,
        total_hours: 80,
        gross_pay_total: 10000,
        additions_total: 0,
        deductions_total: 0,
        net_pay_total: 10000,
        paid_amount_total: 4000,
        created_at: '2026-11-15T00:00:00Z',
      },
      {
        id: 'r2',
        run_code: 'PAY-2',
        title: 'Voided',
        cadence: 'SEMI_MONTHLY',
        period_start: '2026-10-16',
        period_end: '2026-10-31',
        payday_date: '2026-10-31',
        status: 'VOIDED',
        staff_count: 2,
        total_shifts: 10,
        total_hours: 80,
        gross_pay_total: 9000,
        additions_total: 0,
        deductions_total: 0,
        net_pay_total: 9000,
        paid_amount_total: 9000,
        created_at: '2026-10-31T00:00:00Z',
      },
    ];
    const kpis = computeHubKpis(runs, '2026-11-27');
    expect(kpis.totalUnpaidBalance).toBe(6000);
    expect(kpis.unpaidCutoffsCount).toBe(1);
    expect(kpis.totalPaidThisMonth).toBe(4000);
    expect(kpis.totalPaidYtd).toBe(4000);
  });
});
