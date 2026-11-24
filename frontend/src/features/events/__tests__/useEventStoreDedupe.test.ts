import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEventStore } from '../application/useEventStore';
import { eventsApi } from '../data/events.api';
import { clearAllInFlight } from '@/features/shared/utils/inFlightDedupe';

vi.mock('../data/events.api', () => ({
  eventsApi: {
    getEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    settleArtistDoorChargePayout: vi.fn(),
  },
}));

vi.mock('@/features/shared/toast/useToastStore', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useEventStore in-flight deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllInFlight();
    useEventStore.setState({
      events: [],
      isLoading: false,
      hasLoadedOnce: false,
      selectedEvent: null,
      editingEvent: null,
    });
  });

  it('deduplicates concurrent loadEvents calls and sets hasLoadedOnce', async () => {
    const mockEvents = [
      {
        id: 'ev-1',
        title: 'Jazz Night',
        event_date: '2026-11-24',
        start_time: '20:00:00',
        status: 'published',
      },
    ];

    vi.mocked(eventsApi.getEvents).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return mockEvents as any;
    });

    const p1 = useEventStore.getState().loadEvents();
    const p2 = useEventStore.getState().loadEvents();

    await Promise.all([p1, p2]);

    expect(eventsApi.getEvents).toHaveBeenCalledTimes(1);
    expect(useEventStore.getState().events).toHaveLength(1);
    expect(useEventStore.getState().hasLoadedOnce).toBe(true);
    expect(useEventStore.getState().isLoading).toBe(false);
  });

  it('deduplicates concurrent saveEvent calls for the same event ID', async () => {
    const mockSaved = {
      id: 'ev-existing',
      title: 'Trio Set',
      event_date: '2026-11-24',
      start_time: '21:00:00',
      status: 'confirmed',
    };

    vi.mocked(eventsApi.updateEvent).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return mockSaved as any;
    });

    const input = { title: 'Trio Set' } as any;
    const [res1, res2] = await Promise.all([
      useEventStore.getState().saveEvent(input, 'ev-existing'),
      useEventStore.getState().saveEvent(input, 'ev-existing'),
    ]);

    expect(eventsApi.updateEvent).toHaveBeenCalledTimes(1);
    expect(res1).toEqual(mockSaved);
    expect(res2).toEqual(mockSaved);
  });
});
