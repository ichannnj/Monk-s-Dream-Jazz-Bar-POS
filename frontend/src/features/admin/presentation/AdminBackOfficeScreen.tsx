import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { SharedChatView } from '@/features/chat/presentation/SharedChatView';
import { useResponsive } from '@/features/shared/hooks/useResponsive';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';
import { useVenueStore } from '@/features/shared';
import type { AdminRoute, DashboardTelemetry, TimeframeFilter } from '../domain/admin.types';
import {
  adminApi,
  type InventoryItemAdmin,
  type ProductAdmin,
  type SalesAnalyticsOverview,
} from '../data/admin.api';
import { adminTelemetryService } from '../data/adminTelemetry';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminHeader } from './components/AdminHeader';
import { AdminFloatingChat } from './components/AdminFloatingChat';
import { AdminBottomNav } from './components/AdminBottomNav';
import { AdminMobileDrawer } from './components/AdminMobileDrawer';
import { AdminDashboardView } from './views/AdminDashboardView';
import { AdminInventoryView } from './views/AdminInventoryView';
import { AdminRecipesView } from './views/AdminRecipesView';
import { AdminStaffView } from './views/AdminStaffView';
import { AdminAttendancePayrollView } from './views/AdminAttendancePayrollView';
import { AdminStationsView } from './views/AdminStationsView';
import { AdminTransactionsView } from './views/AdminTransactionsView';
import { AdminSettingsView } from './views/AdminSettingsView';
import { AdminTableLayoutView } from './views/AdminTableLayoutView';
import { AdminProfileView } from './views/AdminProfileView';
import { AdminEventsView } from '@/features/events';
import { ManagerModeSwitchModal } from '@/features/floor/presentation/ManagerModeSwitchModal';

export const AdminBackOfficeScreen: React.FC<{ onSwitchToFloor?: () => void }> = ({
  onSwitchToFloor,
}) => {
  const { isMobile, isTablet } = useResponsive();
  const [currentRoute, setCurrentRoute] = useState<AdminRoute>('dashboard');
  const { operatingMode, setOperatingMode } = useVenueStore();
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModeSwitchModalOpen, setIsModeSwitchModalOpen] = useState(false);

  // Telemetry & back-office data state
  const [telemetry, setTelemetry] = useState<DashboardTelemetry | null>(null);
  const [inventory, setInventory] = useState<InventoryItemAdmin[]>([]);
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [analytics, setAnalytics] = useState<SalesAnalyticsOverview | null>(null);

  const timeframeRef = useRef<TimeframeFilter>(timeframe);
  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  const loadData = useCallback(async (tf?: TimeframeFilter, silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    const activeTimeframe = tf ?? timeframeRef.current;
    try {
      const [settingsRes, invRes, prodRes, analRes, telemRes] = await Promise.allSettled([
        adminApi.getVenueSettings(),
        adminApi.getInventoryItems(),
        adminApi.getProductsWithBOM(),
        adminApi.getSalesOverview(),
        adminTelemetryService.fetchDashboardTelemetry(activeTimeframe),
      ]);

      if (settingsRes.status === 'fulfilled') {
        setOperatingMode(settingsRes.value.operating_mode);
      }
      if (invRes.status === 'fulfilled') {
        setInventory(invRes.value);
      } else {
        console.warn('[AdminBackOfficeScreen] Failed to load inventory:', invRes.reason);
      }
      if (prodRes.status === 'fulfilled') {
        setProducts(prodRes.value);
      } else {
        console.warn('[AdminBackOfficeScreen] Failed to load products:', prodRes.reason);
      }
      if (analRes.status === 'fulfilled') {
        setAnalytics(analRes.value);
      }
      if (telemRes.status === 'fulfilled') {
        setTelemetry(telemRes.value);
      } else {
        console.warn('[AdminBackOfficeScreen] Failed to load telemetry:', telemRes.reason);
      }
    } catch (err) {
      console.error('[AdminBackOfficeScreen] Unexpected error in loadData:', err);
      if (!silent) {
        toast.error('Failed to refresh administrative data', { title: 'Admin Notice' });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime Centralized Event-Driven Sync (tables, tabs, orders, payments, drawer, inventory)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerQuietRefresh = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      loadData(timeframeRef.current, true);
    }, 400);
  }, [loadData]);

  useEffect(() => {
    const unsub = realtimeGateway.subscribeGlobalPOSRealtime({
      onTableChange: () => triggerQuietRefresh(),
      onTabChange: () => triggerQuietRefresh(),
      onOrderChange: () => triggerQuietRefresh(),
      onOrderItemChange: () => triggerQuietRefresh(),
      onProductChange: () => triggerQuietRefresh(),
      onPaymentChange: () => triggerQuietRefresh(),
      onInventoryChange: () => triggerQuietRefresh(),
      onWasteLogChange: () => triggerQuietRefresh(),
      onCashDrawerChange: () => triggerQuietRefresh(),
      onAttendanceChange: () => triggerQuietRefresh(),
      onPosSyncNeeded: () => triggerQuietRefresh(),
    });

    return () => {
      unsub();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [triggerQuietRefresh]);

  const handleToggleMode = () => {
    setIsDrawerOpen(false);
    setIsModeSwitchModalOpen(true);
  };

  const handleConfirmSwitchMode = async (nextMode: 'CAFE' | 'EVENT') => {
    await setOperatingMode(nextMode);
    toast.success(
      nextMode === 'EVENT'
        ? '🎷 Event Mode Activated! Orders tagged for Live Jazz Set (auto-reverts to Cafe Mode at 6:00 AM).'
        : '☀️ Daytime Cafe Mode Activated!',
      { title: 'Operating Mode Updated' }
    );
  };

  const renderActiveView = () => {
    if (isLoading && !telemetry && currentRoute === 'dashboard') {
      return (
        <View className="flex-1 items-center justify-center bg-[#fcf9f9]">
          <ActivityIndicator size="large" color="#800020" />
          <Text className="mt-4 text-base font-medium text-stone-600">
            Loading Monk's Dream Admin Suite...
          </Text>
        </View>
      );
    }

    switch (currentRoute) {
      case 'dashboard':
        return telemetry ? (
          <AdminDashboardView
            telemetry={telemetry}
            onRefresh={() => loadData(timeframe)}
            onNavigateRoute={setCurrentRoute}
            isLoading={isLoading}
            timeframe={timeframe}
            onChangeTimeframe={(tf) => {
              setTimeframe(tf);
              loadData(tf);
            }}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-[#fcf9f9]">
            <ActivityIndicator size="large" color="#800020" />
            <Text className="mt-4 text-base font-medium text-stone-600">
              Initializing live analytics...
            </Text>
          </View>
        );
      case 'inventory':
        return <AdminInventoryView inventory={inventory} onRefresh={loadData} />;
      case 'events':
        return <AdminEventsView />;
      case 'menu':
        return <AdminRecipesView products={products} onRefresh={loadData} />;
      case 'staff':
        return (
          <AdminStaffView
            onRefresh={loadData}
            onNavigateToAttendance={() => setCurrentRoute('attendance')}
          />
        );
      case 'attendance':
        return (
          <AdminAttendancePayrollView
            onRefresh={loadData}
            onNavigateToRoster={() => setCurrentRoute('staff')}
          />
        );
      case 'stations':
        return <AdminStationsView telemetry={telemetry} onRefresh={() => loadData(timeframe)} />;
      case 'sales':
        return <AdminTransactionsView analytics={analytics} onRefresh={loadData} />;
      case 'tables':
        return <AdminTableLayoutView />;
      case 'settings':
        return <AdminSettingsView onRefresh={loadData} />;
      case 'profile':
        return <AdminProfileView />;
      case 'chats':
        return (
          <View className="flex-1">
            <SharedChatView senderRole="Manager" title="Central Team & Station Chat" />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View
      className="flex-1 flex-row w-full overflow-hidden"
      style={{ backgroundColor: '#4A1020E0' }}
    >
      {/* Pinned Wine Burgundy Sidebar (Visible on Desktop >= 1024px) */}
      <AdminSidebar
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        unreadChatCount={3}
      />

      {/* Main Content Workspace */}
      <View className="flex-1 min-w-0 flex-col bg-[#fcf9f9] overflow-hidden">
        {/* Top Header Bar */}
        <AdminHeader
          currentRoute={currentRoute}
          operatingMode={operatingMode}
          onToggleOperatingMode={handleToggleMode}
          onSwitchToFloor={onSwitchToFloor}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onNavigateProfile={() => setCurrentRoute('profile')}
        />

        {/* Dynamic Route Body */}
        <View className="flex-1 min-w-0">{renderActiveView()}</View>

        {/* Mobile / Tablet Bottom Navigation Bar (< 1024px) */}
        {(isMobile || isTablet) && (
          <AdminBottomNav
            currentRoute={currentRoute}
            onRouteChange={setCurrentRoute}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            unreadChatCount={3}
          />
        )}
      </View>

      {/* Slide-over Full Navigation Drawer for Mobile/Tablet (< 1024px) */}
      <AdminMobileDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        unreadChatCount={3}
        operatingMode={operatingMode}
        onToggleOperatingMode={handleToggleMode}
        onSwitchToFloor={onSwitchToFloor}
      />

      {/* Slide-over Team Chat Trigger Button (Desktop only; on mobile, Chat is in bottom bar) */}
      {!isMobile && currentRoute !== 'chats' && <AdminFloatingChat unreadCount={3} />}

      {/* Operating Mode Switch Confirmation Modal */}
      <ManagerModeSwitchModal
        visible={isModeSwitchModalOpen}
        currentMode={operatingMode}
        isAdminUser={true}
        onClose={() => setIsModeSwitchModalOpen(false)}
        onConfirmSwitch={handleConfirmSwitchMode}
      />
    </View>
  );
};
