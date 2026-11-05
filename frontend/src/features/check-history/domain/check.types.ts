export type CheckOrderType = 'dine_in' | 'takeout' | 'online_delivery';

export interface CheckLineItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

export interface SettledCheckItem {
  id: string;
  paymentId: string;
  tabId: string;
  checkNumber: string;
  orderType: CheckOrderType;
  tableOrRef: string;
  guestName: string;
  itemsCount: number;
  items: CheckLineItem[];
  subtotal: number;
  discountAmount: number;
  corkageFee: number;
  vatableSales: number;
  vatAmount: number;
  serviceCharge: number;
  total: number;
  paymentMethod: string;
  paymentChannel?: string;
  referenceNumber?: string;
  drawerTarget: 'main' | 'bar' | 'consolidated';
  cashierName: string;
  settledAt: string;
  timestamp: string;
  orderChannel: string;
  operatingMode: string;
  notes?: string;
}

export interface CheckFilterParams {
  startDate?: string;
  endDate?: string;
  channel?: 'all' | CheckOrderType;
  station?: string;
  searchQuery?: string;
  mode?: 'all' | 'CAFE' | 'EVENT';
}
