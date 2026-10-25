import { OrderLineItem } from '../../../../types/floor';

export interface RunnerTicket {
  id: string;
  orderNumber: string;
  sourceTitle: string; // e.g. "Table 4 · Tab 1 · Round 2"
  guestName: string;
  orderType: 'dine_in' | 'takeout' | 'online_delivery';
  elapsedTime: string;
  minutesElapsed: number;
  items: OrderLineItem[];
  allDone: boolean;
  readyItemsCount: number;
  totalItemsCount: number;
  roundNumber?: number;
  tableId?: string;
  tabIndex?: number;
  transferredFrom?: {
    tableCode: string;
    transferredAt?: string;
  };
}

export interface ConfirmHandoffState {
  ticket: RunnerTicket;
  target?: 'bar' | 'kitchen';
}
