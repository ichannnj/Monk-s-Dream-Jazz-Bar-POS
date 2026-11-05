export type EventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface VenueEvent {
  id: string;
  title: string;
  event_date: string; // 'YYYY-MM-DD'
  start_time: string; // 'HH:MM:SS' or 'HH:MM'
  end_time?: string | null;
  poster_url?: string | null;
  poster_storage_path?: string | null;
  performer_name?: string | null;
  genre?: string | null;
  description?: string | null;
  sound_check_time?: string | null;
  gear_requirements?: string | null;
  reserved_tables?: string | null;
  special_requests?: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateEventInput {
  title: string;
  event_date: string;
  start_time: string;
  end_time?: string | null;
  poster_url?: string | null;
  poster_storage_path?: string | null;
  performer_name?: string | null;
  genre?: string | null;
  description?: string | null;
  sound_check_time?: string | null;
  gear_requirements?: string | null;
  reserved_tables?: string | null;
  special_requests?: string | null;
  status?: EventStatus;
}

export type UpdateEventInput = Partial<CreateEventInput>;

export type CalendarViewMode = 'month' | 'week' | 'agenda';

export interface CalendarDayCell {
  date: Date;
  dateString: string; // 'YYYY-MM-DD'
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: VenueEvent[];
}
