import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, Upload, Calendar, Clock, Mic, Check, Trash2 } from 'lucide-react-native';
import type {
  VenueEvent,
  CreateEventInput,
  UpdateEventInput,
  EventStatus,
} from '../../domain/event.types';
import { eventsApi } from '../../data/events.api';
import { toast } from '@/features/shared/toast/useToastStore';
import { getManilaTodayDateString } from '../utils/eventFormatters';

interface CreateEditEventModalProps {
  isOpen: boolean;
  event: VenueEvent | null;
  initialDate?: string | null;
  onClose: () => void;
  onSave: (input: CreateEventInput | UpdateEventInput, id?: string) => Promise<any>;
}

const GENRE_PRESETS = [
  'Hard Bop',
  'Bebop',
  'Vocal Jazz',
  'Latin Jazz',
  'Acoustic Trio',
  'Post-Bop',
  'Brass & Bourbon',
  'Open Jam',
];

const STATUS_OPTIONS: { id: EventStatus; label: string }[] = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export const CreateEditEventModal: React.FC<CreateEditEventModalProps> = ({
  isOpen,
  event,
  initialDate,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('23:30');
  const [posterUrl, setPosterUrl] = useState('');
  const [posterStoragePath, setPosterStoragePath] = useState<string | null>(null);
  const [performerName, setPerformerName] = useState('');
  const [genre, setGenre] = useState('Hard Bop');
  const [description, setDescription] = useState('');
  const [soundCheckTime, setSoundCheckTime] = useState('');
  const [gearRequirements, setGearRequirements] = useState('');
  const [reservedTables, setReservedTables] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [status, setStatus] = useState<EventStatus>('scheduled');

  const [activeTab, setActiveTab] = useState<'info' | 'poster' | 'logistics'>('info');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; eventDate?: string; startTime?: string }>(
    {}
  );

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setEventDate(event.event_date || '');
      setStartTime(event.start_time ? event.start_time.slice(0, 5) : '20:00');
      setEndTime(event.end_time ? event.end_time.slice(0, 5) : '23:30');
      setPosterUrl(event.poster_url || '');
      setPosterStoragePath(event.poster_storage_path || null);
      setPerformerName(event.performer_name || '');
      setGenre(event.genre || 'Hard Bop');
      setDescription(event.description || '');
      setSoundCheckTime(event.sound_check_time ? event.sound_check_time.slice(0, 5) : '');
      setGearRequirements(event.gear_requirements || '');
      setReservedTables(event.reserved_tables || '');
      setSpecialRequests(event.special_requests || '');
      setStatus(event.status || 'scheduled');
    } else {
      const defaultDate = initialDate || getManilaTodayDateString();
      setTitle('');
      setEventDate(defaultDate);
      setStartTime('20:00');
      setEndTime('23:30');
      setPosterUrl('');
      setPosterStoragePath(null);
      setPerformerName('');
      setGenre('Hard Bop');
      setDescription('');
      // Clean defaults: no fabricated gear or reserved table notes
      setSoundCheckTime('');
      setGearRequirements('');
      setReservedTables('');
      setSpecialRequests('');
      setStatus('scheduled');
    }
    setErrors({});
    setActiveTab('info');
  }, [event, initialDate, isOpen]);

  if (!isOpen) return null;

  const triggerFileBrowser = () => {
    if (typeof document !== 'undefined') {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/jpeg,image/png,image/webp';
      fileInput.style.display = 'none';
      fileInput.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          setIsUploading(true);
          try {
            const result = await eventsApi.uploadEventPoster(file);
            setPosterUrl(result.publicUrl);
            setPosterStoragePath(result.storagePath);
            toast.success('Event poster uploaded');
          } catch (err: any) {
            console.error('Failed to upload poster:', err);
            toast.error('Failed to upload poster image');
          } finally {
            setIsUploading(false);
          }
        }
      };
      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
    }
  };

  const handleRemovePoster = () => {
    setPosterUrl('');
    setPosterStoragePath(null);
  };

  const validate = () => {
    const newErrors: { title?: string; eventDate?: string; startTime?: string } = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!eventDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate.trim())) {
      newErrors.eventDate = 'Valid date required (YYYY-MM-DD)';
    }
    if (!startTime.trim()) {
      newErrors.startTime = 'Start time is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      setActiveTab('info');
      toast.error('Please complete required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateEventInput = {
        title: title.trim(),
        event_date: eventDate.trim(),
        start_time: startTime.trim().length === 5 ? `${startTime.trim()}:00` : startTime.trim(),
        end_time: endTime.trim()
          ? endTime.trim().length === 5
            ? `${endTime.trim()}:00`
            : endTime.trim()
          : null,
        poster_url: posterUrl || null,
        poster_storage_path: posterStoragePath || null,
        performer_name: performerName.trim() || null,
        genre: genre.trim() || null,
        description: description.trim() || null,
        sound_check_time: soundCheckTime.trim()
          ? soundCheckTime.trim().length === 5
            ? `${soundCheckTime.trim()}:00`
            : soundCheckTime.trim()
          : null,
        gear_requirements: gearRequirements.trim() || null,
        reserved_tables: reservedTables.trim() || null,
        special_requests: specialRequests.trim() || null,
        status,
      };

      await onSave(payload, event?.id);
      onClose();
    } catch {
      // Error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-end sm:justify-center bg-black/60 p-0 sm:p-4">
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityLabel="Dismiss event form"
        />

        <View
          className="relative max-h-[94vh] sm:max-h-[88vh] w-full max-w-xl overflow-hidden rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white shadow-2xl flex-col"
          style={Platform.OS === 'web' ? ({ overscrollBehavior: 'contain' } as any) : undefined}
        >
          {/* Header */}
          <View className="p-4 sm:p-5 border-b border-stone-200 flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-bold text-stone-900">
                {event ? 'Edit event' : 'Schedule event'}
              </Text>
              <Text className="text-xs text-stone-500">
                {event
                  ? 'Update event details and run-of-show'
                  : 'Add new jazz gig or venue performance'}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              className="h-8 w-8 items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 active:bg-stone-300"
            >
              <X size={16} color="#44403c" aria-hidden={true} />
            </Pressable>
          </View>

          {/* Section Tabs */}
          <View className="flex-row border-b border-stone-100 bg-stone-50/70 px-4 pt-2">
            <Pressable
              onPress={() => setActiveTab('info')}
              accessibilityRole="tab"
              accessibilityLabel="General details tab"
              className={`pb-2.5 px-3 border-b-2 mr-2 ${
                activeTab === 'info'
                  ? 'border-[#800020] text-[#800020]'
                  : 'border-transparent text-stone-500'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'info' ? 'text-[#800020]' : 'text-stone-600'
                }`}
              >
                General details
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('poster')}
              accessibilityRole="tab"
              accessibilityLabel="Poster artwork tab"
              className={`pb-2.5 px-3 border-b-2 mr-2 ${
                activeTab === 'poster'
                  ? 'border-[#800020] text-[#800020]'
                  : 'border-transparent text-stone-500'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'poster' ? 'text-[#800020]' : 'text-stone-600'
                }`}
              >
                Poster artwork
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('logistics')}
              accessibilityRole="tab"
              accessibilityLabel="Production and logistics tab"
              className={`pb-2.5 px-3 border-b-2 ${
                activeTab === 'logistics'
                  ? 'border-[#800020] text-[#800020]'
                  : 'border-transparent text-stone-500'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'logistics' ? 'text-[#800020]' : 'text-stone-600'
                }`}
              >
                Production notes
              </Text>
            </Pressable>
          </View>

          {/* Form Body */}
          <ScrollView className="flex-1 p-4 sm:p-5 space-y-4" showsVerticalScrollIndicator={false}>
            {activeTab === 'info' && (
              <View className="space-y-3.5">
                {/* Event Title */}
                <View>
                  <Text className="text-xs font-bold text-stone-700 mb-1">
                    Event title <Text className="text-rose-600">*</Text>
                  </Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g., Thelonious Monk Birthday Set"
                    placeholderTextColor="#a8a29e"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#800020]"
                    accessibilityLabel="Event title"
                  />
                  {errors.title ? (
                    <Text className="text-xs text-rose-600 mt-1">{errors.title}</Text>
                  ) : null}
                </View>

                {/* Performer / Ensemble */}
                <View>
                  <Text className="text-xs font-bold text-stone-700 mb-1">Performer or band</Text>
                  <TextInput
                    value={performerName}
                    onChangeText={setPerformerName}
                    placeholder="e.g., Manila Bebop Collective"
                    placeholderTextColor="#a8a29e"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#800020]"
                    accessibilityLabel="Performer or band name"
                  />
                </View>

                {/* Date & Showtime Row */}
                <View className="flex-col sm:flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-stone-700 mb-1">
                      Event date <Text className="text-rose-600">*</Text>
                    </Text>
                    <TextInput
                      value={eventDate}
                      onChangeText={setEventDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#a8a29e"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#800020]"
                      accessibilityLabel="Event date in YYYY-MM-DD format"
                    />
                    {errors.eventDate ? (
                      <Text className="text-xs text-rose-600 mt-1">{errors.eventDate}</Text>
                    ) : null}
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-bold text-stone-700 mb-1">
                      Start time <Text className="text-rose-600">*</Text>
                    </Text>
                    <TextInput
                      value={startTime}
                      onChangeText={setStartTime}
                      placeholder="HH:MM (e.g. 20:00)"
                      placeholderTextColor="#a8a29e"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#800020]"
                      accessibilityLabel="Start time in 24-hour format"
                    />
                    {errors.startTime ? (
                      <Text className="text-xs text-rose-600 mt-1">{errors.startTime}</Text>
                    ) : null}
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-bold text-stone-700 mb-1">End time</Text>
                    <TextInput
                      value={endTime}
                      onChangeText={setEndTime}
                      placeholder="HH:MM (e.g. 23:30)"
                      placeholderTextColor="#a8a29e"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#800020]"
                      accessibilityLabel="End time in 24-hour format"
                    />
                  </View>
                </View>

                {/* Genre Selector */}
                <View>
                  <Text className="text-xs font-bold text-stone-700 mb-1.5">Musical style</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {GENRE_PRESETS.map((p) => {
                      const isSel = genre === p;
                      return (
                        <Pressable
                          key={p}
                          onPress={() => setGenre(p)}
                          className={`rounded-lg px-2.5 py-1 border text-xs font-medium ${
                            isSel
                              ? 'bg-[#800020] border-[#800020] text-white'
                              : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <Text
                            className={`text-xs ${
                              isSel ? 'text-white font-bold' : 'text-stone-700'
                            }`}
                          >
                            {p}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Status Selector */}
                <View>
                  <Text className="text-xs font-bold text-stone-700 mb-1.5">Status</Text>
                  <View className="flex-row gap-2">
                    {STATUS_OPTIONS.map((opt) => {
                      const isSel = status === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => setStatus(opt.id)}
                          className={`flex-1 items-center justify-center py-2 rounded-xl border ${
                            isSel
                              ? 'bg-rose-50 border-[#800020] text-[#800020]'
                              : 'bg-white border-stone-200 text-stone-700'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              isSel ? 'text-[#800020]' : 'text-stone-700'
                            }`}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Description */}
                <View>
                  <Text className="text-xs font-bold text-stone-700 mb-1">Event summary / bio</Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Short description of the performance or tasting evening…"
                    placeholderTextColor="#a8a29e"
                    multiline
                    numberOfLines={3}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#800020]"
                    accessibilityLabel="Event description"
                  />
                </View>
              </View>
            )}

            {activeTab === 'poster' && (
              <View className="space-y-4">
                <Text className="text-xs text-stone-500">
                  Upload an event flyer or stage poster. Recommended aspect ratio 16:9 or 4:3.
                </Text>

                {posterUrl ? (
                  <View className="space-y-3">
                    <View className="h-48 w-full rounded-2xl overflow-hidden border border-stone-200 bg-stone-100">
                      <Image
                        source={{ uri: posterUrl }}
                        className="h-full w-full object-cover"
                        resizeMode="cover"
                        accessibilityLabel="Current poster preview"
                      />
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Pressable
                        onPress={triggerFileBrowser}
                        disabled={isUploading}
                        className="flex-row items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2"
                      >
                        <Upload size={14} color="#44403c" aria-hidden={true} />
                        <Text className="text-xs font-semibold text-stone-700">Change image</Text>
                      </Pressable>

                      <Pressable
                        onPress={handleRemovePoster}
                        className="flex-row items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700"
                      >
                        <Trash2 size={14} color="#e11d48" aria-hidden={true} />
                        <Text className="text-xs font-bold text-rose-700">Remove poster</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={triggerFileBrowser}
                    disabled={isUploading}
                    className="h-44 w-full rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 items-center justify-center p-6 hover:bg-stone-100 active:bg-stone-200 transition-colors"
                  >
                    {isUploading ? (
                      <View className="items-center gap-2">
                        <ActivityIndicator color="#800020" />
                        <Text className="text-xs font-semibold text-stone-600">
                          Uploading poster…
                        </Text>
                      </View>
                    ) : (
                      <View className="items-center gap-2">
                        <View className="h-10 w-10 rounded-full bg-stone-200 items-center justify-center">
                          <Upload size={18} color="#57534e" aria-hidden={true} />
                        </View>
                        <Text className="text-xs font-bold text-stone-800">
                          Click to select poster image
                        </Text>
                        <Text className="text-[11px] text-stone-400">
                          JPEG, PNG, or WebP up to 5&nbsp;MB
                        </Text>
                      </View>
                    )}
                  </Pressable>
                )}
              </View>
            )}

            {activeTab === 'logistics' && (
              <View className="space-y-3.5">
                <Text className="text-xs text-stone-500">
                  Optional production and backstage details for staff and sound engineers.
                </Text>

                {/* Sound check time */}
                <View>
                  <Text className="text-xs font-bold text-stone-700 mb-1">
                    Sound check call time
                  </Text>
                  <TextInput
                    value={soundCheckTime}
                    onChangeText={setSoundCheckTime}
                    placeholder="HH:MM (e.g. 18:00)"
                    placeholderTextColor="#a8a29e"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#800020]"
                    accessibilityLabel="Sound check time"
                  />
                </View>

                {/* Gear / Backline */}
                <View>
                  <Text className="text-xs font-bold text-stone-700 mb-1">
                    Backline & gear requirements
                  </Text>
                  <TextInput
                    value={gearRequirements}
                    onChangeText={setGearRequirements}
                    placeholder="e.g. Grand Piano, drum kit, 2x vocal mics…"
                    placeholderTextColor="#a8a29e"
                    multiline
                    numberOfLines={2}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#800020]"
                    accessibilityLabel="Backline and gear requirements"
                  />
                </View>

                {/* Reserved tables */}
                <View>
                  <Text className="text-xs font-bold text-stone-700 mb-1">
                    Reserved VIP tables / Guest list
                  </Text>
                  <TextInput
                    value={reservedTables}
                    onChangeText={setReservedTables}
                    placeholder="e.g. T1 and T2 reserved for artist guests…"
                    placeholderTextColor="#a8a29e"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#800020]"
                    accessibilityLabel="Reserved tables note"
                  />
                </View>

                {/* Special requests */}
                <View>
                  <Text className="text-xs font-bold text-stone-700 mb-1">
                    Hospitality rider & special requests
                  </Text>
                  <TextInput
                    value={specialRequests}
                    onChangeText={setSpecialRequests}
                    placeholder="e.g. Sparkling water, bourbon on ice during sound check…"
                    placeholderTextColor="#a8a29e"
                    multiline
                    numberOfLines={2}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#800020]"
                    accessibilityLabel="Hospitality rider or special requests"
                  />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Action Buttons */}
          <View className="p-4 border-t border-stone-200 bg-stone-50/80 flex-row items-center justify-end gap-2.5">
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Cancel editing"
              className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white active:bg-stone-100"
            >
              <Text className="text-xs font-semibold text-stone-700">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={event ? 'Save changes' : 'Schedule event'}
              className="flex-row items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#800020] text-white active:bg-[#66001a] shadow-xs"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Check size={16} color="#ffffff" aria-hidden={true} />
              )}
              <Text className="text-xs font-bold text-white">
                {isSubmitting ? 'Saving…' : event ? 'Save changes' : 'Schedule event'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
