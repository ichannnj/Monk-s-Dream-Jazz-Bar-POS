import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Modal,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
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
  Ticket,
  CheckCircle2,
} from 'lucide-react-native';
import type { VenueEvent, EventDoorChargeSummary } from '../../domain/event.types';
import { generateEventIcs, triggerIcsDownload } from '../../utils/eventIcsExport';
import { toast } from '@/features/shared/toast/useToastStore';
import { formatFullDate, formatShowtimeRange } from '../utils/eventFormatters';
import { eventsApi } from '../../data/events.api';
import { useEventStore } from '../../application/useEventStore';
import { useAuthStore } from '@/features/auth/application/useAuthStore';

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

  // Door Charge & Settlement
  const [summary, setSummary] = useState<EventDoorChargeSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutNotes, setPayoutNotes] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const settleArtistPayout = useEventStore((s) => s.settleArtistPayout);
  const currentUser = useAuthStore((s) => s.currentUser);

  useEffect(() => {
    if (isOpen && event && event.has_door_charge) {
      setIsLoadingSummary(true);
      eventsApi
        .getEventDoorChargeSummary(event.id)
        .then((res) => setSummary(res))
        .catch((err) => console.warn('Failed to load door charge summary:', err))
        .finally(() => setIsLoadingSummary(false));
    } else {
      setSummary(null);
    }
  }, [isOpen, event?.id, event?.has_door_charge, event?.artist_payout_status]);

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

            {/* Door Charge & Artist Settlement Card */}
            {event.has_door_charge ? (
              <View className="pt-2 border-t border-stone-100 space-y-2.5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <Ticket size={15} color="#800020" />
                    <Text className="text-xs font-extrabold text-stone-900 uppercase tracking-wider">
                      Door Charge & Artist Settlement
                    </Text>
                  </View>
                  <View
                    className={`px-2.5 py-0.5 rounded-full ${
                      event.artist_payout_status === 'paid' ? 'bg-emerald-100' : 'bg-amber-100'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        event.artist_payout_status === 'paid'
                          ? 'text-emerald-800'
                          : 'text-amber-800'
                      }`}
                    >
                      {event.artist_payout_status === 'paid' ? 'PAID TO ARTIST' : 'UNSETTLED'}
                    </Text>
                  </View>
                </View>

                <View className="rounded-2xl border border-stone-200 bg-stone-50/80 p-3.5 space-y-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-stone-500 font-medium">Admission Price</Text>
                    <Text className="text-sm font-bold text-stone-900">
                      ₱{Number(event.door_charge_amount || 0).toFixed(2)} / head
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-stone-500 font-medium">Agreement Split</Text>
                    <Text className="text-xs font-bold text-stone-800">
                      {event.split_type === 'percentage'
                        ? `${event.artist_split_value}% Artist · ${event.venue_split_value}% Monk's Dream`
                        : `₱${event.artist_split_value} Artist · ₱${event.venue_split_value} Monk's Dream`}
                    </Text>
                  </View>

                  {/* Dynamic Metrics */}
                  <View className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-200/60">
                    <View className="bg-white p-2 rounded-xl border border-stone-200/60 items-center">
                      <Text className="text-[10px] uppercase font-bold text-stone-400">
                        Tickets
                      </Text>
                      <Text className="text-sm font-extrabold text-stone-900 mt-0.5">
                        {isLoadingSummary ? '…' : (summary?.tickets_sold ?? 0)}
                      </Text>
                    </View>
                    <View className="bg-white p-2 rounded-xl border border-stone-200/60 items-center">
                      <Text className="text-[10px] uppercase font-bold text-stone-400">Gross</Text>
                      <Text className="text-sm font-extrabold text-stone-900 mt-0.5">
                        {isLoadingSummary
                          ? '…'
                          : `₱${Number(summary?.gross_sales || 0).toLocaleString()}`}
                      </Text>
                    </View>
                    <View className="bg-rose-50/70 p-2 rounded-xl border border-rose-200/60 items-center">
                      <Text className="text-[10px] uppercase font-bold text-[#800020]">
                        Artist Share
                      </Text>
                      <Text className="text-sm font-extrabold text-[#800020] mt-0.5">
                        {isLoadingSummary
                          ? '…'
                          : `₱${Number(summary?.artist_share || 0).toLocaleString()}`}
                      </Text>
                    </View>
                  </View>

                  {/* Settle button or Paid Confirmation */}
                  {isAdmin && (
                    <View className="pt-1">
                      {event.artist_payout_status === 'paid' ? (
                        <View className="flex-row items-center gap-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                          <CheckCircle2 size={16} color="#059669" />
                          <View className="flex-1">
                            <Text className="text-xs font-bold text-emerald-900">
                              Payout Settled
                            </Text>
                            {event.artist_payout_notes ? (
                              <Text className="text-[11px] text-emerald-700 mt-0.5">
                                {event.artist_payout_notes}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => setIsPayoutModalOpen(true)}
                          className="w-full py-2 px-3 rounded-xl bg-[#800020] active:bg-[#66001a] items-center justify-center flex-row gap-1.5 shadow-xs"
                        >
                          <Ticket size={14} color="#ffffff" />
                          <Text className="text-xs font-bold text-white">
                            Mark Artist Paid & Settle Door Charge
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
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

      {/* Settle Artist Payout Modal */}
      {isPayoutModalOpen && (
        <Modal visible={isPayoutModalOpen} transparent animationType="fade">
          <View className="flex-1 items-center justify-center bg-black/60 p-4">
            <View className="w-full max-w-sm rounded-2xl bg-white p-5 border border-stone-200 shadow-2xl space-y-3.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-stone-900">
                  Settle Artist Door Charge
                </Text>
                <Pressable
                  onPress={() => setIsPayoutModalOpen(false)}
                  className="p-1 rounded-full hover:bg-stone-100"
                >
                  <X size={16} color="#78716c" />
                </Pressable>
              </View>

              <View className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80 space-y-1">
                <Text className="text-xs text-stone-600">
                  Artist:{' '}
                  <Text className="font-bold text-stone-900">
                    {event.performer_name || event.title}
                  </Text>
                </Text>
                <Text className="text-xs text-stone-600">
                  Total Tickets Sold:{' '}
                  <Text className="font-bold text-stone-900">{summary?.tickets_sold ?? 0}</Text>
                </Text>
                <Text className="text-sm font-extrabold text-[#800020] pt-1 border-t border-rose-200/60">
                  Payout Due: ₱{Number(summary?.artist_share || 0).toLocaleString()}
                </Text>
              </View>

              <View className="space-y-1">
                <Text className="text-xs font-bold text-stone-700">
                  Settlement Notes / Reference
                </Text>
                <TextInput
                  value={payoutNotes}
                  onChangeText={setPayoutNotes}
                  placeholder="e.g. Paid in cash backstage after set 2..."
                  placeholderTextColor="#a8a29e"
                  multiline
                  numberOfLines={2}
                  className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs text-stone-900 focus:border-[#800020]"
                />
              </View>

              <View className="flex-row items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <Pressable
                  onPress={() => setIsPayoutModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white active:bg-stone-100"
                >
                  <Text className="text-xs font-semibold text-stone-700">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    setIsSubmittingPayout(true);
                    try {
                      const staffId = currentUser?.id || '11111111-1111-1111-1111-111111111111';
                      await settleArtistPayout(event.id, staffId, payoutNotes);
                      setIsPayoutModalOpen(false);
                      // reload summary
                      const updatedSummary = await eventsApi.getEventDoorChargeSummary(event.id);
                      setSummary(updatedSummary);
                    } catch (e: any) {
                      toast.error('Failed to settle payout');
                    } finally {
                      setIsSubmittingPayout(false);
                    }
                  }}
                  disabled={isSubmittingPayout}
                  className="px-4 py-2 rounded-xl bg-[#800020] active:bg-[#66001a] flex-row items-center gap-1.5"
                >
                  {isSubmittingPayout ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <CheckCircle2 size={14} color="#ffffff" />
                  )}
                  <Text className="text-xs font-bold text-white">
                    {isSubmittingPayout ? 'Recording...' : 'Confirm Paid'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
};
