import './src/global.css';
import React from 'react';
import { SafeAreaView, StatusBar, View } from 'react-native';
import { WaiterCashierScreen } from './src/components';
import { LoginScreen } from './src/auth';
import { useAuthStore } from './src/store/useAuthStore';

export default function App() {
  const { currentUser } = useAuthStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f0ed' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f0ed" />
      <View style={{ flex: 1, backgroundColor: '#f6f0ed' }}>
        {!currentUser ? <LoginScreen /> : <WaiterCashierScreen />}
      </View>
    </SafeAreaView>
  );
}
