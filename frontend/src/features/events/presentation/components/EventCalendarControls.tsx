import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { ChevronLeft, ChevronRight, CalendarDays, Columns, List } from 'lucide-react-native';
import type { CalendarViewMode } from '../../domain/event.types';

export interface EventCalendarControlsProps {
  currentPeriodTitle: string;
  viewMode: CalendarViewMode;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
  onGoToToday: () => void;
  onSetViewMode: (mode: CalendarViewMode) => void;
  actionMenuSlot?: React.ReactNode;
}

export const EventCalendarControls: React.FC<EventCalendarControlsProps> = ({
  currentPeriodTitle,
  viewMode,
  onPrevPeriod,
  onNextPeriod,
  onGoToToday,
  onSetViewMode,
  actionMenuSlot,
}) => {
  return (
    <View className="flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      {/* Date Navigation & Current Period */}
      <View className="flex-row items-center gap-2 flex-wrap">
        <View className="flex-row items-center rounded-xl border border-stone-200 bg-white p-1 shadow-xs">
          <Pressable
            onPress={onPrevPeriod}
            accessibilityRole="button"
            accessibilityLabel="Previous period"
            className="h-8 w-8 rounded-lg bg-stone-100 hover:bg-stone-200 active:bg-stone-300 items-center justify-center transition-colors"
            style={Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined}
          >
            <ChevronLeft size={16} color="#44403c" aria-hidden={true} />
          </Pressable>

          <Pressable
            onPress={onGoToToday}
            accessibilityRole="button"
            accessibilityLabel="Jump to today"
            className="px-2.5 py-1 rounded-lg hover:bg-stone-100 active:bg-stone-200 transition-colors"
            style={Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined}
          >
            <Text className="text-xs font-bold text-stone-700">Today</Text>
          </Pressable>

          <Pressable
            onPress={onNextPeriod}
            accessibilityRole="button"
            accessibilityLabel="Next period"
            className="h-8 w-8 rounded-lg bg-stone-100 hover:bg-stone-200 active:bg-stone-300 items-center justify-center transition-colors"
            style={Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined}
          >
            <ChevronRight size={16} color="#44403c" aria-hidden={true} />
          </Pressable>

          <Text className="px-2.5 text-xs sm:text-sm font-bold text-stone-900 whitespace-nowrap">
            {currentPeriodTitle}
          </Text>
        </View>

        {/* View Mode Toggle: Month, Week, Agenda */}
        <View className="flex-row rounded-xl border border-stone-200 bg-white p-1 shadow-xs">
          <Pressable
            onPress={() => onSetViewMode('month')}
            accessibilityRole="button"
            accessibilityLabel="Month view"
            className={`flex-row items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === 'month'
                ? 'bg-[#800020] text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-50'
            }`}
            style={Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined}
          >
            <CalendarDays
              size={14}
              color={viewMode === 'month' ? '#ffffff' : '#57534e'}
              aria-hidden={true}
            />
            <Text
              className={`text-xs font-bold ${viewMode === 'month' ? 'text-white' : 'text-stone-600'}`}
            >
              Month
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onSetViewMode('week')}
            accessibilityRole="button"
            accessibilityLabel="Week view"
            className={`flex-row items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === 'week'
                ? 'bg-[#800020] text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-50'
            }`}
            style={Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined}
          >
            <Columns
              size={14}
              color={viewMode === 'week' ? '#ffffff' : '#57534e'}
              aria-hidden={true}
            />
            <Text
              className={`text-xs font-bold ${viewMode === 'week' ? 'text-white' : 'text-stone-600'}`}
            >
              Week
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onSetViewMode('agenda')}
            accessibilityRole="button"
            accessibilityLabel="Agenda list view"
            className={`flex-row items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === 'agenda'
                ? 'bg-[#800020] text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-50'
            }`}
            style={Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined}
          >
            <List
              size={14}
              color={viewMode === 'agenda' ? '#ffffff' : '#57534e'}
              aria-hidden={true}
            />
            <Text
              className={`text-xs font-bold ${viewMode === 'agenda' ? 'text-white' : 'text-stone-600'}`}
            >
              Agenda
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Action Menu Slot (Secondary actions: Print, Excel, iCal, Share) */}
      {actionMenuSlot ? <View className="self-end sm:self-auto">{actionMenuSlot}</View> : null}
    </View>
  );
};
