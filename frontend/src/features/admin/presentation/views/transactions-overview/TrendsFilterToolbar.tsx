import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Calendar, Filter, ChevronDown } from 'lucide-react-native';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import {
  type ModeFilter,
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
    <View className="border-b border-stone-200/80 bg-white px-3.5 sm:px-6 py-2.5 print-hidden">
      <View className="flex-row items-center gap-2 flex-wrap">
        {/* Period Dropdown Button */}
        <Pressable
          onPress={() => setIsTimeframeModalOpen(true)}
          className="min-h-[44px] px-3.5 py-1.5 rounded-xl border border-stone-200 bg-[#EFECE6] active:bg-stone-100 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-2">
            <Calendar size={16} color="#810021" />
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
              ? 'border-[#810021] bg-white'
              : 'border-stone-200 bg-[#EFECE6] active:bg-stone-100'
          }`}
        >
          <View className="flex-row items-center gap-2">
            <Calendar
              size={16}
              color={
                selectedPeriod === 'custom' ||
                selectedPeriod === 'select_week' ||
                selectedPeriod === 'select_month'
                  ? '#810021'
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
                    ? 'text-[#810021]'
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
          className="min-h-[44px] px-3.5 py-1.5 rounded-xl border border-stone-200 bg-[#EFECE6] active:bg-stone-100 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-2">
            <Filter size={16} color="#810021" />
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
    </View>
  );
};
