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

import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAuthStore } from '../../application/useAuthStore';
import { toast } from '../../../shared/toast/useToastStore';
import { posApi } from '../../../shared/infrastructure/api';
import { PinCodeInput } from '../components/PinCodeInput';
import { TrainingModeSwitch } from '../components/TrainingModeSwitch';
import { ForgotPinModal } from '../components/ForgotPinModal';
import { AlertCircle } from 'lucide-react-native';
import { styles } from './LoginScreen.styles';

const JAZZ_HERO_IMAGE = require('../../../../../assets/images/jazz-club-stage.jpg');
const MONKS_DREAM_LOGO = require('../../../../../assets/Monks Dream Logo files-02.png');

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

  const handleClockIn = useCallback(
    async (pinOverride?: string) => {
      if (isSubmitting) return;

      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        setIsError(true);
        setErrorMessage('Staff ID / Username is required.');
        toast.warning('Please enter your Staff ID / Username.', {
          title: 'Username Required',
        });
        return;
      }

      const targetPin = (pinOverride || pin).trim();
      if (!targetPin) {
        setIsError(true);
        setErrorMessage('Please enter your 4-digit staff PIN.');
        toast.warning('Please enter your 4-digit staff PIN.', {
          title: 'PIN Required',
        });
        return;
      }

      if (targetPin.length !== 4) {
        setIsError(true);
        setErrorMessage('Staff PIN must be exactly 4 digits.');
        toast.warning('Staff PIN must be exactly 4 digits.', {
          title: 'Incomplete PIN',
        });
        return;
      }

      setIsSubmitting(true);
      setIsError(false);
      setErrorMessage(null);

      try {
        // Authenticate directly against Supabase BaaS via authenticate_staff_credentials RPC
        const result = await posApi.loginWithCredentials(trimmedUsername, targetPin);

        if (result && result.success && result.user) {
          setIsTrainingMode(isTraining);
          setUser({
            id: result.user.id,
            username: result.user.username,
            displayName: result.user.displayName,
            role: result.user.role as any,
            isActive: true,
            email: result.user.email,
            phone: result.user.phone,
            avatarUrl: result.user.avatarUrl,
            baseDailyRate: result.user.baseDailyRate,
          });

          toast.success(
            `Welcome, ${result.user.displayName}! Role: ${result.user.role.toUpperCase()}`,
            {
              title: isTraining ? 'Sandbox Mode Active' : 'Staff Clock-In Successful',
            }
          );
          return;
        }

        throw new Error('Invalid Staff ID or PIN. Access denied.');
      } catch (err: any) {
        setIsError(true);
        const errText = err.message || 'Invalid Staff ID or PIN. Access denied.';
        setErrorMessage(errText);
        setPin('');
        toast.error(errText, {
          title: 'Authentication Failed',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [username, pin, isTraining, isSubmitting, setUser, setIsTrainingMode]
  );

  const handlePinComplete = useCallback(
    (completedPin: string) => {
      if (!username.trim()) {
        setIsError(true);
        setErrorMessage('Please enter your Staff ID / Username first.');
        toast.warning('Please enter your Staff ID before entering your PIN.', {
          title: 'Username Required',
        });
        return;
      }
      // Auto-submit when both Username is non-empty and all 4 digits are punched
      setTimeout(() => {
        handleClockIn(completedPin);
      }, 100);
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
          <View style={[styles.cardContainer, isTablet ? styles.cardTablet : styles.cardMobile]}>
            {/* ========================================= */}
            {/* LEFT PANE: Jazz Club Hero & Ambiance     */}
            {/* ========================================= */}
            <View
              style={[styles.leftPane, isTablet ? styles.leftPaneTablet : styles.leftPaneMobile]}
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
                    Clock in, track your shift, and get back to what you do best. Built for every
                    member of the team.
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
              style={[styles.rightPane, isTablet ? styles.rightPaneTablet : styles.rightPaneMobile]}
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

                {/* PIN Grid (4 Discrete Cells) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>4-Digit Staff PIN</Text>
                  <PinCodeInput
                    value={pin}
                    length={4}
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
                    onPress={() => handleClockIn()}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isSubmitting || !username.trim() || pin.length !== 4}
                    style={[
                      styles.clockInButton,
                      (isSubmitting || !username.trim() || pin.length !== 4) &&
                        styles.clockInButtonDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Clock In"
                  >
                    <Text style={styles.clockInButtonText}>
                      {isSubmitting ? 'Verifying...' : 'Clock - In'}
                    </Text>
                  </Pressable>
                </Animated.View>

                {/* Bottom Row Controls: Training Mode & Forgot PIN */}
                <View style={styles.controlsRow}>
                  <View style={styles.trainingModeGroup}>
                    <Text style={styles.trainingModeLabel}>Training Mode</Text>
                    <TrainingModeSwitch
                      value={isTraining}
                      onValueChange={(val) => {
                        setIsTraining(val);
                        if (val) {
                          toast.info(
                            "Training Sandbox Mode active — tickets won't route to live stations.",
                            {
                              title: 'Sandbox Mode ON',
                            }
                          );
                        } else {
                          toast.info('Live Production Mode active.', {
                            title: 'Live Mode',
                          });
                        }
                      }}
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
        <ForgotPinModal visible={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
