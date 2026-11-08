import { useState, useMemo, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { adminApi, type SalesAnalyticsOverview } from '../../../data/admin.api';
import { exportFinancialOverviewToExcel } from '../../../utils/readingExcelExport';
import { toast } from '@/features/shared/toast/useToastStore';
import { printHtmlElement } from '@/features/shared';
import {
  type StationFilter,
  type ModeFilter,
  type TimeframePeriod,
  type TimeframeChipOption,
  type StationOption,
  TIMEFRAME_OPTIONS,
  STATION_OPTIONS,
} from './transactionsOverview.types';
import { calculateDateBounds, formatTimeframeDisplayLabel } from './transactionsDateUtils';

export function useTransactionsOverviewController(
  initialAnalytics: SalesAnalyticsOverview | null,
  onRefresh: () => void
) {
  const [subTab, setSubTab] = useState<'analytics' | 'trends' | 'checks' | 'cashless' | 'readings'>(
    'analytics'
  );
  const [selectedPeriod, setSelectedPeriod] = useState<TimeframePeriod>('daily');
  const [selectedStation, setSelectedStation] = useState<StationFilter>('ALL');
  const [selectedMode, setSelectedMode] = useState<ModeFilter>('ALL');
  const [isTimeframeModalOpen, setIsTimeframeModalOpen] = useState(false);
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false);

  const [datePickerMode, setDatePickerMode] = useState<'day' | 'week' | 'month'>('day');
  const [selectedMonthYear, setSelectedMonthYear] = useState<{ year: number; month: number }>(
    () => {
      const today = new Date();
      return { year: today.getFullYear(), month: today.getMonth() };
    }
  );

  const [selectedWeekRange, setSelectedWeekRange] = useState<{
    startStr: string;
    endStr: string;
  } | null>(null);

  const [specificDate, setSpecificDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());

  const [liveAnalytics, setLiveAnalytics] = useState<SalesAnalyticsOverview | null>(
    initialAnalytics
  );
  const [isFetchingAnalytics, setIsFetchingAnalytics] = useState(false);

  const dateBounds = useMemo(() => {
    return calculateDateBounds(selectedPeriod, specificDate, selectedWeekRange, selectedMonthYear);
  }, [selectedPeriod, specificDate, selectedWeekRange, selectedMonthYear]);

  const fetchAnalyticsData = useCallback(async () => {
    setIsFetchingAnalytics(true);
    try {
      const res = await adminApi.getSalesOverview({
        startDate: dateBounds.startDate,
        endDate: dateBounds.endDate,
        station: selectedStation,
        filterMode: selectedMode,
      });
      setLiveAnalytics(res);
    } catch (err: any) {
      console.error('[AdminTransactionsView] Error loading live sales overview:', err);
    } finally {
      setIsFetchingAnalytics(false);
    }
  }, [dateBounds.startDate, dateBounds.endDate, selectedStation, selectedMode]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const effectiveAnalytics = liveAnalytics || initialAnalytics;

  const channelEntries = useMemo(() => {
    const raw = Object.entries(effectiveAnalytics?.channelBreakdown || {});
    if (selectedStation === 'ALL') return raw;
    return raw.filter(([k]) => k.toUpperCase() === selectedStation);
  }, [effectiveAnalytics?.channelBreakdown, selectedStation]);

  const grossSales = Number(effectiveAnalytics?.grossSales || 0);
  const orderCount = Number(effectiveAnalytics?.orderCount || 0);
  const averageTicket = Number(effectiveAnalytics?.averageTicket || 0);
  const totalCogs = Number(effectiveAnalytics?.totalCogs || 0);
  const totalLaborExpense = Number(effectiveAnalytics?.totalLaborExpense || 0);
  const estimatedNetProfit = Number(effectiveAnalytics?.estimatedNetProfit || 0);
  const profitMargin = grossSales > 0 ? Math.round((estimatedNetProfit / grossSales) * 100) : 0;
  const cogsMargin = grossSales > 0 ? Math.round((totalCogs / grossSales) * 100) : 28;

  const activeTimeframeOption: TimeframeChipOption = useMemo(() => {
    return (
      TIMEFRAME_OPTIONS.find((opt: TimeframeChipOption) => opt.key === selectedPeriod) ||
      TIMEFRAME_OPTIONS[0]
    );
  }, [selectedPeriod]);

  const activeStationOption: StationOption = useMemo(() => {
    return (
      STATION_OPTIONS.find((opt: StationOption) => opt.key === selectedStation) ||
      STATION_OPTIONS[0]
    );
  }, [selectedStation]);

  const timeframeDisplayLabel: string = useMemo(() => {
    return formatTimeframeDisplayLabel(
      selectedPeriod,
      specificDate,
      selectedWeekRange,
      selectedMonthYear
    );
  }, [selectedPeriod, specificDate, selectedWeekRange, selectedMonthYear]);

  const handlePrintReport = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      printHtmlElement('monks-sales-report-printable', {
        title: `Sales & Transactions Report (${timeframeDisplayLabel}) - Monk's Dream POS`,
        pageSize: 'A4',
      });
    } else {
      toast.info('Printing is supported on desktop web browser.');
    }
  };

  const handleExportFinancialExcel = () => {
    if (!effectiveAnalytics) return;
    try {
      const filterLabel = `${timeframeDisplayLabel} · ${activeStationOption.label}`;
      exportFinancialOverviewToExcel(effectiveAnalytics, filterLabel);
      toast.success('Executive Financial Overview exported to Excel (.xls)', {
        title: 'Export Ready',
      });
    } catch (err: any) {
      console.error('[AdminTransactionsView] Excel export error:', err);
      toast.error('Failed to export financial overview', { title: 'Export Error' });
    }
  };

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [calendarYear, calendarMonth]);

  const monthNames = [
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

  const isCurrentOrFutureMonth = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return (
      calendarYear > currentYear || (calendarYear === currentYear && calendarMonth >= currentMonth)
    );
  }, [calendarYear, calendarMonth]);

  const isDayInSelectedWeek = (day: number) => {
    if (selectedPeriod !== 'select_week' || !selectedWeekRange) return false;
    const yyyy = calendarYear;
    const mm = String(calendarMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const startStr = selectedWeekRange.startStr.split('T')[0];
    const endStr = selectedWeekRange.endStr.split('T')[0];
    return dateStr >= startStr && dateStr <= endStr;
  };

  const handleSelectDay = (day: number) => {
    const yyyy = calendarYear;
    const mm = String(calendarMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (dateStr > todayStr) {
      toast.warning('Future days cannot be selected.', { title: 'Invalid Selection' });
      return;
    }

    if (datePickerMode === 'week') {
      const targetDate = new Date(yyyy, calendarMonth, day);
      const currentDay = targetDate.getDay();
      const distanceToMonday = (currentDay + 6) % 7;
      const startWeek = new Date(yyyy, calendarMonth, day - distanceToMonday, 0, 0, 0);
      const endWeek = new Date(yyyy, calendarMonth, day - distanceToMonday + 6, 23, 59, 59, 999);

      const cappedEndWeek =
        endWeek > now
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
          : endWeek;

      setSelectedWeekRange({
        startStr: startWeek.toISOString(),
        endStr: cappedEndWeek.toISOString(),
      });
      setSelectedPeriod('select_week');
      setIsDatePickerModalOpen(false);
      return;
    }

    setSpecificDate(dateStr);
    setSelectedPeriod('custom');
    setIsDatePickerModalOpen(false);
  };

  const handleSelectMonth = (monthIndex: number, yearNum: number) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (yearNum > currentYear || (yearNum === currentYear && monthIndex > currentMonth)) {
      toast.warning('Future months cannot be selected.', { title: 'Invalid Selection' });
      return;
    }

    setSelectedMonthYear({ year: yearNum, month: monthIndex });
    setSelectedPeriod('select_month');
    setIsDatePickerModalOpen(false);
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isCurrentOrFutureMonth) return;
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  return {
    subTab,
    setSubTab,
    selectedPeriod,
    setSelectedPeriod,
    selectedStation,
    setSelectedStation,
    selectedMode,
    setSelectedMode,
    isTimeframeModalOpen,
    setIsTimeframeModalOpen,
    isStationModalOpen,
    setIsStationModalOpen,
    isDatePickerModalOpen,
    setIsDatePickerModalOpen,
    datePickerMode,
    setDatePickerMode,
    selectedMonthYear,
    setSelectedMonthYear,
    selectedWeekRange,
    specificDate,
    calendarYear,
    setCalendarYear,
    calendarMonth,
    setCalendarMonth,
    liveAnalytics,
    isFetchingAnalytics,
    dateBounds,
    effectiveAnalytics,
    channelEntries,
    grossSales,
    orderCount,
    averageTicket,
    totalCogs,
    totalLaborExpense,
    estimatedNetProfit,
    profitMargin,
    cogsMargin,
    activeTimeframeOption,
    activeStationOption,
    timeframeDisplayLabel,
    handlePrintReport,
    handleExportFinancialExcel,
    calendarDays,
    monthNames,
    isCurrentOrFutureMonth,
    isDayInSelectedWeek,
    handleSelectDay,
    handleSelectMonth,
    handlePrevMonth,
    handleNextMonth,
    fetchAnalyticsData,
  };
}
