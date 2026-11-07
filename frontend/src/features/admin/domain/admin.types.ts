export type AdminRoute =
  | 'dashboard'
  | 'stations'
  | 'chats'
  | 'menu'
  | 'inventory'
  | 'events'
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
  stationKey: 'bar' | 'kitchen' | 'runner' | 'floor';
  name: string;
  isOnline: boolean;
  targetTicketTime: string;
  activeTickets: number;
  avgTicketTime: string;
  avgTicketSeconds?: number;
  completedTickets?: number;
  onTimeRate?: number;
  lateTickets: number;
  stockoutCount: number;
  activeTicketTimestamps?: string[];
}

export interface TableTurnoverTelemetry {
  avgMinutes: number;
  avgFormatted: string;
  totalTablesTurned: number;
  activeOccupiedTables: number;
}

export interface StationsOverviewTelemetry {
  totalCompletedTickets: number;
  overallSlaPercent: number;
  fastestStation: string;
  busiestStation: string;
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

  // Staff Attendance & Payroll Expense Telemetry (Direct from attendance_records DB)
  totalPayrollExpense: number;
  basePayrollTotal: number;
  bonusPayrollTotal: number;
  laborCostPercent: number;
  estimatedCogs: number;
  estimatedNetProfit: number;
  clockedInStaffCount: number;
  completedShiftsCount: number;
  presentStaffCount: number;
  totalActiveStaffCount: number;

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
  tableTurnover?: TableTurnoverTelemetry;
  stationsOverview?: StationsOverviewTelemetry;
  stationMetricsResetAt?: string | null;
  categorySales: CategorySalesItem[];
  alerts: AttentionAlert[];
  lastUpdated: string;
}
