import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Calendar, Filter, ChevronDown, FileSpreadsheet, Printer } from 'lucide-react-native';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import {
  type ModeFilter,
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
  timeframeDisplayLabel,
  activeTimeframeOption,
  activeStationOption,
  selectedPeriod,
  selectedMode,
  setSelectedMode,
  modeFilterOptions,
  setIsTimeframeModalOpen,
  setIsDatePickerModalOpen,
  setIsStationModalOpen,
  handleExportFinancialExcel,
  handlePrintReport,
}) => {
  return (
    <View className="rounded-xl border border-stone-200/90 bg-white p-3.5 sm:p-4 shadow-xs mb-5 print-hidden">
      <View className="flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Filter Selectors */}
        <View className="flex-row items-center gap-2 flex-wrap flex-1">
          {/* Period Dropdown Button */}
          <Pressable
            onPress={() => setIsTimeframeModalOpen(true)}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl border border-stone-200 bg-[#FAF8F5] active:bg-stone-100 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2">
              <Calendar size={16} color="#800020" />
              <View>
                <Text className="text-[10px] text-stone-500 font-semibold leading-tight uppercase">
                  Timeframe
                </Text>
                <Text className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">
                  {activeTimeframeOption.label}
                </Text>
              </View>
            </View>
            <ChevronDown size={15} color="#78716c" className="ml-2" />
          </Pressable>

          {/* Pick Specific Day / Week / Month Button */}
          <Pressable
            onPress={() => setIsDatePickerModalOpen(true)}
            className={`min-h-[44px] px-3.5 py-1.5 rounded-xl border flex-row items-center justify-between ${
              selectedPeriod === 'custom' ||
              selectedPeriod === 'select_week' ||
              selectedPeriod === 'select_month'
                ? 'border-[#800020] bg-white'
                : 'border-stone-200 bg-[#FAF8F5] active:bg-stone-100'
            }`}
          >
            <View className="flex-row items-center gap-2">
              <Calendar
                size={16}
                color={
                  selectedPeriod === 'custom' ||
                  selectedPeriod === 'select_week' ||
                  selectedPeriod === 'select_month'
                    ? '#800020'
                    : '#78716c'
                }
              />
              <View>
                <Text className="text-[10px] text-stone-500 font-semibold leading-tight uppercase">
                  Range
                </Text>
                <Text
                  className={`text-xs sm:text-sm font-bold leading-tight ${
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
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl border border-stone-200 bg-[#FAF8F5] active:bg-stone-100 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2">
              <Filter size={16} color="#800020" />
              <View>
                <Text className="text-[10px] text-stone-500 font-semibold leading-tight uppercase">
                  Station
                </Text>
                <Text className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">
                  {activeStationOption.label}
                </Text>
              </View>
            </View>
            <ChevronDown size={15} color="#78716c" className="ml-2" />
          </Pressable>

          {/* Operating Mode Dropdown */}
          <PosDropdown
            options={modeFilterOptions}
            value={selectedMode}
            onChange={setSelectedMode}
            prefixLabel="Mode:"
            sheetTitle="Filter by Operating Mode"
            className="min-w-[145px]"
          />
        </View>

        {/* Right: Export & Print Buttons */}
        <View className="flex-row items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100 flex-wrap">
          <Pressable
            onPress={handleExportFinancialExcel}
            className="min-h-[44px] px-3.5 rounded-xl bg-white border border-stone-200 active:bg-stone-50 flex-row items-center gap-1.5 shadow-2xs"
            accessibilityLabel="Export Financial Report to Excel"
          >
            <FileSpreadsheet size={15} color="#800020" />
            <Text className="text-xs font-bold text-stone-800">Export</Text>
          </Pressable>

          <Pressable
            onPress={handlePrintReport}
            className="min-h-[44px] px-4 rounded-xl bg-[#800020] active:bg-[#600018] flex-row items-center justify-center shadow-2xs"
            accessibilityLabel="Print Financial Report"
          >
            <Printer size={15} color="#ffffff" />
            <Text className="ml-1.5 text-xs font-bold text-white">Print</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
