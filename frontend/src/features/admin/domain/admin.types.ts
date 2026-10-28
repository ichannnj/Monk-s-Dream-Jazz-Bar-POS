export type AdminRoute =
  'dashboard' | 'stations' | 'chats' | 'menu' | 'inventory' | 'staff' | 'sales' | 'attendance';

export interface BestSellerItem {
  id: string;
  rank: number;
  name: string;
  category: string;
  soldCount: number;
  salesAmount: number;
  progressPercent: number; // 0 to 100
}

export interface StationTelemetry {
  stationKey: 'bar' | 'cafe' | 'kitchen' | 'runner';
  name: string;
  isOnline: boolean;
  targetTicketTime: string;
  activeTickets: number;
  avgTicketTime: string;
  lateTickets: number;
  stockoutCount: number;
}

export interface CategorySalesItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface AttentionAlert {
  id: string;
  type: 'void' | 'low_stock' | 'clock_out' | 'ticket_late';
  badgeLabel: string;
  title: string;
  description: string;
  targetRoute: AdminRoute;
  createdAt: string;
}

export interface HourlySalesPoint {
  hourLabel: string; // e.g. "7 AM", "1 PM"
  sales: number;
  isPeak?: boolean;
}

export interface DashboardTelemetry {
  liveSalesTotal: number;
  salesGrowthPercent: number;
  orderCount: number;
  ordersGrowthPercent: number;
  ordersPerHour: number;
  averageCheck: number;
  averageCheckGrowthPercent: number;
  guestCount: number;
  guestGrowthPercent: number;
  spendPerGuest: number;
  hourlySales: HourlySalesPoint[];
  peakHourLabel: string;
  bestSellers: BestSellerItem[];
  stations: StationTelemetry[];
  categorySales: CategorySalesItem[];
  alerts: AttentionAlert[];
  lastUpdated: string;
}
