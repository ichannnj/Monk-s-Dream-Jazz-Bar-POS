import type { AttendanceRecordAdmin, StaffMemberAdmin } from '../../../data/admin.api';

export type PeriodFilter =
  | 'today'
  | 'yesterday'
  | 'specific_day'
  | 'this_week'
  | 'select_week'
  | 'this_month'
  | 'select_month'
  | 'all';

export type ShiftStatusFilter =
  'all' | 'clocked_in' | 'completed' | 'absent' | 'needs_review' | 'pos_only' | 'support_only';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface SingleDayStaffItem {
  staff: StaffMemberAdmin;
  rec?: AttendanceRecordAdmin;
  isPresent: boolean;
  shiftStatus: 'CLOCKED_IN' | 'COMPLETED' | 'ABSENT';
  firstClockInAt: string | null;
  clockInAt: string | null;
  clockOutAt: string | null;
  hoursWorked: number;
  regularHours: number;
  overtimeHours: number;
  overtimePay: number;
  overtimeOverride: boolean;
  needsReview: boolean;
  reviewReason: string | null;
  editedAt: string | null;
  editReason: string | null;
  baseDailyPay: number;
  addonPay: number;
  totalDayPay: number;
  notes: string;
}

export interface MultiDayAggregateItem {
  staff: StaffMemberAdmin;
  shiftsWorked: number;
  hoursLogged: number;
  overtimeHoursSum: number;
  overtimePaySum: number;
  basePaySum: number;
  bonusSum: number;
  totalPaySum: number;
}

export interface EditingRecordState {
  userId: string;
  displayName: string;
  roleOrTitle: string;
  isPosUser: boolean;
  date: string;
  isPresent: boolean;
  shiftStatus: 'CLOCKED_IN' | 'COMPLETED' | 'ABSENT';
  clockInLocal: string;
  clockOutLocal: string;
  baseDailyPay: string;
  overtimePay: string;
  overtimeOverride: boolean;
  addonPay: string;
  notes: string;
  editReason: string;
  needsReview?: boolean;
  userOtOverride?: number | null;
}

export interface AttendancePeriodTotals {
  presentCount: number;
  clockedInCount: number;
  completedCount: number;
  needsReviewCount: number;
  overtimeHoursTotal: number;
  overtimePayTotal: number;
  baseTotal: number;
  bonusTotal: number;
  grandTotal: number;
}
