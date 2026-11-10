import React, { useState } from 'react';
import { View, Text, Pressable, Image, ScrollView, Modal, Platform } from 'react-native';
import {
  X,
  Calendar,
  Clock,
  Music,
  Download,
  Printer,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import type { VenueEvent } from '../../domain/event.types';
import { generateEventIcs, triggerIcsDownload } from '../../utils/eventIcsExport';
import { toast } from '@/features/shared/toast/useToastStore';
import { formatFullDate, formatShowtimeRange } from '../utils/eventFormatters';

interface EventDetailModalProps {
  isOpen: boolean;
  event: VenueEvent | null;
  onClose: () => void;
  onEdit?: (event: VenueEvent) => void;
  onDelete?: (id: string, storagePath?: string | null) => void;
  isAdmin?: boolean;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  event,
  onClose,
  onEdit,
  onDelete,
  isAdmin = false,
}) => {
  const [showLogistics, setShowLogistics] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!isOpen || !event) return null;

  const showtime = formatShowtimeRange(event.start_time, event.end_time);

  const handleDownloadIcs = () => {
    try {
      const ics = generateEventIcs(event);
      triggerIcsDownload(ics, `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
      toast.success('Downloaded calendar event (.ics)');
    } catch {
      toast.error('Failed to download calendar file');
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDelete = () => {
    onDelete?.(event.id, event.poster_storage_path);
    setIsConfirmingDelete(false);
  };

  const hasLogistics = Boolean(
    event.sound_check_time ||
    event.gear_requirements ||
    event.reserved_tables ||
    event.special_requests
  );

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-end sm:justify-center bg-black/60 p-0 sm:p-4">
        {/* Backdrop dismiss */}
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityLabel="Dismiss event details"
        />

        {/* Modal / Sheet Container */}
        <View
          className="relative max-h-[92vh] sm:max-h-[85vh] w-full max-w-xl overflow-hidden rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white shadow-2xl flex-col"
          style={Platform.OS === 'web' ? ({ overscrollBehavior: 'contain' } as any) : undefined}
        >
          {/* Header Close button */}
          <View className="absolute top-3 right-3 z-20">
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close event details"
              className="h-9 w-9 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 active:bg-black/70 backdrop-blur-sm"
            >
              <X size={18} color="#ffffff" aria-hidden={true} />
            </Pressable>
          </View>

          {/* Hero Poster Header (if poster exists) */}
          {event.poster_url ? (
            <View className="relative h-44 sm:h-56 w-full overflow-hidden bg-stone-100 flex-shrink-0">
              <Image
                source={{ uri: event.poster_url }}
                className="h-full w-full object-cover"
                resizeMode="cover"
                accessibilityLabel={`${event.title} poster`}
              />
              <View className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <View className="absolute bottom-3 left-4 right-4 flex-row items-center justify-between">
                <View className="bg-[#800020] px-2.5 py-0.5 rounded-md">
                  <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                    {event.status.replace('_', ' ')}
                  </Text>
                </View>

                {event.genre ? (
                  <View className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md">
                    <Text className="text-[11px] font-semibold text-stone-800">{event.genre}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <View className="p-5 pb-3 border-b border-stone-100 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center">
                  <Music size={20} color="#800020" aria-hidden={true} />
                </View>
                <View>
                  <Text className="text-xs font-bold text-[#800020] uppercase tracking-wider">
                    {event.status.replace('_', ' ')}
                  </Text>
                  {event.genre ? (
                    <Text className="text-xs text-stone-500 font-medium">{event.genre}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          )}

          {/* Content Body */}
          <ScrollView className="flex-1 p-5 space-y-4" showsVerticalScrollIndicator={false}>
            {/* Title & Performer */}
            <View>
              <Text className="text-xl sm:text-2xl font-extrabold text-stone-900 leading-snug">
                {event.title}
              </Text>
              {event.performer_name ? (
                <Text className="text-sm sm:text-base font-semibold text-[#800020] mt-0.5">
                  {event.performer_name}
                </Text>
              ) : null}
            </View>

            {/* Date & Showtime Info Pills */}
            <View className="flex-row flex-wrap items-center gap-2">
              <View className="flex-row items-center gap-1.5 bg-stone-50 border border-stone-200/80 px-3 py-1.5 rounded-xl">
                <Calendar size={13} color="#78716c" aria-hidden={true} />
                <Text className="text-xs font-bold text-stone-800">
                  {formatFullDate(event.event_date)}
                </Text>
              </View>

              {showtime ? (
                <View className="flex-row items-center gap-1.5 bg-rose-50/70 border border-rose-200 px-3 py-1.5 rounded-xl">
                  <Clock size={13} color="#800020" aria-hidden={true} />
                  <Text className="text-xs font-bold text-[#800020]">{showtime}</Text>
                </View>
              ) : null}
            </View>

            {/* Description */}
            {event.description ? (
              <View className="pt-2">
                <Text className="text-sm text-stone-700 leading-relaxed">{event.description}</Text>
              </View>
            ) : null}

            {/* Production Details (Collapsible, Admin only or venue operational staff) */}
            {isAdmin && hasLogistics ? (
              <View className="pt-2 border-t border-stone-100">
                <Pressable
                  onPress={() => setShowLogistics(!showLogistics)}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle production details"
                  className="flex-row items-center justify-between py-2 text-stone-700 active:opacity-75"
                >
                  <Text className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Production details
                  </Text>
                  {showLogistics ? (
                    <ChevronUp size={16} color="#78716c" aria-hidden={true} />
                  ) : (
                    <ChevronDown size={16} color="#78716c" aria-hidden={true} />
                  )}
                </Pressable>

                {showLogistics ? (
                  <View className="space-y-2.5 pt-2 pl-1 bg-stone-50/80 p-3 rounded-xl border border-stone-200/60 mt-1">
                    {event.sound_check_time ? (
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-medium text-stone-500">Sound check</Text>
                        <Text className="text-xs font-bold text-stone-800">
                          {event.sound_check_time.slice(0, 5)}
                        </Text>
                      </View>
                    ) : null}

                    {event.gear_requirements ? (
                      <View>
                        <Text className="text-xs font-medium text-stone-500 mb-0.5">
                          Gear / Backline
                        </Text>
                        <Text className="text-xs text-stone-800 leading-normal">
                          {event.gear_requirements}
                        </Text>
                      </View>
                    ) : null}

                    {event.reserved_tables ? (
                      <View>
                        <Text className="text-xs font-medium text-stone-500 mb-0.5">
                          Reserved tables
                        </Text>
                        <Text className="text-xs text-stone-800 leading-normal">
                          {event.reserved_tables}
                        </Text>
                      </View>
                    ) : null}

                    {event.special_requests ? (
                      <View>
                        <Text className="text-xs font-medium text-stone-500 mb-0.5">
                          Special requests / Rider
                        </Text>
                        <Text className="text-xs text-stone-800 leading-normal">
                          {event.special_requests}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          {/* Destructive Confirmation Bar (if confirming delete) */}
          {isConfirmingDelete ? (
            <View className="p-4 border-t border-rose-200 bg-rose-50/90 space-y-2">
              <Text className="text-xs font-bold text-rose-900">
                Cancel and remove “{event.title}” from calendar?
              </Text>
              <View className="flex-row items-center gap-2 justify-end">
                <Pressable
                  onPress={() => setIsConfirmingDelete(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Keep event"
                  className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
                >
                  <Text className="text-xs font-semibold text-stone-700">Keep event</Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm cancel event"
                  className="px-3 py-1.5 rounded-lg bg-rose-700 active:bg-rose-800"
                >
                  <Text className="text-xs font-bold text-white">Yes, cancel event</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            /* Modal Footer Action Bar */
            <View className="p-3 sm:p-4 border-t border-stone-200 bg-stone-50/80 flex-row items-center justify-between gap-2">
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={handleDownloadIcs}
                  accessibilityRole="button"
                  accessibilityLabel="Add to calendar (.ics)"
                  className="flex-row items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 active:bg-stone-100"
                >
                  <Download size={14} color="#57534e" aria-hidden={true} />
                  <Text className="text-xs font-semibold text-stone-700">Add to calendar</Text>
                </Pressable>

                <Pressable
                  onPress={handlePrint}
                  accessibilityRole="button"
                  accessibilityLabel="Print event details"
                  className="hidden sm:flex flex-row items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 active:bg-stone-100"
                >
                  <Printer size={14} color="#57534e" aria-hidden={true} />
                  <Text className="text-xs font-semibold text-stone-700">Print</Text>
                </Pressable>
              </View>

              {isAdmin ? (
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => setIsConfirmingDelete(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Delete event"
                    className="h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 active:bg-rose-100"
                  >
                    <Trash2 size={15} color="#e11d48" aria-hidden={true} />
                  </Pressable>

                  {onEdit ? (
                    <Pressable
                      onPress={() => {
                        onClose();
                        onEdit(event);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Edit event"
                      className="flex-row items-center gap-1.5 rounded-xl bg-[#800020] px-4 py-2 text-white active:bg-[#66001a]"
                    >
                      <Edit2 size={14} color="#ffffff" aria-hidden={true} />
                      <Text className="text-xs font-bold text-white">Edit event</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close event modal"
                  className="rounded-xl bg-stone-900 px-5 py-2 text-white active:bg-stone-800"
                >
                  <Text className="text-xs font-bold text-white">Close</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
