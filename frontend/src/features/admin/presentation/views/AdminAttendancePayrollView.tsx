import React from 'react';
import { View, ScrollView } from 'react-native';
import { useAttendancePayrollController } from './attendance/useAttendancePayrollController';
import { AttendanceToolbarAndPickers } from './attendance/AttendanceToolbarAndPickers';
import { AttendanceSummaryKpiRow } from './attendance/AttendanceSummaryKpiRow';
import { AttendanceRosterTable } from './attendance/AttendanceRosterTable';
import { AttendanceDatePickerModal } from './attendance/AttendanceDatePickerModal';
import { AttendanceEditAndBonusModals } from './attendance/AttendanceEditAndBonusModals';
import { AttendanceReportModal } from './attendance/AttendanceReportModal';

export interface AdminAttendancePayrollViewProps {
  onRefresh?: () => void;
  onNavigateToRoster?: () => void;
}

export const AdminAttendancePayrollView: React.FC<AdminAttendancePayrollViewProps> = ({
  onRefresh,
  onNavigateToRoster,
}) => {
  const {
    period,
    setPeriod,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    selectedDate,
    setSelectedDate,
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
    periodTotals,
    handleStepDay,
    calendarDays,
    handleSelectDay,
    handleSelectMonth,
    handleSaveRecord,
    exportItems,
    handleExportExcel,
  } = useAttendancePayrollController(onRefresh);

  return (
    <ScrollView
      className="flex-1 bg-[#FAF8F5] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      <AttendanceToolbarAndPickers
        dateRange={dateRange}
        todayStr={todayStr}
        period={period}
        setPeriod={setPeriod}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isLoading={isLoading}
        loadData={loadData}
        handleOpenPrintModal={() => setIsReportModalOpen(true)}
        handleExportExcel={handleExportExcel}
        handleStepDay={handleStepDay}
        setDatePickerMode={setDatePickerMode}
        setIsDatePickerModalOpen={setIsDatePickerModalOpen}
        onNavigateToRoster={onNavigateToRoster}
      />

      {/* PRINT TARGET CONTAINER */}
      <View
        nativeID="monks-attendance-payroll-print-area"
        {...({ id: 'monks-attendance-payroll-print-area' } as any)}
        className="space-y-4"
      >
        <AttendanceSummaryKpiRow periodTotals={periodTotals} dateRange={dateRange} />

        <AttendanceRosterTable
          dateRange={dateRange}
          filteredSingleDayList={filteredSingleDayList}
          multiDayAggregates={multiDayAggregates}
          loadData={loadData}
          setEditingRecord={setEditingRecord}
        />
      </View>

      <AttendanceDatePickerModal
        visible={isDatePickerModalOpen}
        onClose={() => setIsDatePickerModalOpen(false)}
        datePickerMode={datePickerMode}
        setDatePickerMode={setDatePickerMode}
        calendarYear={calendarYear}
        setCalendarYear={setCalendarYear}
        calendarMonth={calendarMonth}
        setCalendarMonth={setCalendarMonth}
        calendarDays={calendarDays}
        todayStr={todayStr}
        selectedDate={selectedDate}
        period={period}
        setSelectedDate={setSelectedDate}
        setPeriod={setPeriod}
        handleSelectDay={handleSelectDay}
        handleSelectMonth={handleSelectMonth}
      />

      <AttendanceEditAndBonusModals
        editingRecord={editingRecord}
        setEditingRecord={setEditingRecord}
        handleSaveRecord={handleSaveRecord}
        staffRoster={staffRoster}
      />

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

export default AdminAttendancePayrollView;
