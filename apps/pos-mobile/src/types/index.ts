export type UserRole =
  | 'admin'
  | 'waiter_cashier'
  | 'barista'
  | 'kitchen'
  | 'bartender';

export type StationType = 'barista' | 'kitchen' | 'bartender';

export type TicketStatus = 'NEW' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export type TableStatus =
  | 'EMPTY'
  | 'OCCUPIED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'BILL_REQUESTED';

export interface StationTicketItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
  isCorkage?: boolean;
}

export interface StationTicket {
  id: string;
  orderId: string;
  tableNumber: number;
  tableName?: string;
  station: StationType;
  status: TicketStatus;
  items: StationTicketItem[];
  waiterName?: string;
  createdAt: string;
  elapsedMinutes: number;
}
