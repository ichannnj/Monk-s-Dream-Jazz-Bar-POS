import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Platform, ActivityIndicator } from 'react-native';
import {
  BarChart3,
  Receipt,
  FileText,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  ReceiptText,
  Coffee,
  Wine,
  Bike,
  Sparkles,
  PieChart,
  Percent,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react-native';
import { ChecksHistoryView } from '@/features/check-history/presentation/ChecksHistoryView';
import { AdminReadingsView } from './readings/AdminReadingsView';
import { AdminModal } from '../components/AdminModal';
import { HourlySalesVelocityChart } from './analytics/HourlySalesVelocityChart';
import { PaymentTenderMixBar } from './analytics/PaymentTenderMixBar';
import { adminApi, type SalesAnalyticsOverview } from '../../data/admin.api';
import { exportFinancialOverviewToExcel } from '../../utils/readingExcelExport';
import { toast } from '@/features/shared/toast/useToastStore';

interface AdminTransactionsViewProps {
  analytics: SalesAnalyticsOverview | null;
  onRefresh: () => void;
}

type StationFilter = 'ALL' | 'CAFE_AREA' | 'BAR_AREA' | 'TAKEOUT_COUNTER' | 'GRAB_FOOD';

type TimeframePeriod =
  | 'daily'
  | 'yesterday'
  | 'weekly'
  | 'select_week'
  | 'monthly'
  | 'select_month'
  | 'yearly'
  | 'custom';

interface TimeframeChipOption {
  key: TimeframePeriod;
  label: string;
  description: string;
}

const TIMEFRAME_OPTIONS: TimeframeChipOption[] = [
  { key: 'daily', label: 'Today (Daily)', description: 'Today’s live sales and shift metrics' },
  { key: 'yesterday', label: 'Yesterday', description: 'Full previous business day performance' },
  { key: 'weekly', label: 'This Week (WTD)', description: 'Current week-to-date starting Monday' },
  {
    key: 'select_week',
    label: 'Select Specific Week...',
    description: 'Pick any historical week by selecting a day or week in calendar',
  },
  {
    key: 'monthly',
    label: 'This Month (MTD)',
    description: 'Current month-to-date operational aggregate',
  },
  {
    key: 'select_month',
    label: 'Select Specific Month...',
    description: 'Pick any past month and year from the interactive selector',
  },
  { key: 'yearly', label: 'Yearly (YTD)', description: 'Full calendar year fiscal performance' },
  {
    key: 'custom',
    label: 'Select Specific Day...',
    description: 'Select an exact historical day from the calendar',
  },
];

interface StationOption {
  key: StationFilter;
  label: string;
  description: string;
}

const STATION_OPTIONS: StationOption[] = [
  {
    key: 'ALL',
    label: 'All Stations',
    description: 'Consolidated venue performance across all stations',
  },
  {
    key: 'CAFE_AREA',
    label: 'Cafe Area',
    description: 'Artisan espresso bar & handcrafted beverages',
  },
  {
    key: 'BAR_AREA',
    label: 'Bar Area',
    description: 'Cocktails, draft beer, fine wines & spirits',
  },
  {
    key: 'TAKEOUT_COUNTER',
    label: 'Takeout Counter',
    description: 'Direct customer walk-in counter intake',
  },
  {
    key: 'GRAB_FOOD',
    label: 'GrabFood Delivery',
    description: 'Online delivery marketplace fulfillment',
  },
];

export const AdminTransactionsView: React.FC<AdminTransactionsViewProps> = ({
  analytics: initialAnalytics,
  onRefresh,
}) => {
  const [subTab, setSubTab] = useState<'analytics' | 'checks' | 'readings'>('analytics');
  const [selectedPeriod, setSelectedPeriod] = useState<TimeframePeriod>('daily');
  const [selectedStation, setSelectedStation] = useState<StationFilter>('ALL');
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
    return today.toISOString().split('T')[0]; // "YYYY-MM-DD"
  });

  // Calendar state for specific day picker
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth()); // 0-indexed

  // Live analytics state driven by filters
  const [liveAnalytics, setLiveAnalytics] = useState<SalesAnalyticsOverview | null>(
    initialAnalytics
  );
  const [isFetchingAnalytics, setIsFetchingAnalytics] = useState(false);

  // Date boundary calculation based on selected timeframe
  const dateBounds = useMemo(() => {
    const now = new Date();
    if (selectedPeriod === 'daily') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (selectedPeriod === 'yesterday') {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      const endYesterday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
        23,
        59,
        59,
        999
      );
      return { startDate: yesterday.toISOString(), endDate: endYesterday.toISOString() };
    }
    if (selectedPeriod === 'weekly') {
      const currentDay = now.getDay();
      const distanceToMonday = (currentDay + 6) % 7;
      const startWeek = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - distanceToMonday,
        0,
        0,
        0
      );
      // End at end of today (never query future days of this week)
      const endWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: startWeek.toISOString(), endDate: endWeek.toISOString() };
    }
    if (selectedPeriod === 'select_week') {
      if (!selectedWeekRange) return {};
      return {
        startDate: selectedWeekRange.startStr,
        endDate: selectedWeekRange.endStr,
      };
    }
    if (selectedPeriod === 'monthly') {
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      // Capped at end of today
      const endMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: startMonth.toISOString(), endDate: endMonth.toISOString() };
    }
    if (selectedPeriod === 'select_month') {
      const { year, month } = selectedMonthYear;
      const startMonth = new Date(year, month, 1, 0, 0, 0);
      // If selected month is current month, cap at end of today
      const isCurrentMonthYear = year === now.getFullYear() && month === now.getMonth();
      const endMonth = isCurrentMonthYear
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        : new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { startDate: startMonth.toISOString(), endDate: endMonth.toISOString() };
    }
    if (selectedPeriod === 'yearly') {
      const startYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      const endYear = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: startYear.toISOString(), endDate: endYear.toISOString() };
    }
    if (selectedPeriod === 'custom') {
      if (!specificDate) return {};
      const [y, m, d] = specificDate.split('-').map(Number);
      const startCustom = new Date(y, m - 1, d, 0, 0, 0);
      const endCustom = new Date(y, m - 1, d, 23, 59, 59, 999);
      return { startDate: startCustom.toISOString(), endDate: endCustom.toISOString() };
    }
    return {};
  }, [selectedPeriod, specificDate, selectedWeekRange, selectedMonthYear]);

  // Fetch real database analytics whenever timeframe or station changes
  const fetchAnalyticsData = useCallback(async () => {
    setIsFetchingAnalytics(true);
    try {
      const res = await adminApi.getSalesOverview({
        startDate: dateBounds.startDate,
        endDate: dateBounds.endDate,
        station: selectedStation,
      });
      setLiveAnalytics(res);
    } catch (err) {
      console.error('[AdminTransactionsView] Error loading live sales overview:', err);
    } finally {
      setIsFetchingAnalytics(false);
    }
  }, [dateBounds.startDate, dateBounds.endDate, selectedStation]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const effectiveAnalytics = liveAnalytics || initialAnalytics;

  // Channel helper for styling and iconography
  const getChannelMeta = (channelKey: string) => {
    const normalized = channelKey.toLowerCase();
    if (normalized.includes('cafe')) {
      return {
        label: 'Cafe Area',
        subtext: 'Espresso & Handcrafted Beverages',
        icon: <Coffee size={20} color="#b45309" />,
        badgeBg: 'bg-amber-100/80',
        badgeBorder: 'border-amber-200',
        progressBg: 'bg-amber-600',
        textColor: 'text-amber-900',
      };
    }
    if (normalized.includes('bar')) {
      return {
        label: 'Bar Area',
        subtext: 'Cocktails, Craft Beer & Fine Spirits',
        icon: <Wine size={20} color="#800020" />,
        badgeBg: 'bg-rose-100/80',
        badgeBorder: 'border-rose-200',
        progressBg: 'bg-[#800020]',
        textColor: 'text-rose-950',
      };
    }
    if (normalized.includes('grab')) {
      return {
        label: 'GrabFood Delivery',
        subtext: 'Online Marketplace Dispatch',
        icon: <Bike size={20} color="#047857" />,
        badgeBg: 'bg-emerald-100/80',
        badgeBorder: 'border-emerald-200',
        progressBg: 'bg-emerald-600',
        textColor: 'text-emerald-950',
      };
    }
    return {
      label: channelKey.replace(/_/g, ' '),
      subtext: 'Direct Counter & Quick Pickups',
      icon: <ShoppingBag size={20} color="#4338ca" />,
      badgeBg: 'bg-indigo-100/80',
      badgeBorder: 'border-indigo-200',
      progressBg: 'bg-indigo-600',
      textColor: 'text-indigo-950',
    };
  };

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

  const activeTimeframeOption = useMemo(() => {
    return TIMEFRAME_OPTIONS.find((opt) => opt.key === selectedPeriod) || TIMEFRAME_OPTIONS[0];
  }, [selectedPeriod]);

  const activeStationOption = useMemo(() => {
    return STATION_OPTIONS.find((opt) => opt.key === selectedStation) || STATION_OPTIONS[0];
  }, [selectedStation]);

  const timeframeDisplayLabel = useMemo(() => {
    switch (selectedPeriod) {
      case 'daily':
        return 'Today (Daily)';
      case 'yesterday':
        return 'Yesterday';
      case 'weekly':
        return 'This Week (WTD)';
      case 'select_week': {
        if (!selectedWeekRange) return 'Selected Week';
        const s = new Date(selectedWeekRange.startStr);
        const e = new Date(selectedWeekRange.endStr);
        const sFmt = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const eFmt = e.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return `Week: ${sFmt} – ${eFmt}`;
      }
      case 'monthly':
        return 'This Month (MTD)';
      case 'select_month': {
        const d = new Date(selectedMonthYear.year, selectedMonthYear.month, 1);
        return `Month: ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      }
      case 'yearly':
        return `Year ${new Date().getFullYear()} (YTD)`;
      case 'custom': {
        if (!specificDate) return 'Specific Day';
        const d = new Date(specificDate + 'T00:00:00');
        return isNaN(d.getTime())
          ? specificDate
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
  }, [selectedPeriod, specificDate, selectedWeekRange, selectedMonthYear]);

  const handlePrintReport = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printStyleId = 'monks-pos-sales-report-print-styles';
      let styleEl = document.getElementById(printStyleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = printStyleId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #monks-sales-report-printable, #monks-sales-report-printable * {
            visibility: visible !important;
          }
          #monks-sales-report-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-hidden {
            display: none !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `;
      window.print();
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

  // Calendar builder helper
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 is Sunday
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

  // Helper to determine if a calendar date belongs to the currently selected week
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

    // Disallow future day selection
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (dateStr > todayStr) {
      toast.warning('Future days cannot be selected.', { title: 'Invalid Selection' });
      return;
    }

    if (datePickerMode === 'week') {
      // Calculate Monday - Sunday for the selected day's week
      const targetDate = new Date(yyyy, calendarMonth, day);
      const currentDay = targetDate.getDay();
      const distanceToMonday = (currentDay + 6) % 7;
      const startWeek = new Date(yyyy, calendarMonth, day - distanceToMonday, 0, 0, 0);
      const endWeek = new Date(yyyy, calendarMonth, day - distanceToMonday + 6, 23, 59, 59, 999);

      // Never query beyond end of today if week ends in the future
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

    // Default 'day' mode
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

  return (
    <View className="flex-1 bg-[#fcf9f9]">
      {/* Sleek, Space-Efficient Sub-navigation Tabs */}
      <View className="border-b border-stone-200/80 bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          className="flex-row"
        >
          <View className="flex-row items-center px-4 sm:px-8">
            <Pressable
              onPress={() => setSubTab('analytics')}
              className={`min-h-[48px] flex-row items-center justify-center px-3 sm:px-5 border-b-2 transition-all ${
                subTab === 'analytics'
                  ? 'border-[#800020] bg-[#800020]/5'
                  : 'border-transparent active:bg-stone-50'
              }`}
            >
              <BarChart3 size={18} color={subTab === 'analytics' ? '#800020' : '#78716c'} />
              <Text
                className={`ml-2 text-base whitespace-nowrap ${
                  subTab === 'analytics' ? 'font-bold text-[#800020]' : 'font-medium text-stone-600'
                }`}
              >
                Financial Overview
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSubTab('checks')}
              className={`min-h-[48px] flex-row items-center justify-center px-3 sm:px-5 border-b-2 transition-all ${
                subTab === 'checks'
                  ? 'border-[#800020] bg-[#800020]/5'
                  : 'border-transparent active:bg-stone-50'
              }`}
            >
              <Receipt size={18} color={subTab === 'checks' ? '#800020' : '#78716c'} />
              <Text
                className={`ml-2 text-base whitespace-nowrap ${
                  subTab === 'checks' ? 'font-bold text-[#800020]' : 'font-medium text-stone-600'
                }`}
              >
                Checks &amp; Reprints
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSubTab('readings')}
              className={`min-h-[48px] flex-row items-center justify-center px-3 sm:px-5 border-b-2 transition-all ${
                subTab === 'readings'
                  ? 'border-[#800020] bg-[#800020]/5'
                  : 'border-transparent active:bg-stone-50'
              }`}
            >
              <FileText size={18} color={subTab === 'readings' ? '#800020' : '#78716c'} />
              <Text
                className={`ml-2 text-base whitespace-nowrap ${
                  subTab === 'readings' ? 'font-bold text-[#800020]' : 'font-medium text-stone-600'
                }`}
              >
                X &amp; Z Shift Readings
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {subTab === 'readings' ? (
        <View className="flex-1">
          <AdminReadingsView />
        </View>
      ) : subTab === 'checks' ? (
        <View className="flex-1">
          <ChecksHistoryView
            startDate={dateBounds.startDate}
            endDate={dateBounds.endDate}
            station={selectedStation}
            timeframeLabel={timeframeDisplayLabel}
          />
        </View>
      ) : (
        <ScrollView className="flex-1 p-4 sm:p-6 lg:p-8" showsVerticalScrollIndicator={false}>
          {/* Printable Container */}
          <View {...({ id: 'monks-sales-report-printable' } as any)} className="flex-1">
            {/* Filter & Action Toolbar */}
            <View className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs mb-6 print-hidden">
              <View className="flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Dropdown Trigger & Date Picker */}
                <View className="flex-col sm:flex-row sm:items-center gap-3 flex-1">
                  {/* Period Dropdown Button */}
                  <Pressable
                    onPress={() => setIsTimeframeModalOpen(true)}
                    className="min-h-[48px] px-4 py-2.5 rounded-xl border border-stone-300 bg-white active:bg-stone-50 flex-row items-center justify-between shadow-xs w-full sm:w-auto"
                  >
                    <View className="flex-row items-center gap-2.5">
                      <Calendar size={18} color="#800020" />
                      <View>
                        <Text className="text-base text-stone-400 font-medium">Timeframe</Text>
                        <Text className="text-base font-bold text-stone-900 leading-tight">
                          {activeTimeframeOption.label}
                        </Text>
                      </View>
                    </View>
                    <ChevronDown size={18} color="#78716c" className="ml-3" />
                  </Pressable>

                  {/* Pick Specific Day / Week / Month Button */}
                  <Pressable
                    onPress={() => setIsDatePickerModalOpen(true)}
                    className={`min-h-[48px] px-4 py-2.5 rounded-xl border flex-row items-center justify-between shadow-xs w-full sm:w-auto ${
                      selectedPeriod === 'custom' ||
                      selectedPeriod === 'select_week' ||
                      selectedPeriod === 'select_month'
                        ? 'border-[#800020] bg-[#800020]/5'
                        : 'border-stone-300 bg-white active:bg-stone-50'
                    }`}
                  >
                    <View className="flex-row items-center gap-2">
                      <Calendar
                        size={18}
                        color={
                          selectedPeriod === 'custom' ||
                          selectedPeriod === 'select_week' ||
                          selectedPeriod === 'select_month'
                            ? '#800020'
                            : '#78716c'
                        }
                      />
                      <View>
                        <Text className="text-base text-stone-400 font-medium">Selected Range</Text>
                        <Text
                          className={`text-base font-bold leading-tight ${
                            selectedPeriod === 'custom' ||
                            selectedPeriod === 'select_week' ||
                            selectedPeriod === 'select_month'
                              ? 'text-[#800020]'
                              : 'text-stone-800'
                          }`}
                        >
                          {timeframeDisplayLabel}
                        </Text>
                      </View>
                    </View>
                  </Pressable>

                  {/* Station Dropdown Trigger */}
                  <Pressable
                    onPress={() => setIsStationModalOpen(true)}
                    className="min-h-[48px] px-4 py-2.5 rounded-xl border border-stone-300 bg-white active:bg-stone-50 flex-row items-center justify-between shadow-xs w-full sm:w-auto"
                  >
                    <View className="flex-row items-center gap-2">
                      <Filter size={18} color="#800020" />
                      <View>
                        <Text className="text-base text-stone-400 font-medium">Station Filter</Text>
                        <Text className="text-base font-bold text-stone-900 leading-tight">
                          {activeStationOption.label}
                        </Text>
                      </View>
                    </View>
                    <ChevronDown size={18} color="#78716c" className="ml-3" />
                  </Pressable>
                </View>

                {/* Right: Refresh, Export, Print Buttons */}
                <View className="flex-row items-center gap-2.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100 flex-wrap">
                  <Pressable
                    onPress={fetchAnalyticsData}
                    className="w-12 h-12 rounded-xl bg-white border border-stone-300 items-center justify-center active:bg-stone-100 shadow-xs"
                  >
                    <RefreshCw
                      size={18}
                      color="#57534e"
                      className={isFetchingAnalytics ? 'animate-spin' : ''}
                    />
                  </Pressable>

                  <Pressable
                    onPress={handleExportFinancialExcel}
                    className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 active:bg-emerald-100 flex-row items-center gap-2 shadow-xs"
                  >
                    <FileSpreadsheet size={18} color="#047857" />
                    <Text className="text-base font-bold text-emerald-800">Export Excel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handlePrintReport}
                    className="min-h-[48px] px-5 py-2.5 rounded-xl bg-stone-900 active:bg-stone-800 flex-row items-center justify-center shadow-xs"
                  >
                    <Printer size={18} color="#ffffff" />
                    <Text className="ml-2 text-base font-bold text-white">Print Report</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Print-Only Executive Header */}
            <View className="mb-6 pb-4 border-b-2 border-stone-900 hidden print:block">
              <Text className="text-2xl font-black text-stone-900 tracking-tight">
                MONK'S DREAM JAZZ BAR &amp; CAFE
              </Text>
              <Text className="text-lg font-bold text-stone-700 mt-1">
                Executive Sales, Fulfilment &amp; Tender Audit Report
              </Text>
              <Text className="text-base text-stone-500 mt-1">
                Scope: {selectedStation === 'ALL' ? 'All Operational Stations' : selectedStation} ·
                Timeframe: {timeframeDisplayLabel} · Generated on {new Date().toLocaleString()}
              </Text>
            </View>

            {/* Top Executive KPI Grid */}
            <View className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Gross Revenue */}
              <View className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-semibold text-stone-500">Gross Sales</Text>
                  <View className="w-9 h-9 rounded-xl bg-amber-50 items-center justify-center print-hidden">
                    <DollarSign size={18} color="#b45309" />
                  </View>
                </View>
                <Text className="text-3xl font-black text-stone-900 tracking-tight">
                  ₱
                  {grossSales.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <View className="flex-row items-center mt-2">
                  <View className="flex-row items-center bg-emerald-50 px-2 py-0.5 rounded-md">
                    <TrendingUp size={14} color="#059669" />
                    <Text className="text-base font-bold text-emerald-700 ml-1">Live Revenue</Text>
                  </View>
                  <Text className="text-base text-stone-400 ml-2">across filter</Text>
                </View>
              </View>

              {/* Net Estimated Profit */}
              <View className="rounded-2xl border border-[#800020]/20 bg-rose-50/20 p-5 shadow-xs">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-semibold text-stone-600">
                    Net Estimated Profit
                  </Text>
                  <View className="w-9 h-9 rounded-xl bg-[#800020]/10 items-center justify-center print-hidden">
                    <Sparkles size={18} color="#800020" />
                  </View>
                </View>
                <Text className="text-3xl font-black text-[#800020] tracking-tight">
                  ₱
                  {estimatedNetProfit.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <View className="flex-row items-center mt-2">
                  <View className="bg-[#800020]/10 px-2 py-0.5 rounded-md">
                    <Text className="text-base font-bold text-[#800020]">
                      {profitMargin}% Margin
                    </Text>
                  </View>
                  <Text className="text-base text-stone-400 ml-2">after COGS &amp; labor</Text>
                </View>
              </View>

              {/* Settled Orders */}
              <View className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-semibold text-stone-500">Settled Checks</Text>
                  <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center print-hidden">
                    <ReceiptText size={18} color="#2563eb" />
                  </View>
                </View>
                <Text className="text-3xl font-black text-stone-900 tracking-tight">
                  {orderCount}
                </Text>
                <Text className="text-base text-stone-500 mt-2 font-medium">
                  Customer tabs completed
                </Text>
              </View>

              {/* Average Ticket */}
              <View className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-semibold text-stone-500">Average Ticket</Text>
                  <View className="w-9 h-9 rounded-xl bg-purple-50 items-center justify-center print-hidden">
                    <Percent size={18} color="#9333ea" />
                  </View>
                </View>
                <Text className="text-3xl font-black text-stone-900 tracking-tight">
                  ₱
                  {averageTicket.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text className="text-base text-stone-500 mt-2 font-medium">
                  Per settled transaction
                </Text>
              </View>
            </View>

            {/* Visual Analytics Suite: Hourly Pacing & Payment Tender Mix */}
            <View className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print-avoid-break">
              <HourlySalesVelocityChart
                data={effectiveAnalytics?.hourlySales || []}
                peakHourLabel={effectiveAnalytics?.peakHourLabel}
                totalSales={grossSales}
              />

              <PaymentTenderMixBar
                data={
                  effectiveAnalytics?.tenderBreakdown || {
                    cash: 0,
                    card: 0,
                    digital: 0,
                    delivery: 0,
                    total: grossSales,
                  }
                }
              />
            </View>

            {/* Channel Breakdown Card */}
            <View className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-xs mb-6 print-avoid-break">
              <View className="flex-row items-center justify-between pb-4 mb-4 border-b border-stone-100 flex-wrap gap-2">
                <View>
                  <View className="flex-row items-center gap-2">
                    <PieChart size={20} color="#800020" />
                    <Text className="text-xl font-bold text-stone-900">
                      Sales by Channel &amp; Fulfilment Route
                    </Text>
                  </View>
                  <Text className="text-base text-stone-500 mt-1">
                    Distribution of volume and monetary yield across operational venues
                  </Text>
                </View>

                <View className="bg-stone-100 px-3 py-1.5 rounded-xl">
                  <Text className="text-base font-semibold text-stone-700">
                    {channelEntries.length} Active Channels
                  </Text>
                </View>
              </View>

              {/* Channel List */}
              <View className="space-y-4">
                {channelEntries.map(([channel, data]) => {
                  const meta = getChannelMeta(channel);
                  const salesValue = Number(data.sales || 0);
                  const percentOfTotal =
                    grossSales > 0 ? Math.round((salesValue / grossSales) * 100) : 0;

                  return (
                    <View
                      key={channel}
                      className="p-4 rounded-xl border border-stone-100 bg-[#fbfaf8] hover:border-stone-200 transition-colors"
                    >
                      <View className="flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left: Icon, Name, and Meta */}
                        <View className="flex-row items-center gap-3.5">
                          <View
                            className={`w-11 h-11 rounded-xl items-center justify-center border ${meta.badgeBg} ${meta.badgeBorder}`}
                          >
                            {meta.icon}
                          </View>
                          <View>
                            <View className="flex-row items-center gap-2">
                              <Text className="text-lg font-bold text-stone-900">{meta.label}</Text>
                              <View className="bg-stone-200/80 px-2 py-0.5 rounded-md">
                                <Text className="text-base font-semibold text-stone-700">
                                  {data.count} {data.count === 1 ? 'order' : 'orders'}
                                </Text>
                              </View>
                            </View>
                            <Text className="text-base text-stone-500">{meta.subtext}</Text>
                          </View>
                        </View>

                        {/* Right: Sales and Percentage */}
                        <View className="flex-row items-baseline sm:flex-col sm:items-end justify-between sm:justify-center">
                          <Text className="text-xl font-black text-stone-900 tracking-tight">
                            ₱
                            {salesValue.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                          <Text className="text-base font-bold text-stone-500">
                            {percentOfTotal}% of venue sales
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar Container */}
                      <View className="mt-3.5 w-full bg-stone-200/70 h-2.5 rounded-full overflow-hidden">
                        <View
                          className={`h-full rounded-full ${meta.progressBg}`}
                          style={{ width: `${Math.min(100, Math.max(percentOfTotal, 0))}%` }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Financial Breakdown & Margin Cards */}
            <View className="grid grid-cols-1 md:grid-cols-3 gap-5 print-avoid-break">
              <View className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
                <Text className="text-base font-semibold text-stone-500">Gross Sales Revenue</Text>
                <Text className="text-2xl font-black text-stone-900 mt-1">
                  ₱
                  {grossSales.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <View className="mt-3 pt-3 border-t border-stone-100 flex-row items-center justify-between">
                  <Text className="text-base text-stone-500">Settled Transactions</Text>
                  <Text className="text-base font-bold text-emerald-600">{orderCount} tabs</Text>
                </View>
              </View>

              <View className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
                <Text className="text-base font-semibold text-stone-500">
                  Cost of Goods Sold (COGS)
                </Text>
                <Text className="text-2xl font-black text-stone-900 mt-1">
                  ₱
                  {totalCogs.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <View className="mt-3 pt-3 border-t border-stone-100 flex-row items-center justify-between">
                  <Text className="text-base text-stone-500">Ingredients baseline</Text>
                  <Text className="text-base font-bold text-stone-700">{cogsMargin}% of sales</Text>
                </View>
              </View>

              <View className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
                <Text className="text-base font-semibold text-stone-500">Net Estimated Profit</Text>
                <Text className="text-2xl font-black text-[#800020] mt-1">
                  ₱
                  {estimatedNetProfit.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <View className="mt-3 pt-3 border-t border-stone-100 flex-row items-center justify-between">
                  <Text className="text-base text-stone-500">Estimated Net Margin</Text>
                  <Text className="text-base font-bold text-[#800020]">{profitMargin}% net</Text>
                </View>
              </View>
            </View>

            {/* Print Sign-off Trailer */}
            <View className="mt-8 pt-6 border-t-2 border-stone-300 hidden print:block print-avoid-break">
              <View className="grid grid-cols-2 gap-8">
                <View className="border-t border-stone-400 pt-2">
                  <Text className="text-sm font-bold">Manager On Duty Signature</Text>
                  <Text className="text-xs text-stone-500 mt-1">
                    Monk's Dream Jazz Bar Back-Office
                  </Text>
                </View>
                <View className="border-t border-stone-400 pt-2">
                  <Text className="text-sm font-bold">Accounting &amp; Audit Acknowledgment</Text>
                  <Text className="text-xs text-stone-500 mt-1">Fiscal Ledger Synchronization</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* TIMEFRAME DROPDOWN MODAL */}
      <AdminModal
        visible={isTimeframeModalOpen}
        onClose={() => setIsTimeframeModalOpen(false)}
        title="Select Reporting Timeframe"
        subtitle="Filter sales metrics, channel volume, and estimated net yield"
        icon={<Calendar size={22} color="#800020" />}
        size="md"
      >
        <View className="space-y-3">
          {TIMEFRAME_OPTIONS.map((opt) => {
            const isSelected = selectedPeriod === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => {
                  setSelectedPeriod(opt.key);
                  setIsTimeframeModalOpen(false);
                  if (opt.key === 'custom') {
                    setDatePickerMode('day');
                    setIsDatePickerModalOpen(true);
                  } else if (opt.key === 'select_week') {
                    setDatePickerMode('week');
                    setIsDatePickerModalOpen(true);
                  } else if (opt.key === 'select_month') {
                    setDatePickerMode('month');
                    setIsDatePickerModalOpen(true);
                  }
                }}
                className={`min-h-[52px] p-4 rounded-xl border flex-row items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-[#800020]/10 border-[#800020]'
                    : 'bg-white border-stone-200 active:bg-stone-50 hover:bg-stone-50'
                }`}
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2">
                    <Text
                      className={`text-base font-bold ${
                        isSelected ? 'text-[#800020]' : 'text-stone-900'
                      }`}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <View className="bg-[#800020] rounded-full p-0.5">
                        <Check size={14} color="#ffffff" />
                      </View>
                    )}
                  </View>
                  <Text className="text-base text-stone-500 mt-1">{opt.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </AdminModal>

      {/* STATION DROPDOWN MODAL */}
      <AdminModal
        visible={isStationModalOpen}
        onClose={() => setIsStationModalOpen(false)}
        title="Select Operational Station"
        subtitle="Filter sales yield and check volume by specific fulfillment destination"
        icon={<Filter size={22} color="#800020" />}
        size="md"
      >
        <View className="space-y-3">
          {STATION_OPTIONS.map((opt) => {
            const isSelected = selectedStation === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => {
                  setSelectedStation(opt.key);
                  setIsStationModalOpen(false);
                }}
                className={`min-h-[52px] p-4 rounded-xl border flex-row items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-[#800020]/10 border-[#800020]'
                    : 'bg-white border-stone-200 active:bg-stone-50 hover:bg-stone-50'
                }`}
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2">
                    <Text
                      className={`text-base font-bold ${
                        isSelected ? 'text-[#800020]' : 'text-stone-900'
                      }`}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <View className="bg-[#800020] rounded-full p-0.5">
                        <Check size={14} color="#ffffff" />
                      </View>
                    )}
                  </View>
                  <Text className="text-base text-stone-500 mt-1">{opt.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </AdminModal>

      {/* CALENDAR DATE / WEEK / MONTH PICKER MODAL */}
      <AdminModal
        visible={isDatePickerModalOpen}
        onClose={() => setIsDatePickerModalOpen(false)}
        title={
          datePickerMode === 'day'
            ? 'Select Specific Day'
            : datePickerMode === 'week'
              ? 'Select Specific Week'
              : 'Select Specific Month'
        }
        subtitle={
          datePickerMode === 'day'
            ? 'Pick an exact operational day for transactional audit'
            : datePickerMode === 'week'
              ? 'Select any day within a week to load its full Monday–Sunday bounds'
              : 'Choose any historical month and year across venue operations'
        }
        icon={<Calendar size={22} color="#800020" />}
        size="md"
      >
        <View className="p-1">
          {/* Picker Mode Switcher: Day vs Week vs Month */}
          <View className="flex-row rounded-xl bg-stone-100 p-1 mb-4">
            <Pressable
              onPress={() => setDatePickerMode('day')}
              className={`flex-1 min-h-[40px] items-center justify-center rounded-lg ${
                datePickerMode === 'day' ? 'bg-white shadow-xs' : 'active:bg-stone-200'
              }`}
            >
              <Text
                className={`text-base font-bold ${
                  datePickerMode === 'day' ? 'text-[#800020]' : 'text-stone-600'
                }`}
              >
                Day
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setDatePickerMode('week')}
              className={`flex-1 min-h-[40px] items-center justify-center rounded-lg ${
                datePickerMode === 'week' ? 'bg-white shadow-xs' : 'active:bg-stone-200'
              }`}
            >
              <Text
                className={`text-base font-bold ${
                  datePickerMode === 'week' ? 'text-[#800020]' : 'text-stone-600'
                }`}
              >
                Week
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setDatePickerMode('month')}
              className={`flex-1 min-h-[40px] items-center justify-center rounded-lg ${
                datePickerMode === 'month' ? 'bg-white shadow-xs' : 'active:bg-stone-200'
              }`}
            >
              <Text
                className={`text-base font-bold ${
                  datePickerMode === 'month' ? 'text-[#800020]' : 'text-stone-600'
                }`}
              >
                Month
              </Text>
            </Pressable>
          </View>

          {datePickerMode === 'month' ? (
            /* MONTH & YEAR PICKER VIEW */
            <View>
              {/* Year Navigation Bar */}
              <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-stone-200">
                <Pressable
                  onPress={() => setCalendarYear((y) => y - 1)}
                  className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
                >
                  <ChevronLeft size={20} color="#44403c" />
                </Pressable>

                <Text className="text-lg font-black text-stone-900">{calendarYear}</Text>

                <Pressable
                  onPress={() => {
                    const currentYear = new Date().getFullYear();
                    if (calendarYear < currentYear) {
                      setCalendarYear((y) => y + 1);
                    }
                  }}
                  disabled={calendarYear >= new Date().getFullYear()}
                  className={`min-h-[44px] min-w-[44px] items-center justify-center rounded-xl ${
                    calendarYear >= new Date().getFullYear()
                      ? 'bg-stone-50 opacity-40 cursor-not-allowed'
                      : 'bg-stone-100 active:bg-stone-200'
                  }`}
                >
                  <ChevronRight
                    size={20}
                    color={calendarYear >= new Date().getFullYear() ? '#a8a29e' : '#44403c'}
                  />
                </Pressable>
              </View>

              {/* 12 Months Grid */}
              <View className="flex-row flex-wrap justify-between gap-y-2.5">
                {monthNames.map((mName, mIdx) => {
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  const currentMonth = now.getMonth();
                  const isFutureMonth =
                    calendarYear > currentYear ||
                    (calendarYear === currentYear && mIdx > currentMonth);
                  const isSelectedMonth =
                    selectedPeriod === 'select_month' &&
                    selectedMonthYear.year === calendarYear &&
                    selectedMonthYear.month === mIdx;
                  const isCurrentMonth = calendarYear === currentYear && mIdx === currentMonth;

                  return (
                    <Pressable
                      key={mName}
                      disabled={isFutureMonth}
                      onPress={() => !isFutureMonth && handleSelectMonth(mIdx, calendarYear)}
                      className={`w-[31%] min-h-[48px] items-center justify-center rounded-xl transition-all ${
                        isFutureMonth
                          ? 'opacity-25 bg-stone-50 cursor-not-allowed'
                          : isSelectedMonth
                            ? 'bg-[#800020]'
                            : isCurrentMonth
                              ? 'border border-[#800020] bg-rose-50/40'
                              : 'bg-stone-100 active:bg-stone-200'
                      }`}
                    >
                      <Text
                        className={`text-base font-bold ${
                          isFutureMonth
                            ? 'text-stone-400'
                            : isSelectedMonth
                              ? 'text-white'
                              : isCurrentMonth
                                ? 'text-[#800020]'
                                : 'text-stone-800'
                        }`}
                      >
                        {mName.slice(0, 3)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            /* DAY / WEEK CALENDAR VIEW */
            <View>
              {/* Calendar Header with Month/Year Navigation */}
              <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-stone-200">
                <Pressable
                  onPress={handlePrevMonth}
                  className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-stone-100 active:bg-stone-200"
                >
                  <ChevronLeft size={20} color="#44403c" />
                </Pressable>

                <Text className="text-lg font-black text-stone-900">
                  {monthNames[calendarMonth]} {calendarYear}
                </Text>

                <Pressable
                  onPress={handleNextMonth}
                  disabled={isCurrentOrFutureMonth}
                  className={`min-h-[44px] min-w-[44px] items-center justify-center rounded-xl ${
                    isCurrentOrFutureMonth
                      ? 'bg-stone-50 opacity-40 cursor-not-allowed'
                      : 'bg-stone-100 active:bg-stone-200'
                  }`}
                >
                  <ChevronRight size={20} color={isCurrentOrFutureMonth ? '#a8a29e' : '#44403c'} />
                </Pressable>
              </View>

              {/* Weekday Labels */}
              <View className="flex-row justify-between mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <View key={d} className="w-[14%] items-center">
                    <Text className="text-base font-bold text-stone-400">{d}</Text>
                  </View>
                ))}
              </View>

              {/* Day Grid */}
              <View className="flex-row flex-wrap">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <View key={`empty-${idx}`} className="w-[14%] h-12" />;
                  }

                  const formattedDayStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const now = new Date();
                  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  const isToday = formattedDayStr === todayStr;
                  const isFuture = formattedDayStr > todayStr;

                  const isSelected =
                    datePickerMode === 'week'
                      ? isDayInSelectedWeek(day)
                      : selectedPeriod === 'custom' && specificDate === formattedDayStr;

                  return (
                    <Pressable
                      key={`day-${day}`}
                      disabled={isFuture}
                      onPress={() => !isFuture && handleSelectDay(day)}
                      className={`w-[14%] h-12 items-center justify-center rounded-xl transition-all ${
                        isFuture
                          ? 'opacity-25 bg-stone-50 cursor-not-allowed'
                          : isSelected
                            ? 'bg-[#800020]'
                            : isToday
                              ? 'border border-[#800020] bg-rose-50/40'
                              : 'active:bg-stone-100 hover:bg-stone-100'
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

          {/* Footer Quick Today & Done Button */}
          <View className="mt-5 pt-3 border-t border-stone-100 flex-row items-center justify-between">
            <Pressable
              onPress={() => {
                const now = new Date();
                setCalendarYear(now.getFullYear());
                setCalendarMonth(now.getMonth());
                if (datePickerMode === 'month') {
                  handleSelectMonth(now.getMonth(), now.getFullYear());
                } else {
                  handleSelectDay(now.getDate());
                }
              }}
              className="min-h-[44px] px-4 rounded-xl bg-stone-100 active:bg-stone-200 flex-row items-center"
            >
              <Text className="text-base font-bold text-stone-700">
                {datePickerMode === 'month'
                  ? 'This Month'
                  : datePickerMode === 'week'
                    ? 'This Week'
                    : 'Today'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setIsDatePickerModalOpen(false)}
              className="min-h-[44px] px-4 rounded-xl bg-[#800020] active:bg-[#6b001a] flex-row items-center"
            >
              <Text className="text-base font-bold text-white">Done</Text>
            </Pressable>
          </View>
        </View>
      </AdminModal>
    </View>
  );
};
