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
} from 'react-native';
import { X, Upload, Calendar, Clock, Mic, Music, Wrench, Users, Check } from 'lucide-react-native';
import type {
  VenueEvent,
  CreateEventInput,
  UpdateEventInput,
  EventStatus,
} from '../../domain/event.types';
import { eventsApi } from '../../data/events.api';
import { toast } from '@/features/shared/toast/useToastStore';

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
  { id: 'in_progress', label: 'In Progress' },
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
  const [soundCheckTime, setSoundCheckTime] = useState('18:00');
  const [gearRequirements, setGearRequirements] = useState('');
  const [reservedTables, setReservedTables] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [status, setStatus] = useState<EventStatus>('scheduled');

  const [activeTab, setActiveTab] = useState<'info' | 'poster' | 'logistics'>('info');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setSoundCheckTime(event.sound_check_time ? event.sound_check_time.slice(0, 5) : '18:00');
      setGearRequirements(event.gear_requirements || '');
      setReservedTables(event.reserved_tables || '');
      setSpecialRequests(event.special_requests || '');
      setStatus(event.status || 'scheduled');
    } else {
      const defaultDate = initialDate || new Date().toISOString().slice(0, 10);
      setTitle('');
      setEventDate(defaultDate);
      setStartTime('20:00');
      setEndTime('23:30');
      setPosterUrl('');
      setPosterStoragePath(null);
      setPerformerName('');
      setGenre('Hard Bop');
      setDescription('');
      setSoundCheckTime('18:00');
      setGearRequirements('Yamaha Baby Grand Piano, Bass Amp, Drum Kit, 2x Vocal Mics');
      setReservedTables('Tables T1, T2 reserved for guest list');
      setSpecialRequests('');
      setStatus('scheduled');
    }
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
            toast.success('Event poster uploaded successfully');
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

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter an event title');
      setActiveTab('info');
      return;
    }
    if (!eventDate.trim()) {
      toast.error('Please select an event date');
      setActiveTab('info');
      return;
    }
    if (!startTime.trim()) {
      toast.error('Please enter a start time');
      setActiveTab('info');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(
        {
          title: title.trim(),
          event_date: eventDate.trim(),
          start_time:
            startTime.includes(':') && startTime.length === 5 ? `${startTime}:00` : startTime,
          end_time: endTime ? (endTime.length === 5 ? `${endTime}:00` : endTime) : null,
          poster_url: posterUrl.trim() || null,
          poster_storage_path: posterStoragePath,
          performer_name: performerName.trim() || null,
          genre: genre.trim() || null,
          description: description.trim() || null,
          sound_check_time: soundCheckTime
            ? soundCheckTime.length === 5
              ? `${soundCheckTime}:00`
              : soundCheckTime
            : null,
          gear_requirements: gearRequirements.trim() || null,
          reserved_tables: reservedTables.trim() || null,
          special_requests: specialRequests.trim() || null,
          status,
        },
        event?.id
      );
      onClose();
    } catch {
      // error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
          {/* Header */}
          <View className="flex flex-row items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
            <View className="flex flex-row items-center gap-3">
              <View className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#800020] text-white">
                <Music size={20} color="#ffffff" />
              </View>
              <View>
                <Text className="text-base font-extrabold text-stone-900">
                  {event ? 'Edit Jazz Event & Logistics' : 'Schedule New Event / Gig'}
                </Text>
                <Text className="text-xs text-stone-500">
                  Configure performance details, hero poster, and stage run-of-show
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:text-stone-900"
            >
              <X size={16} color="#57534e" />
            </Pressable>
          </View>

          {/* Navigation Tabs */}
          <View className="flex flex-row border-b border-stone-200 bg-stone-50/50 px-6">
            <Pressable
              onPress={() => setActiveTab('info')}
              className={`border-b-2 py-3 px-4 transition-colors ${
                activeTab === 'info' ? 'border-[#800020]' : 'border-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase tracking-wider ${
                  activeTab === 'info' ? 'text-[#800020]' : 'text-stone-500'
                }`}
              >
                1. General Details
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('poster')}
              className={`border-b-2 py-3 px-4 transition-colors ${
                activeTab === 'poster' ? 'border-[#800020]' : 'border-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase tracking-wider ${
                  activeTab === 'poster' ? 'text-[#800020]' : 'text-stone-500'
                }`}
              >
                2. Hero Poster / Photo
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('logistics')}
              className={`border-b-2 py-3 px-4 transition-colors ${
                activeTab === 'logistics' ? 'border-[#800020]' : 'border-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase tracking-wider ${
                  activeTab === 'logistics' ? 'text-[#800020]' : 'text-stone-500'
                }`}
              >
                3. Backstage Logistics
              </Text>
            </Pressable>
          </View>

          {/* Tab Content */}
          <ScrollView className="flex-1 p-6">
            {/* TAB 1: GENERAL INFO */}
            {activeTab === 'info' && (
              <View className="space-y-4">
                <View>
                  <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                    Event Title *
                  </Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. The Monk's Dream Quintet: Miles & Monk Tribute"
                    placeholderTextColor="#a8a29e"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#800020]"
                  />
                </View>

                <View className="flex flex-col sm:flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                      Event Date (YYYY-MM-DD) *
                    </Text>
                    <TextInput
                      value={eventDate}
                      onChangeText={setEventDate}
                      placeholder="2026-11-15"
                      placeholderTextColor="#a8a29e"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#800020]"
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                      Show Start (HH:MM) *
                    </Text>
                    <TextInput
                      value={startTime}
                      onChangeText={setStartTime}
                      placeholder="20:00"
                      placeholderTextColor="#a8a29e"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#800020]"
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                      End Time (HH:MM)
                    </Text>
                    <TextInput
                      value={endTime}
                      onChangeText={setEndTime}
                      placeholder="23:30"
                      placeholderTextColor="#a8a29e"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#800020]"
                    />
                  </View>
                </View>

                <View className="flex flex-col sm:flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                      Performer / Band Lineup
                    </Text>
                    <TextInput
                      value={performerName}
                      onChangeText={setPerformerName}
                      placeholder="e.g. Maya Rivera Trio"
                      placeholderTextColor="#a8a29e"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#800020]"
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                      Genre / Style
                    </Text>
                    <TextInput
                      value={genre}
                      onChangeText={setGenre}
                      placeholder="e.g. Vocal Jazz"
                      placeholderTextColor="#a8a29e"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#800020]"
                    />
                  </View>
                </View>

                {/* Genre presets */}
                <View className="flex flex-wrap flex-row gap-1.5">
                  {GENRE_PRESETS.map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => setGenre(p)}
                      className={`rounded-full px-2.5 py-1 border transition-colors ${
                        genre === p
                          ? 'bg-[#800020] border-[#800020]'
                          : 'bg-stone-100 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          genre === p ? 'text-white' : 'text-stone-600'
                        }`}
                      >
                        {p}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View>
                  <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                    Description & Public Run-of-Show Notes
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    placeholder="Brief background on the music, repertoire, guest sit-ins, and door opening schedule..."
                    placeholderTextColor="#a8a29e"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#800020]"
                  />
                </View>
              </View>
            )}

            {/* TAB 2: POSTER PHOTO */}
            {activeTab === 'poster' && (
              <View className="space-y-4">
                <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                  Hero Poster / Artist Photo
                </Text>

                {/* Upload Trigger Area */}
                <Pressable
                  onPress={triggerFileBrowser}
                  disabled={isUploading}
                  className="relative rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/80 p-6 text-center hover:border-[#800020] transition-colors flex flex-col items-center justify-center cursor-pointer"
                >
                  {isUploading ? (
                    <View className="py-4 flex items-center">
                      <ActivityIndicator size="small" color="#800020" />
                      <Text className="text-xs text-[#800020] mt-2 font-medium">
                        Optimizing & uploading poster...
                      </Text>
                    </View>
                  ) : (
                    <View className="flex flex-col items-center">
                      <View className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-[#800020] mb-2 border border-rose-200">
                        <Upload size={22} color="#800020" />
                      </View>
                      <Text className="text-sm font-bold text-stone-800">
                        Click to select image file
                      </Text>
                      <Text className="text-xs text-stone-500 mt-1 text-center">
                        JPG, PNG, or WebP. Auto-compressed up to 1200px for crisp hero banners.
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Direct URL Fallback */}
                <View>
                  <Text className="text-xs font-bold text-stone-600 uppercase tracking-wide mb-1.5">
                    Or Enter Image URL
                  </Text>
                  <TextInput
                    value={posterUrl}
                    onChangeText={setPosterUrl}
                    placeholder="https://images.unsplash.com/photo-..."
                    placeholderTextColor="#a8a29e"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2 text-xs text-stone-900 focus:bg-white focus:border-[#800020]"
                  />
                </View>

                {/* Live Preview */}
                {posterUrl ? (
                  <View className="rounded-2xl border border-stone-200 bg-stone-50 p-2 overflow-hidden shadow-xs">
                    <Text className="text-[11px] font-bold text-stone-500 uppercase px-2 py-1">
                      Hero Poster Preview
                    </Text>
                    <View className="h-52 w-full rounded-xl overflow-hidden relative bg-stone-100">
                      <Image
                        source={{ uri: posterUrl }}
                        className="h-full w-full object-cover"
                        resizeMode="cover"
                      />
                      <View className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                      <View className="absolute bottom-3 left-3 right-3">
                        <Text className="text-base font-extrabold text-white drop-shadow">
                          {title || 'Event Title Preview'}
                        </Text>
                        <Text className="text-xs font-bold text-rose-200">
                          {performerName || 'Performer Name'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {/* TAB 3: BACKSTAGE LOGISTICS */}
            {activeTab === 'logistics' && (
              <View className="space-y-4">
                <View className="flex flex-col sm:flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                      Sound Check Time (HH:MM)
                    </Text>
                    <TextInput
                      value={soundCheckTime}
                      onChangeText={setSoundCheckTime}
                      placeholder="18:00"
                      placeholderTextColor="#a8a29e"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2 text-sm text-stone-900 focus:bg-white focus:border-[#800020]"
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                      Event Status
                    </Text>
                    <View className="flex flex-row flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((opt) => (
                        <Pressable
                          key={opt.id}
                          onPress={() => setStatus(opt.id)}
                          className={`rounded-xl px-3 py-2 border transition-colors ${
                            status === opt.id
                              ? 'bg-[#800020] border-[#800020]'
                              : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              status === opt.id ? 'text-white' : 'text-stone-700'
                            }`}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                    Audio Gear & Backline Requirements
                  </Text>
                  <TextInput
                    value={gearRequirements}
                    onChangeText={setGearRequirements}
                    multiline
                    numberOfLines={2}
                    placeholder="e.g. Yamaha Grand Piano (tuned), Ampeg bass amp, Twin Reverb, 4x SM58..."
                    placeholderTextColor="#a8a29e"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2 text-sm text-stone-900 focus:bg-white focus:border-[#800020]"
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                    Reserved Tables / Seating Notes
                  </Text>
                  <TextInput
                    value={reservedTables}
                    onChangeText={setReservedTables}
                    placeholder="e.g. Tables T1, T2 reserved for VIP press and artist guests"
                    placeholderTextColor="#a8a29e"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2 text-sm text-stone-900 focus:bg-white focus:border-[#800020]"
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                    Hospitality & Special Rider Requests
                  </Text>
                  <TextInput
                    value={specialRequests}
                    onChangeText={setSpecialRequests}
                    multiline
                    numberOfLines={2}
                    placeholder="e.g. Sparkling water, hot lemon tea, dark espresso backstage..."
                    placeholderTextColor="#a8a29e"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2 text-sm text-stone-900 focus:bg-white focus:border-[#800020]"
                  />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View className="flex flex-row items-center justify-between border-t border-stone-200 bg-stone-50 px-6 py-4">
            <Pressable
              onPress={onClose}
              className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-stone-700 hover:bg-stone-100 shadow-xs"
            >
              <Text className="text-xs font-bold text-stone-700">Cancel</Text>
            </Pressable>

            <View className="flex flex-row items-center gap-2">
              {activeTab !== 'info' && (
                <Pressable
                  onPress={() => setActiveTab(activeTab === 'logistics' ? 'poster' : 'info')}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-700 shadow-xs"
                >
                  <Text className="text-xs font-bold text-stone-700">Back</Text>
                </Pressable>
              )}

              {activeTab !== 'logistics' ? (
                <Pressable
                  onPress={() => setActiveTab(activeTab === 'info' ? 'poster' : 'logistics')}
                  className="rounded-xl bg-[#800020] px-5 py-2.5 text-white font-bold hover:bg-[#66001a] shadow-xs"
                >
                  <Text className="text-xs font-bold text-white">Next Step</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  className="flex flex-row items-center gap-2 rounded-xl bg-[#800020] px-6 py-2.5 text-white font-bold hover:bg-[#66001a] shadow-xs"
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Check size={16} color="#ffffff" />
                      <Text className="text-xs font-bold text-white">
                        {event ? 'Save Changes' : 'Schedule Event'}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
