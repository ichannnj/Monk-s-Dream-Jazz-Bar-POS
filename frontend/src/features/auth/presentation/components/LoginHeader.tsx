import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Users, Shield, Clock, ExternalLink } from 'lucide-react-native';
import { styles } from '../screens/LoginScreen.styles';

const MONKS_DREAM_LOGO = require('../../../../../assets/Monks Dream Logo files-02.png');

interface LoginHeaderProps {
  authMode: 'staff' | 'admin' | 'timeclock';
  setAuthMode: (mode: 'staff' | 'admin' | 'timeclock') => void;
  onClearErrors: () => void;
}

export const LoginHeader: React.FC<LoginHeaderProps> = ({
  authMode,
  setAuthMode,
  onClearErrors,
}) => {
  return (
    <>
      <View style={styles.rightHeader}>
        <Text style={styles.rightBrandName}>Monk's Dream Jazz Bar</Text>
        <View style={styles.logoWrapper}>
          <ExpoImage
            source={MONKS_DREAM_LOGO}
            style={styles.officialBarLogo}
            contentFit="contain"
            priority="high"
          />
        </View>
        <Text style={styles.formTitle}>
          {authMode === 'admin'
            ? 'Administrator Back-Office Portal'
            : 'Floor & Station POS Sign-In'}
        </Text>
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeToggleContainer}>
        <Pressable
          onPress={() => {
            setAuthMode('staff');
            onClearErrors();
          }}
          style={[styles.modeToggleTab, authMode === 'staff' && styles.modeToggleTabActive]}
          accessibilityRole="tab"
          accessibilityLabel="Staff Clock-In Mode"
        >
          <Users size={16} color={authMode === 'staff' ? '#641b2a' : '#6b7280'} />
          <Text
            style={[styles.modeToggleText, authMode === 'staff' && styles.modeToggleTextActive]}
          >
            Floor POS
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setAuthMode('admin');
            onClearErrors();
          }}
          style={[styles.modeToggleTab, authMode === 'admin' && styles.modeToggleTabActive]}
          accessibilityRole="tab"
          accessibilityLabel="Admin Portal Login Mode"
        >
          <Shield size={16} color={authMode === 'admin' ? '#641b2a' : '#6b7280'} />
          <Text
            style={[styles.modeToggleText, authMode === 'admin' && styles.modeToggleTextActive]}
          >
            Admin Portal
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setAuthMode('timeclock');
            onClearErrors();
          }}
          style={styles.modeToggleTab}
          accessibilityRole="tab"
          accessibilityLabel="Timeclock Kiosk Mode"
        >
          <Clock size={16} color="#6b7280" />
          <Text style={styles.modeToggleText}>Timeclock</Text>
        </Pressable>
      </View>

      {/* Standalone Tab Launcher */}
      {Platform.OS === 'web' && (
        <View className="mb-4 flex-row items-center justify-end">
          <Pressable
            onPress={() => window.open('?mode=timeclock', '_blank')}
            className="flex-row items-center py-1 px-2.5 rounded-lg active:bg-stone-100"
          >
            <ExternalLink size={13} color="#800020" />
            <Text className="ml-1 text-xs font-bold text-[#800020]">
              Open Timeclock in New Tab ↗
            </Text>
          </Pressable>
        </View>
      )}
    </>
  );
};
