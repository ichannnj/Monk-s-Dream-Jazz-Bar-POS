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
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAuthStore } from '../../application/useAuthStore';
import { toast } from '../../../shared/toast/useToastStore';
import { posApi } from '../../../shared/infrastructure/api';
import { TrainingModeSwitch } from '../components/TrainingModeSwitch';
import { ForgotPinModal } from '../components/ForgotPinModal';
import { StaffPinLoginForm } from '../components/StaffPinLoginForm';
import { AdminPasswordLoginForm } from '../components/AdminPasswordLoginForm';
import { LoginHeroPane } from '../components/LoginHeroPane';
import { LoginHeader } from '../components/LoginHeader';
import { AlertCircle } from 'lucide-react-native';
import { TimeclockKioskScreen } from './TimeclockKioskScreen';
import { styles } from './LoginScreen.styles';

export const LoginScreen: React.FC = () => {
  const { setUser, setIsTrainingMode } = useAuthStore();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  // Form State
  const [authMode, setAuthMode] = useState<'staff' | 'admin' | 'timeclock'>('staff');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Button Animation
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

  const clearErrors = () => {
    if (errorMessage) setErrorMessage(null);
    if (isError) setIsError(false);
  };

  const handleClockIn = useCallback(
    async (pinOverride?: string) => {
      if (isSubmitting) return;

      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        setIsError(true);
        const reqText =
          authMode === 'admin'
            ? 'Admin Username or Email is required.'
            : 'Staff ID / Username is required.';
        setErrorMessage(reqText);
        toast.warning(reqText, { title: 'Username Required' });
        return;
      }

      if (authMode === 'admin') {
        if (!adminPassword) {
          setIsError(true);
          setErrorMessage('Admin Password is required.');
          toast.warning('Please enter your Admin Password.', { title: 'Password Required' });
          return;
        }

        setIsSubmitting(true);
        setIsError(false);
        setErrorMessage(null);

        try {
          const result = await posApi.loginAdminWithPassword(trimmedUsername, adminPassword);
          if (result && result.success && result.user) {
            setIsTrainingMode(isTraining);
            setUser({
              id: result.user.id,
              username: result.user.username,
              displayName: result.user.displayName,
              role: result.user.role as any,
              isActive: true,
              jobTitle: (result.user as any).jobTitle,
              email: result.user.email,
              phone: result.user.phone,
              avatarUrl: result.user.avatarUrl,
              baseDailyRate: result.user.baseDailyRate,
              lastLoginAt: (result.user as any).lastLoginAt,
              passwordUpdatedAt: (result.user as any).passwordUpdatedAt,
              pinUpdatedAt: (result.user as any).pinUpdatedAt,
            });

            toast.success(`Administrator session verified: ${result.user.displayName} (Manager)`, {
              title: 'Admin Console Access Granted',
            });
            return;
          }
          throw new Error('Invalid Admin credentials. Access denied.');
        } catch (err: any) {
          setIsError(true);
          const errText = err.message || 'Invalid Admin credentials. Access denied.';
          setErrorMessage(errText);
          toast.error(errText, { title: 'Authentication Failed' });
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      const targetPin = (pinOverride || pin).trim();
      if (!targetPin) {
        setIsError(true);
        setErrorMessage('Please enter your 4-digit staff PIN.');
        toast.warning('Please enter your 4-digit staff PIN.', { title: 'PIN Required' });
        return;
      }

      if (targetPin.length !== 4) {
        setIsError(true);
        setErrorMessage('Staff PIN must be exactly 4 digits.');
        toast.warning('Staff PIN must be exactly 4 digits.', { title: 'Incomplete PIN' });
        return;
      }

      setIsSubmitting(true);
      setIsError(false);
      setErrorMessage(null);

      try {
        const result = await posApi.loginWithCredentials(trimmedUsername, targetPin);

        if (result && result.success && result.user) {
          setIsTrainingMode(isTraining);
          setUser({
            id: result.user.id,
            username: result.user.username,
            displayName: result.user.displayName,
            role: result.user.role as any,
            isActive: true,
            jobTitle: (result.user as any).jobTitle,
            email: result.user.email,
            phone: result.user.phone,
            avatarUrl: result.user.avatarUrl,
            baseDailyRate: result.user.baseDailyRate,
            lastLoginAt: (result.user as any).lastLoginAt,
          });

          toast.success(
            `Welcome, ${result.user.displayName}! Role: ${result.user.role.toUpperCase()}`,
            {
              title: isTraining ? 'Sandbox Mode Active' : 'POS Sign-In Successful',
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
        toast.error(errText, { title: 'Authentication Failed' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [username, pin, adminPassword, authMode, isTraining, isSubmitting, setUser, setIsTrainingMode]
  );

  const handlePinComplete = useCallback(
    (completedPin: string) => {
      if (authMode === 'admin') return;
      if (!username.trim()) {
        setIsError(true);
        setErrorMessage('Please enter your Staff ID / Username first.');
        toast.warning('Please enter your Staff ID before entering your PIN.', {
          title: 'Username Required',
        });
        return;
      }
      setTimeout(() => {
        handleClockIn(completedPin);
      }, 100);
    },
    [username, authMode, handleClockIn]
  );

  if (authMode === 'timeclock') {
    return <TimeclockKioskScreen onBackToLogin={() => setAuthMode('staff')} />;
  }

  const isCtaDisabled =
    isSubmitting || !username.trim() || (authMode === 'admin' ? !adminPassword : pin.length !== 4);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, !isTablet && styles.scrollContentMobile]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.outerCanvas}>
          <View style={[styles.cardContainer, isTablet ? styles.cardTablet : styles.cardMobile]}>
            {/* LEFT PANE: Jazz Club Hero & Ambiance */}
            <LoginHeroPane isTablet={isTablet} />

            {/* RIGHT PANE: Staff Login & Attendance Form */}
            <View
              style={[styles.rightPane, isTablet ? styles.rightPaneTablet : styles.rightPaneMobile]}
            >
              <LoginHeader
                authMode={authMode}
                setAuthMode={setAuthMode}
                onClearErrors={clearErrors}
                isTablet={isTablet}
              />

              {/* Error Banner */}
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={18} color="#be123c" style={{ marginRight: 8 }} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <View style={styles.formBody}>
                {/* Username / Staff ID */}
                <View style={[styles.inputGroup, !isTablet && styles.inputGroupMobile]}>
                  <Text style={[styles.inputLabel, !isTablet && styles.inputLabelMobile]}>
                    {authMode === 'admin' ? 'Admin Username or Email' : 'Username'}
                  </Text>
                  <TextInput
                    value={username}
                    onChangeText={(val) => {
                      setUsername(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder={
                      authMode === 'admin' ? 'Enter admin username or email' : 'Enter staff ID'
                    }
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.textInput, !isTablet && styles.textInputMobile]}
                  />
                </View>

                {authMode === 'admin' ? (
                  <AdminPasswordLoginForm
                    adminPassword={adminPassword}
                    setAdminPassword={setAdminPassword}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    onClearErrors={clearErrors}
                    onSubmit={() => handleClockIn()}
                    isTablet={isTablet}
                  />
                ) : (
                  <StaffPinLoginForm
                    pin={pin}
                    setPin={setPin}
                    isError={isError}
                    onClearErrors={clearErrors}
                    onComplete={handlePinComplete}
                    isTablet={isTablet}
                  />
                )}

                {/* Primary CTA */}
                <Animated.View
                  style={[
                    styles.clockInButtonWrapper,
                    !isTablet && styles.clockInButtonWrapperMobile,
                    buttonAnimatedStyle,
                  ]}
                >
                  <Pressable
                    onPress={() => handleClockIn()}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isCtaDisabled}
                    style={[
                      styles.clockInButton,
                      !isTablet && styles.clockInButtonMobile,
                      isCtaDisabled && styles.clockInButtonDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      authMode === 'admin' ? 'Sign In as Administrator' : 'Sign In to POS'
                    }
                  >
                    <Text
                      style={[
                        styles.clockInButtonText,
                        !isTablet && styles.clockInButtonTextMobile,
                      ]}
                    >
                      {isSubmitting
                        ? 'Verifying...'
                        : authMode === 'admin'
                          ? 'Sign In to Admin Console'
                          : 'Sign In to POS'}
                    </Text>
                  </Pressable>
                </Animated.View>

                {/* Bottom Row Controls */}
                <View style={[styles.controlsRow, !isTablet && styles.controlsRowMobile]}>
                  <View
                    style={[styles.trainingModeGroup, !isTablet && styles.trainingModeGroupMobile]}
                  >
                    <Text
                      style={[
                        styles.trainingModeLabel,
                        !isTablet && styles.trainingModeLabelMobile,
                      ]}
                    >
                      Training Mode
                    </Text>
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
                          toast.info('Live Production Mode active.', { title: 'Live Mode' });
                        }
                      }}
                    />
                  </View>

                  <Pressable
                    onPress={() => setIsForgotModalOpen(true)}
                    style={styles.forgotPinPressable}
                    accessibilityRole="link"
                  >
                    <Text style={[styles.forgotPinText, !isTablet && styles.forgotPinTextMobile]}>
                      Forgot PIN?
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>

        <ForgotPinModal visible={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
