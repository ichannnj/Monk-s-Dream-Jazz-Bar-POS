import './src/global.css';
import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, View } from 'react-native';
import { rem } from 'nativewind';
import { WaiterCashierScreen } from './src/features/floor';
import { BaristaKdsScreen, KitchenKdsScreen, FohRunnerScreen } from './src/features/kds';
import { ToastContainer, ErrorBoundary } from './src/features/shared';
import { LoginScreen, TimeclockKioskScreen, useAuthStore } from './src/features/auth';
import { PublicEventCalendarScreen } from './src/features/events';
import { HardwarePrintStationScreen, useDeviceHardwareStation } from './src/features/printer';
import { useOrderStore } from './src/features/orders';
import { useChatStore } from './src/features/chat';

import { AdminBackOfficeScreen } from './src/features/admin';

import { useVenueStore } from './src/features/shared';

// Ensure 1rem = 16px root scale for tablet typography
try {
  rem.set(16);
} catch {
  // Handled in environments where rem observable is pre-configured
}

export default function App() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const initRealtimeSync = useOrderStore((s) => s.initRealtimeSync);
  const [adminView, setAdminView] = React.useState<'admin' | 'floor'>('admin');

  // Keep all stations synchronized with POS orders, venue settings and Team Chat in real-time
  useEffect(() => {
    const unsubOrders = initRealtimeSync();
    const unsubChat = useChatStore.getState().setupRealtimeSubscription();
    const unsubVenue = useVenueStore.getState().initRealtimeSubscription();
    useChatStore.getState().loadInitialData(currentUser?.id);
    if (currentUser?.id) {
      useChatStore.getState().trackCurrentPresence();
    }

    return () => {
      unsubOrders();
      unsubChat();
      unsubVenue();
    };
  }, [initRealtimeSync, currentUser?.id]);

  // ALWAYS reset admin view to 'admin' whenever currentUser logs in or changes
  useEffect(() => {
    setAdminView('admin');
  }, [currentUser]);

  // Keep device-level hardware station active across all screens & logins if this PC is designated
  const initDeviceStation = useDeviceHardwareStation((s) => s.initDeviceStation);
  const isHardwareStation = useDeviceHardwareStation((s) => s.isHardwareStation);
  useEffect(() => {
    const unsubStation = initDeviceStation();
    return () => {
      unsubStation();
    };
  }, [initDeviceStation, isHardwareStation]);

  // Touch Screen & Mobile Anti-Zoom Enforcer + Viewport Scroll Normalizer
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Enforce strict touch viewport meta tag
    let meta = document.querySelector('meta[name="viewport"]');
    const targetContent =
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content';
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', targetContent);

    // 2. Global blur listener to normalize any mobile browser scroll-shift
    const handleGlobalBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        // Immediate scroll normalization
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    };

    window.addEventListener('focusout', handleGlobalBlur);
    return () => {
      window.removeEventListener('focusout', handleGlobalBlur);
    };
  }, []);

  const renderScreen = () => {
    // Check if running in dedicated Hardware Print & Cash Drawer Station tab (?mode=printer)
    if (typeof window !== 'undefined' && window.location?.search?.includes('mode=printer')) {
      return <HardwarePrintStationScreen />;
    }

    // Check if running in dedicated Public Event Calendar tab (?mode=events)
    if (typeof window !== 'undefined' && window.location?.search?.includes('mode=events')) {
      return <PublicEventCalendarScreen />;
    }

    // Check if running in dedicated Timeclock Kiosk tab (?mode=timeclock)
    if (typeof window !== 'undefined' && window.location?.search?.includes('mode=timeclock')) {
      return <TimeclockKioskScreen isStandaloneTab />;
    }

    if (!currentUser) {
      return <LoginScreen />;
    }

    const role = (currentUser.role || '').toLowerCase();

    // Admin & Manager roles: always land on Admin Console Dashboard upon login
    if (role === 'admin' || role === 'manager' || role === 'administrator') {
      if (adminView === 'admin') {
        return <AdminBackOfficeScreen onSwitchToFloor={() => setAdminView('floor')} />;
      }
      return <WaiterCashierScreen onSwitchToAdmin={() => setAdminView('admin')} />;
    }

    switch (role) {
      case 'station_bar':
      case 'barista':
      case 'bartender':
        return <BaristaKdsScreen />;
      case 'station_cafe':
        return <BaristaKdsScreen />;
      case 'station_food':
      case 'kitchen':
        return <KitchenKdsScreen />;
      case 'foh_runner':
      case 'cashier':
      case 'waiter':
      default:
        return <WaiterCashierScreen />;
    }
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f0ed' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#f6f0ed" />
        <View style={{ flex: 1, backgroundColor: '#f6f0ed' }}>
          {renderScreen()}
          <ToastContainer />
        </View>
      </SafeAreaView>
    </ErrorBoundary>
  );
}
