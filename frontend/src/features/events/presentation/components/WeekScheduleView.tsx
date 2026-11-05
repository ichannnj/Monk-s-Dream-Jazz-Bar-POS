import React, { useMemo } from 'react';
import { View, Text, Pressable, Image, ScrollView } from 'react-native';
import { Clock, Music, Wrench, Users, Plus, Mic } from 'lucide-react-native';
import type { VenueEvent } from '../../domain/event.types';

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
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay();
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);

    const todayStr = new Date().toISOString().slice(0, 10);
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
  }, [currentDate, events]);

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  return (
    <View className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
      <ScrollView horizontal showsHorizontalScrollIndicator={true} className="w-full">
        <View className="flex flex-row divide-x divide-stone-200/70 min-w-[1050px]">
          {weekDays.map((col) => {
            const canAddHere = isAdmin && onAddEvent;

            return (
              <Pressable
                key={col.dateString}
                onPress={() => {
                  if (canAddHere) {
                    onAddEvent(col.dateString);
                  }
                }}
                disabled={!canAddHere}
                className={`flex-1 min-w-[150px] flex-col p-3.5 transition-colors ${
                  canAddHere ? 'cursor-pointer hover:bg-stone-50/80' : ''
                } ${col.isToday ? 'bg-rose-50/20' : 'bg-white'}`}
              >
                {/* Day Header */}
                <View className="mb-4 pb-3 border-b border-stone-100 flex flex-row items-center justify-between pointer-events-none">
                  <View>
                    <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      {col.dayOfWeekName.slice(0, 3)}
                    </Text>
                    <View className="flex flex-row items-center gap-1.5 mt-0.5">
                      <Text
                        className={`text-xl font-extrabold ${
                          col.isToday ? 'text-[#800020]' : 'text-stone-900'
                        }`}
                      >
                        {col.dayOfMonth}
                      </Text>
                      {col.isToday && (
                        <View className="bg-rose-100 rounded-full px-1.5 py-0.5">
                          <Text className="text-[9px] font-bold text-[#800020] uppercase">
                            Today
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {canAddHere && (
                    <View className="h-6 w-6 rounded-md bg-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-[#800020] group-hover:text-white transition-colors">
                      <Plus size={14} color="currentColor" />
                    </View>
                  )}
                </View>

                {/* Gigs & Logistics for this day */}
                <View className="flex-1 space-y-3">
                  {col.events.length === 0 ? (
                    <View className="h-44 border border-dashed border-stone-200 rounded-xl flex items-center justify-center p-3 text-center bg-stone-50/50">
                      <Music size={20} color="#a8a29e" style={{ marginBottom: 4 }} />
                      <Text className="text-xs text-stone-400 font-medium">No Gigs Scheduled</Text>
                      {canAddHere && (
                        <Text className="text-[11px] text-[#800020] font-bold mt-1">
                          Click box to add
                        </Text>
                      )}
                    </View>
                  ) : (
                    col.events.map((ev) => (
                      <Pressable
                        key={ev.id}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          onSelectEvent(ev);
                        }}
                        className="group/week relative rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs hover:border-[#800020] transition-all hover:scale-[1.01]"
                      >
                        {/* Hero Image Poster */}
                        {ev.poster_url && (
                          <View className="h-28 w-full relative overflow-hidden bg-stone-100">
                            <Image
                              source={{ uri: ev.poster_url }}
                              className="h-full w-full object-cover group-hover/week:scale-105 transition-transform duration-300"
                              resizeMode="cover"
                            />
                            <View className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                            <View className="absolute bottom-2 left-2 right-2">
                              <Text
                                numberOfLines={2}
                                className="text-xs font-bold text-white drop-shadow leading-tight"
                              >
                                {ev.title}
                              </Text>
                            </View>
                          </View>
                        )}

                        <View className="p-3 space-y-2">
                          {!ev.poster_url && (
                            <Text numberOfLines={2} className="text-xs font-bold text-stone-900">
                              {ev.title}
                            </Text>
                          )}

                          {/* Performer / Genre */}
                          {ev.performer_name && (
                            <View className="flex flex-row items-center gap-1.5">
                              <Mic size={12} color="#800020" />
                              <Text
                                numberOfLines={1}
                                className="text-[11px] font-bold text-[#800020]"
                              >
                                {ev.performer_name}
                              </Text>
                            </View>
                          )}

                          {/* Showtime Badge */}
                          <View className="flex flex-row items-center justify-between bg-stone-50 rounded-md px-2 py-1 border border-stone-200">
                            <View className="flex flex-row items-center gap-1">
                              <Clock size={11} color="#800020" />
                              <Text className="text-[10px] font-bold text-[#800020]">
                                {formatTime(ev.start_time)}
                                {ev.end_time ? ` – ${formatTime(ev.end_time)}` : ''}
                              </Text>
                            </View>
                            {ev.genre && (
                              <Text
                                numberOfLines={1}
                                className="text-[9px] text-stone-500 font-medium"
                              >
                                {ev.genre}
                              </Text>
                            )}
                          </View>

                          {/* Backstage Sound Check Block */}
                          {ev.sound_check_time && (
                            <View className="bg-rose-50/70 border border-rose-200 rounded-md px-2 py-1 flex flex-row items-center gap-1.5">
                              <Wrench size={10} color="#800020" />
                              <Text className="text-[10px] text-stone-700">
                                Sound Check:{' '}
                                <Text className="font-bold text-[#800020]">
                                  {formatTime(ev.sound_check_time)}
                                </Text>
                              </Text>
                            </View>
                          )}

                          {/* Reserved Tables */}
                          {ev.reserved_tables && (
                            <View className="flex flex-row items-center gap-1.5 px-0.5">
                              <Users size={10} color="#78716c" />
                              <Text numberOfLines={1} className="text-[10px] text-stone-500">
                                {ev.reserved_tables}
                              </Text>
                            </View>
                          )}
                        </View>
                      </Pressable>
                    ))
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};
