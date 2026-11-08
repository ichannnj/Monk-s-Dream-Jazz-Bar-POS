import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Calendar, Filter, ChevronDown } from 'lucide-react-native';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import {
  type ModeFilter,
  type StationFilter,
  type TimeframeChipOption,
  type StationOption,
  type TimeframePeriod,
} from './transactionsOverview.types';

interface TrendsFilterToolbarProps {
  activeTimeframeOption: TimeframeChipOption;
  activeStationOption: StationOption;
  selectedPeriod: TimeframePeriod;
  timeframeDisplayLabel: string;
  selectedMode: ModeFilter;
  setSelectedMode: (mode: ModeFilter) => void;
  modeFilterOptions: PosDropdownOption<ModeFilter>[];
  setIsTimeframeModalOpen: (open: boolean) => void;
  setIsStationModalOpen: (open: boolean) => void;
  setIsDatePickerModalOpen: (open: boolean) => void;
}

export const TrendsFilterToolbar: React.FC<TrendsFilterToolbarProps> = ({
  activeTimeframeOption,
  activeStationOption,
  selectedPeriod,
  timeframeDisplayLabel,
  selectedMode,
  setSelectedMode,
  modeFilterOptions,
  setIsTimeframeModalOpen,
  setIsStationModalOpen,
  setIsDatePickerModalOpen,
}) => {
  return (
    <View className="border-b border-stone-200/80 bg-white px-4 sm:px-8 py-3 print-hidden">
      <View className="flex-col sm:flex-row sm:items-center justify-between gap-3">
        <View className="flex-col sm:flex-row sm:items-center gap-3 flex-1 flex-wrap">
          {/* Period Dropdown Button */}
          <Pressable
            onPress={() => setIsTimeframeModalOpen(true)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white active:bg-stone-50 flex-row items-center justify-between shadow-xs"
          >
            <View className="flex-row items-center gap-2">
              <Calendar size={17} color="#800020" />
              <View>
                <Text className="text-[11px] text-stone-400 font-medium leading-none">
                  Timeframe
                </Text>
                <Text className="text-sm font-bold text-stone-900 leading-tight mt-0.5">
                  {activeTimeframeOption.label}
                </Text>
              </View>
            </View>
            <ChevronDown size={16} color="#78716c" className="ml-2.5" />
          </Pressable>

          {/* Pick Specific Day / Week / Month Button */}
          <Pressable
            onPress={() => setIsDatePickerModalOpen(true)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border flex-row items-center justify-between shadow-xs ${
              selectedPeriod === 'custom' ||
              selectedPeriod === 'select_week' ||
              selectedPeriod === 'select_month'
                ? 'border-[#800020] bg-[#800020]/5'
                : 'border-stone-300 bg-white active:bg-stone-50'
            }`}
          >
            <View className="flex-row items-center gap-2">
              <Calendar
                size={17}
                color={
                  selectedPeriod === 'custom' ||
                  selectedPeriod === 'select_week' ||
                  selectedPeriod === 'select_month'
                    ? '#800020'
                    : '#78716c'
                }
              />
              <View>
                <Text className="text-[11px] text-stone-400 font-medium leading-none">
                  Selected Range
                </Text>
                <Text
                  className={`text-sm font-bold leading-tight mt-0.5 ${
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
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white active:bg-stone-50 flex-row items-center justify-between shadow-xs"
          >
            <View className="flex-row items-center gap-2">
              <Filter size={17} color="#800020" />
              <View>
                <Text className="text-[11px] text-stone-400 font-medium leading-none">
                  Station Filter
                </Text>
                <Text className="text-sm font-bold text-stone-900 leading-tight mt-0.5">
                  {activeStationOption.label}
                </Text>
              </View>
            </View>
            <ChevronDown size={16} color="#78716c" className="ml-2.5" />
          </Pressable>

          {/* Operating Mode Dropdown */}
          <PosDropdown
            options={modeFilterOptions}
            value={selectedMode}
            onChange={setSelectedMode}
            prefixLabel="Mode:"
            sheetTitle="Filter by Operating Mode"
            className="w-full sm:w-auto min-w-[150px]"
          />
        </View>
      </View>
    </View>
  );
};
