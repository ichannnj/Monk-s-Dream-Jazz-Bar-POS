import { useState, useEffect, useMemo } from 'react';
import { toast } from '@/features/shared/toast/useToastStore';
import { realtimeGateway, useWindowVisibilitySync } from '@/features/shared';
import {
  adminApi,
  getManilaBusinessDateString,
  type AttendanceRecordAdmin,
  type StaffMemberAdmin,
} from '../../../data/admin.api';
import {
  exportAttendancePayrollToExcel,
  type AttendanceExportItem,
} from '../../../utils/readingExcelExport';
import {
  PeriodFilter,
  ShiftStatusFilter,
  EditingRecordState,
  AttendancePeriodTotals,
} from './attendance.types';
import { computeAttendanceDateRange, calculateCalendarDays } from './attendanceDateUtils';
import {
  computeSingleDayStaffList,
  filterSingleDayStaffList,
  computeMultiDayAggregates,
} from './attendanceRosterComputations';

export function useAttendancePayrollController(onRefresh?: () => void) {
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [statusFilter, setStatusFilter] = useState<ShiftStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedDate, setSelectedDate] = useState<string>(() => getManilaBusinessDateString());
  const [selectedWeekRange, setSelectedWeekRange] = useState<{ start: string; end: string } | null>(
    null
  );
  const [selectedMonthYear, setSelectedMonthYear] = useState<{ year: number; month: number }>(
    () => {
      const bDateStr = getManilaBusinessDateString();
      const [y, m] = bDateStr.split('-').map(Number);
      return { year: y, month: m - 1 };
    }
  );

  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'day' | 'week' | 'month'>('day');
  const [calendarYear, setCalendarYear] = useState<number>(() => {
    return Number(getManilaBusinessDateString().split('-')[0]);
  });
  const [calendarMonth, setCalendarMonth] = useState<number>(() => {
    return Number(getManilaBusinessDateString().split('-')[1]) - 1;
  });

  const [staffRoster, setStaffRoster] = useState<StaffMemberAdmin[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [editingRecord, setEditingRecord] = useState<EditingRecordState | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const todayStr = useMemo(() => getManilaBusinessDateString(), []);

  const dateRange = useMemo(() => {
    return computeAttendanceDateRange(
      period,
      todayStr,
      selectedDate,
      selectedWeekRange,
      selectedMonthYear
    );
  }, [period, selectedDate, selectedWeekRange, selectedMonthYear, todayStr]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [roster, records] = await Promise.all([
        adminApi.getStaffRoster(),
        adminApi.getAttendanceRecords(dateRange.start, dateRange.end),
      ]);
      setStaffRoster(roster);
      setAttendanceRecords(records);
    } catch (e) {
      console.warn('Failed to load attendance records:', e);
      toast.error('Failed to load attendance records', { title: 'Network Notice' });
    } finally {
      setIsLoading(false);
    }
  };

  useWindowVisibilitySync(loadData);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 10000);

    const unsub = realtimeGateway.subscribeGlobalPOSRealtime({
      onAttendanceChange: () => loadData(),
      onUserChange: () => loadData(),
      onPosSyncNeeded: () => loadData(),
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [dateRange.start, dateRange.end]);

  const singleDayStaffList = useMemo(() => {
    if (!dateRange.isSingleDay) return [];
    return computeSingleDayStaffList(staffRoster, attendanceRecords);
  }, [dateRange.isSingleDay, staffRoster, attendanceRecords]);

  const filteredSingleDayList = useMemo(() => {
    return filterSingleDayStaffList(singleDayStaffList, statusFilter, searchQuery);
  }, [singleDayStaffList, statusFilter, searchQuery]);

  const multiDayAggregates = useMemo(() => {
    if (dateRange.isSingleDay) return [];
    return computeMultiDayAggregates(staffRoster, attendanceRecords, statusFilter, searchQuery);
  }, [dateRange.isSingleDay, staffRoster, attendanceRecords, statusFilter, searchQuery]);

  const adminUserIds = useMemo(() => {
    return new Set(staffRoster.filter((s) => s.role === 'admin').map((s) => s.id));
  }, [staffRoster]);

  const periodTotals: AttendancePeriodTotals = useMemo(() => {
    const presentCount = attendanceRecords.filter((r) => r.is_present).length;
    const clockedInCount = attendanceRecords.filter((r) => r.shift_status === 'CLOCKED_IN').length;
    const completedCount = attendanceRecords.filter((r) => r.shift_status === 'COMPLETED').length;
    const eligibleRecords = attendanceRecords.filter(
      (r) => r.is_present && !adminUserIds.has(r.user_id)
    );
    const baseTotal = eligibleRecords.reduce((sum, r) => sum + Number(r.base_daily_pay || 0), 0);
    const bonusTotal = eligibleRecords.reduce((sum, r) => sum + Number(r.addon_pay || 0), 0);
    const grandTotal = eligibleRecords.reduce((sum, r) => sum + Number(r.total_day_pay || 0), 0);

    return {
      presentCount,
      clockedInCount,
      completedCount,
      baseTotal,
      bonusTotal,
      grandTotal,
    };
  }, [attendanceRecords, adminUserIds]);

  const handleStepDay = (step: -1 | 1) => {
    const current = new Date(dateRange.start + 'T00:00:00');
    current.setDate(current.getDate() + step);
    const nextStr = current.toISOString().split('T')[0];

    if (nextStr > todayStr) {
      toast.warning('Future dates cannot be selected.', { title: 'Invalid Date' });
      return;
    }

    setSelectedDate(nextStr);
    setPeriod('specific_day');
  };

  const calendarDays = useMemo(() => {
    return calculateCalendarDays(calendarYear, calendarMonth);
  }, [calendarYear, calendarMonth]);

  const handleSelectDay = (day: number) => {
    const yyyy = calendarYear;
    const mm = String(calendarMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (dateStr > todayStr) {
      toast.warning('Future dates cannot be selected.', { title: 'Invalid Selection' });
      return;
    }

    if (datePickerMode === 'week') {
      const targetDate = new Date(yyyy, calendarMonth, day);
      const currentDay = targetDate.getDay();
      const dist = (currentDay + 6) % 7;
      const startW = new Date(yyyy, calendarMonth, day - dist).toISOString().split('T')[0];
      const endW = new Date(yyyy, calendarMonth, day - dist + 6).toISOString().split('T')[0];
      setSelectedWeekRange({ start: startW, end: endW > todayStr ? todayStr : endW });
      setPeriod('select_week');
      setIsDatePickerModalOpen(false);
      return;
    }

    setSelectedDate(dateStr);
    setPeriod('specific_day');
    setIsDatePickerModalOpen(false);
  };

  const handleSelectMonth = (mIdx: number, yNum: number) => {
    const now = new Date();
    if (yNum > now.getFullYear() || (yNum === now.getFullYear() && mIdx > now.getMonth())) {
      toast.warning('Future months cannot be selected.', { title: 'Invalid Selection' });
      return;
    }
    setSelectedMonthYear({ year: yNum, month: mIdx });
    setPeriod('select_month');
    setIsDatePickerModalOpen(false);
  };

  const handleSaveRecord = async () => {
    if (!editingRecord) return;
    const isTargetAdmin = staffRoster.find((s) => s.id === editingRecord.userId)?.role === 'admin';
    const parsedBase = isTargetAdmin ? 0 : parseFloat(editingRecord.baseDailyPay);
    const parsedAddon = isTargetAdmin ? 0 : parseFloat(editingRecord.addonPay || '0');

    if (!isTargetAdmin && (isNaN(parsedBase) || parsedBase < 0)) {
      toast.error('Please enter a valid base daily shift rate', { title: 'Validation Error' });
      return;
    }
    if (!isTargetAdmin && (isNaN(parsedAddon) || parsedAddon < 0)) {
      toast.error('Please enter a valid OT / bonus amount', { title: 'Validation Error' });
      return;
    }

    try {
      await adminApi.adminUpsertAttendance({
        userId: editingRecord.userId,
        date: editingRecord.date,
        isPresent: editingRecord.isPresent,
        shiftStatus: editingRecord.shiftStatus,
        baseDailyPay: isTargetAdmin ? 0 : parsedBase,
        addonPay: isTargetAdmin ? 0 : parsedAddon,
        notes: editingRecord.notes.trim() || undefined,
      });

      toast.success(`Updated attendance for ${editingRecord.displayName}`, {
        title: 'Attendance Saved',
      });
      setEditingRecord(null);
      loadData();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update attendance record', { title: 'Error Saving' });
    }
  };

  const exportItems: AttendanceExportItem[] = useMemo(() => {
    return dateRange.isSingleDay
      ? filteredSingleDayList.map((item) => {
          const isAdmin = item.staff.role === 'admin';
          return {
            name: item.staff.display_name,
            username: item.staff.username,
            role: item.staff.job_title || item.staff.role,
            isPosUser: item.staff.is_workflow_staff,
            status:
              item.shiftStatus === 'CLOCKED_IN'
                ? isAdmin
                  ? 'Clocked In (Exempt)'
                  : 'Clocked In'
                : item.shiftStatus === 'COMPLETED'
                  ? isAdmin
                    ? 'Completed (Exempt)'
                    : 'Completed'
                  : 'Absent',
            clockIn: item.clockInAt ? new Date(item.clockInAt).toLocaleTimeString() : null,
            clockOut: item.clockOutAt ? new Date(item.clockOutAt).toLocaleTimeString() : null,
            hoursWorked: item.hoursWorked,
            basePay: isAdmin ? 0 : item.baseDailyPay,
            addonPay: isAdmin ? 0 : item.addonPay,
            totalPay: isAdmin ? 0 : item.totalDayPay,
            notes: item.notes,
          };
        })
      : multiDayAggregates.map((item) => {
          const isAdmin = item.staff.role === 'admin';
          return {
            name: item.staff.display_name,
            username: item.staff.username,
            role: item.staff.job_title || item.staff.role,
            isPosUser: item.staff.is_workflow_staff,
            status: isAdmin
              ? `${item.shiftsWorked} shifts (Exempt)`
              : `${item.shiftsWorked} shifts`,
            hoursWorked: item.hoursLogged,
            basePay: isAdmin ? 0 : item.basePaySum,
            addonPay: isAdmin ? 0 : item.bonusSum,
            totalPay: isAdmin ? 0 : item.totalPaySum,
          };
        });
  }, [dateRange.isSingleDay, filteredSingleDayList, multiDayAggregates]);

  const handleExportExcel = () => {
    try {
      exportAttendancePayrollToExcel({
        dateRangeLabel: dateRange.label,
        isSingleDay: dateRange.isSingleDay,
        items: exportItems,
        totals: periodTotals,
      });

      toast.success('Attendance report exported to Excel (.xls)', {
        title: 'Excel Export Ready',
      });
    } catch (err: any) {
      console.error('[AdminAttendancePayrollView] Excel export error:', err);
      toast.error('Failed to export report to Excel', { title: 'Export Error' });
    }
  };

  return {
    period,
    setPeriod,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    selectedDate,
    setSelectedDate,
    selectedWeekRange,
    selectedMonthYear,
    isDatePickerModalOpen,
    setIsDatePickerModalOpen,
    datePickerMode,
    setDatePickerMode,
    calendarYear,
    setCalendarYear,
    calendarMonth,
    setCalendarMonth,
    staffRoster,
    isLoading,
    editingRecord,
    setEditingRecord,
    isReportModalOpen,
    setIsReportModalOpen,
    todayStr,
    dateRange,
    loadData,
    filteredSingleDayList,
    multiDayAggregates,
    adminUserIds,
    periodTotals,
    handleStepDay,
    calendarDays,
    handleSelectDay,
    handleSelectMonth,
    handleSaveRecord,
    exportItems,
    handleExportExcel,
  };
}
