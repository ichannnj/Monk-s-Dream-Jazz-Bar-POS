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
    <SafeAreaView style={{ flex: 1, backgroundColor: currentUser ? '#07090e' : '#f7f2f0' }}>
      <StatusBar
        barStyle={currentUser ? 'light-content' : 'dark-content'}
        backgroundColor={currentUser ? '#07090e' : '#f7f2f0'}
      />
      <View style={{ flex: 1, backgroundColor: currentUser ? '#07090e' : '#f7f2f0' }}>
        {currentUser && <Header />}
        <View style={{ flex: 1 }}>
          {!currentUser ? <LoginScreen /> : <HomeScreen />}
        </View>
      </View>
    </SafeAreaView>
  );
}
