import React, { useMemo } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Plus, Clock, Music } from 'lucide-react-native';
import type { VenueEvent, CalendarDayCell } from '../../domain/event.types';

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
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Compute calendar grid cells (42 cells: 6 weeks x 7 days)
  const calendarCells: CalendarDayCell[] = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const todayStr = new Date().toISOString().slice(0, 10);

    const eventsByDate = new Map<string, VenueEvent[]>();
    events.forEach((ev) => {
      const list = eventsByDate.get(ev.event_date) || [];
      list.push(ev);
      eventsByDate.set(ev.event_date, list);
    });

    const cells: CalendarDayCell[] = [];

    // Previous month padding days
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

    // Trailing next month days to complete 35 or 42 cells
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
  }, [year, month, events]);

  const formatEventTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  return (
    <View className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
      {/* Scrollable Container on Mobile */}
      <View className="overflow-x-auto w-full">
        <View className="min-w-[640px] sm:min-w-0">
          {/* Weekday Header */}
          <View className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/90">
            {WEEKDAYS.map((day, idx) => (
              <View
                key={day}
                className={`py-2.5 sm:py-3 text-center ${idx === 0 || idx === 6 ? 'bg-stone-100/50' : ''}`}
              >
                <Text className="text-center text-[11px] sm:text-xs font-bold tracking-wider text-stone-600 uppercase">
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar 7-Column Grid */}
          <View className="grid grid-cols-7 divide-x divide-y divide-stone-200/70">
            {calendarCells.map((cell) => {
              const canAddHere = isAdmin && cell.isCurrentMonth && onAddEvent;

              return (
                <Pressable
                  key={cell.dateString}
                  onPress={() => {
                    if (canAddHere) {
                      onAddEvent(cell.dateString);
                    }
                  }}
                  disabled={!canAddHere}
                  className={`group relative flex min-h-[110px] sm:min-h-[145px] flex-col p-1.5 sm:p-2.5 transition-colors ${
                    canAddHere ? 'cursor-pointer' : ''
                  } ${
                    !cell.isCurrentMonth
                      ? 'bg-stone-50/40 opacity-40'
                      : cell.isToday
                        ? 'bg-rose-50/25 ring-1 ring-[#800020]/25 ring-inset hover:bg-rose-50/40'
                        : 'bg-white hover:bg-stone-50/80'
                  }`}
                >
                  {/* Day Cell Header */}
                  <View className="mb-1 sm:mb-2 flex flex-row items-center justify-between pointer-events-none">
                    <View className="flex flex-row items-center gap-1 sm:gap-1.5">
                      <Text
                        className={`text-xs sm:text-sm font-semibold ${
                          cell.isToday
                            ? 'flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-[#800020] text-center font-bold text-white leading-5 sm:leading-6 text-[10px] sm:text-xs'
                            : cell.isCurrentMonth
                              ? 'text-stone-800'
                              : 'text-stone-400'
                        }`}
                      >
                        {cell.dayOfMonth}
                      </Text>
                      {cell.isToday && (
                        <Text className="hidden text-[10px] font-extrabold tracking-wide text-[#800020] uppercase sm:inline">
                          TODAY
                        </Text>
                      )}
                    </View>

                    {/* Optional indicator showing this day can be clicked to add */}
                    {canAddHere && (
                      <View className="flex h-5 w-5 items-center justify-center rounded-md bg-stone-100 text-stone-400 opacity-0 group-hover:opacity-100 group-hover:bg-[#800020] group-hover:text-white transition-all">
                        <Plus size={12} color="currentColor" />
                      </View>
                    )}
                  </View>

                  {/* Event Cards inside cell */}
                  <View className="flex flex-1 flex-col space-y-1 sm:space-y-1.5">
                    {cell.events.slice(0, 2).map((ev) => (
                      <Pressable
                        key={ev.id}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          onSelectEvent(ev);
                        }}
                        className="group/card relative flex cursor-pointer overflow-hidden rounded-lg sm:rounded-xl border border-stone-200 bg-white shadow-xs transition-all hover:scale-[1.01] hover:border-[#800020] hover:shadow-xs"
                      >
                        {/* Hero Thumbnail Banner */}
                        {ev.poster_url ? (
                          <View className="relative h-10 sm:h-14 w-full overflow-hidden bg-stone-100">
                            <Image
                              source={{ uri: ev.poster_url }}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                              resizeMode="cover"
                            />
                            <View className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                            <View className="absolute bottom-0.5 sm:bottom-1 left-1 sm:left-1.5 right-1 sm:right-1.5">
                              <Text
                                numberOfLines={1}
                                className="text-[10px] sm:text-[11px] font-bold tracking-tight text-white drop-shadow"
                              >
                                {ev.title}
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View className="flex flex-row items-center gap-1 bg-rose-50 px-1.5 sm:px-2 py-1 sm:py-1.5">
                            <Music size={11} color="#800020" />
                            <Text
                              numberOfLines={1}
                              className="flex-1 text-[10px] sm:text-[11px] font-bold text-stone-900"
                            >
                              {ev.title}
                            </Text>
                          </View>
                        )}

                        {/* Event Meta Line */}
                        <View className="flex flex-row items-center justify-between bg-white px-1.5 sm:px-2 py-0.5 sm:py-1 border-t border-stone-100">
                          <View className="flex flex-row items-center gap-1">
                            <Clock size={10} color="#800020" />
                            <Text className="text-[9px] sm:text-[10px] font-bold text-[#800020]">
                              {formatEventTime(ev.start_time)}
                            </Text>
                          </View>
                          {ev.genre && (
                            <Text
                              numberOfLines={1}
                              className="hidden sm:inline max-w-[70px] text-[9px] font-medium text-stone-500"
                            >
                              {ev.genre}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    ))}

                    {/* Overflow count badge */}
                    {cell.events.length > 2 && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          onSelectEvent(cell.events[2]);
                        }}
                        className="rounded-lg bg-stone-100 py-0.5 text-center transition-colors hover:bg-stone-200"
                      >
                        <Text className="text-center text-[9px] sm:text-[10px] font-bold text-stone-700">
                          +{cell.events.length - 2} more gig{cell.events.length - 2 > 1 ? 's' : ''}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};
