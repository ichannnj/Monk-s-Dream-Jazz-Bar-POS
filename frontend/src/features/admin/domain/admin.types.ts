export type AdminRoute =
  | 'dashboard'
  | 'stations'
  | 'chats'
  | 'menu'
  | 'inventory'
  | 'staff'
  | 'sales'
  | 'attendance'
  | 'tables'
  | 'settings'
  | 'profile';

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
  activeTicketTimestamps?: string[];
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

export type TimeframeFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all';

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

  // Operational Floor & Payment Mix (Direct from DB)
  cashSales: number;
  digitalSales: number;
  cardSales: number;

  // Operating Mode Revenue Split (Cafe vs Event vs Total)
  cafeSales: number;
  eventSales: number;
  cafePercentage: number;
  eventPercentage: number;
  cafeOrdersCount: number;
  eventOrdersCount: number;
  cafeAvgCheck: number;
  eventAvgCheck: number;
  activeOperatingMode: 'CAFE' | 'EVENT';
  totalTables: number;
  occupiedTables: number;
  activeOpenTabs: number;
  occupancyPercent: number;
  timeframe: TimeframeFilter;
  timeframeLabel: string;
  benchmarkLabel: string;

  hourlySales: HourlySalesPoint[];
  peakHourLabel: string;
  bestSellers: BestSellerItem[];
  stations: StationTelemetry[];
  categorySales: CategorySalesItem[];
  alerts: AttentionAlert[];
  lastUpdated: string;
}
