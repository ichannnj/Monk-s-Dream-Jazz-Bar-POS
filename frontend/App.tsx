import './src/global.css';
import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, View } from 'react-native';
import { rem } from 'nativewind';
import {
  WaiterCashierScreen,
  BaristaKdsScreen,
  KitchenKdsScreen,
  FohRunnerScreen,
  ToastContainer,
} from './src/components';
import { LoginScreen } from './src/auth';
import { useAuthStore } from './src/store/useAuthStore';
import { useOrderStore } from './src/store/useOrderStore';

// Ensure 1rem = 16px root scale for tablet typography
try {
  rem.set(16);
} catch {
  // Handled in environments where rem observable is pre-configured
}

export default function App() {
  const { currentUser } = useAuthStore();
  const { initRealtimeSync } = useOrderStore();

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
