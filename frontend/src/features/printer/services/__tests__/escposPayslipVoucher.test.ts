import { describe, it, expect } from 'vitest';
import { buildPayslipVoucherBytes } from '../escposSpecialSlips';

describe('escposSpecialSlips.buildPayslipVoucherBytes (Seam 3)', () => {
  const sample = {
    runCode: 'PAY-20261101-ABCD',
    periodStart: '2026-11-01',
    periodEnd: '2026-11-15',
    paydayDate: '2026-11-15',
    employeeName: 'Maria Santos',
    employeeRole: 'waiter',
    shiftsWorked: 10,
    hoursWorked: 84.5,
    basePay: 6450,
    overtimePay: 403.12,
    shiftBonus: 200,
    additions: 500,
    deductions: 1000,
    netPay: 6553.12,
    payoutStatus: 'PAID',
    paymentMethod: 'GCASH',
    paymentReference: '8921',
  };

  it('renders 57mm and 80mm payslip vouchers without cash drawer kick (ESC p)', () => {
    for (const width of ['57mm', '80mm'] as const) {
      const bytes = buildPayslipVoucherBytes(sample, width);
      const text = new TextDecoder().decode(bytes);
      expect(text).toContain('EMPLOYEE PAYSLIP VOUCHER');
      expect(text).toContain('Maria Santos');
      expect(text).toContain('PHP 6,553.12');
      expect(text).toContain('PAID (GCASH #8921)');
      // Ensure ESC p (0x1B 0x70) cash drawer kick is NEVER emitted
      for (let i = 0; i < bytes.length - 1; i++) {
        expect(bytes[i] === 0x1b && bytes[i + 1] === 0x70).toBe(false);
      }
    }
  });
});
