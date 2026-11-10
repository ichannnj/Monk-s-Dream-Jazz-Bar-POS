import React from 'react';
import { View, Text, Pressable, Image, Platform } from 'react-native';
import { Clock, Music, Calendar } from 'lucide-react-native';
import type { VenueEvent } from '../../domain/event.types';
import { formatShortDate, formatShowtimeRange } from '../utils/eventFormatters';

export interface EventSummaryCardProps {
  event: VenueEvent;
  onPress: (event: VenueEvent) => void;
  showDate?: boolean;
  isAdmin?: boolean;
  compact?: boolean;
}

export const EventSummaryCard: React.FC<EventSummaryCardProps> = ({
  event,
  onPress,
  showDate = true,
  isAdmin = false,
  compact = false,
}) => {
  const showtime = formatShowtimeRange(event.start_time, event.end_time);

  return (
    <Pressable
      onPress={() => onPress(event)}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${event.title}${event.performer_name ? ` by ${event.performer_name}` : ''}`}
      style={
        Platform.OS === 'web'
          ? ({
              cursor: 'pointer',
              touchAction: 'manipulation',
            } as any)
          : undefined
      }
      className={`group w-full flex-row items-center gap-3 rounded-xl border border-stone-200/80 bg-white p-3 shadow-xs hover:border-[#800020]/60 active:bg-stone-50 transition-colors ${
        compact ? 'min-h-[52px]' : 'min-h-[64px]'
      }`}
    >
      {/* Thumbnail or Icon */}
      <View
        className={`${
          compact ? 'h-11 w-11' : 'h-13 w-13'
        } rounded-lg bg-stone-100 border border-stone-200/70 overflow-hidden items-center justify-center flex-shrink-0`}
      >
        {event.poster_url ? (
          <Image
            source={{ uri: event.poster_url }}
            className="h-full w-full object-cover"
            resizeMode="cover"
            accessibilityLabel={`${event.title} poster`}
          />
        ) : (
          <Music size={compact ? 18 : 22} color="#800020" aria-hidden={true} />
        )}
      </View>

      {/* Main Info */}
      <View className="flex-1 min-w-0 justify-center">
        <View className="flex-row items-center gap-2 mb-0.5">
          {showDate && (
            <View className="flex-row items-center gap-1">
              <Calendar size={12} color="#78716c" aria-hidden={true} />
              <Text className="text-xs font-semibold text-stone-600">
                {formatShortDate(event.event_date)}
              </Text>
            </View>
          )}

          {event.genre ? (
            <View className="rounded bg-stone-100 px-1.5 py-0.5 border border-stone-200/60">
              <Text className="text-[10px] font-semibold text-stone-600" numberOfLines={1}>
                {event.genre}
              </Text>
            </View>
          ) : null}

          {event.status !== 'scheduled' && (
            <View
              className={`rounded px-1.5 py-0.2 border ${
                event.status === 'in_progress'
                  ? 'bg-amber-50 border-amber-200'
                  : event.status === 'completed'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-rose-50 border-rose-200'
              }`}
            >
              <Text
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  event.status === 'in_progress'
                    ? 'text-amber-700'
                    : event.status === 'completed'
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                }`}
              >
                {event.status.replace('_', ' ')}
              </Text>
            </View>
          )}
        </View>

        <Text
          numberOfLines={1}
          className="text-base font-bold text-stone-900 leading-tight group-hover:text-[#800020] transition-colors"
        >
          {event.title}
        </Text>

        {event.performer_name ? (
          <Text numberOfLines={1} className="text-xs font-medium text-stone-600 mt-0.5">
            {event.performer_name}
          </Text>
        ) : null}
      </View>

      {/* Showtime */}
      {showtime ? (
        <View className="items-end justify-center flex-shrink-0 pl-1">
          <View className="flex-row items-center gap-1 bg-stone-50 border border-stone-200/80 px-2 py-1 rounded-md">
            <Clock size={11} color="#800020" aria-hidden={true} />
            <Text className="text-xs font-bold text-stone-800" numberOfLines={1}>
              {showtime}
            </Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
};
