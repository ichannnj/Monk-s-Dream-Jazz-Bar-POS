import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Users, Shield, Clock, ExternalLink } from 'lucide-react-native';
import { styles } from '../screens/LoginScreen.styles';

const MONKS_DREAM_LOGO = require('../../../../../assets/monks-dream-logo-lockup.png');

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
      <View style={[styles.formHeader, !isTablet && styles.formHeaderMobile]}>
        <Text style={styles.welcomeEyebrow}>WELCOME TO</Text>
        <View style={[styles.logoWrapper, !isTablet && styles.logoWrapperMobile]}>
          <ExpoImage
            source={MONKS_DREAM_LOGO}
            style={isTablet ? styles.officialBarLogo : styles.officialBarLogoMobile}
            contentFit="contain"
            priority="high"
            accessibilityLabel="Monk's Dream Jazz Bar logo"
          />
        </View>
        <Text style={[styles.headerSubtitle, !isTablet && styles.headerSubtitleMobile]}>
          Sign in to access your station terminal and start your shift.
        </Text>
      </View>

      {/* Mode Toggle Pills */}
      <View
        style={[styles.modeToggleContainer, !isTablet && styles.modeToggleContainerMobile]}
        accessibilityRole="tablist"
      >
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
          accessibilityState={{ selected: authMode === 'staff' }}
          accessibilityLabel="Floor POS Mode"
        >
          <Users size={14} color={authMode === 'staff' ? '#810021' : '#78716c'} />
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
          accessibilityState={{ selected: authMode === 'admin' }}
          accessibilityLabel="Admin Portal Mode"
        >
          <Shield size={14} color={authMode === 'admin' ? '#810021' : '#78716c'} />
          <Text
            style={[
              styles.modeToggleText,
              !isTablet && styles.modeToggleTextMobile,
              authMode === 'admin' && styles.modeToggleTextActive,
            ]}
          >
            Admin
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setAuthMode('timeclock');
            onClearErrors();
          }}
          style={[
            styles.modeToggleTab,
            !isTablet && styles.modeToggleTabMobile,
            authMode === 'timeclock' && styles.modeToggleTabActive,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: authMode === 'timeclock' }}
          accessibilityLabel="Timeclock Mode"
        >
          <Clock size={14} color={authMode === 'timeclock' ? '#810021' : '#78716c'} />
          <Text
            style={[
              styles.modeToggleText,
              !isTablet && styles.modeToggleTextMobile,
              authMode === 'timeclock' && styles.modeToggleTextActive,
            ]}
          >
            Clock In
          </Text>
        </Pressable>
      </View>
    </>
  );
};
