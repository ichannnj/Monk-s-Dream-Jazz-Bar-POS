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
  isTablet?: boolean;
}

export const LoginHeader: React.FC<LoginHeaderProps> = ({
  authMode,
  setAuthMode,
  onClearErrors,
  isTablet = true,
}) => {
  return (
    <>
      <View style={[styles.rightHeader, !isTablet && styles.rightHeaderMobile]}>
        <Text style={[styles.rightBrandName, !isTablet && styles.rightBrandNameMobile]}>
          Monk's Dream Jazz Bar
        </Text>
        <View style={[styles.logoWrapper, !isTablet && styles.logoWrapperMobile]}>
          <ExpoImage
            source={MONKS_DREAM_LOGO}
            style={isTablet ? styles.officialBarLogo : styles.officialBarLogoMobile}
            contentFit="contain"
            priority="high"
          />
        </View>
        <Text style={[styles.formTitle, !isTablet && styles.formTitleMobile]}>
          {authMode === 'admin'
            ? 'Administrator Back-Office Portal'
            : 'Floor & Station POS Sign-In'}
        </Text>
      </View>

      {/* Mode Toggle */}
      <View style={[styles.modeToggleContainer, !isTablet && styles.modeToggleContainerMobile]}>
        <Pressable
          onPress={() => {
            setAuthMode('staff');
            onClearErrors();
          }}
          style={[
            styles.modeToggleTab,
            !isTablet && styles.modeToggleTabMobile,
            authMode === 'staff' && styles.modeToggleTabActive,
          ]}
          accessibilityRole="tab"
          accessibilityLabel="Staff Clock-In Mode"
        >
          <Users size={isTablet ? 16 : 14} color={authMode === 'staff' ? '#641b2a' : '#6b7280'} />
          <Text
            style={[
              styles.modeToggleText,
              !isTablet && styles.modeToggleTextMobile,
              authMode === 'staff' && styles.modeToggleTextActive,
            ]}
          >
            Floor POS
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setAuthMode('admin');
            onClearErrors();
          }}
          style={[
            styles.modeToggleTab,
            !isTablet && styles.modeToggleTabMobile,
            authMode === 'admin' && styles.modeToggleTabActive,
          ]}
          accessibilityRole="tab"
          accessibilityLabel="Admin Portal Login Mode"
        >
          <Shield size={isTablet ? 16 : 14} color={authMode === 'admin' ? '#641b2a' : '#6b7280'} />
          <Text
            style={[
              styles.modeToggleText,
              !isTablet && styles.modeToggleTextMobile,
              authMode === 'admin' && styles.modeToggleTextActive,
            ]}
          >
            Admin Portal
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setAuthMode('timeclock');
            onClearErrors();
          }}
          style={[styles.modeToggleTab, !isTablet && styles.modeToggleTabMobile]}
          accessibilityRole="tab"
          accessibilityLabel="Timeclock Kiosk Mode"
        >
          <Clock size={isTablet ? 16 : 14} color="#6b7280" />
          <Text style={[styles.modeToggleText, !isTablet && styles.modeToggleTextMobile]}>
            Timeclock
          </Text>
        </Pressable>
      </View>

      {/* Standalone Tab Launcher */}
      {Platform.OS === 'web' && (
        <View className="mb-3.5 flex-row items-center justify-end">
          <Pressable
            onPress={() => window.open('?mode=timeclock', '_blank')}
            className="flex-row items-center py-1.5 px-2.5 rounded-lg active:bg-stone-100 min-h-[36px]"
          >
            <ExternalLink size={12} color="#800020" />
            <Text className="ml-1 text-xs font-bold text-[#800020]">
              Open Timeclock in New Tab ↗
            </Text>
          </Pressable>
        </View>
      )}
    </>
  );
};
