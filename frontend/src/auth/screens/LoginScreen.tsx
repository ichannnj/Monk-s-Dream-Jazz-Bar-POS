import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useAuthStore } from '../../store/useAuthStore';
import { SEED_STAFF_USERS } from '../../mockData';
import { PinCodeInput } from '../components/PinCodeInput';
import { TrainingModeSwitch } from '../components/TrainingModeSwitch';
import { ForgotPinModal } from '../components/ForgotPinModal';
import { AlertCircle } from 'lucide-react-native';

const JAZZ_HERO_IMAGE = require('../../../assets/images/jazz-club-stage.jpg');
const MONKS_DREAM_LOGO = require('../../../assets/Monks Dream Logo files-02.png');

export const LoginScreen: React.FC = () => {
  const { setUser, setIsTrainingMode } = useAuthStore();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Tablet & Landscape detection (standard iPad/tablet POS screens: 768px - 1366px)
  const isTablet = windowWidth >= 768;
  const isLandscape = windowWidth > windowHeight;

  // Brand font 'Raconteur NF' is loaded via global.css @font-face and CDNFonts for web/tablets

  // Form State
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Button Animation (GPU-accelerated scale)
  const buttonScale = useSharedValue(1);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handleClockIn = useCallback(() => {
    if (isSubmitting) return;

    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername) {
      setIsError(true);
      setErrorMessage('Please enter your staff ID or username.');
      return;
    }

    if (pin.length < 6) {
      setIsError(true);
      setErrorMessage('Please enter your full 6-digit staff PIN.');
      return;
    }

    setIsSubmitting(true);
    setIsError(false);
    setErrorMessage(null);

    // Find staff user
    const foundStaff = SEED_STAFF_USERS.find(
      (staff) =>
        staff.username.toLowerCase() === trimmedUsername ||
        staff.id.toLowerCase() === trimmedUsername ||
        staff.displayName.toLowerCase().includes(trimmedUsername)
    );

    if (foundStaff && (foundStaff.pin === pin || foundStaff.pin.startsWith(pin.slice(0, 4)))) {
      // Success! Update auth state
      setIsTrainingMode(isTraining);
      setUser({
        id: foundStaff.id,
        username: foundStaff.username,
        displayName: foundStaff.displayName,
        role: foundStaff.role,
        isActive: true,
      });
    } else {
      // Trigger error shake on PIN cells
      setIsError(true);
      setErrorMessage(
        foundStaff
          ? `Incorrect PIN for ${foundStaff.displayName}. (Hint: check Forgot PIN)`
          : 'Staff ID not recognized. Please check your credentials.'
      );
      setPin('');
      setIsSubmitting(false);
    }
  }, [username, pin, isTraining, isSubmitting, setUser, setIsTrainingMode]);

  const handlePinComplete = useCallback(
    (completedPin: string) => {
      // Auto-submit when all 6 digits are typed if username is present
      if (username.trim()) {
        setTimeout(() => {
          handleClockIn();
        }, 120);
      }
    },
    [username, handleClockIn]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Ambient Outer Kiosk Canvas */}
        <View style={styles.outerCanvas}>
          {/* Main Rounded Split Card */}
          <View
            style={[
              styles.cardContainer,
              isTablet ? styles.cardTablet : styles.cardMobile,
            ]}
          >
            {/* ========================================= */}
            {/* LEFT PANE: Jazz Club Hero & Ambiance     */}
            {/* ========================================= */}
            <View
              style={[
                styles.leftPane,
                isTablet ? styles.leftPaneTablet : styles.leftPaneMobile,
              ]}
            >
              {/* Background Jazz Musician Stage Image */}
              <ExpoImage
                source={JAZZ_HERO_IMAGE}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={400}
                priority="high"
              />

              {/* Deep Wine Duotone Vignette Overlays */}
              <View style={styles.imageOverlayTop} />
              <View style={styles.imageOverlayBottom} />

              {/* Left Content Column */}
              <View style={styles.leftContent}>
                {/* Brand Title with Raconteur NF Typography */}
                <View style={styles.brandTitleBlock}>
                  <Text style={styles.heroTitleLine}>Monk's</Text>
                  <Text style={styles.heroTitleLine}>Dream</Text>
                  <Text style={styles.heroTitleLine}>Jazz Bar</Text>
                  {/* Rose accent dash */}
                  <View style={styles.heroAccentDash} />
                </View>

                {/* Bottom Club Narrative & Secure Portal Dot */}
                <View style={styles.leftBottomBlock}>
                  <Text style={styles.welcomeHeading}>Welcome back to the club.</Text>
                  <Text style={styles.welcomeDescription}>
                    Clock in, track your shift, and get back to what you do best. Built for
                    every member of the team.
                  </Text>

                  {/* Thin Divider */}
                  <View style={styles.heroDivider} />

                  {/* Red status indicator */}
                  <View style={styles.portalBadgeRow}>
                    <View style={styles.redStatusDot} />
                    <Text style={styles.portalBadgeText}>
                      Secure staff portal · Shift attendance
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ========================================= */}
            {/* RIGHT PANE: Staff Login & Attendance Form */}
            {/* ========================================= */}
            <View
              style={[
                styles.rightPane,
                isTablet ? styles.rightPaneTablet : styles.rightPaneMobile,
              ]}
            >
              {/* Top Branding Section with Official Bar Logo */}
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

                <Text style={styles.formTitle}>Staff Login & Attendance</Text>
              </View>

              {/* Error Banner */}
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={18} color="#be123c" style={{ marginRight: 8 }} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Form Inputs (Tablet touch target friendly) */}
              <View style={styles.formBody}>
                {/* Username / Staff ID */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Username</Text>
                  <TextInput
                    value={username}
                    onChangeText={(val) => {
                      setUsername(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Enter staff ID"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInput}
                  />
                </View>

                {/* PIN Grid (6 Discrete Cells) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PIN</Text>
                  <PinCodeInput
                    value={pin}
                    length={6}
                    onChange={(val) => {
                      setPin(val);
                      if (errorMessage) setErrorMessage(null);
                      if (isError) setIsError(false);
                    }}
                    onComplete={handlePinComplete}
                    isError={isError}
                  />
                </View>

                {/* Primary CTA: Clock-In Button */}
                <Animated.View style={[styles.clockInButtonWrapper, buttonAnimatedStyle]}>
                  <Pressable
                    onPress={handleClockIn}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isSubmitting}
                    style={styles.clockInButton}
                    accessibilityRole="button"
                    accessibilityLabel="Clock In"
                  >
                    <Text style={styles.clockInButtonText}>Clock - In</Text>
                  </Pressable>
                </Animated.View>

                {/* Bottom Row Controls: Training Mode & Forgot PIN */}
                <View style={styles.controlsRow}>
                  <View style={styles.trainingModeGroup}>
                    <Text style={styles.trainingModeLabel}>Training Mode</Text>
                    <TrainingModeSwitch
                      value={isTraining}
                      onValueChange={setIsTraining}
                    />
                  </View>

                  <Pressable
                    onPress={() => setIsForgotModalOpen(true)}
                    style={styles.forgotPinPressable}
                    accessibilityRole="link"
                  >
                    <Text style={styles.forgotPinText}>Forgot PIN?</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Forgot PIN Recovery Modal */}
        <ForgotPinModal
          visible={isForgotModalOpen}
          onClose={() => setIsForgotModalOpen(false)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#f7f2f0',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  outerCanvas: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 36,
    elevation: 10,
    width: '100%',
    maxWidth: 980,
  },
  cardTablet: {
    flexDirection: 'row',
    minHeight: 580,
  },
  cardMobile: {
    flexDirection: 'column',
  },
  // ---------------- Left Pane ----------------
  leftPane: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1b0910',
  },
  leftPaneTablet: {
    width: '50%',
    minHeight: 580,
  },
  leftPaneMobile: {
    width: '100%',
    height: 380,
  },
  imageOverlayTop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 10, 16, 0.45)',
  },
  imageOverlayBottom: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(16, 5, 9, 0.65)',
  },
  leftContent: {
    flex: 1,
    padding: 38,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  brandTitleBlock: {
    marginTop: 10,
  },
  heroTitleLine: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: '400',
    fontFamily: Platform.select({
      web: '"Raconteur NF", "Playfair Display", Georgia, serif',
      ios: 'Raconteur NF',
      default: 'Raconteur NF',
    }),
    lineHeight: 48,
    letterSpacing: 0.8,
  },
  heroAccentDash: {
    width: 44,
    height: 3.5,
    backgroundColor: '#b93a52',
    borderRadius: 2,
    marginTop: 12,
  },
  leftBottomBlock: {
    marginBottom: 6,
  },
  welcomeHeading: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
    marginBottom: 8,
  },
  welcomeDescription: {
    color: '#d4b2b9',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 16,
  },
  portalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  redStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#e11d48',
  },
  portalBadgeText: {
    color: '#b38d95',
    fontSize: 11.5,
    fontWeight: '500',
  },
  // ---------------- Right Pane ----------------
  rightPane: {
    backgroundColor: '#ffffff',
    justifyContent: 'center',
  },
  rightPaneTablet: {
    width: '50%',
    paddingVertical: 44,
    paddingHorizontal: 52,
  },
  rightPaneMobile: {
    width: '100%',
    padding: 24,
  },
  rightHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  rightBrandName: {
    color: '#641b2a',
    fontSize: 22,
    fontWeight: '400',
    fontFamily: Platform.select({
      web: '"Raconteur NF", "Playfair Display", Georgia, serif',
      ios: 'Raconteur NF',
      default: 'Raconteur NF',
    }),
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  logoWrapper: {
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  officialBarLogo: {
    width: 90,
    height: 90,
  },
  formTitle: {
    color: '#1a1a1e',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#be123c',
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  formBody: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1f242e',
    marginBottom: 8,
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
  },
  textInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#e2e4e8',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  clockInButtonWrapper: {
    width: '100%',
    marginTop: 8,
    marginBottom: 20,
  },
  clockInButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#641b2a',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#641b2a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  clockInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  trainingModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trainingModeLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1a1a1e',
  },
  forgotPinPressable: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  forgotPinText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#641b2a',
  },
});
