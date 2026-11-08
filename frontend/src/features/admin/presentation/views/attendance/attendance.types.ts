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
  'all' | 'clocked_in' | 'completed' | 'absent' | 'pos_only' | 'support_only';

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
  clockInAt: string | null;
  clockOutAt: string | null;
  hoursWorked: number;
  baseDailyPay: number;
  addonPay: number;
  totalDayPay: number;
  notes: string;
}

export interface MultiDayAggregateItem {
  staff: StaffMemberAdmin;
  shiftsWorked: number;
  hoursLogged: number;
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
  baseDailyPay: string;
  addonPay: string;
  notes: string;
}

export interface AttendancePeriodTotals {
  presentCount: number;
  clockedInCount: number;
  completedCount: number;
  baseTotal: number;
  bonusTotal: number;
  grandTotal: number;
}
