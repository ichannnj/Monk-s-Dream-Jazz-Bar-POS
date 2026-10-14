import './src/global.css';
import React from 'react';
import { SafeAreaView, StatusBar, View } from 'react-native';
import { Header } from './src/components/Header';
import { HomeScreen } from './src/components/HomeScreen';
import { LoginScreen } from './src/auth';
import { useAuthStore } from './src/store/useAuthStore';

export default function App() {
  const { currentUser } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-jazz-950">
      <StatusBar barStyle="light-content" backgroundColor="#07090e" />
      <View className="flex-1 flex-col bg-jazz-950">
        {currentUser && <Header />}
        <View className="flex-1">
          {!currentUser ? <LoginScreen /> : <HomeScreen />}
        </View>
      </View>
    </SafeAreaView>
  );
}
