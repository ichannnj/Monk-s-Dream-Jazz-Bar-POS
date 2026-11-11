export type EventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type EventSplitType = 'percentage' | 'flat_per_ticket';
export type ArtistPayoutStatus = 'unsettled' | 'paid';

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
  // Door Charge & Artist Revenue Split
  has_door_charge?: boolean;
  door_charge_amount?: number;
  split_type?: EventSplitType;
  artist_split_value?: number;
  venue_split_value?: number;
  artist_payout_status?: ArtistPayoutStatus;
  artist_payout_notes?: string | null;
  artist_payout_at?: string | null;
  artist_paid_by_id?: string | null;
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
  // Door Charge & Artist Revenue Split
  has_door_charge?: boolean;
  door_charge_amount?: number;
  split_type?: EventSplitType;
  artist_split_value?: number;
  venue_split_value?: number;
  artist_payout_status?: ArtistPayoutStatus;
  artist_payout_notes?: string | null;
  artist_payout_at?: string | null;
}

export interface EventDoorChargeSummary {
  event_id: string;
  title: string;
  has_door_charge: boolean;
  door_charge_amount: number;
  split_type: EventSplitType;
  artist_split_value: number;
  venue_split_value: number;
  tickets_sold: number;
  gross_sales: number;
  artist_share: number;
  venue_share: number;
  artist_payout_status: ArtistPayoutStatus;
  artist_payout_notes?: string | null;
  artist_payout_at?: string | null;
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
