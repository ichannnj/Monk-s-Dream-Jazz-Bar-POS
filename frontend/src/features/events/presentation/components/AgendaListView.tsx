import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Clock, Music, Calendar, Wrench, Users, ChevronRight } from 'lucide-react-native';
import type { VenueEvent } from '../../domain/event.types';

interface AgendaListViewProps {
  events: VenueEvent[];
  onSelectEvent: (event: VenueEvent) => void;
  isAdmin?: boolean;
}

export const AgendaListView: React.FC<AgendaListViewProps> = ({ events, onSelectEvent }) => {
  const formatFullDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  if (events.length === 0) {
    return (
      <View className="rounded-2xl border border-stone-200/90 bg-white p-12 text-center flex items-center justify-center shadow-xs">
        <Calendar size={40} color="#a8a29e" style={{ marginBottom: 12 }} />
        <Text className="text-lg font-bold text-stone-800">No Events Scheduled</Text>
        <Text className="text-sm text-stone-500 mt-1 max-w-sm text-center">
          There are no upcoming jazz gigs or special tasting nights scheduled for this period.
        </Text>
      </View>
    );
  }

  return (
    <View className="space-y-4">
      {events.map((ev) => (
        <Pressable
          key={ev.id}
          onPress={() => onSelectEvent(ev)}
          className="group overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs hover:border-[#800020] transition-all flex flex-col md:flex-row cursor-pointer"
        >
          {/* Hero Image Poster */}
          <View className="w-full md:w-64 h-48 md:h-auto relative overflow-hidden bg-stone-100 flex-shrink-0">
            {ev.poster_url ? (
              <Image
                source={{ uri: ev.poster_url }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full flex items-center justify-center bg-rose-50/50">
                <Music size={36} color="#800020" />
              </View>
            )}
            <View className="absolute top-3 left-3 bg-[#800020] text-white font-black text-xs px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
              <Text className="text-[10px] font-black text-white uppercase tracking-wider">
                {ev.status}
              </Text>
            </View>
          </View>

          {/* Event Content & Logistics Summary */}
          <View className="flex-1 p-5 flex flex-col justify-between">
            <View>
              {/* Date & Genre Line */}
              <View className="flex flex-row items-center justify-between gap-2 mb-2">
                <View className="flex flex-row items-center gap-1.5">
                  <Calendar size={14} color="#800020" />
                  <Text className="text-xs font-bold text-[#800020] uppercase tracking-wide">
                    {formatFullDate(ev.event_date)}
                  </Text>
                </View>

                {ev.genre && (
                  <View className="bg-stone-100 border border-stone-200 rounded-full px-2.5 py-0.5">
                    <Text className="text-[11px] font-semibold text-stone-600">{ev.genre}</Text>
                  </View>
                )}
              </View>

              {/* Title & Performer */}
              <Text className="text-xl font-bold text-stone-900 group-hover:text-[#800020] transition-colors mb-1">
                {ev.title}
              </Text>
              {ev.performer_name && (
                <Text className="text-sm font-semibold text-[#800020] mb-2">
                  {ev.performer_name}
                </Text>
              )}

              {/* Description */}
              {ev.description && (
                <Text numberOfLines={2} className="text-xs text-stone-500 leading-relaxed mb-4">
                  {ev.description}
                </Text>
              )}
            </View>

            {/* Run-of-Show Logistics Chips */}
            <View className="pt-3 border-t border-stone-100 flex flex-wrap flex-row items-center gap-3">
              {/* Showtime */}
              <View className="flex flex-row items-center gap-1.5 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
                <Clock size={13} color="#800020" />
                <Text className="text-xs font-bold text-[#800020]">
                  Show: {formatTime(ev.start_time)}
                  {ev.end_time ? ` – ${formatTime(ev.end_time)}` : ''}
                </Text>
              </View>

              {/* Sound Check */}
              {ev.sound_check_time && (
                <View className="flex flex-row items-center gap-1.5 bg-rose-50/70 px-2.5 py-1 rounded-lg border border-rose-200">
                  <Wrench size={13} color="#800020" />
                  <Text className="text-xs text-stone-700">
                    Sound Check:{' '}
                    <Text className="font-bold text-[#800020]">
                      {formatTime(ev.sound_check_time)}
                    </Text>
                  </Text>
                </View>
              )}

              {/* Reserved Tables */}
              {ev.reserved_tables && (
                <View className="flex flex-row items-center gap-1.5 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
                  <Users size={13} color="#78716c" />
                  <Text className="text-xs text-stone-600">{ev.reserved_tables}</Text>
                </View>
              )}

              <View className="ml-auto flex flex-row items-center gap-1 text-[#800020] group-hover:translate-x-0.5 transition-transform">
                <Text className="text-xs font-bold text-[#800020]">Details & Logistics</Text>
                <ChevronRight size={14} color="#800020" />
              </View>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
};
