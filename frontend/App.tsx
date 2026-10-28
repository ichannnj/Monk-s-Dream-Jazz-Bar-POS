import './src/global.css';
import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, View } from 'react-native';
import { rem } from 'nativewind';
import { WaiterCashierScreen } from './src/features/floor';
import { BaristaKdsScreen, KitchenKdsScreen, FohRunnerScreen } from './src/features/kds';
import { ToastContainer } from './src/features/shared';
import { LoginScreen, useAuthStore } from './src/features/auth';
import { useOrderStore } from './src/features/orders';

import { AdminBackOfficeScreen } from './src/features/admin';

// Ensure 1rem = 16px root scale for tablet typography
try {
  rem.set(16);
} catch {
  // Handled in environments where rem observable is pre-configured
}

export default function App() {
  const { currentUser } = useAuthStore();
  const { initRealtimeSync } = useOrderStore();
  const [adminView, setAdminView] = React.useState<'admin' | 'floor'>('admin');

  // Keep all stations (Waiter, Barista, Kitchen, Runner) synchronized in real-time
  useEffect(() => {
    const unsub = initRealtimeSync();
    return () => {
      unsub();
    };
  }, [initRealtimeSync]);

  const renderScreen = () => {
    if (!currentUser) {
      return <LoginScreen />;
    }

    switch (currentUser.role) {
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
        return <FohRunnerScreen />;
      case 'admin':
        if (adminView === 'admin') {
          return <AdminBackOfficeScreen onSwitchToFloor={() => setAdminView('floor')} />;
        }
        return <WaiterCashierScreen />;
      case 'cashier':
      case 'waiter':
      default:
        return <WaiterCashierScreen />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f0ed' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f0ed" />
      <View style={{ flex: 1, backgroundColor: '#f6f0ed' }}>
        {renderScreen()}
        <ToastContainer />
      </View>
    </SafeAreaView>
  );
}
