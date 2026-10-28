import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { SharedChatView } from '@/features/chat/presentation/SharedChatView';
import type { AdminRoute, DashboardTelemetry } from '../domain/admin.types';
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

export const AdminBackOfficeScreen: React.FC<{ onSwitchToFloor?: () => void }> = ({
  onSwitchToFloor,
}) => {
  const [currentRoute, setCurrentRoute] = useState<AdminRoute>('dashboard');
  const [operatingMode, setOperatingMode] = useState<'CAFE' | 'EVENT'>('CAFE');
  const [isLoading, setIsLoading] = useState(true);

  // Telemetry & back-office data state
  const [telemetry, setTelemetry] = useState<DashboardTelemetry | null>(null);
  const [inventory, setInventory] = useState<InventoryItemAdmin[]>([]);
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [analytics, setAnalytics] = useState<SalesAnalyticsOverview | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settings, inv, prod, anal, telem] = await Promise.all([
        adminApi.getVenueSettings(),
        adminApi.getInventoryItems(),
        adminApi.getProductsWithBOM(),
        adminApi.getSalesOverview(),
        adminTelemetryService.fetchDashboardTelemetry(),
      ]);
      setOperatingMode(settings.operating_mode);
      setInventory(inv);
      setProducts(prod);
      setAnalytics(anal);
      setTelemetry(telem);
    } catch {
      toast.error('Failed to load administrative telemetry suite', { title: 'Admin Error' });
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
    if (isLoading && !telemetry) {
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
            onRefresh={loadData}
            onNavigateRoute={setCurrentRoute}
            isLoading={isLoading}
          />
        ) : null;
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
      case 'chats':
        return (
          <View className="flex-1">
            <SharedChatView
              senderRole="Manager"
              senderName="Dana Cruz"
              title="Central Team & Station Chat"
            />
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
