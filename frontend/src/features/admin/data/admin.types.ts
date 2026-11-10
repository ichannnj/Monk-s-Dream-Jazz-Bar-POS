import type { Database } from '@monks/shared';

export type OperatingMode = Database['public']['Enums']['operating_mode'];

export interface VenueSettings {
  id: string;
  operating_mode: OperatingMode;
  venue_name: string;
  daily_overhead_cost: number;
  vat_rate?: number;
  vat_inclusive?: boolean;
  service_charge_rate?: number;
  service_charge_enabled?: boolean;
  cafe_food_service_charge_rate?: number;
  event_service_charge_rate?: number;
  discounts_config?: {
    senior_pwd_percent: number;
    musician_comp_percent: number;
    staff_discount_percent: number;
    [key: string]: number;
  };
  printer_routing_config?: {
    bar_printer_ip?: string;
    kitchen_printer_ip?: string;
    runner_printer_ip?: string;
    [key: string]: string | undefined;
  };
  mode_switched_at?: string;
  updated_at?: string;
}

export interface SupplierAdmin {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  lead_time_days: number;
  notes: string | null;
}

export interface InventoryItemAdmin {
  id: string;
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  unit: string;
  min_alert_level: number;
  unit_cost: number;
  supplier_name: string | null;
  supplier_id?: string | null;
  supplier?: SupplierAdmin | null;
}

export interface CategoryAdmin {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface ProductModifierOptionAdmin {
  id: string;
  group_id?: string | null;
  product_id?: string | null;
  name: string;
  price_delta: number;
  applicable_category?: string;
  inventory_item_id?: string | null;
  amount_delta?: number;
  unit?: string | null;
  inventory_item?: {
    name: string;
    unit: string;
  };
}

export interface ModifierGroupAdmin {
  id: string;
  name: string;
  product_id: string | null;
  applicable_category?: string;
  min_selections: number;
  max_selections: number;
  is_required: boolean;
  sort_order: number;
  options?: ProductModifierOptionAdmin[];
}

export interface ProductVariantAdmin {
  id?: string;
  product_id?: string;
  temperature: 'HOT' | 'COLD' | 'ROOM' | 'NONE';
  size_label: string;
  price: number;
  is_available?: boolean;
  sku?: string | null;
  sort_order?: number;
}

export interface ProductVariantOptionAdmin {
  id: string;
  group_id: string;
  code: string;
  name: string;
  default_price_delta: number;
  price_delta?: number;
  is_default?: boolean;
  is_available?: boolean;
  is_active?: boolean;
  sort_order?: number;
  ingredients?: Array<{
    id?: string;
    inventory_item_id: string;
    amount: number;
    unit: string;
    conversion_factor?: number;
  }>;
}

export interface ProductVariantGroupAdmin {
  id: string;
  code: string;
  name: string;
  min_selections: number;
  max_selections: number;
  is_required: boolean;
  allows_duplicates: boolean;
  is_active: boolean;
  sort_order: number;
  options?: ProductVariantOptionAdmin[];
  is_assigned?: boolean;
}

export interface ProductAdmin {
  id: string;
  name: string;
  category_id: string;
  base_price: number;
  station_target: string;
  is_resold_outside_food: boolean;
  original_cost: number | null;
  auto_86: boolean;
  image_url: string | null;
  image_storage_path?: string | null;
  image_mime_type?: string | null;
  image_size_bytes?: number | null;
  description?: string;
  allergens?: string[];
  dietary?: string[];
  is_available?: boolean;
  categories?: {
    id: string;
    name: string;
    slug: string;
  };
  variants?: ProductVariantAdmin[];
  ingredients?: Array<{
    id: string;
    inventory_item_id: string;
    amount: number;
    unit: string;
    conversion_factor: number;
    inventory_item?: {
      name: string;
      unit: string;
      unit_cost: number;
    };
  }>;
  modifier_groups?: ModifierGroupAdmin[];
  modifiers?: ProductModifierOptionAdmin[];
}

export interface StockMovementAdmin {
  id: string;
  inventory_item_id: string;
  movement_type: string;
  change_amount: number;
  balance_before: number;
  balance_after: number;
  reference_id: string | null;
  created_at: string;
  inventory_item?: {
    name: string;
    sku: string;
    unit: string;
  };
}

export interface StocktakeSessionAdmin {
  id: string;
  conducted_by_id: string | null;
  notes: string | null;
  status: string;
  total_variance_cost: number;
  created_at: string;
}

export const PH_MINIMUM_WAGE_DAILY = 645.0;

export type StaffRoleType =
  | 'admin'
  | 'cashier'
  | 'waiter'
  | 'station_bar'
  | 'station_cafe'
  | 'station_food'
  | 'printer_station';

export interface StaffMemberAdmin {
  id: string;
  username: string;
  display_name: string;
  role: StaffRoleType | string;
  job_title?: string | null;
  is_workflow_staff: boolean;
  base_daily_rate: number | string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface CreateStaffUserPayload {
  display_name: string;
  username: string;
  pin: string;
  role: StaffRoleType;
  job_title?: string | null;
  base_daily_rate: number;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  password?: string | null;
}

export interface CreateNonWorkflowStaffPayload {
  display_name: string;
  job_title: string;
  username?: string;
  pin?: string;
  base_daily_rate: number;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface UpdateStaffMemberPayload {
  display_name?: string;
  username?: string;
  role?: StaffRoleType;
  job_title?: string | null;
  base_daily_rate?: number;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
}

export interface AttendanceRecordAdmin {
  id: string;
  user_id: string;
  date: string;
  is_present: boolean;
  shift_status?: 'CLOCKED_IN' | 'COMPLETED' | 'ABSENT';
  clock_in_at?: string | null;
  clock_out_at?: string | null;
  hours_worked?: number;
  base_daily_pay: number;
  addon_pay: number;
  total_day_pay: number;
  notes?: string | null;
  user?: {
    display_name: string;
    role: string;
    job_title?: string | null;
    is_workflow_staff: boolean;
  };
}

export interface SalesAnalyticsOverview {
  grossSales: number;
  orderCount: number;
  averageTicket: number;
  totalLaborExpense: number;
  totalCogs: number;
  estimatedNetProfit: number;
  channelBreakdown: Record<string, { sales: number; count: number }>;
  tenderBreakdown: {
    cash: number;
    card: number;
    digital: number;
    delivery: number;
    total: number;
  };
  hourlySales: {
    hour: string;
    sales: number;
    orderCount?: number;
  }[];
  peakHourLabel?: string;
  modeBreakdown?: {
    cafeSales: number;
    eventSales: number;
    cafeOrderCount: number;
    eventOrderCount: number;
    totalSales: number;
    cafePercent: number;
    eventPercent: number;
  };
}

export interface SalesOverviewFilterParams {
  filterMode?: OperatingMode | 'ALL';
  startDate?: string;
  endDate?: string;
  station?: string;
}

export interface TableAdmin {
  id: string;
  table_number: string;
  zone: 'CAFE_AREA' | 'BAR_AREA';
  capacity: number;
  is_occupied: boolean;
}
