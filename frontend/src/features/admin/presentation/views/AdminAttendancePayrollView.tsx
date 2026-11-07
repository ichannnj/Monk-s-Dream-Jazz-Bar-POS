import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import {
  Clock,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  CheckCircle2,
  FileText,
  Edit3,
  Award,
  Printer,
  FileSpreadsheet,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { printHtmlElement, realtimeGateway, useWindowVisibilitySync } from '@/features/shared';
import {
  adminApi,
  PH_MINIMUM_WAGE_DAILY,
  type AttendanceRecordAdmin,
  type StaffMemberAdmin,
} from '../../data/admin.api';
import { AdminModal, AdminNumberInput, AdminInput } from '../components';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import {
  exportAttendancePayrollToExcel,
  type AttendanceExportItem,
} from '../../utils/readingExcelExport';
import { AttendanceReportModal } from './attendance/AttendanceReportModal';

interface AdminAttendancePayrollViewProps {
  onRefresh?: () => void;
  onNavigateToRoster?: () => void;
}

type PeriodFilter =
  | 'today'
  | 'yesterday'
  | 'specific_day'
  | 'this_week'
  | 'select_week'
  | 'this_month'
  | 'select_month'
  | 'all';

type ShiftStatusFilter =
  'all' | 'clocked_in' | 'completed' | 'absent' | 'pos_only' | 'support_only';

const MONTH_NAMES = [
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

export const AdminAttendancePayrollView: React.FC<AdminAttendancePayrollViewProps> = ({
  onRefresh,
  onNavigateToRoster,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [statusFilter, setStatusFilter] = useState<ShiftStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected date / week / month state
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedWeekRange, setSelectedWeekRange] = useState<{ start: string; end: string } | null>(
    null
  );
  const [selectedMonthYear, setSelectedMonthYear] = useState<{ year: number; month: number }>(
    () => {
      const d = new Date();
      return { year: d.getFullYear(), month: d.getMonth() };
    }
  );

  // Calendar Picker Modal State
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'day' | 'week' | 'month'>('day');
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());

  // Roster & Attendance data
  const [staffRoster, setStaffRoster] = useState<StaffMemberAdmin[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Edit / Manual Punch Modal State
  const [editingRecord, setEditingRecord] = useState<{
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
  } | null>(null);

  // Dedicated Printable Document Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute effective date range from current period filter
  const dateRange = useMemo(() => {
    const now = new Date();

    if (period === 'today') {
      return { start: todayStr, end: todayStr, label: `Today · ${todayStr}`, isSingleDay: true };
    }

    if (period === 'yesterday') {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      return { start: yStr, end: yStr, label: `Yesterday · ${yStr}`, isSingleDay: true };
    }

    if (period === 'specific_day') {
      return {
        start: selectedDate,
        end: selectedDate,
        label: selectedDate,
        isSingleDay: true,
      };
    }

    if (period === 'this_week') {
      const day = now.getDay();
      const dist = (day + 6) % 7;
      const startW = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dist);
      const startStr = startW.toISOString().split('T')[0];
      return {
        start: startStr,
        end: todayStr,
        label: `This Week (${startStr} – ${todayStr})`,
        isSingleDay: false,
      };
    }

    if (period === 'select_week' && selectedWeekRange) {
      return {
        start: selectedWeekRange.start,
        end: selectedWeekRange.end,
        label: `Week (${selectedWeekRange.start} – ${selectedWeekRange.end})`,
        isSingleDay: false,
      };
    }

    if (period === 'this_month') {
      const startM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return {
        start: startM,
        end: todayStr,
        label: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`,
        isSingleDay: false,
      };
    }

    if (period === 'select_month') {
      const mStart = `${selectedMonthYear.year}-${String(selectedMonthYear.month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(selectedMonthYear.year, selectedMonthYear.month + 1, 0).getDate();
      const mEnd = `${selectedMonthYear.year}-${String(selectedMonthYear.month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        start: mStart,
        end: mEnd,
        label: `${MONTH_NAMES[selectedMonthYear.month]} ${selectedMonthYear.year}`,
        isSingleDay: false,
      };
    }

    return {
      start: '2026-01-01',
      end: todayStr,
      label: 'All-Time History',
      isSingleDay: false,
    };
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

  // Auto-refresh when tab/screen is focused
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

  // Single-day unified view mapping: merges staff roster with attendance rows
  const singleDayStaffList = useMemo(() => {
    if (!dateRange.isSingleDay) return [];

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

        return {
          staff,
          rec,
          isPresent,
          shiftStatus,
          clockInAt: rec?.clock_in_at || null,
          clockOutAt: rec?.clock_out_at || null,
          hoursWorked: rec?.hours_worked || (shiftStatus === 'COMPLETED' ? 8.0 : 0.0),
          baseDailyPay,
          addonPay,
          totalDayPay,
          notes: rec?.notes || '',
        };
      });
  }, [dateRange.isSingleDay, staffRoster, attendanceRecords]);

  // Filter single day list
  const filteredSingleDayList = useMemo(() => {
    return singleDayStaffList.filter((item) => {
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
  }, [singleDayStaffList, statusFilter, searchQuery]);

  // Multi-day aggregation per staff member
  const multiDayAggregates = useMemo(() => {
    if (dateRange.isSingleDay) return [];

    const map = new Map<
      string,
      {
        staff: StaffMemberAdmin;
        shiftsWorked: number;
        hoursLogged: number;
        basePaySum: number;
        bonusSum: number;
        totalPaySum: number;
      }
    >();

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
  }, [dateRange.isSingleDay, staffRoster, attendanceRecords, statusFilter, searchQuery]);

  const adminUserIds = useMemo(() => {
    return new Set(staffRoster.filter((s) => s.role === 'admin').map((s) => s.id));
  }, [staffRoster]);

  // Period Totals (Strictly excludes Admin/Management roles from payroll expense sums)
  const periodTotals = useMemo(() => {
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

  // Quick Prev / Next Day Step
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

  // Calendar builder helper
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
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

  // Manual Punch / Edit Record Submit
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

  // Export Data Aggregation Helper
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

  // Open Printable Report Modal
  const handleOpenPrintModal = () => {
    setIsReportModalOpen(true);
  };

  // Excel (.xls) Export Trigger
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

  const periodOptions: PosDropdownOption<PeriodFilter>[] = [
    { value: 'today', label: 'Today (Live Shift)', icon: Clock },
    { value: 'yesterday', label: 'Yesterday', icon: Calendar },
    { value: 'specific_day', label: 'Pick Specific Day...', icon: Calendar },
    { value: 'this_week', label: 'This Week (WTD)', icon: Clock },
    { value: 'select_week', label: 'Pick Specific Week...', icon: Calendar },
    { value: 'this_month', label: 'This Month (MTD)', icon: Calendar },
    { value: 'select_month', label: 'Pick Specific Month...', icon: Calendar },
    { value: 'all', label: 'All-Time History', icon: FileText },
  ];

  const statusFilterOptions: PosDropdownOption<ShiftStatusFilter>[] = [
    { value: 'all', label: 'All Staff', icon: Users },
    { value: 'clocked_in', label: 'Clocked In', icon: CheckCircle2 },
    { value: 'completed', label: 'Completed Shift', icon: Clock },
    { value: 'absent', label: 'Absent / Unclocked', icon: Users },
    { value: 'pos_only', label: 'POS Users', icon: Users },
    { value: 'support_only', label: 'Support Staff', icon: Users },
  ];

  return (
    <ScrollView
      className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      {/* Sleek Top Header Bar */}
      <View className="mb-5 flex-col md:flex-row md:items-center justify-between gap-3">
        <View className="flex-row items-center gap-3">
          <Text className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
            Attendance &amp; Payroll
          </Text>
          <View className="rounded-full bg-rose-50 border border-rose-200/80 px-3 py-1">
            <Text className="text-base font-bold text-[#800020]">{dateRange.label}</Text>
          </View>
        </View>

        {/* Action Shortcuts & Export Trio */}
        <View className="flex-row flex-wrap items-center gap-2">
          {Platform.OS === 'web' && (
            <>
              {/* Print A4 Report Button */}
              <Pressable
                onPress={handleOpenPrintModal}
                className="min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50 shadow-xs"
                accessibilityLabel="Print Attendance & Payroll Report"
              >
                <Printer size={16} color="#44403c" />
                <Text className="ml-2 text-base font-bold text-stone-700">Print</Text>
              </Pressable>

              {/* Excel Spreadsheet Export Button */}
              <Pressable
                onPress={handleExportExcel}
                className="min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50/70 active:bg-emerald-100 shadow-xs"
                accessibilityLabel="Export Attendance to Excel Spreadsheet"
              >
                <FileSpreadsheet size={16} color="#047857" />
                <Text className="ml-2 text-base font-bold text-emerald-800">Excel</Text>
              </Pressable>

              <Pressable
                onPress={() => window.open('?mode=timeclock', '_blank')}
                className="min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50 shadow-xs"
                accessibilityLabel="Launch Timeclock Kiosk in new tab"
              >
                <ExternalLink size={16} color="#800020" />
                <Text className="ml-2 text-base font-bold text-[#800020]">Timeclock ↗</Text>
              </Pressable>
            </>
          )}

          {onNavigateToRoster && (
            <Pressable
              onPress={onNavigateToRoster}
              className="min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50 shadow-xs"
            >
              <Users size={16} color="#44403c" />
              <Text className="ml-2 text-base font-bold text-stone-700">Roster →</Text>
            </Pressable>
          )}

          <Pressable
            onPress={loadData}
            disabled={isLoading}
            className="min-h-[48px] px-4 flex-row items-center justify-center rounded-xl bg-[#800020] active:bg-[#6b001a] shadow-xs"
          >
            <Clock size={16} color="#ffffff" className={isLoading ? 'animate-spin' : ''} />
            <Text className="ml-2 text-base font-bold text-white">
              {isLoading ? 'Syncing...' : 'Refresh'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Date Stepper & Filter Controls */}
      <View className="mb-4 flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-2xl border border-stone-200/80 bg-white p-2.5 shadow-xs">
        {/* Period Selector with inline day stepper */}
        <View className="flex-row items-center gap-2 flex-wrap">
          <PosDropdown
            options={periodOptions}
            value={period}
            onChange={(val) => {
              setPeriod(val);
              if (val === 'specific_day') {
                setDatePickerMode('day');
                setIsDatePickerModalOpen(true);
              } else if (val === 'select_week') {
                setDatePickerMode('week');
                setIsDatePickerModalOpen(true);
              } else if (val === 'select_month') {
                setDatePickerMode('month');
                setIsDatePickerModalOpen(true);
              }
            }}
            prefixLabel="Period:"
            sheetTitle="Select Timeframe"
            className="w-full sm:w-56"
          />

          {dateRange.isSingleDay && (
            <View className="flex-row items-center gap-1">
              <Pressable
                onPress={() => handleStepDay(-1)}
                className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
                accessibilityLabel="Previous day"
              >
                <ChevronLeft size={20} color="#44403c" />
              </Pressable>

              <Pressable
                onPress={() => {
                  setDatePickerMode('day');
                  setIsDatePickerModalOpen(true);
                }}
                className="min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl bg-stone-50 border border-stone-200 active:bg-stone-100"
              >
                <Calendar size={16} color="#800020" />
                <Text className="ml-1.5 text-base font-bold text-stone-800">{dateRange.start}</Text>
              </Pressable>

              <Pressable
                onPress={() => handleStepDay(1)}
                disabled={dateRange.start >= todayStr}
                className={`min-h-[48px] min-w-[48px] items-center justify-center rounded-xl ${
                  dateRange.start >= todayStr
                    ? 'bg-stone-50 opacity-40 cursor-not-allowed'
                    : 'bg-stone-100 active:bg-stone-200'
                }`}
                accessibilityLabel="Next day"
              >
                <ChevronRight size={20} color="#44403c" />
              </Pressable>
            </View>
          )}
        </View>

        {/* Filter & Search */}
        <View className="flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <PosDropdown
            options={statusFilterOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            prefixLabel="Filter:"
            sheetTitle="Filter Records"
            className="w-full sm:w-44"
          />

          <View className="flex-1">
            <AdminInput
              placeholder="Search staff..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftElement={<Search size={18} color="#78716c" />}
            />
          </View>
        </View>
      </View>

      {/* PRINT TARGET CONTAINER */}
      <View
        nativeID="monks-attendance-payroll-print-area"
        {...({ id: 'monks-attendance-payroll-print-area' } as any)}
        className="space-y-4"
      >
        {/* Printable Formal Header (Visible only on print or document view) */}
        <View className="hidden print:block mb-4 p-4 border-b-2 border-stone-800">
          <Text className="text-xl font-black text-[#800020] uppercase tracking-wide">
            MONK'S DREAM JAZZ BAR &amp; BISTRO
          </Text>
          <Text className="text-lg font-bold text-stone-900 mt-0.5">
            ATTENDANCE &amp; SHIFT PAYROLL LEDGER
          </Text>
          <Text className="text-base text-stone-600 mt-1">
            Reporting Period: {dateRange.label} · Printed on {new Date().toLocaleString()}
          </Text>
        </View>

        {/* Clean 4-Metric Payroll Summary Strip */}
        <View className="flex-col sm:flex-row flex-wrap gap-2.5">
          <View className="flex-1 min-w-[170px] rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs justify-between">
            <Text className="text-base font-semibold text-stone-500">Staff Present</Text>
            <Text className="mt-1 text-2xl font-black text-stone-900">
              {periodTotals.presentCount}
              <Text className="text-base font-normal text-stone-500">
                {' '}
                ({periodTotals.clockedInCount} in · {periodTotals.completedCount} done)
              </Text>
            </Text>
          </View>

          <View className="flex-1 min-w-[170px] rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs justify-between">
            <Text className="text-base font-semibold text-stone-500">Base Wages</Text>
            <Text className="mt-1 text-2xl font-black text-stone-800">
              ₱{periodTotals.baseTotal.toFixed(2)}
            </Text>
          </View>

          <View className="flex-1 min-w-[170px] rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs justify-between">
            <Text className="text-base font-semibold text-emerald-800">OT / Bonuses</Text>
            <Text className="mt-1 text-2xl font-black text-emerald-700">
              +₱{periodTotals.bonusTotal.toFixed(2)}
            </Text>
          </View>

          <View className="flex-1 min-w-[170px] rounded-xl border border-[#800020]/20 bg-[#800020]/5 p-3.5 shadow-xs justify-between">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-[#800020]">Total Staff Payroll</Text>
              <Text className="text-xs text-[#800020]/70 font-semibold">Excludes Admin</Text>
            </View>
            <Text className="mt-1 text-2xl font-black text-[#800020]">
              ₱{periodTotals.grandTotal.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* VIEW MODE 1: SINGLE-DAY ROSTER LIST */}
        {dateRange.isSingleDay ? (
          <View className="rounded-2xl border border-stone-200/80 bg-white p-3 sm:p-5 shadow-xs">
            {filteredSingleDayList.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Users size={36} color="#a8a29e" />
                <Text className="mt-3 text-lg font-bold text-stone-700">No records found</Text>
                <Text className="mt-1 text-base text-stone-500 text-center">
                  Try adjusting your search or period filter.
                </Text>
              </View>
            ) : (
              <View className="space-y-2.5">
                {filteredSingleDayList.map((item) => {
                  const isClockedIn = item.shiftStatus === 'CLOCKED_IN';
                  const isCompleted = item.shiftStatus === 'COMPLETED';
                  const roleDisplay = item.staff.is_workflow_staff
                    ? item.staff.job_title || item.staff.role
                    : item.staff.job_title || 'Support Staff';

                  // 2-Letter Initials
                  const initials =
                    (item.staff.display_name || '')
                      .split(' ')
                      .filter(Boolean)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'ST';

                  const inTimeFormatted = item.clockInAt
                    ? new Date(item.clockInAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : null;

                  const outTimeFormatted = item.clockOutAt
                    ? new Date(item.clockOutAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : null;

                  return (
                    <View
                      key={item.staff.id}
                      className={`flex-col md:flex-row md:items-center justify-between rounded-xl border p-3.5 sm:p-4 gap-3 ${
                        isClockedIn
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : isCompleted
                            ? 'border-sky-200 bg-sky-50/20'
                            : 'border-stone-200 bg-white'
                      }`}
                    >
                      {/* Left: Staff Identity & Role */}
                      <View className="flex-row items-center space-x-3 flex-1 min-w-[200px]">
                        <View
                          className={`min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border ${
                            isClockedIn
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                              : isCompleted
                                ? 'bg-sky-100 border-sky-300 text-sky-800'
                                : 'bg-stone-100 border-stone-200 text-stone-600'
                          }`}
                        >
                          <Text className="text-base font-black">{initials}</Text>
                        </View>

                        <View className="ml-3 flex-1 min-w-0">
                          <View className="flex-row flex-wrap items-center gap-2">
                            <Text className="text-lg font-extrabold text-stone-900 truncate">
                              {item.staff.display_name}
                            </Text>
                            <View className="rounded-full bg-stone-100 px-2.5 py-0.5 border border-stone-200">
                              <Text className="text-base font-bold text-stone-700 capitalize">
                                {roleDisplay}
                              </Text>
                            </View>
                          </View>

                          {/* Punch & Shift Status Line */}
                          <View className="mt-1 flex-row items-center flex-wrap gap-2">
                            {isClockedIn && (
                              <View className="flex-row items-center">
                                <View className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />
                                <Text className="text-base font-bold text-emerald-800">
                                  In since {inTimeFormatted} ({item.hoursWorked}h)
                                </Text>
                              </View>
                            )}

                            {isCompleted && (
                              <View className="flex-row items-center">
                                <View className="h-2 w-2 rounded-full bg-sky-500 mr-1.5" />
                                <Text className="text-base font-bold text-sky-800">
                                  Completed: {inTimeFormatted} – {outTimeFormatted} (
                                  {item.hoursWorked}h)
                                </Text>
                              </View>
                            )}

                            {!item.isPresent && (
                              <Text className="text-base text-stone-400 font-medium">
                                Not clocked in
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Right: Shift Pay & Actions */}
                      <View className="flex-row items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t border-stone-100 md:border-t-0">
                        <View className="items-start md:items-end mr-1">
                          {item.staff.role === 'admin' ? (
                            <View className="rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5">
                              <Text className="text-xs font-bold text-stone-600">
                                Payroll Exempt
                              </Text>
                            </View>
                          ) : (
                            <>
                              <Text className="text-lg font-black text-stone-900">
                                ₱{item.totalDayPay.toFixed(2)}
                              </Text>
                              {item.addonPay > 0 && (
                                <Text className="text-base font-bold text-emerald-700">
                                  +₱{item.addonPay.toFixed(2)} OT
                                </Text>
                              )}
                            </>
                          )}
                        </View>

                        {/* Interactive Buttons - Print will hide these via .no-print */}
                        <View className="flex-row items-center gap-2 no-print">
                          {/* 1-Click Quick Punch Override */}
                          {!item.isPresent ? (
                            <Pressable
                              onPress={async () => {
                                try {
                                  await adminApi.adminUpsertAttendance({
                                    userId: item.staff.id,
                                    date: dateRange.start,
                                    isPresent: true,
                                    shiftStatus: 'CLOCKED_IN',
                                    baseDailyPay: item.baseDailyPay,
                                    addonPay: item.addonPay,
                                  });
                                  toast.success(`Clocked in ${item.staff.display_name}`);
                                  loadData();
                                } catch (err: any) {
                                  toast.error(err?.message || 'Clock-in failed');
                                }
                              }}
                              className="min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 active:bg-emerald-100"
                            >
                              <CheckCircle2 size={16} color="#047857" />
                              <Text className="ml-1.5 text-base font-bold text-emerald-800">
                                Clock In
                              </Text>
                            </Pressable>
                          ) : isClockedIn ? (
                            <Pressable
                              onPress={async () => {
                                try {
                                  await adminApi.adminUpsertAttendance({
                                    userId: item.staff.id,
                                    date: dateRange.start,
                                    isPresent: true,
                                    shiftStatus: 'COMPLETED',
                                    baseDailyPay: item.baseDailyPay,
                                    addonPay: item.addonPay,
                                  });
                                  toast.success(`Completed shift for ${item.staff.display_name}`);
                                  loadData();
                                } catch (err: any) {
                                  toast.error(err?.message || 'Clock-out failed');
                                }
                              }}
                              className="min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl bg-sky-50 border border-sky-200 active:bg-sky-100"
                            >
                              <Clock size={16} color="#0369a1" />
                              <Text className="ml-1.5 text-base font-bold text-sky-800">
                                Clock Out
                              </Text>
                            </Pressable>
                          ) : null}

                          {/* Adjust / OT Dialog */}
                          <Pressable
                            onPress={() => {
                              setEditingRecord({
                                userId: item.staff.id,
                                displayName: item.staff.display_name,
                                roleOrTitle: item.staff.job_title || item.staff.role,
                                isPosUser: item.staff.is_workflow_staff,
                                date: dateRange.start,
                                isPresent: item.isPresent,
                                shiftStatus: item.shiftStatus,
                                baseDailyPay: String(item.baseDailyPay.toFixed(2)),
                                addonPay: String(item.addonPay.toFixed(2)),
                                notes: item.notes,
                              });
                            }}
                            className="min-h-[48px] px-3.5 flex-row items-center justify-center rounded-xl border border-stone-200 bg-stone-50 active:bg-stone-100"
                          >
                            <Edit3 size={16} color="#44403c" />
                            <Text className="ml-1.5 text-base font-bold text-stone-700">
                              Adjust
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          /* VIEW MODE 2: MULTI-DAY SUMMARY TABLE */
          <View className="rounded-2xl border border-stone-200/80 bg-white p-3 sm:p-5 shadow-xs">
            {multiDayAggregates.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <FileText size={36} color="#a8a29e" />
                <Text className="mt-3 text-lg font-bold text-stone-700">
                  No shift records found
                </Text>
                <Text className="mt-1 text-base text-stone-500 text-center">
                  No attendance punches logged within this period range.
                </Text>
              </View>
            ) : (
              <View className="space-y-2.5">
                {multiDayAggregates.map((item) => {
                  const initials =
                    (item.staff.display_name || '')
                      .split(' ')
                      .filter(Boolean)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'ST';

                  return (
                    <View
                      key={item.staff.id}
                      className="flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 py-3 gap-3"
                    >
                      <View className="flex-row items-center space-x-3">
                        <View className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-stone-100 border border-stone-200">
                          <Text className="text-base font-black text-stone-700">{initials}</Text>
                        </View>
                        <View className="ml-3">
                          <Text className="text-lg font-extrabold text-stone-900">
                            {item.staff.display_name}
                          </Text>
                          <Text className="text-base text-stone-500">
                            {item.staff.job_title || item.staff.role}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center justify-between sm:justify-end gap-5 flex-wrap">
                        <View className="items-start sm:items-end">
                          <Text className="text-base font-bold text-stone-800">
                            {item.shiftsWorked} shifts ({item.hoursLogged.toFixed(1)}h)
                          </Text>
                        </View>

                        {item.staff.role === 'admin' ? (
                          <View className="items-start sm:items-end min-w-[90px]">
                            <View className="rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5">
                              <Text className="text-xs font-bold text-stone-600">
                                Payroll Exempt
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <>
                            <View className="items-start sm:items-end">
                              <Text className="text-base font-semibold text-stone-700">
                                Base: ₱{item.basePaySum.toFixed(2)}
                                {item.bonusSum > 0 ? ` · +₱${item.bonusSum.toFixed(2)} OT` : ''}
                              </Text>
                            </View>

                            <View className="items-start sm:items-end min-w-[90px]">
                              <Text className="text-xl font-black text-[#800020]">
                                ₱{item.totalPaySum.toFixed(2)}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>

      {/* MODAL 1: CALENDAR PICKER */}
      <AdminModal
        visible={isDatePickerModalOpen}
        onClose={() => setIsDatePickerModalOpen(false)}
        title="Select Attendance Date"
        subtitle="Choose any business date to inspect shifts and payroll"
        icon={<Calendar size={22} color="#800020" />}
        size="md"
      >
        <View className="p-1">
          {/* Picker Mode Switcher */}
          <View className="flex-row rounded-xl bg-stone-100 p-1 mb-4">
            {(['day', 'week', 'month'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setDatePickerMode(m)}
                className={`flex-1 min-h-[48px] items-center justify-center rounded-lg ${
                  datePickerMode === m ? 'bg-white shadow-xs' : 'active:bg-stone-200'
                }`}
              >
                <Text
                  className={`text-base font-bold capitalize ${
                    datePickerMode === m ? 'text-[#800020]' : 'text-stone-600'
                  }`}
                >
                  {m}
                </Text>
              </Pressable>
            ))}
          </View>

          {datePickerMode === 'month' ? (
            <View>
              <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-stone-200">
                <Pressable
                  onPress={() => setCalendarYear((y) => y - 1)}
                  className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
                >
                  <ChevronLeft size={20} color="#44403c" />
                </Pressable>
                <Text className="text-xl font-black text-stone-900">{calendarYear}</Text>
                <Pressable
                  onPress={() => {
                    if (calendarYear < new Date().getFullYear()) setCalendarYear((y) => y + 1);
                  }}
                  disabled={calendarYear >= new Date().getFullYear()}
                  className={`min-h-[48px] min-w-[48px] items-center justify-center rounded-xl ${
                    calendarYear >= new Date().getFullYear()
                      ? 'bg-stone-50 opacity-40 cursor-not-allowed'
                      : 'bg-stone-100 active:bg-stone-200'
                  }`}
                >
                  <ChevronRight size={20} color="#44403c" />
                </Pressable>
              </View>

              <View className="flex-row flex-wrap justify-between gap-y-2.5">
                {MONTH_NAMES.map((mName, mIdx) => {
                  const now = new Date();
                  const isFuture =
                    calendarYear > now.getFullYear() ||
                    (calendarYear === now.getFullYear() && mIdx > now.getMonth());
                  return (
                    <Pressable
                      key={mName}
                      disabled={isFuture}
                      onPress={() => !isFuture && handleSelectMonth(mIdx, calendarYear)}
                      className={`w-[31%] min-h-[48px] items-center justify-center rounded-xl ${
                        isFuture
                          ? 'opacity-25 bg-stone-50 cursor-not-allowed'
                          : 'bg-stone-100 active:bg-stone-200'
                      }`}
                    >
                      <Text
                        className={`text-base font-bold ${isFuture ? 'text-stone-400' : 'text-stone-800'}`}
                      >
                        {mName.slice(0, 3)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <View>
              <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-stone-200">
                <Pressable
                  onPress={() => {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear((y) => y - 1);
                    } else {
                      setCalendarMonth((m) => m - 1);
                    }
                  }}
                  className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
                >
                  <ChevronLeft size={20} color="#44403c" />
                </Pressable>

                <Text className="text-xl font-black text-stone-900">
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </Text>

                <Pressable
                  onPress={() => {
                    const now = new Date();
                    if (calendarYear === now.getFullYear() && calendarMonth >= now.getMonth()) {
                      return;
                    }
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear((y) => y + 1);
                    } else {
                      setCalendarMonth((m) => m + 1);
                    }
                  }}
                  disabled={
                    calendarYear === new Date().getFullYear() &&
                    calendarMonth >= new Date().getMonth()
                  }
                  className={`min-h-[48px] min-w-[48px] items-center justify-center rounded-xl ${
                    calendarYear === new Date().getFullYear() &&
                    calendarMonth >= new Date().getMonth()
                      ? 'bg-stone-50 opacity-40 cursor-not-allowed'
                      : 'bg-stone-100 active:bg-stone-200'
                  }`}
                >
                  <ChevronRight size={20} color="#44403c" />
                </Pressable>
              </View>

              <View className="flex-row justify-between mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <View key={d} className="w-[14%] items-center">
                    <Text className="text-base font-bold text-stone-400">{d}</Text>
                  </View>
                ))}
              </View>

              <View className="flex-row flex-wrap">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <View key={`empty-${idx}`} className="w-[14%] min-h-[48px]" />;
                  }

                  const formattedDay = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = formattedDay === todayStr;
                  const isFuture = formattedDay > todayStr;
                  const isSelected = selectedDate === formattedDay && period === 'specific_day';

                  return (
                    <Pressable
                      key={`day-${day}`}
                      disabled={isFuture}
                      onPress={() => !isFuture && handleSelectDay(day)}
                      className={`w-[14%] min-h-[48px] items-center justify-center rounded-xl ${
                        isFuture
                          ? 'opacity-25 bg-stone-50 cursor-not-allowed'
                          : isSelected
                            ? 'bg-[#800020]'
                            : isToday
                              ? 'border border-[#800020] bg-rose-50/40'
                              : 'active:bg-stone-100'
                      }`}
                    >
                      <Text
                        className={`text-base font-bold ${
                          isFuture
                            ? 'text-stone-400'
                            : isSelected
                              ? 'text-white'
                              : isToday
                                ? 'text-[#800020]'
                                : 'text-stone-800'
                        }`}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View className="mt-5 pt-3 border-t border-stone-100 flex-row items-center justify-between">
            <Pressable
              onPress={() => {
                setSelectedDate(todayStr);
                setPeriod('today');
                setIsDatePickerModalOpen(false);
              }}
              className="min-h-[48px] px-5 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
            >
              <Text className="text-base font-bold text-stone-700">Today</Text>
            </Pressable>

            <Pressable
              onPress={() => setIsDatePickerModalOpen(false)}
              className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#800020] active:bg-[#6b001a]"
            >
              <Text className="text-base font-bold text-white">Done</Text>
            </Pressable>
          </View>
        </View>
      </AdminModal>

      {/* MODAL 2: ADJUST ATTENDANCE, BASE PAY & OT BONUS */}
      <AdminModal
        visible={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        title={`Adjust Pay: ${editingRecord?.displayName || ''}`}
        subtitle={`Role: ${editingRecord?.roleOrTitle || ''} · Date: ${editingRecord?.date || ''}`}
        icon={<Award size={22} color="#800020" />}
        size="md"
        footer={
          <>
            <Pressable
              onPress={() => setEditingRecord(null)}
              className="min-h-[48px] px-5 items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
            >
              <Text className="text-base font-semibold text-stone-700">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSaveRecord}
              className="min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#800020] active:opacity-90"
            >
              <Text className="text-base font-bold text-white">Save</Text>
            </Pressable>
          </>
        }
      >
        {editingRecord && (
          <View className="space-y-4">
            {/* Shift Status Selector */}
            <View>
              <Text className="mb-2 text-base font-bold text-stone-700">Shift Status</Text>
              <View className="flex-row rounded-xl bg-stone-100 p-1">
                {(
                  [
                    { key: 'CLOCKED_IN', label: 'Clocked In', present: true },
                    { key: 'COMPLETED', label: 'Completed', present: true },
                    { key: 'ABSENT', label: 'Absent', present: false },
                  ] as const
                ).map((opt) => {
                  const isSel = editingRecord.shiftStatus === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() =>
                        setEditingRecord((prev) =>
                          prev
                            ? {
                                ...prev,
                                shiftStatus: opt.key,
                                isPresent: opt.present,
                              }
                            : null
                        )
                      }
                      className={`flex-1 min-h-[48px] items-center justify-center rounded-lg ${
                        isSel ? 'bg-white shadow-xs' : 'active:bg-stone-200'
                      }`}
                    >
                      <Text
                        className={`text-base font-bold ${
                          isSel ? 'text-[#800020]' : 'text-stone-600'
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {editingRecord.isPresent && (
              <>
                {staffRoster.find((s) => s.id === editingRecord.userId)?.role === 'admin' ? (
                  <View className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                    <Text className="text-base font-bold text-stone-800">
                      Management Role · Payroll Exempt
                    </Text>
                    <Text className="text-sm text-stone-500 mt-1">
                      Administrator shifts are tracked for operational attendance without incurring
                      daily shift payroll costs (₱0.00).
                    </Text>
                  </View>
                ) : (
                  <>
                    <AdminNumberInput
                      label="Base Daily Shift Pay"
                      mode="currency"
                      value={editingRecord.baseDailyPay}
                      onChangeText={(val) =>
                        setEditingRecord((prev) => (prev ? { ...prev, baseDailyPay: val } : null))
                      }
                      placeholder="645.00"
                      helperText="Fixed daily shift rate (₱645.00 baseline)"
                    />

                    <AdminNumberInput
                      label="OT / Shift Bonus"
                      mode="currency"
                      value={editingRecord.addonPay}
                      onChangeText={(val) =>
                        setEditingRecord((prev) => (prev ? { ...prev, addonPay: val } : null))
                      }
                      placeholder="0.00"
                      helperText="Optional overtime or performance bonus"
                    />
                  </>
                )}

                <AdminInput
                  label="Notes (Optional)"
                  placeholder="e.g. 2 hrs overtime for rush"
                  value={editingRecord.notes}
                  onChangeText={(val) =>
                    setEditingRecord((prev) => (prev ? { ...prev, notes: val } : null))
                  }
                />

                <View className="flex-row items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                  <Text className="text-base font-bold text-stone-600">Total Shift Pay</Text>
                  <Text className="text-xl font-black text-stone-900">
                    {staffRoster.find((s) => s.id === editingRecord.userId)?.role === 'admin'
                      ? 'Exempt (₱0.00)'
                      : `₱${(
                          (parseFloat(editingRecord.baseDailyPay) || 0) +
                          (parseFloat(editingRecord.addonPay) || 0)
                        ).toFixed(2)}`}
                  </Text>
                </View>
              </>
            )}

            {!editingRecord.isPresent && (
              <View className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <Text className="text-base font-bold text-stone-700">Staff Marked Absent</Text>
                <Text className="text-base text-stone-500 mt-1">
                  ₱0.00 wage expense incurred for this shift.
                </Text>
              </View>
            )}
          </View>
        )}
      </AdminModal>

      {/* Dedicated Printable Attendance & Payroll Report Modal */}
      <AttendanceReportModal
        visible={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        dateRangeLabel={dateRange.label}
        isSingleDay={dateRange.isSingleDay}
        items={exportItems}
        totals={periodTotals}
      />
    </ScrollView>
  );
};
