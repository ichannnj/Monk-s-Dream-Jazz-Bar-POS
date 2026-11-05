import React, { useMemo } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Music, Clock, Wrench, ChevronRight } from 'lucide-react-native';
import { useEventStore } from '../../application/useEventStore';
import type { VenueEvent } from '../../domain/event.types';

interface TodaysEventBannerProps {
  onPressEvent?: (event: VenueEvent) => void;
  compact?: boolean;
}

export const TodaysEventBanner: React.FC<TodaysEventBannerProps> = ({
  onPressEvent,
  compact = false,
}) => {
  const { events, openEventDetail } = useEventStore();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todaysEvent = useMemo(() => {
    return events.find((ev) => ev.event_date === todayStr && ev.status !== 'cancelled') || null;
  }, [events, todayStr]);

  if (!todaysEvent) return null;

  const handlePress = () => {
    if (onPressEvent) {
      onPressEvent(todaysEvent);
    } else {
      openEventDetail(todaysEvent);
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

  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        className="flex flex-row items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-1.5 transition-all hover:bg-rose-100 shadow-xs"
      >
        {todaysEvent.poster_url ? (
          <Image
            source={{ uri: todaysEvent.poster_url }}
            className="h-6 w-6 rounded-md object-cover"
          />
        ) : (
          <Music size={14} color="#800020" />
        )}
        <View className="flex flex-row items-center gap-1.5">
          <Text className="text-[11px] font-black text-[#800020] uppercase tracking-wider">
            Tonight:
          </Text>
          <Text numberOfLines={1} className="max-w-[150px] text-xs font-bold text-stone-900">
            {todaysEvent.title}
          </Text>
          <Text className="text-[11px] font-semibold text-[#800020]">
            ({formatTime(todaysEvent.start_time)})
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      className="group relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs transition-all hover:border-[#800020]/60 hover:shadow-sm"
    >
      <View className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <View className="flex flex-row items-center gap-4 flex-1 min-w-0">
          {/* Hero Thumbnail */}
          {todaysEvent.poster_url ? (
            <View className="h-16 w-16 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 flex-shrink-0 shadow-xs">
              <Image
                source={{ uri: todaysEvent.poster_url }}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                resizeMode="cover"
              />
            </View>
          ) : (
            <View className="h-16 w-16 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center flex-shrink-0">
              <Music size={26} color="#800020" />
            </View>
          )}

          <View className="flex-1 min-w-0">
            <View className="flex flex-row items-center gap-2 mb-1">
              <View className="bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                <Text className="text-[10px] font-black text-[#800020] uppercase tracking-wider">
                  TONIGHT AT MONK'S DREAM
                </Text>
              </View>
              {todaysEvent.genre && (
                <Text className="text-xs font-semibold text-stone-500">{todaysEvent.genre}</Text>
              )}
            </View>

            <Text
              numberOfLines={1}
              className="text-lg font-bold text-stone-900 group-hover:text-[#800020] transition-colors"
            >
              {todaysEvent.title}
            </Text>
            {todaysEvent.performer_name && (
              <Text numberOfLines={1} className="text-xs font-semibold text-[#800020]">
                {todaysEvent.performer_name}
              </Text>
            )}
          </View>
        </View>

        {/* Timings & Action Link */}
        <View className="flex flex-row items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 flex-shrink-0">
          <View className="flex flex-row items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
            <Clock size={14} color="#800020" />
            <Text className="text-xs font-bold text-stone-800">
              Show: {formatTime(todaysEvent.start_time)}
            </Text>
          </View>

          {todaysEvent.sound_check_time && (
            <View className="hidden md:flex flex-row items-center gap-1.5 bg-rose-50/70 px-3 py-1.5 rounded-xl border border-rose-200">
              <Wrench size={13} color="#800020" />
              <Text className="text-xs text-stone-700">
                Sound Check:{' '}
                <Text className="font-bold text-[#800020]">
                  {formatTime(todaysEvent.sound_check_time)}
                </Text>
              </Text>
            </View>
          )}

          <View className="flex flex-row items-center gap-1 text-[#800020] font-bold text-xs group-hover:translate-x-0.5 transition-transform">
            <Text className="text-xs font-bold text-[#800020]">View Details</Text>
            <ChevronRight size={16} color="#800020" />
          </View>
        </View>
      </View>
    </Pressable>
  );
};
