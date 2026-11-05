import React from 'react';
import { View, Text, Pressable, Image, ScrollView, Modal } from 'react-native';
import {
  X,
  Calendar,
  Clock,
  Mic,
  Music,
  Wrench,
  Download,
  Printer,
  Edit2,
  Trash2,
} from 'lucide-react-native';
import type { VenueEvent } from '../../domain/event.types';
import { generateEventIcs, triggerIcsDownload } from '../../utils/eventIcsExport';
import { toast } from '@/features/shared/toast/useToastStore';

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
  if (!isOpen || !event) return null;

  const formatFullDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
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
    if (
      typeof window !== 'undefined' &&
      window.confirm(`Cancel and remove "${event.title}" from the calendar?`)
    ) {
      onDelete?.(event.id, event.poster_storage_path);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl flex flex-col">
          {/* Hero Poster Header */}
          <View className="relative h-60 w-full overflow-hidden bg-stone-100 flex-shrink-0">
            {event.poster_url ? (
              <Image
                source={{ uri: event.poster_url }}
                className="h-full w-full object-cover"
                resizeMode="cover"
              />
            ) : (
              <View className="h-full w-full flex items-center justify-center bg-rose-50/50">
                <Music size={54} color="#800020" />
              </View>
            )}
            <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Close Button */}
            <Pressable
              onPress={onClose}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X size={18} color="#ffffff" />
            </Pressable>

            {/* Badges on hero */}
            <View className="absolute bottom-4 left-6 right-6 flex flex-row items-end justify-between">
              <View className="flex flex-row items-center gap-2">
                <View className="rounded-full bg-[#800020] px-3 py-1">
                  <Text className="text-xs font-black text-white uppercase tracking-wider">
                    {event.status}
                  </Text>
                </View>
                {event.genre && (
                  <View className="rounded-full bg-white/90 border border-white px-3 py-1">
                    <Text className="text-xs font-bold text-stone-800">{event.genre}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Modal Scrollable Content */}
          <ScrollView className="flex-1 p-6 space-y-6">
            {/* Title & Performer */}
            <View>
              <Text className="text-2xl font-extrabold text-stone-900 leading-tight">
                {event.title}
              </Text>
              {event.performer_name && (
                <View className="mt-1 flex flex-row items-center gap-2">
                  <Mic size={16} color="#800020" />
                  <Text className="text-base font-bold text-[#800020]">{event.performer_name}</Text>
                </View>
              )}
            </View>

            {/* Timing Banner */}
            <View className="flex flex-col sm:flex-row gap-3">
              <View className="flex-1 flex flex-row items-center gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
                <View className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-[#800020]">
                  <Calendar size={20} color="#800020" />
                </View>
                <View>
                  <Text className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">
                    Date
                  </Text>
                  <Text className="text-sm font-bold text-stone-900">
                    {formatFullDate(event.event_date)}
                  </Text>
                </View>
              </View>

              <View className="flex-1 flex flex-row items-center gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
                <View className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-[#800020]">
                  <Clock size={20} color="#800020" />
                </View>
                <View>
                  <Text className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">
                    Showtime
                  </Text>
                  <Text className="text-sm font-bold text-[#800020]">
                    {formatTime(event.start_time)}
                    {event.end_time ? ` – ${formatTime(event.end_time)}` : ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Description */}
            {event.description && (
              <View className="rounded-xl border border-stone-200 bg-stone-50/40 p-4">
                <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  About the Performance
                </Text>
                <Text className="text-sm text-stone-700 leading-relaxed">{event.description}</Text>
              </View>
            )}

            {/* Backstage Logistics Checklist Card */}
            <View className="rounded-2xl border border-stone-200 bg-stone-50/80 p-5 shadow-xs">
              <View className="flex flex-row items-center gap-2 mb-4 pb-2 border-b border-stone-200">
                <Wrench size={18} color="#800020" />
                <Text className="text-sm font-extrabold text-stone-900 uppercase tracking-wider">
                  Event Logistics & Production Checklist
                </Text>
              </View>

              <View className="space-y-3.5">
                {/* Sound Check */}
                <View className="flex flex-row items-start gap-3">
                  <View className="h-2 w-2 rounded-full bg-[#800020] mt-2" />
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-stone-500 uppercase">
                      Sound Check Schedule
                    </Text>
                    <Text className="text-sm text-stone-900 font-semibold">
                      {event.sound_check_time
                        ? `${formatTime(event.sound_check_time)} (FOH Engineer call)`
                        : 'Standard 1 hour prior to doors'}
                    </Text>
                  </View>
                </View>

                {/* Gear & Backline */}
                {event.gear_requirements && (
                  <View className="flex flex-row items-start gap-3">
                    <View className="h-2 w-2 rounded-full bg-[#800020] mt-2" />
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-stone-500 uppercase">
                        Backline & Gear Requirements
                      </Text>
                      <Text className="text-sm text-stone-700 leading-relaxed">
                        {event.gear_requirements}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Reserved Tables */}
                {event.reserved_tables && (
                  <View className="flex flex-row items-start gap-3">
                    <View className="h-2 w-2 rounded-full bg-[#800020] mt-2" />
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-stone-500 uppercase">
                        Reserved Tables & Seating
                      </Text>
                      <Text className="text-sm font-semibold text-[#800020]">
                        {event.reserved_tables}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Special Requests / Rider */}
                {event.special_requests && (
                  <View className="flex flex-row items-start gap-3">
                    <View className="h-2 w-2 rounded-full bg-[#800020] mt-2" />
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-stone-500 uppercase">
                        Artist Rider & Hospitality Requests
                      </Text>
                      <Text className="text-sm text-stone-700 leading-relaxed">
                        {event.special_requests}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Modal Footer Actions */}
          <View className="border-t border-stone-200 bg-stone-50 px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <View className="flex flex-row items-center gap-2">
              <Pressable
                onPress={handleDownloadIcs}
                className="flex-1 sm:flex-initial flex flex-row items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-stone-200 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-stone-700 hover:bg-stone-100 transition-colors shadow-xs"
              >
                <Download size={14} color="#44403c" />
                <Text className="text-xs font-bold text-stone-700 whitespace-nowrap">Add .ICS</Text>
              </Pressable>

              <Pressable
                onPress={handlePrint}
                className="flex-1 sm:flex-initial flex flex-row items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-stone-200 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-stone-700 hover:bg-stone-100 transition-colors shadow-xs"
              >
                <Printer size={14} color="#44403c" />
                <Text className="text-xs font-bold text-stone-700 whitespace-nowrap">Print</Text>
              </Pressable>
            </View>

            {isAdmin && (
              <View className="flex flex-row items-center gap-2">
                <Pressable
                  onPress={() => onEdit?.(event)}
                  className="flex-1 sm:flex-initial flex flex-row items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 sm:px-4 py-2 sm:py-2.5 text-[#800020] hover:bg-rose-100 transition-colors shadow-xs"
                >
                  <Edit2 size={14} color="#800020" />
                  <Text className="text-xs font-bold text-[#800020]">Edit</Text>
                </Pressable>

                <Pressable
                  onPress={handleDelete}
                  className="flex-1 sm:flex-initial flex flex-row items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 sm:px-3.5 py-2 sm:py-2.5 text-red-700 hover:bg-red-100 transition-colors shadow-xs"
                >
                  <Trash2 size={14} color="#b91c1c" />
                  <Text className="text-xs font-bold text-red-700">Delete</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
