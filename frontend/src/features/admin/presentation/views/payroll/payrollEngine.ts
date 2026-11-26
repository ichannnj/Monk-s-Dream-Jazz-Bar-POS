import type {
  PayrollCutoffPreset,
  PayrollHubKpis,
  PayrollRunItem,
  PayrollRunStatus,
  PayrollRunSummary,
} from './payroll.types';

const round2 = (n: number): number => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

export function computePayrollItemTotals(
  item: Pick<
    PayrollRunItem,
    | 'is_payroll_exempt'
    | 'base_pay_total'
    | 'overtime_pay_total'
    | 'shift_bonus_total'
    | 'cutoff_bonus'
    | 'service_charge_share'
    | 'other_additions'
    | 'cash_advance_deduction'
    | 'sss_deduction'
    | 'philhealth_deduction'
    | 'pagibig_deduction'
    | 'tax_deduction'
    | 'other_deductions'
  >
): {
  grossPay: number;
  totalAdditions: number;
  totalDeductions: number;
  netPay: number;
  deductionsExceedGross: boolean;
} {
  if (item.is_payroll_exempt) {
    return {
      grossPay: 0,
      totalAdditions: 0,
      totalDeductions: 0,
      netPay: 0,
      deductionsExceedGross: false,
    };
  }

  const grossPay = round2(
    Math.max(0, Number(item.base_pay_total || 0)) +
      Math.max(0, Number(item.overtime_pay_total || 0)) +
      Math.max(0, Number(item.shift_bonus_total || 0))
  );

  const totalAdditions = round2(
    Math.max(0, Number(item.cutoff_bonus || 0)) +
      Math.max(0, Number(item.service_charge_share || 0)) +
      Math.max(0, Number(item.other_additions || 0))
  );

  const totalDeductions = round2(
    Math.max(0, Number(item.cash_advance_deduction || 0)) +
      Math.max(0, Number(item.sss_deduction || 0)) +
      Math.max(0, Number(item.philhealth_deduction || 0)) +
      Math.max(0, Number(item.pagibig_deduction || 0)) +
      Math.max(0, Number(item.tax_deduction || 0)) +
      Math.max(0, Number(item.other_deductions || 0))
  );

  const rawNet = round2(grossPay + totalAdditions - totalDeductions);
  return {
    grossPay,
    totalAdditions,
    totalDeductions,
    netPay: Math.max(0, rawNet),
    deductionsExceedGross: rawNet < 0,
  };
}

export function computePayrollRunTotals(
  items: PayrollRunItem[],
  currentStatus: PayrollRunStatus = 'DRAFT'
): {
  grossTotal: number;
  additionsTotal: number;
  deductionsTotal: number;
  netTotal: number;
  paidTotal: number;
  remainingTotal: number;
  paidCount: number;
  pendingCount: number;
  derivedStatus: PayrollRunStatus;
} {
  let grossTotal = 0;
  let additionsTotal = 0;
  let deductionsTotal = 0;
  let netTotal = 0;
  let paidTotal = 0;
  let paidCount = 0;
  let pendingCount = 0;

  for (const item of items) {
    if (item.is_payroll_exempt) continue;
    const calc = computePayrollItemTotals(item);
    grossTotal += calc.grossPay;
    additionsTotal += calc.totalAdditions;
    deductionsTotal += calc.totalDeductions;
    netTotal += calc.netPay;

    if (item.payout_status === 'PAID') {
      paidCount += 1;
      paidTotal += Number(item.paid_amount ?? calc.netPay);
    } else if (item.payout_status === 'PENDING') {
      pendingCount += 1;
    }
  }

  grossTotal = round2(grossTotal);
  additionsTotal = round2(additionsTotal);
  deductionsTotal = round2(deductionsTotal);
  netTotal = round2(netTotal);
  paidTotal = round2(paidTotal);
  const remainingTotal = round2(Math.max(0, netTotal - paidTotal));

  let derivedStatus: PayrollRunStatus = currentStatus;
  if (
    currentStatus === 'FINALIZED' ||
    currentStatus === 'PARTIALLY_PAID' ||
    currentStatus === 'PAID'
  ) {
    if (paidCount > 0 && pendingCount === 0) {
      derivedStatus = 'PAID';
    } else if (paidCount > 0 && pendingCount > 0) {
      derivedStatus = 'PARTIALLY_PAID';
    } else {
      derivedStatus = 'FINALIZED';
    }
  }

  return {
    grossTotal,
    additionsTotal,
    deductionsTotal,
    netTotal,
    paidTotal,
    remainingTotal,
    paidCount,
    pendingCount,
    derivedStatus,
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatYmd(year: number, monthIndex0: number, day: number): string {
  return `${year}-${pad2(monthIndex0 + 1)}-${pad2(day)}`;
}

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return formatYmd(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

export function generateSemiMonthlyCutoffPresets(
  todayStr: string,
  cutoffDay1 = 15,
  cutoffDay2 = 30,
  paydayLagDays = 0
): PayrollCutoffPreset[] {
  const [y, m1, d] = todayStr.split('-').map(Number);
  const m = m1 - 1;
  const maxDayThisMonth = lastDayOfMonth(y, m);
  const d1 = Math.min(Math.max(1, cutoffDay1), maxDayThisMonth);
  const d2 = cutoffDay2 >= 28 ? maxDayThisMonth : Math.min(cutoffDay2, maxDayThisMonth);

  const prevMonthDate = new Date(Date.UTC(y, m - 1, 1));
  const py = prevMonthDate.getUTCFullYear();
  const pm = prevMonthDate.getUTCMonth();
  const maxDayPrevMonth = lastDayOfMonth(py, pm);
  const pd1 = Math.min(Math.max(1, cutoffDay1), maxDayPrevMonth);
  const pd2 = cutoffDay2 >= 28 ? maxDayPrevMonth : Math.min(cutoffDay2, maxDayPrevMonth);

  const firstHalfCurrent: PayrollCutoffPreset = {
    id: 'semi_curr_1',
    label: `1st–${d1}th (Current Month)`,
    cadence: 'SEMI_MONTHLY',
    periodStart: formatYmd(y, m, 1),
    periodEnd: formatYmd(y, m, d1),
    paydayDate: addDaysYmd(formatYmd(y, m, d1), paydayLagDays),
  };

  const secondHalfCurrent: PayrollCutoffPreset = {
    id: 'semi_curr_2',
    label: `${d1 + 1}th–${d2}th (Current Month)`,
    cadence: 'SEMI_MONTHLY',
    periodStart: formatYmd(y, m, d1 + 1),
    periodEnd: formatYmd(y, m, d2),
    paydayDate: addDaysYmd(formatYmd(y, m, d2), paydayLagDays),
  };

  const secondHalfPrev: PayrollCutoffPreset = {
    id: 'semi_prev_2',
    label: `${pd1 + 1}th–${pd2}th (Previous Month)`,
    cadence: 'SEMI_MONTHLY',
    periodStart: formatYmd(py, pm, pd1 + 1),
    periodEnd: formatYmd(py, pm, pd2),
    paydayDate: addDaysYmd(formatYmd(py, pm, pd2), paydayLagDays),
  };

  const firstHalfPrev: PayrollCutoffPreset = {
    id: 'semi_prev_1',
    label: `1st–${pd1}th (Previous Month)`,
    cadence: 'SEMI_MONTHLY',
    periodStart: formatYmd(py, pm, 1),
    periodEnd: formatYmd(py, pm, pd1),
    paydayDate: addDaysYmd(formatYmd(py, pm, pd1), paydayLagDays),
  };

  return d <= d1
    ? [firstHalfCurrent, secondHalfPrev, firstHalfPrev]
    : [secondHalfCurrent, firstHalfCurrent, secondHalfPrev];
}

export function generateWeeklyCutoffPresets(
  todayStr: string,
  paydayLagDays = 0
): PayrollCutoffPreset[] {
  const [y, m1, d] = todayStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m1 - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun..6=Sat
  const distToMon = (dow + 6) % 7;
  const thisMon = addDaysYmd(todayStr, -distToMon);
  const thisSun = addDaysYmd(thisMon, 6);
  const prevMon = addDaysYmd(thisMon, -7);
  const prevSun = addDaysYmd(thisMon, -1);

  return [
    {
      id: 'week_curr',
      label: 'This Week (Mon–Sun)',
      cadence: 'WEEKLY',
      periodStart: thisMon,
      periodEnd: thisSun,
      paydayDate: addDaysYmd(thisSun, paydayLagDays),
    },
    {
      id: 'week_prev',
      label: 'Last Week (Mon–Sun)',
      cadence: 'WEEKLY',
      periodStart: prevMon,
      periodEnd: prevSun,
      paydayDate: addDaysYmd(prevSun, paydayLagDays),
    },
  ];
}

export function computeHubKpis(runs: PayrollRunSummary[], todayStr: string): PayrollHubKpis {
  const [currYear, currMonth] = todayStr.split('-');
  const currYm = `${currYear}-${currMonth}`;

  let totalUnpaidBalance = 0;
  let unpaidCutoffsCount = 0;
  let totalPaidThisMonth = 0;
  let totalPaidYtd = 0;

  for (const run of runs) {
    if (run.status === 'VOIDED') continue;
    const net = Number(run.net_pay_total || 0);
    const paid = Number(run.paid_amount_total || 0);

    if (run.status === 'FINALIZED' || run.status === 'PARTIALLY_PAID') {
      const rem = Math.max(0, net - paid);
      totalUnpaidBalance += rem;
      if (rem > 0 || run.status === 'FINALIZED') {
        unpaidCutoffsCount += 1;
      }
    }

    if (paid > 0) {
      if (run.period_end.startsWith(currYm) || run.payday_date.startsWith(currYm)) {
        totalPaidThisMonth += paid;
      }
      if (run.period_end.startsWith(currYear) || run.payday_date.startsWith(currYear)) {
        totalPaidYtd += paid;
      }
    }
  }

  return {
    totalUnpaidBalance: round2(totalUnpaidBalance),
    unpaidCutoffsCount,
    pendingPayoutsCount: unpaidCutoffsCount,
    totalPaidThisMonth: round2(totalPaidThisMonth),
    totalPaidYtd: round2(totalPaidYtd),
  };
}
