/**
 * Floor POS, Station Routing & Tab Domain Types for Monk's Dream Jazz Bar
 */

export interface StaffUser {
  id: string;
  username: string;
  displayName: string;
  role:
    | 'admin'
    | 'waiter'
    | 'cashier'
    | 'barista'
    | 'kitchen'
    | 'bartender'
    | 'station_bar'
    | 'station_cafe'
    | 'station_food'
    | 'foh_runner'
    | 'printer_station';
  pin: string;
}

export type TableArea = 'bar' | 'cafe';
export type TableStatus = 'empty' | 'occupied' | 'preparing' | 'ready' | 'served';
export type ChannelCategory = 'all' | 'cafe' | 'bar' | 'takeout' | 'online';

export interface OrderLineItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  stationTarget: 'bar' | 'kitchen';
  modifiers?: string[];
  notes?: string;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  roundNumber?: number;
  voidReason?: string;
}

export interface CustomerTab {
  id: string;
  tabIndex: number;
  guestName: string;
  status: 'open' | 'billed' | 'closed';
  hasCorkageFee?: boolean;
  corkageAmount?: number;
  discountType?: 'staff' | 'promo' | 'comp';
  discountAmount?: number;
  items: OrderLineItem[];
  totalAmount: number;
  openedAt?: string;
  transferredFrom?: {
    tableCode: string;
    transferredAt?: string;
  };
}

export interface TableItem {
  id: string;
  code: string;
  area: TableArea;
  seats: number;
  guests: number;
  status: TableStatus;
  elapsedTime: string;
  assignedStaff?: {
    initials: string;
    name: string;
  };
  totalAmount?: number;
  hasOpenCheck: boolean;
  activeTabs: number[];
  maxTabs: number;
  isMyTable: boolean;
  tabs?: CustomerTab[];
}

export type MenuCategory =
  'coffee' | 'cocktails_wine' | 'mains_pasta' | 'small_plates' | 'desserts';

export interface MenuItem {
  id: string;
  name: string;
  imageUrl?: string;
  category: MenuCategory;
  price: number;
  stationTarget: 'bar' | 'kitchen';
  description: string;
  allergens: string[]; // Dairy, Gluten, Peanuts, Tree Nuts, Eggs, Soy, etc.
  dietary: string[]; // Vegan, Vegetarian, Gluten-Free
  isAvailable: boolean;
  auto86: boolean;
  outOfStockReason?: string;
  isResoldOutsideFood?: boolean;
  originalCost?: number;
  modifiers: {
    id: string;
    name: string;
    priceDelta: number;
  }[];
}

export interface TakeoutOrder {
  id: string;
  ticketNumber: string; // e.g. "T-105"
  customerName: string;
  items: OrderLineItem[];
  total: number;
  status: 'preparing' | 'ready' | 'completed';
  elapsedTime: string;
  isPrepaid: boolean;
  notes?: string;
}

export interface OnlineDeliveryOrder {
  id: string;
  platform: 'grabfood' | 'foodpanda';
  platformOrderRef: string; // e.g. "GF-8842" or "FP-3012"
  riderName: string;
  customerName: string;
  items: OrderLineItem[];
  total: number;
  status: 'preparing' | 'ready' | 'completed';
  elapsedTime: string;
  paymentStatus: 'PAID_ONLINE_GRAB' | 'PAID_ONLINE_FOODPANDA';
}

export interface CheckItem {
  id: string;
  checkNumber: string;
  orderType: 'dine_in' | 'takeout' | 'online_delivery';
  tableOrRef: string;
  guestName: string;
  itemsCount: number;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp';
  status: 'open' | 'billed' | 'paid' | 'voided';
  timestamp: string;
  cashierName: string;
  itemsSummary: string;
}

export interface DrawerEntry {
  id: string;
  type: 'float' | 'cash_in' | 'cash_out' | 'drop' | 'sale';
  amount: number;
  reason: string;
  performedBy: string;
  timestamp: string;
}

export interface FloorAlert {
  id: string;
  title: string;
  description: string;
  type: 'station_ready' | 'auto_86' | 'transfer' | 'system' | 'spoilage_alert';
  time: string;
  isRead: boolean;
  targetRef?: string;
}

export interface ChatMessage {
  id: string;
  channel: 'all' | 'bar' | 'kitchen';
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
}
