import './src/global.css';
import React from 'react';
import { SafeAreaView, StatusBar, View } from 'react-native';
import { Header } from './src/components/Header';
import { LoginScreen } from './src/auth';
import {
  WaiterCashierScreen,
  AdminDashboardScreen,
  BaristaKdsScreen,
  KitchenKdsScreen,
  BartenderKdsScreen,
} from './src/users';
import { TeamChatScreen } from './src/components/TeamChatScreen';
import { useAuthStore } from './src/store/useAuthStore';

export default function App() {
  const { activeRoleView, currentUser } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-jazz-950">
      <StatusBar barStyle="light-content" backgroundColor="#07090e" />
      <View className="flex-1 flex-col bg-jazz-950">
        {currentUser && <Header />}
        <View className="flex-1">
          {(!currentUser || activeRoleView === 'login') && <LoginScreen />}
          {currentUser && activeRoleView === 'waiter_cashier' && <WaiterCashierScreen />}
          {currentUser && activeRoleView === 'admin' && <AdminDashboardScreen />}
          {currentUser && activeRoleView === 'barista' && <BaristaKdsScreen />}
          {currentUser && activeRoleView === 'kitchen' && <KitchenKdsScreen />}
          {currentUser && activeRoleView === 'bartender' && <BartenderKdsScreen />}
          {currentUser && activeRoleView === 'chat' && <TeamChatScreen />}
        </View>
      </View>
    </SafeAreaView>
  );
}
