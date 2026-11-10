import React from 'react';
import { View, Text, Pressable, Image, Platform } from 'react-native';
import { Clock, Music, Calendar } from 'lucide-react-native';
import type { VenueEvent } from '../../domain/event.types';
import { formatFullDate, formatShowtimeRange } from '../utils/eventFormatters';

interface AgendaListViewProps {
  events: VenueEvent[];
  onSelectEvent: (event: VenueEvent) => void;
  isAdmin?: boolean;
}

export const AgendaListView: React.FC<AgendaListViewProps> = ({ events, onSelectEvent }) => {
  if (events.length === 0) {
    return (
      <View className="rounded-2xl border border-stone-200/90 bg-white p-8 sm:p-12 items-center justify-center shadow-xs">
        <Calendar size={36} color="#a8a29e" aria-hidden={true} style={{ marginBottom: 12 }} />
        <Text className="text-base sm:text-lg font-bold text-stone-800">No events scheduled</Text>
        <Text className="text-xs sm:text-sm text-stone-500 mt-1 max-w-sm text-center">
          There are no upcoming jazz gigs or tasting sessions scheduled for this period.
        </Text>
      </View>
    );
  }

  // Group events by date
  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, VenueEvent[]>();
    events.forEach((ev) => {
      const list = map.get(ev.event_date) || [];
      list.push(ev);
      map.set(ev.event_date, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  return (
    <View className="space-y-4">
      {eventsByDate.map(([dateStr, dateEvents]) => (
        <View key={dateStr} className="space-y-2">
          {/* Date Section Header */}
          <View className="flex-row items-center gap-2 px-1">
            <Calendar size={14} color="#800020" aria-hidden={true} />
            <Text className="text-xs font-bold text-[#800020] uppercase tracking-wide">
              {formatFullDate(dateStr)}
            </Text>
            <View className="h-px flex-1 bg-stone-200/80" />
          </View>

          {/* List of Events for this Date */}
          <View className="space-y-2">
            {dateEvents.map((ev) => {
              const showtime = formatShowtimeRange(ev.start_time, ev.end_time);

              return (
                <Pressable
                  key={ev.id}
                  onPress={() => onSelectEvent(ev)}
                  accessibilityRole="button"
                  accessibilityLabel={`Event details for ${ev.title}${ev.performer_name ? `, by ${ev.performer_name}` : ''}`}
                  style={
                    Platform.OS === 'web'
                      ? ({
                          cursor: 'pointer',
                          touchAction: 'manipulation',
                        } as any)
                      : undefined
                  }
                  className="group overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs hover:border-[#800020]/60 active:bg-stone-50 transition-colors flex-col sm:flex-row"
                >
                  {/* Poster Thumbnail */}
                  <View className="w-full sm:w-40 sm:min-w-[160px] h-36 sm:h-auto relative overflow-hidden bg-stone-100 flex-shrink-0">
                    {ev.poster_url ? (
                      <Image
                        source={{ uri: ev.poster_url }}
                        className="w-full h-full object-cover"
                        resizeMode="cover"
                        accessibilityLabel={`${ev.title} poster`}
                      />
                    ) : (
                      <View className="w-full h-full min-h-[110px] items-center justify-center bg-rose-50/50">
                        <Music size={28} color="#800020" aria-hidden={true} />
                      </View>
                    )}

                    {ev.status !== 'scheduled' && (
                      <View className="absolute top-2.5 left-2.5 bg-black/75 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                          {ev.status.replace('_', ' ')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Body Content */}
                  <View className="flex-1 p-3.5 sm:p-4 justify-between flex-col">
                    <View>
                      <View className="flex-row items-center justify-between gap-2 mb-1">
                        {ev.genre ? (
                          <View className="bg-stone-100 border border-stone-200/80 rounded px-2 py-0.5">
                            <Text
                              className="text-[10px] font-semibold text-stone-600"
                              numberOfLines={1}
                            >
                              {ev.genre}
                            </Text>
                          </View>
                        ) : (
                          <View />
                        )}

                        {showtime ? (
                          <View className="flex-row items-center gap-1 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md">
                            <Clock size={11} color="#800020" aria-hidden={true} />
                            <Text className="text-xs font-bold text-stone-800">{showtime}</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text
                        numberOfLines={1}
                        className="text-base sm:text-lg font-bold text-stone-900 group-hover:text-[#800020] transition-colors"
                      >
                        {ev.title}
                      </Text>

                      {ev.performer_name ? (
                        <Text
                          numberOfLines={1}
                          className="text-xs font-semibold text-[#800020] mt-0.5"
                        >
                          {ev.performer_name}
                        </Text>
                      ) : null}

                      {ev.description ? (
                        <Text
                          numberOfLines={2}
                          className="text-xs text-stone-500 leading-relaxed mt-1.5"
                        >
                          {ev.description}
                        </Text>
                      ) : null}
                    </View>

                    <View className="pt-2 sm:pt-3 border-t border-stone-100 flex-row items-center justify-between mt-2">
                      <Text className="text-xs font-semibold text-[#800020]">View details</Text>
                      {ev.sound_check_time ? (
                        <Text className="text-[11px] text-stone-400">
                          Sound check: {ev.sound_check_time.slice(0, 5)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
};
