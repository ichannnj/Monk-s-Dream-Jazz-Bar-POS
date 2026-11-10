import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Image, Platform } from 'react-native';
import { Plus, Clock, Music } from 'lucide-react-native';
import type { VenueEvent, CalendarDayCell } from '../../domain/event.types';
import { useResponsive } from '@/features/shared';
import {
  getManilaTodayDateString,
  formatShowtimeRange,
  formatShortDate,
} from '../utils/eventFormatters';
import { EventSummaryCard } from './EventSummaryCard';

interface MonthCalendarGridProps {
  currentDate: Date;
  events: VenueEvent[];
  onSelectEvent: (event: VenueEvent) => void;
  onAddEvent?: (dateString: string) => void;
  isAdmin?: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MonthCalendarGrid: React.FC<MonthCalendarGridProps> = ({
  currentDate,
  events,
  onSelectEvent,
  onAddEvent,
  isAdmin = false,
}) => {
  const { isMobile } = useResponsive();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const todayStr = getManilaTodayDateString();

  // Selected date for phone view
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, VenueEvent[]>();
    events.forEach((ev) => {
      const list = map.get(ev.event_date) || [];
      list.push(ev);
      map.set(ev.event_date, list);
    });
    return map;
  }, [events]);

  // Compute 35 or 42 calendar cells
  const calendarCells: CalendarDayCell[] = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const cells: CalendarDayCell[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const d = new Date(year, month - 1, pDay);
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
      cells.push({
        date: d,
        dateString,
        dayOfMonth: pDay,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
        events: eventsByDate.get(dateString) || [],
      });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        date: d,
        dateString,
        dayOfMonth: day,
        isCurrentMonth: true,
        isToday: dateString === todayStr,
        events: eventsByDate.get(dateString) || [],
      });
    }

    // Trailing next month padding
    const remaining = (7 - (cells.length % 7)) % 7;
    const targetLength = cells.length + remaining < 35 ? 35 : cells.length + remaining;
    let nextMonthDay = 1;
    while (cells.length < targetLength) {
      const d = new Date(year, month + 1, nextMonthDay);
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(nextMonthDay).padStart(2, '0')}`;
      cells.push({
        date: d,
        dateString,
        dayOfMonth: nextMonthDay,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
        events: eventsByDate.get(dateString) || [],
      });
      nextMonthDay++;
    }

    return cells;
  }, [year, month, eventsByDate, todayStr]);

  // Phone view (<768px): Compact monthly grid boxes that showcase the event poster inside the cell
  if (isMobile) {
    const selectedDateEvents = eventsByDate.get(selectedDateStr) || [];

    return (
      <View className="space-y-4">
        <View className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-2.5 sm:p-3 shadow-xs">
          {/* Weekday labels */}
          <View className="flex-row items-center justify-between mb-1.5 pb-1.5 border-b border-stone-100">
            {WEEKDAYS.map((day) => (
              <View key={day} className="flex-1 items-center">
                <Text className="text-[10px] font-bold text-stone-500 uppercase">
                  {day.slice(0, 1)}
                </Text>
              </View>
            ))}
          </View>

          {/* Month day grid */}
          <View className="flex-row flex-wrap -m-0.5">
            {calendarCells.map((cell) => {
              const isSelected = cell.dateString === selectedDateStr;
              const hasEvents = cell.events.length > 0;
              const firstEventWithPoster = cell.events.find((e) => Boolean(e.poster_url));
              const posterUrl = firstEventWithPoster?.poster_url;

              return (
                <View key={cell.dateString} className="w-[14.28%] p-0.5">
                  <Pressable
                    onPress={() => setSelectedDateStr(cell.dateString)}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatShortDate(cell.dateString)}, ${cell.events.length} events`}
                    style={
                      Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined
                    }
                    className={`relative w-full aspect-square rounded-xl overflow-hidden flex-col justify-between p-1 border transition-colors ${
                      isSelected
                        ? 'border-[#800020] ring-2 ring-[#800020] ring-inset shadow-xs'
                        : cell.isToday
                          ? 'border-[#800020]/40 bg-rose-50/20'
                          : cell.isCurrentMonth
                            ? 'border-stone-200/80 bg-stone-50/40 active:bg-stone-100'
                            : 'border-stone-100 bg-stone-50/10 opacity-30'
                    }`}
                  >
                    {/* Background Poster Artwork if available */}
                    {posterUrl ? (
                      <View className="absolute inset-0 z-0">
                        <Image
                          source={{ uri: posterUrl }}
                          className="h-full w-full object-cover"
                          resizeMode="cover"
                          accessibilityLabel="Event poster preview"
                        />
                        <View className="absolute inset-0 bg-black/45" />
                      </View>
                    ) : null}

                    {/* Day number */}
                    <View className="z-10 flex-row items-center justify-between w-full">
                      <Text
                        className={`text-[10px] sm:text-xs font-bold leading-tight ${
                          posterUrl
                            ? 'text-white drop-shadow-sm'
                            : isSelected
                              ? 'text-[#800020]'
                              : cell.isToday
                                ? 'text-[#800020]'
                                : cell.isCurrentMonth
                                  ? 'text-stone-800'
                                  : 'text-stone-400'
                        }`}
                      >
                        {cell.dayOfMonth}
                      </Text>

                      {hasEvents && !posterUrl ? (
                        <View className="h-1.5 w-1.5 rounded-full bg-[#800020]" />
                      ) : null}
                    </View>

                    {/* Event thumbnail badge on poster cells */}
                    <View className="z-10 w-full flex-row items-center justify-between">
                      {hasEvents ? (
                        <View
                          className={`rounded px-1 py-0.2 ${
                            posterUrl ? 'bg-black/70' : 'bg-[#800020]/10'
                          }`}
                        >
                          <Text
                            className={`text-[8px] font-black ${
                              posterUrl ? 'text-amber-200' : 'text-[#800020]'
                            }`}
                            numberOfLines={1}
                          >
                            {cell.events.length > 1 ? `${cell.events.length} gigs` : 'Gig'}
                          </Text>
                        </View>
                      ) : (
                        <View />
                      )}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* Selected Date Detail Drawer */}
        <View className="rounded-2xl border border-stone-200/90 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
          <View className="flex-row items-center justify-between pb-2 border-b border-stone-100">
            <View>
              <Text className="text-[11px] font-bold text-[#800020] uppercase tracking-wider">
                {selectedDateStr === todayStr ? 'Today' : 'Selected Date'}
              </Text>
              <Text className="text-base font-bold text-stone-900">
                {formatShortDate(selectedDateStr)}
              </Text>
            </View>

            {isAdmin && onAddEvent ? (
              <Pressable
                onPress={() => onAddEvent(selectedDateStr)}
                accessibilityRole="button"
                accessibilityLabel={`Schedule event on ${formatShortDate(selectedDateStr)}`}
                className="flex-row items-center gap-1.5 rounded-xl bg-[#800020] px-3 py-1.5 text-white active:bg-[#66001a]"
              >
                <Plus size={14} color="#ffffff" aria-hidden={true} />
                <Text className="text-xs font-bold text-white">Add</Text>
              </Pressable>
            ) : null}
          </View>

          {selectedDateEvents.length === 0 ? (
            <View className="py-4 items-center justify-center">
              <Text className="text-xs text-stone-400">
                No performances scheduled on this date.
              </Text>
            </View>
          ) : (
            <View className="space-y-2">
              {selectedDateEvents.map((ev) => (
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
      </View>
    );
  }

  // Tablet & Desktop (>=768px): Full 7-column calendar with event poster thumbnails inside boxes
  return (
    <View className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
      {/* Weekday Header */}
      <View className="flex-row border-b border-stone-200 bg-stone-50/90">
        {WEEKDAYS.map((day, idx) => (
          <View
            key={day}
            className={`flex-1 py-2.5 sm:py-3 text-center items-center justify-center ${
              idx === 0 || idx === 6 ? 'bg-stone-100/40' : ''
            }`}
          >
            <Text className="text-[11px] sm:text-xs font-bold tracking-wider text-stone-600 uppercase">
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View className="flex-row flex-wrap divide-y divide-stone-200/70">
        {calendarCells.map((cell) => {
          const canAddHere = isAdmin && cell.isCurrentMonth && onAddEvent;

          return (
            <View
              key={cell.dateString}
              className={`w-[14.28%] min-h-[135px] sm:min-h-[160px] p-2 border-r border-stone-200/70 flex-col justify-between ${
                !cell.isCurrentMonth
                  ? 'bg-stone-50/40 opacity-40'
                  : cell.isToday
                    ? 'bg-rose-50/20'
                    : 'bg-white'
              }`}
            >
              {/* Day Number Header */}
              <View className="flex-row items-center justify-between mb-1.5">
                <Text
                  className={`text-xs font-semibold ${
                    cell.isToday
                      ? 'h-6 w-6 rounded-full bg-[#800020] text-center font-bold text-white leading-6 text-[11px]'
                      : cell.isCurrentMonth
                        ? 'text-stone-800'
                        : 'text-stone-400'
                  }`}
                >
                  {cell.dayOfMonth}
                </Text>

                {canAddHere ? (
                  <Pressable
                    onPress={() => onAddEvent(cell.dateString)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add event on ${cell.dateString}`}
                    className="h-6 w-6 items-center justify-center rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700"
                  >
                    <Plus size={12} color="#78716c" aria-hidden={true} />
                  </Pressable>
                ) : null}
              </View>

              {/* Event Cards inside Day Cell with Poster Previews */}
              <View className="flex-1 space-y-1.5">
                {cell.events.slice(0, 2).map((ev) => {
                  const showtime = formatShowtimeRange(ev.start_time, ev.end_time);

                  return (
                    <Pressable
                      key={ev.id}
                      onPress={() => onSelectEvent(ev)}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${ev.title}`}
                      className="group/card relative overflow-hidden rounded-lg border border-stone-200/90 bg-white hover:border-[#800020] active:bg-rose-50 transition-colors shadow-2xs"
                      style={
                        Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined
                      }
                    >
                      {/* Hero Thumbnail Banner */}
                      {ev.poster_url ? (
                        <View className="relative h-10 sm:h-12 w-full overflow-hidden bg-stone-100">
                          <Image
                            source={{ uri: ev.poster_url }}
                            className="h-full w-full object-cover"
                            resizeMode="cover"
                            accessibilityLabel={`${ev.title} poster`}
                          />
                          <View className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                          <View className="absolute bottom-0.5 left-1 right-1">
                            <Text
                              numberOfLines={1}
                              className="text-[10px] sm:text-[11px] font-bold text-white leading-tight drop-shadow-sm"
                            >
                              {ev.title}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View className="flex-row items-center gap-1 bg-rose-50/90 p-1 sm:p-1.5 border-b border-rose-100">
                          <Music size={11} color="#800020" aria-hidden={true} />
                          <Text
                            numberOfLines={1}
                            className="flex-1 text-[10px] sm:text-[11px] font-bold text-stone-900"
                          >
                            {ev.title}
                          </Text>
                        </View>
                      )}

                      {/* Event Meta Line */}
                      <View className="flex-row items-center justify-between bg-white px-1.5 py-0.5 border-t border-stone-100">
                        {showtime ? (
                          <View className="flex-row items-center gap-0.5">
                            <Clock size={9} color="#800020" aria-hidden={true} />
                            <Text className="text-[9px] sm:text-[10px] font-bold text-[#800020]">
                              {showtime.split('–')[0]?.trim()}
                            </Text>
                          </View>
                        ) : null}

                        {ev.genre ? (
                          <Text
                            numberOfLines={1}
                            className="text-[9px] text-stone-500 font-medium max-w-[60px]"
                          >
                            {ev.genre}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}

                {cell.events.length > 2 ? (
                  <Text className="text-[10px] font-semibold text-stone-500 pl-1">
                    +{cell.events.length - 2} more
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};
