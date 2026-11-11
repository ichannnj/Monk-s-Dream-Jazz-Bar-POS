import React from 'react';
import { View, Text, Pressable, Platform, ActivityIndicator } from 'react-native';
import {
  Calendar,
  Filter,
  RefreshCw,
  ChevronDown,
  FileSpreadsheet,
  Printer,
} from 'lucide-react-native';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import {
  type ModeFilter,
  type StationFilter,
  type TimeframeChipOption,
  type StationOption,
  type TimeframePeriod,
} from './transactionsOverview.types';

interface FinancialOverviewToolbarProps {
  isFetchingAnalytics: boolean;
  timeframeDisplayLabel: string;
  activeTimeframeOption: TimeframeChipOption;
  activeStationOption: StationOption;
  selectedPeriod: TimeframePeriod;
  selectedMode: ModeFilter;
  setSelectedMode: (mode: ModeFilter) => void;
  modeFilterOptions: PosDropdownOption<ModeFilter>[];
  setIsTimeframeModalOpen: (open: boolean) => void;
  setIsDatePickerModalOpen: (open: boolean) => void;
  setDatePickerMode: (mode: 'day' | 'week' | 'month') => void;
  setIsStationModalOpen: (open: boolean) => void;
  handleExportFinancialExcel: () => void;
  handlePrintReport: () => void;
  fetchAnalyticsData: () => void;
}

export const FinancialOverviewToolbar: React.FC<FinancialOverviewToolbarProps> = ({
  isFetchingAnalytics,
  timeframeDisplayLabel,
  activeTimeframeOption,
  activeStationOption,
  selectedPeriod,
  selectedMode,
  setSelectedMode,
  modeFilterOptions,
  setIsTimeframeModalOpen,
  setIsDatePickerModalOpen,
  setDatePickerMode,
  setIsStationModalOpen,
  handleExportFinancialExcel,
  handlePrintReport,
  fetchAnalyticsData,
}) => {
  return (
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

          {/* Operating Mode Dropdown */}
          <PosDropdown
            options={modeFilterOptions}
            value={selectedMode}
            onChange={setSelectedMode}
            prefixLabel="Mode:"
            sheetTitle="Filter by Operating Mode"
            className="w-full sm:w-auto min-w-[165px]"
          />
        </View>

        {/* Right: Export & Print Buttons */}
        <View className="flex-row items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100 flex-wrap">
          <Pressable
            onPress={handleExportFinancialExcel}
            className="h-10 px-3 rounded-xl bg-white border border-stone-200 active:bg-stone-50 flex-row items-center gap-1.5 shadow-xs"
          >
            <FileSpreadsheet size={15} color="#800020" />
            <Text className="text-xs font-bold text-stone-800">Export</Text>
          </Pressable>

          <Pressable
            onPress={handlePrintReport}
            className="h-10 px-3.5 rounded-xl bg-[#800020] active:bg-[#600018] flex-row items-center justify-center shadow-xs"
          >
            <Printer size={15} color="#ffffff" />
            <Text className="ml-1.5 text-xs font-bold text-white">Print</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
