import React from 'react';
import { View, Text, Pressable, Image, Platform } from 'react-native';
import { Clock, Music, Calendar, ChevronRight } from 'lucide-react-native';
import { useEventStore } from '../../application/useEventStore';
import type { VenueEvent } from '../../domain/event.types';
import { getManilaTodayDateString, formatShowtimeRange } from '../utils/eventFormatters';
import { toBusinessDate } from '@/features/shared/utils/businessDay';

interface TodaysEventBannerProps {
  onPressEvent?: (event: VenueEvent) => void;
  compact?: boolean;
}

export const TodaysEventBanner: React.FC<TodaysEventBannerProps> = ({
  onPressEvent,
  compact = false,
}) => {
  const { events, openEventDetail, setViewMode } = useEventStore();

  const businessDateStr = toBusinessDate();
  const calendarDateStr = getManilaTodayDateString();

  const todayEvents = React.useMemo(() => {
    const active = events.filter((ev) => ev.status !== 'cancelled');
    const matched = active.filter((ev) => ev.event_date === businessDateStr);
    if (matched.length > 0) return matched;
    return active.filter((ev) => ev.event_date === calendarDateStr);
  }, [events, businessDateStr, calendarDateStr]);

  if (todayEvents.length === 0) return null;

  const firstEvent = todayEvents[0];
  const multipleCount = todayEvents.length;

  const handlePress = () => {
    if (onPressEvent) {
      onPressEvent(firstEvent);
    } else {
      openEventDetail(firstEvent);
    }
  };

  const showtime = formatShowtimeRange(firstEvent.start_time, firstEvent.end_time);

  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Today's performance: ${firstEvent.title}`}
        style={Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined}
        className="flex-row items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-1.5 active:bg-rose-100 shadow-xs"
      >
        {firstEvent.poster_url ? (
          <Image
            source={{ uri: firstEvent.poster_url }}
            className="h-6 w-6 rounded-md object-cover"
            resizeMode="cover"
            accessibilityLabel={`${firstEvent.title} thumbnail`}
          />
        ) : (
          <Music size={14} color="#800020" aria-hidden={true} />
        )}
        <View className="flex-row items-center gap-1.5 min-w-0">
          <Text className="text-[11px] font-bold text-[#800020] uppercase tracking-wider">
            Tonight:
          </Text>
          <Text numberOfLines={1} className="max-w-[150px] text-xs font-bold text-stone-900">
            {firstEvent.title}
          </Text>
          {showtime ? (
            <Text className="text-[11px] font-semibold text-[#800020]">({showtime})</Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Tonight at Monk's Dream: ${firstEvent.title}${firstEvent.performer_name ? `, by ${firstEvent.performer_name}` : ''}. Tap to view details.`}
      style={
        Platform.OS === 'web'
          ? ({
              cursor: 'pointer',
              touchAction: 'manipulation',
            } as any)
          : undefined
      }
      className="group relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-[#800020]/60 active:bg-stone-50 transition-colors"
    >
      <View className="flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <View className="flex-row items-center gap-3 sm:gap-4 flex-1 min-w-0">
          {/* Thumbnail */}
          {firstEvent.poster_url ? (
            <View className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 flex-shrink-0 shadow-xs">
              <Image
                source={{ uri: firstEvent.poster_url }}
                className="h-full w-full object-cover"
                resizeMode="cover"
                accessibilityLabel={`${firstEvent.title} poster`}
              />
            </View>
          ) : (
            <View className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center flex-shrink-0">
              <Music size={24} color="#800020" aria-hidden={true} />
            </View>
          )}

          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-2 mb-1 flex-wrap">
              <View className="bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                <Text className="text-[10px] font-bold text-[#800020] uppercase tracking-wider">
                  Tonight at Monk's Dream
                </Text>
              </View>

              {multipleCount > 1 ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setViewMode('agenda');
                  }}
                  className="rounded-md bg-stone-100 px-1.5 py-0.5 border border-stone-200 hover:bg-stone-200"
                  accessibilityRole="button"
                  accessibilityLabel={`${multipleCount} events scheduled for today. Show agenda view.`}
                >
                  <Text className="text-[10px] font-semibold text-stone-700">
                    +{multipleCount - 1} more today
                  </Text>
                </Pressable>
              ) : null}

              {firstEvent.genre ? (
                <Text className="text-xs font-semibold text-stone-500" numberOfLines={1}>
                  {firstEvent.genre}
                </Text>
              ) : null}

              {firstEvent.has_door_charge ? (
                <View className="rounded-md bg-rose-50 px-1.5 py-0.5 border border-rose-200">
                  <Text className="text-[10px] font-extrabold text-[#800020]">
                    ₱{Number(firstEvent.door_charge_amount || 0).toFixed(0)} Door
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              numberOfLines={1}
              className="text-base sm:text-lg font-bold text-stone-900 group-hover:text-[#800020] transition-colors leading-snug"
            >
              {firstEvent.title}
            </Text>

            {firstEvent.performer_name ? (
              <Text numberOfLines={1} className="text-xs font-semibold text-[#800020]">
                {firstEvent.performer_name}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Timings & Action Cue */}
        <View className="flex-row items-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 flex-shrink-0 justify-between sm:justify-end">
          {showtime ? (
            <View className="flex-row items-center gap-1.5 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200">
              <Clock size={13} color="#800020" aria-hidden={true} />
              <Text className="text-xs font-bold text-stone-800">Show: {showtime}</Text>
            </View>
          ) : null}

          <View className="flex-row items-center gap-1 text-[#800020]">
            <Text className="text-xs font-bold text-[#800020]">View details</Text>
            <ChevronRight size={14} color="#800020" aria-hidden={true} />
          </View>
        </View>
      </View>
    </Pressable>
  );
};
