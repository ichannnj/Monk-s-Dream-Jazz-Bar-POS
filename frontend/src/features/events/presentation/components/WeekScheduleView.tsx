import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { Plus } from 'lucide-react-native';
import type { VenueEvent } from '../../domain/event.types';
import { useResponsive } from '@/features/shared';
import {
  getManilaTodayDateString,
  formatShowtimeRange,
  formatShortDate,
} from '../utils/eventFormatters';
import { EventSummaryCard } from './EventSummaryCard';

interface WeekScheduleViewProps {
  currentDate: Date;
  events: VenueEvent[];
  onSelectEvent: (event: VenueEvent) => void;
  onAddEvent?: (dateString: string) => void;
  isAdmin?: boolean;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const WeekScheduleView: React.FC<WeekScheduleViewProps> = ({
  currentDate,
  events,
  onSelectEvent,
  onAddEvent,
  isAdmin = false,
}) => {
  const { isMobile } = useResponsive();
  const todayStr = getManilaTodayDateString();

  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay();
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);

    const days = [];

    const eventsByDate = new Map<string, VenueEvent[]>();
    events.forEach((ev) => {
      const list = eventsByDate.get(ev.event_date) || [];
      list.push(ev);
      eventsByDate.set(ev.event_date, list);
    });

    for (let i = 0; i < 7; i++) {
      const current = new Date(sunday);
      current.setDate(sunday.getDate() + i);
      const dateString = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      days.push({
        date: current,
        dateString,
        dayOfWeekName: WEEKDAYS[i],
        dayOfMonth: current.getDate(),
        isToday: dateString === todayStr,
        events: eventsByDate.get(dateString) || [],
      });
    }

    return days;
  }, [currentDate, events, todayStr]);

  // Mobile Phone: 1-column responsive list grouped by day of week
  if (isMobile) {
    return (
      <View className="space-y-4">
        {weekDays.map((col) => {
          const hasEvents = col.events.length > 0;
          const canAddHere = isAdmin && onAddEvent;

          return (
            <View
              key={col.dateString}
              className={`rounded-2xl border p-4 shadow-xs space-y-3 ${
                col.isToday ? 'border-[#800020]/40 bg-rose-50/15' : 'border-stone-200/90 bg-white'
              }`}
            >
              {/* Day Header */}
              <View className="flex-row items-center justify-between pb-2 border-b border-stone-100">
                <View className="flex-row items-center gap-2">
                  <Text
                    className={`text-sm font-bold uppercase tracking-wider ${
                      col.isToday ? 'text-[#800020]' : 'text-stone-700'
                    }`}
                  >
                    {col.dayOfWeekName}
                  </Text>
                  <Text className="text-sm font-semibold text-stone-500">
                    {formatShortDate(col.dateString)}
                  </Text>
                  {col.isToday && (
                    <View className="bg-[#800020] rounded-md px-1.5 py-0.2">
                      <Text className="text-[10px] font-bold text-white uppercase">Today</Text>
                    </View>
                  )}
                </View>

                {canAddHere ? (
                  <Pressable
                    onPress={() => onAddEvent(col.dateString)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add event on ${col.dayOfWeekName}`}
                    className="flex-row items-center gap-1 rounded-lg bg-stone-100 hover:bg-stone-200 active:bg-stone-300 px-2.5 py-1"
                  >
                    <Plus size={13} color="#44403c" aria-hidden={true} />
                    <Text className="text-xs font-semibold text-stone-700">Add</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Day's Events */}
              {!hasEvents ? (
                <Text className="text-xs text-stone-400 py-1">No scheduled performances</Text>
              ) : (
                <View className="space-y-2">
                  {col.events.map((ev) => (
                    <EventSummaryCard
                      key={ev.id}
                      event={ev}
                      onPress={onSelectEvent}
                      showDate={false}
                      isAdmin={isAdmin}
                      compact={true}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  }

  // Tablet & Desktop: 7-column Week Board
  return (
    <View className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
      <View className="flex-row divide-x divide-stone-200/70">
        {weekDays.map((col) => {
          const canAddHere = isAdmin && onAddEvent;

          return (
            <View
              key={col.dateString}
              className={`flex-1 min-w-0 p-3 flex-col justify-between min-h-[300px] ${
                col.isToday ? 'bg-rose-50/15' : 'bg-white'
              }`}
            >
              {/* Day Header */}
              <View className="mb-3 pb-2 border-b border-stone-100 flex-row items-center justify-between">
                <View>
                  <Text className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    {col.dayOfWeekName.slice(0, 3)}
                  </Text>
                  <View className="flex-row items-center gap-1.5 mt-0.5">
                    <Text
                      className={`text-lg font-extrabold ${
                        col.isToday ? 'text-[#800020]' : 'text-stone-900'
                      }`}
                    >
                      {col.dayOfMonth}
                    </Text>
                    {col.isToday && (
                      <View className="bg-rose-100 rounded-md px-1 py-0.2">
                        <Text className="text-[9px] font-black text-[#800020] uppercase">
                          Today
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {canAddHere ? (
                  <Pressable
                    onPress={() => onAddEvent(col.dateString)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add event on ${col.dateString}`}
                    className="h-6 w-6 items-center justify-center rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700"
                  >
                    <Plus size={13} color="#78716c" aria-hidden={true} />
                  </Pressable>
                ) : null}
              </View>

              {/* Day Events Column */}
              <View className="flex-1 space-y-2">
                {col.events.map((ev) => {
                  const showtime = formatShowtimeRange(ev.start_time, ev.end_time);

                  return (
                    <Pressable
                      key={ev.id}
                      onPress={() => onSelectEvent(ev)}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${ev.title}`}
                      className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-2.5 hover:bg-rose-50/70 hover:border-rose-200 active:bg-rose-100 transition-colors"
                      style={
                        Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined
                      }
                    >
                      <Text
                        numberOfLines={1}
                        className="text-xs font-bold text-stone-900 leading-tight"
                      >
                        {ev.title}
                      </Text>

                      {ev.performer_name ? (
                        <Text
                          numberOfLines={1}
                          className="text-[11px] font-medium text-stone-600 mt-0.5"
                        >
                          {ev.performer_name}
                        </Text>
                      ) : null}

                      {showtime ? (
                        <Text className="text-[10px] font-bold text-[#800020] mt-1">
                          {showtime}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}

                {col.events.length === 0 ? (
                  <Text className="text-[11px] text-stone-400 pt-1 text-center">No events</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};
