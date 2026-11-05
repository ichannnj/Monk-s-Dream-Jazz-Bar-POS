import { create } from 'zustand';
import { supabase } from '@/features/shared/infrastructure/supabase';
import { toast } from '@/features/shared/toast/useToastStore';
import type {
  VenueEvent,
  CalendarViewMode,
  CreateEventInput,
  UpdateEventInput,
} from '../domain/event.types';
import { eventsApi } from '../data/events.api';

interface EventState {
  events: VenueEvent[];
  currentDate: Date;
  viewMode: CalendarViewMode;
  selectedEvent: VenueEvent | null;
  editingEvent: VenueEvent | null;
  isCreateModalOpen: boolean;
  isDetailModalOpen: boolean;
  isShareModalOpen: boolean;
  isLoading: boolean;
  initialCreateDate: string | null;

  // Actions
  loadEvents: () => Promise<void>;
  setCurrentDate: (date: Date) => void;
  nextPeriod: () => void;
  prevPeriod: () => void;
  goToToday: () => void;
  setViewMode: (mode: CalendarViewMode) => void;
  openEventDetail: (event: VenueEvent) => void;
  closeEventDetail: () => void;
  openCreateModal: (dateString?: string) => void;
  openEditModal: (event: VenueEvent) => void;
  closeCreateEditModal: () => void;
  openShareModal: () => void;
  closeShareModal: () => void;
  saveEvent: (input: CreateEventInput | UpdateEventInput, id?: string) => Promise<VenueEvent>;
  deleteEvent: (id: string, storagePath?: string | null) => Promise<void>;
  initRealtimeSubscription: () => () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  currentDate: new Date(),
  viewMode: 'month',
  selectedEvent: null,
  editingEvent: null,
  isCreateModalOpen: false,
  isDetailModalOpen: false,
  isShareModalOpen: false,
  isLoading: false,
  initialCreateDate: null,

  loadEvents: async () => {
    set({ isLoading: true });
    try {
      const data = await eventsApi.getEvents();
      set({ events: data, isLoading: false });
    } catch (err: any) {
      console.error('[useEventStore.loadEvents] Error:', err);
      toast.error('Failed to load events calendar');
      set({ isLoading: false });
    }
  },

  setCurrentDate: (date: Date) => set({ currentDate: date }),

  nextPeriod: () => {
    const { currentDate, viewMode } = get();
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    set({ currentDate: next });
  },

  prevPeriod: () => {
    const { currentDate, viewMode } = get();
    const prev = new Date(currentDate);
    if (viewMode === 'month') {
      prev.setMonth(prev.getMonth() - 1);
    } else if (viewMode === 'week') {
      prev.setDate(prev.getDate() - 7);
    } else {
      prev.setMonth(prev.getMonth() - 1);
    }
    set({ currentDate: prev });
  },

  goToToday: () => set({ currentDate: new Date() }),

  setViewMode: (mode: CalendarViewMode) => set({ viewMode: mode }),

  openEventDetail: (event: VenueEvent) => {
    set({ selectedEvent: event, isDetailModalOpen: true });
  },

  closeEventDetail: () => {
    set({ isDetailModalOpen: false, selectedEvent: null });
  },

  openCreateModal: (dateString?: string) => {
    set({
      isCreateModalOpen: true,
      editingEvent: null,
      initialCreateDate: dateString || null,
      isDetailModalOpen: false,
    });
  },

  openEditModal: (event: VenueEvent) => {
    set({
      isCreateModalOpen: true,
      editingEvent: event,
      initialCreateDate: null,
      isDetailModalOpen: false,
    });
  },

  closeCreateEditModal: () => {
    set({ isCreateModalOpen: false, editingEvent: null, initialCreateDate: null });
  },

  openShareModal: () => set({ isShareModalOpen: true }),
  closeShareModal: () => set({ isShareModalOpen: false }),

  saveEvent: async (input, id) => {
    try {
      let saved: VenueEvent;
      if (id) {
        saved = await eventsApi.updateEvent(id, input as UpdateEventInput);
        set((state) => ({
          events: state.events.map((e) => (e.id === id ? saved : e)),
          selectedEvent: state.selectedEvent?.id === id ? saved : state.selectedEvent,
          isCreateModalOpen: false,
          editingEvent: null,
        }));
        toast.success(`Updated "${saved.title}"`);
      } else {
        saved = await eventsApi.createEvent(input as CreateEventInput);
        set((state) => ({
          events: [...state.events, saved].sort(
            (a, b) =>
              a.event_date.localeCompare(b.event_date) || a.start_time.localeCompare(b.start_time)
          ),
          isCreateModalOpen: false,
          editingEvent: null,
        }));
        toast.success(`Scheduled "${saved.title}"`);
      }
      return saved;
    } catch (err: any) {
      console.error('[useEventStore.saveEvent] Error:', err);
      toast.error('Failed to save event');
      throw err;
    }
  },

  deleteEvent: async (id, storagePath) => {
    try {
      await eventsApi.deleteEvent(id, storagePath);
      set((state) => ({
        events: state.events.filter((e) => e.id !== id),
        selectedEvent: null,
        isDetailModalOpen: false,
      }));
      toast.success('Event cancelled & removed from calendar');
    } catch (err: any) {
      console.error('[useEventStore.deleteEvent] Error:', err);
      toast.error('Failed to remove event');
      throw err;
    }
  },

  initRealtimeSubscription: () => {
    const channel = supabase
      .channel('pos_venue_events_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'venue_events' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newEvent = payload.new as VenueEvent;
            set((state) => {
              if (state.events.some((e) => e.id === newEvent.id)) return state;
              return {
                events: [...state.events, newEvent].sort(
                  (a, b) =>
                    a.event_date.localeCompare(b.event_date) ||
                    a.start_time.localeCompare(b.start_time)
                ),
              };
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as VenueEvent;
            set((state) => ({
              events: state.events.map((e) => (e.id === updated.id ? updated : e)),
              selectedEvent: state.selectedEvent?.id === updated.id ? updated : state.selectedEvent,
            }));
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            set((state) => ({
              events: state.events.filter((e) => e.id !== deleted.id),
              selectedEvent: state.selectedEvent?.id === deleted.id ? null : state.selectedEvent,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
