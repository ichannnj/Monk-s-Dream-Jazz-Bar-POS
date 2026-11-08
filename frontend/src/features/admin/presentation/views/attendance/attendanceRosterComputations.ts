import {
  AttendanceRecordAdmin,
  StaffMemberAdmin,
  PH_MINIMUM_WAGE_DAILY,
} from '../../../data/admin.api';
import { SingleDayStaffItem, MultiDayAggregateItem, ShiftStatusFilter } from './attendance.types';

export function computeSingleDayStaffList(
  staffRoster: StaffMemberAdmin[],
  attendanceRecords: AttendanceRecordAdmin[]
): SingleDayStaffItem[] {
  const recordByUserId = new Map<string, AttendanceRecordAdmin>();
  attendanceRecords.forEach((r) => {
    recordByUserId.set(r.user_id, r);
  });

  return staffRoster
    .filter((s) => s.is_active)
    .map((staff) => {
      const rec = recordByUserId.get(staff.id);
      const isPresent = rec ? rec.is_present : false;
      const shiftStatus: 'CLOCKED_IN' | 'COMPLETED' | 'ABSENT' = rec
        ? (rec.shift_status as any) || (rec.is_present ? 'CLOCKED_IN' : 'ABSENT')
        : 'ABSENT';

      const isAdmin = staff.role === 'admin';
      const baseDailyPay = isAdmin
        ? 0.0
        : rec
          ? rec.base_daily_pay
          : parseFloat(String(staff.base_daily_rate)) || PH_MINIMUM_WAGE_DAILY;
      const addonPay = isAdmin ? 0.0 : rec ? rec.addon_pay : 0.0;
      const totalDayPay = isPresent && !isAdmin ? baseDailyPay + addonPay : 0.0;

      let computedHours = Number(rec?.hours_worked || 0);
      if (shiftStatus === 'CLOCKED_IN' && rec?.clock_in_at) {
        const inMillis = new Date(rec.clock_in_at).getTime();
        const liveElapsed = Math.max(0, (Date.now() - inMillis) / 3600000);
        computedHours = Math.round((computedHours + liveElapsed) * 10) / 10;
      } else if (shiftStatus === 'COMPLETED' && computedHours === 0) {
        computedHours = 8.0;
      }

      return {
        staff,
        rec,
        isPresent,
        shiftStatus,
        clockInAt: rec?.clock_in_at || null,
        clockOutAt: rec?.clock_out_at || null,
        hoursWorked: computedHours,
        baseDailyPay,
        addonPay,
        totalDayPay,
        notes: rec?.notes || '',
      };
    });
}

export function filterSingleDayStaffList(
  items: SingleDayStaffItem[],
  statusFilter: ShiftStatusFilter,
  searchQuery: string
): SingleDayStaffItem[] {
  return items.filter((item) => {
    if (statusFilter === 'clocked_in' && item.shiftStatus !== 'CLOCKED_IN') return false;
    if (statusFilter === 'completed' && item.shiftStatus !== 'COMPLETED') return false;
    if (statusFilter === 'absent' && item.isPresent) return false;
    if (statusFilter === 'pos_only' && !item.staff.is_workflow_staff) return false;
    if (statusFilter === 'support_only' && item.staff.is_workflow_staff) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.staff.display_name?.toLowerCase().includes(q);
      const matchUser = item.staff.username?.toLowerCase().includes(q);
      const matchRole = item.staff.role?.toLowerCase().includes(q);
      const matchJob = item.staff.job_title?.toLowerCase().includes(q);
      return matchName || matchUser || matchRole || matchJob;
    }
    return true;
  });
}

export function computeMultiDayAggregates(
  staffRoster: StaffMemberAdmin[],
  attendanceRecords: AttendanceRecordAdmin[],
  statusFilter: ShiftStatusFilter,
  searchQuery: string
): MultiDayAggregateItem[] {
  const map = new Map<string, MultiDayAggregateItem>();
  staffRoster.forEach((s) => {
    map.set(s.id, {
      staff: s,
      shiftsWorked: 0,
      hoursLogged: 0,
      basePaySum: 0,
      bonusSum: 0,
      totalPaySum: 0,
    });
  });

  attendanceRecords.forEach((rec) => {
    if (!rec.is_present) return;
    const existing = map.get(rec.user_id);
    if (existing) {
      const isAdmin = existing.staff.role === 'admin';
      existing.shiftsWorked += 1;
      existing.hoursLogged += Number(rec.hours_worked || 8.0);
      if (!isAdmin) {
        existing.basePaySum += Number(rec.base_daily_pay || 0);
        existing.bonusSum += Number(rec.addon_pay || 0);
        existing.totalPaySum += Number(rec.total_day_pay || 0);
      }
    }
  });

  return Array.from(map.values()).filter((item) => {
    if (statusFilter === 'pos_only' && !item.staff.is_workflow_staff) return false;
    if (statusFilter === 'support_only' && item.staff.is_workflow_staff) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.staff.display_name?.toLowerCase().includes(q) ||
        item.staff.username?.toLowerCase().includes(q) ||
        item.staff.job_title?.toLowerCase().includes(q)
      );
    }
    return true;
  });
}
