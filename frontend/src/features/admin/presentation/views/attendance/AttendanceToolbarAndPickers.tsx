import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
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
  Printer,
  FileSpreadsheet,
} from 'lucide-react-native';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { AdminInput } from '../../components';
import { PeriodFilter, ShiftStatusFilter } from './attendance.types';
import { DateRangeResult } from './attendanceDateUtils';

interface AttendanceToolbarProps {
  dateRange: DateRangeResult;
  todayStr: string;
  period: PeriodFilter;
  setPeriod: (val: PeriodFilter) => void;
  statusFilter: ShiftStatusFilter;
  setStatusFilter: (val: ShiftStatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isLoading: boolean;
  loadData: () => void;
  handleOpenPrintModal: () => void;
  handleExportExcel: () => void;
  handleStepDay: (step: -1 | 1) => void;
  setDatePickerMode: (mode: 'day' | 'week' | 'month') => void;
  setIsDatePickerModalOpen: (open: boolean) => void;
  onNavigateToRoster?: () => void;
}

export const AttendanceToolbarAndPickers: React.FC<AttendanceToolbarProps> = ({
  dateRange,
  todayStr,
  period,
  setPeriod,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  isLoading,
  loadData,
  handleOpenPrintModal,
  handleExportExcel,
  handleStepDay,
  setDatePickerMode,
  setIsDatePickerModalOpen,
  onNavigateToRoster,
}) => {
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
    <>
      {/* Sleek Top Header Bar */}
      <View className="mb-5 flex-col md:flex-row md:items-center justify-between gap-3">
        <View className="flex-row items-center gap-2.5">
          <Text className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            Attendance &amp; Payroll
          </Text>
          <View className="rounded-full bg-white border border-stone-200 px-2.5 py-0.5">
            <Text className="text-xs font-bold text-[#800020]">{dateRange.label}</Text>
          </View>
        </View>

        {/* Action Shortcuts */}
        <View className="flex-row flex-wrap items-center gap-2">
          {Platform.OS === 'web' && (
            <>
              {/* Print A4 Report Button */}
              <Pressable
                onPress={handleOpenPrintModal}
                className="h-10 px-3 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50 shadow-xs"
                accessibilityLabel="Print Attendance & Payroll Report"
              >
                <Printer size={15} color="#1c1917" />
                <Text className="ml-1.5 text-xs font-bold text-stone-800">Print</Text>
              </Pressable>

              {/* Excel Spreadsheet Export Button */}
              <Pressable
                onPress={handleExportExcel}
                className="h-10 px-3 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50 shadow-xs"
                accessibilityLabel="Export Attendance to Excel Spreadsheet"
              >
                <FileSpreadsheet size={15} color="#800020" />
                <Text className="ml-1.5 text-xs font-bold text-stone-800">Excel</Text>
              </Pressable>

              <Pressable
                onPress={() => window.open('?mode=timeclock', '_blank')}
                className="h-10 px-3 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50 shadow-xs"
                accessibilityLabel="Launch Timeclock Kiosk in new tab"
              >
                <ExternalLink size={15} color="#800020" />
                <Text className="ml-1.5 text-xs font-bold text-[#800020]">Timeclock ↗</Text>
              </Pressable>
            </>
          )}

          {onNavigateToRoster && (
            <Pressable
              onPress={onNavigateToRoster}
              className="h-10 px-3 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50 shadow-xs"
            >
              <Users size={15} color="#1c1917" />
              <Text className="ml-1.5 text-xs font-bold text-stone-800">Roster →</Text>
            </Pressable>
          )}
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
    </>
  );
};
