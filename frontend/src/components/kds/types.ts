import { OrderLineItem } from '../../types/floor';

export type StationType = 'bar' | 'kitchen' | 'runner';

export type KdsOrderType = 'dine_in' | 'takeout' | 'online_delivery';

export type UrgencyLevel = 'normal' | 'warning' | 'critical';

export interface KdsTicket {
  ticketId: string;
  orderNumber: string;
  orderType: KdsOrderType;
  sourceTitle: string; // e.g. "Table 4", "Takeout #T-105", "GrabFood #GF-8842"
  guestName: string;
  elapsedTime: string;
  minutesElapsed: number;
  items: OrderLineItem[];
  transferAlert?: string; // e.g., "Re-routed from Table 2"
  roundNumber?: number;
  badges?: string[];
  voidAlert?: string;
  multiStationTag?: string;
}

export interface KdsFilterState {
  showCompleted: boolean;
  stationFilter: 'all' | 'food' | 'drink';
  sortBy: 'time_asc' | 'time_desc' | 'urgency';
}
