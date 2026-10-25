import { TableItem, OrderLineItem, CustomerTab } from '../../mockData';

export interface OrderEntryContext {
  type: 'dine_in' | 'takeout' | 'online';
  title: string;
  tableId?: string;
  tabIndex?: number;
  roundNumber?: number;
  initialItems?: OrderLineItem[];
  previousTabItems?: OrderLineItem[];
  hasExistingCorkage?: boolean;
  takeoutCustomer?: string;
  takeoutPrepaid?: boolean;
  takeoutNotes?: string;
  onlinePlatform?: 'grabfood' | 'foodpanda';
  onlineRef?: string;
  onlineRider?: string;
  onlineCustomer?: string;
}

export interface CheckoutContext {
  table: TableItem;
  activeTab?: CustomerTab | null;
}

export interface ConfirmFloorActionContext {
  type: 'takeout_collected' | 'online_courier';
  id: string;
  title: string;
  message: string;
}
