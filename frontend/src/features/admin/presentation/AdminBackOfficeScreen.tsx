import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { SharedChatView } from '@/features/chat/presentation/SharedChatView';
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
import { AdminDashboardView } from './views/AdminDashboardView';
import { AdminInventoryView } from './views/AdminInventoryView';
import { AdminRecipesView } from './views/AdminRecipesView';
import { AdminStaffView } from './views/AdminStaffView';
import { AdminStationsView } from './views/AdminStationsView';
import { AdminTransactionsView } from './views/AdminTransactionsView';
import { AdminSettingsView } from './views/AdminSettingsView';
import { AdminTableLayoutView } from './views/AdminTableLayoutView';

export const AdminBackOfficeScreen: React.FC<{ onSwitchToFloor?: () => void }> = ({
  onSwitchToFloor,
}) => {
  const [currentRoute, setCurrentRoute] = useState<AdminRoute>('dashboard');
  const [operatingMode, setOperatingMode] = useState<'CAFE' | 'EVENT'>('CAFE');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('today');
  const [isLoading, setIsLoading] = useState(true);

  // Telemetry & back-office data state
  const [telemetry, setTelemetry] = useState<DashboardTelemetry | null>(null);
  const [inventory, setInventory] = useState<InventoryItemAdmin[]>([]);
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [analytics, setAnalytics] = useState<SalesAnalyticsOverview | null>(null);

  const loadData = useCallback(async (tf?: TimeframeFilter) => {
    setIsLoading(true);
    const activeTimeframe = tf ?? timeframe;
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
      toast.error('Failed to refresh administrative data', { title: 'Admin Notice' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleMode = async () => {
    const nextMode = operatingMode === 'CAFE' ? 'EVENT' : 'CAFE';
    try {
      await adminApi.setOperatingMode(nextMode);
      setOperatingMode(nextMode);
      toast.success(
        nextMode === 'EVENT'
          ? '🎷 Event Mode Activated! Orders tagged for Live Jazz Set.'
          : '☀️ Daytime Cafe Mode Activated!',
        { title: 'Operating Mode Updated' }
      );
    } catch {
      toast.error('Failed to switch operating mode', { title: 'Update Error' });
    }
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
      case 'menu':
        return <AdminRecipesView products={products} onRefresh={loadData} />;
      case 'staff':
      case 'attendance':
        return <AdminStaffView onRefresh={loadData} />;
      case 'stations':
        return <AdminStationsView />;
      case 'sales':
        return <AdminTransactionsView analytics={analytics} onRefresh={loadData} />;
      case 'tables':
        return <AdminTableLayoutView />;
      case 'settings':
        return <AdminSettingsView onRefresh={loadData} />;
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
    <View className="flex-1 flex-row" style={{ backgroundColor: '#4A1020E0' }}>
      {/* Pinned Wine Burgundy Sidebar */}
      <AdminSidebar
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        unreadChatCount={3}
      />

      {/* Main Content Workspace */}
      <View className="flex-1 flex-col bg-[#fcf9f9]">
        {/* Top Header Bar */}
        <AdminHeader
          currentRoute={currentRoute}
          operatingMode={operatingMode}
          onToggleOperatingMode={handleToggleMode}
          onSwitchToFloor={onSwitchToFloor}
        />

        {/* Dynamic Route Body */}
        <View className="flex-1">{renderActiveView()}</View>
      </View>

      {/* Slide-over Team Chat Trigger Button & Drawer (hidden when on Team Chats view) */}
      {currentRoute !== 'chats' && <AdminFloatingChat unreadCount={3} />}
    </View>
  );
};
