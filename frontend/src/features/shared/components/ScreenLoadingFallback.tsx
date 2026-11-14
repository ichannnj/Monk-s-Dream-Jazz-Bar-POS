import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { JazzLogo } from '@/features/auth/presentation/components/JazzLogo';

export interface ScreenLoadingFallbackProps {
  message?: string;
  subMessage?: string;
}

/**
 * Monk's Dream Jazz Bar POS - Suspense Fallback
 * Provides a velvet-branded, flicker-free loading experience
 * while lazy modules (Admin Back-Office, Kiosks, Print Station) are fetched.
 */
export const ScreenLoadingFallback: React.FC<ScreenLoadingFallbackProps> = ({
  message = "Loading Monk's Dream POS...",
  subMessage = 'Preparing workstation environment',
}) => {
  return (
    <View style={styles.container} accessibilityRole="progressbar" aria-busy={true}>
      <View style={styles.card}>
        <View style={styles.logoWrapper}>
          <JazzLogo size={68} color="#810021" />
        </View>

        <View style={styles.spinnerWrapper}>
          <ActivityIndicator size="large" color="#810021" />
        </View>

        <Text style={styles.title}>{message}</Text>
        {subMessage ? <Text style={styles.subTitle}>{subMessage}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    maxWidth: 360,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  logoWrapper: {
    marginBottom: 20,
    opacity: 0.95,
  },
  spinnerWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1917',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subTitle: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
