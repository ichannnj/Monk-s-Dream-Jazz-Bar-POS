import React from 'react';
import {
  LayoutGrid,
  Activity,
  MessageSquare,
  Utensils,
  Package,
  CalendarDays,
  Users,
  Receipt,
  Clock,
  Settings,
  Shield,
  type LucideIcon,
} from 'lucide-react-native';
import type { AdminRoute } from '../../domain/admin.types';

export type AdminNavGroup = 'operations' | 'manage' | 'reports';

export interface AdminNavigationItemConfig {
  id: AdminRoute;
  label: string;
  description: string;
  group: AdminNavGroup;
  icon: LucideIcon;
  mobilePriority?: 'primary' | 'secondary';
  badgeKey?: 'unreadChats';
}

export const ADMIN_NAVIGATION_ITEMS: AdminNavigationItemConfig[] = [
  // Operations Group
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Live performance and sales metrics',
    group: 'operations',
    icon: LayoutGrid,
    mobilePriority: 'primary',
  },
  {
    id: 'stations',
    label: 'Live Stations',
    description: 'Bar, Barista & Kitchen prep telemetry',
    group: 'operations',
    icon: Activity,
    mobilePriority: 'primary',
  },
  {
    id: 'chats',
    label: 'Team Chats',
    description: 'Station channels and direct messages',
    group: 'operations',
    icon: MessageSquare,
    badgeKey: 'unreadChats',
    mobilePriority: 'primary',
  },

  // Management Group
  {
    id: 'menu',
    label: 'Menu Catalog',
    description: 'Products, variants, BOM and modifiers',
    group: 'manage',
    icon: Utensils,
  },
  {
    id: 'inventory',
    label: 'Inventory Hub',
    description: 'Stock levels, movements and audit logs',
    group: 'manage',
    icon: Package,
  },
  {
    id: 'events',
    label: 'Event Logistics',
    description: 'Live jazz calendar and gig schedule',
    group: 'manage',
    icon: CalendarDays,
  },
  {
    id: 'tables',
    label: 'Table Layout',
    description: 'Floor plan and zone configuration',
    group: 'manage',
    icon: LayoutGrid,
  },
  {
    id: 'staff',
    label: 'Staff Roster',
    description: 'Team members, roles and access PINs',
    group: 'manage',
    icon: Users,
  },

  // Reports & Venue
  {
    id: 'sales',
    label: 'Sales & Transactions',
    description: 'Financial ledger, trends and X/Y/Z readings',
    group: 'reports',
    icon: Receipt,
  },
  {
    id: 'attendance',
    label: 'Attendance & Payroll',
    description: 'Punches, hours and statutory payroll',
    group: 'reports',
    icon: Clock,
  },
  {
    id: 'settings',
    label: 'Venue Settings',
    description: 'Operating configuration and QR payments',
    group: 'reports',
    icon: Settings,
  },
  {
    id: 'profile',
    label: 'My Profile & Security',
    description: 'Credentials and Floor Manager PIN',
    group: 'reports',
    icon: Shield,
  },
];

export const ADMIN_NAV_GROUPS: { key: AdminNavGroup; title: string }[] = [
  { key: 'operations', title: 'OPERATIONS' },
  { key: 'manage', title: 'MANAGEMENT' },
  { key: 'reports', title: 'REPORTS & VENUE' },
];

export function getAdminNavConfig(route: AdminRoute): AdminNavigationItemConfig | undefined {
  return ADMIN_NAVIGATION_ITEMS.find((item) => item.id === route);
}
