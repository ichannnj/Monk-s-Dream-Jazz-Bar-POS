import './src/global.css';
import React, { useEffect, Suspense } from 'react';
import { SafeAreaView, StatusBar, View } from 'react-native';
import { rem } from 'nativewind';
import { WaiterCashierScreen } from './src/features/floor';
import { BaristaKdsScreen, KitchenKdsScreen } from './src/features/kds';
import {
  ToastContainer,
  ErrorBoundary,
  ScreenLoadingFallback,
  getRealtimeSubscriptionPlan,
  useVenueStore,
} from './src/features/shared';
import {
  LoginScreen,
  useAuthStore,
  useInactivityWatchdog,
  InactivityWarningModal,
} from './src/features/auth';
import { useEventStore } from './src/features/events/application/useEventStore';
import { useDeviceHardwareStation } from './src/features/printer/application/useDeviceHardwareStation';
import { useOrderStore } from './src/features/orders';
import { useChatStore } from './src/features/chat';

// Lazy-loaded heavy screens to slash initial bundle footprint on floor tablets & mobile devices
const AdminBackOfficeScreen = React.lazy(() =>
  import('./src/features/admin/presentation/AdminBackOfficeScreen').then((m) => ({
    default: m.AdminBackOfficeScreen,
  }))
);

const PublicEventCalendarScreen = React.lazy(() =>
  import('./src/features/events/presentation/screens/PublicEventCalendarScreen').then((m) => ({
    default: m.PublicEventCalendarScreen,
  }))
);

const HardwarePrintStationScreen = React.lazy(() =>
  import('./src/features/printer/presentation/HardwarePrintStationScreen').then((m) => ({
    default: m.HardwarePrintStationScreen,
  }))
);

const TimeclockKioskScreen = React.lazy(() =>
  import('./src/features/auth/presentation/screens/TimeclockKioskScreen').then((m) => ({
    default: m.TimeclockKioskScreen,
  }))
);

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

  // Scoped Realtime Subscriptions: Strictly isolate order CDC and private chat to authenticated staff.
  // Public modes (?mode=events) subscribe exclusively to public venue events.
  useEffect(() => {
    const searchString = typeof window !== 'undefined' ? window.location?.search || '' : '';
    const plan = getRealtimeSubscriptionPlan({ currentUser, searchString });

    let unsubOrders = () => {};
    let unsubChat = () => {};
    let unsubVenue = () => {};
    let unsubEvents = () => {};

    if (plan.subscribeOrders) {
      unsubOrders = initRealtimeSync();
    }

    if (plan.subscribeChat) {
      unsubChat = useChatStore.getState().setupRealtimeSubscription();
    }

    if (plan.subscribeVenueSettings) {
      unsubVenue = useVenueStore.getState().initRealtimeSubscription();
    }

    if (plan.subscribeEvents) {
      unsubEvents = useEventStore.getState().initRealtimeSubscription();
    }

    if (plan.loadInitialChat && currentUser?.id) {
      useChatStore.getState().loadInitialData(currentUser.id);
    }

    if (plan.trackPresence && currentUser?.id) {
      useChatStore.getState().trackCurrentPresence();
    }

    if (plan.loadEvents) {
      useEventStore.getState().loadEvents();
    }

    return () => {
      unsubOrders();
      unsubChat();
      unsubVenue();
      unsubEvents();
    };
  }, [initRealtimeSync, currentUser]);

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

  // Check if running in dedicated headless station modes (hardware printer, public calendar, timeclock kiosk)
  const isHeadlessMode =
    typeof window !== 'undefined' &&
    (window.location?.search?.includes('mode=printer') ||
      window.location?.search?.includes('mode=events') ||
      window.location?.search?.includes('mode=timeclock'));

  // Session inactivity watchdog: 6h daytime / 3h late-night (12am-6am Manila) + fair attendance auto-clock-out
  const { isWarning, remainingSeconds, isLateNight, staySignedIn, signOutNow } =
    useInactivityWatchdog(Boolean(currentUser && !isHeadlessMode));

  const renderScreen = () => {
    // Check if running in dedicated Hardware Print & Cash Drawer Station tab (?mode=printer)
    if (typeof window !== 'undefined' && window.location?.search?.includes('mode=printer')) {
      return (
        <Suspense fallback={<ScreenLoadingFallback message="Loading Hardware Print Station..." />}>
          <HardwarePrintStationScreen />
        </Suspense>
      );
    }

    // Check if running in dedicated Public Event Calendar tab (?mode=events)
    if (typeof window !== 'undefined' && window.location?.search?.includes('mode=events')) {
      return (
        <Suspense fallback={<ScreenLoadingFallback message="Loading Public Event Calendar..." />}>
          <PublicEventCalendarScreen />
        </Suspense>
      );
    }

    // Check if running in dedicated Timeclock Kiosk tab (?mode=timeclock)
    if (typeof window !== 'undefined' && window.location?.search?.includes('mode=timeclock')) {
      return (
        <Suspense fallback={<ScreenLoadingFallback message="Loading Timeclock Kiosk..." />}>
          <TimeclockKioskScreen isStandaloneTab />
        </Suspense>
      );
    }

    if (!currentUser) {
      return <LoginScreen />;
    }

    const role = (currentUser.role || '').toLowerCase();

    // Admin & Manager roles: always land on Admin Console Dashboard upon login
    if (role === 'admin' || role === 'manager' || role === 'administrator') {
      if (adminView === 'admin') {
        return (
          <Suspense fallback={<ScreenLoadingFallback message="Opening Admin Console..." />}>
            <AdminBackOfficeScreen onSwitchToFloor={() => setAdminView('floor')} />
          </Suspense>
        );
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
          <Suspense fallback={<ScreenLoadingFallback />}>{renderScreen()}</Suspense>
          <ToastContainer />
          <InactivityWarningModal
            visible={isWarning}
            remainingSeconds={remainingSeconds}
            isLateNight={isLateNight}
            onStaySignedIn={staySignedIn}
            onSignOutNow={signOutNow}
          />
        </View>
      </SafeAreaView>
    </ErrorBoundary>
  );
}
