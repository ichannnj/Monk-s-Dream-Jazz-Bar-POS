import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Calendar, Check, Filter } from 'lucide-react-native';
import { AdminModal } from '../../components/AdminModal';
import {
  type StationFilter,
  type TimeframePeriod,
  TIMEFRAME_OPTIONS,
  STATION_OPTIONS,
} from './transactionsOverview.types';

interface TransactionsTimeframeStationModalsProps {
  isTimeframeModalOpen: boolean;
  setIsTimeframeModalOpen: (open: boolean) => void;
  selectedPeriod: TimeframePeriod;
  setSelectedPeriod: (period: TimeframePeriod) => void;
  isStationModalOpen: boolean;
  setIsStationModalOpen: (open: boolean) => void;
  selectedStation: StationFilter;
  setSelectedStation: (station: StationFilter) => void;
  setIsDatePickerModalOpen: (open: boolean) => void;
  setDatePickerMode: (mode: 'day' | 'week' | 'month') => void;
}

export const TransactionsTimeframeStationModals: React.FC<
  TransactionsTimeframeStationModalsProps
> = ({
  isTimeframeModalOpen,
  setIsTimeframeModalOpen,
  selectedPeriod,
  setSelectedPeriod,
  isStationModalOpen,
  setIsStationModalOpen,
  selectedStation,
  setSelectedStation,
  setIsDatePickerModalOpen,
  setDatePickerMode,
}) => {
  return (
    <>
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
    </>
  );
};
