import { PeriodFilter, MONTH_NAMES } from './attendance.types';

export interface DateRangeResult {
  start: string;
  end: string;
  label: string;
  isSingleDay: boolean;
}

export function computeAttendanceDateRange(
  period: PeriodFilter,
  todayStr: string,
  selectedDate: string,
  selectedWeekRange: { start: string; end: string } | null,
  selectedMonthYear: { year: number; month: number }
): DateRangeResult {
  const [todayY, todayM, todayD] = todayStr.split('-').map(Number);
  const businessNow = new Date(todayY, todayM - 1, todayD);

  if (period === 'today') {
    return { start: todayStr, end: todayStr, label: `Today · ${todayStr}`, isSingleDay: true };
  }

  if (period === 'yesterday') {
    const y = new Date(businessNow);
    y.setDate(y.getDate() - 1);
    const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
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
    const day = businessNow.getDay();
    const dist = (day + 6) % 7;
    const startW = new Date(businessNow);
    startW.setDate(startW.getDate() - dist);
    const startStr = `${startW.getFullYear()}-${String(startW.getMonth() + 1).padStart(2, '0')}-${String(startW.getDate()).padStart(2, '0')}`;
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
    const startM = `${todayStr.slice(0, 7)}-01`;
    return {
      start: startM,
      end: todayStr,
      label: `${MONTH_NAMES[todayM - 1]} ${todayY}`,
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
}

export function calculateCalendarDays(
  calendarYear: number,
  calendarMonth: number
): (number | null)[] {
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(d);
  return days;
}
