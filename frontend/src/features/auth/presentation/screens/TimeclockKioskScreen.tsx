import React, { useState, useEffect, useCallback } from 'react';
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
import {
  Clock,
  ShieldCheck,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { posApi } from '@/features/shared/infrastructure/api';
import { realtimeGateway } from '@/features/shared';
import { PinCodeInput } from '../components/PinCodeInput';

const JAZZ_HERO_IMAGE = require('../../../../../assets/images/jazz-club-stage.jpg');
const MONKS_DREAM_LOGO = require('../../../../../assets/Monks Dream Logo files-02.png');

interface TimeclockKioskScreenProps {
  isStandaloneTab?: boolean;
  onBackToLogin?: () => void;
}

export const TimeclockKioskScreen: React.FC<TimeclockKioskScreenProps> = ({
  isStandaloneTab = false,
  onBackToLogin,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [punchResult, setPunchResult] = useState<any | null>(null);

  // Live Clock Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDateStr(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePunch = useCallback(
    async (pinOverride?: string) => {
      if (isSubmitting) return;

      const cleanUser = username.trim().toLowerCase();
      const cleanPin = (pinOverride || pin).trim();

      if (!cleanUser) {
        setErrorMessage('Please enter your Staff ID / Username.');
        toast.warning('Staff ID is required.', { title: 'Missing Staff ID' });
        return;
      }

      if (!cleanPin || cleanPin.length !== 4) {
        setErrorMessage('Please enter your 4-digit staff PIN.');
        toast.warning('4-digit PIN is required.', { title: 'Missing PIN' });
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const res = await posApi.punchStaffTimeclock(cleanUser, cleanPin, 'AUTO');
        setPunchResult(res);

        // Notify all open terminals & admin dashboards in realtime
        try {
          realtimeGateway.broadcastPosSync('timeclock_punch');
        } catch (syncErr) {
          console.warn('[TimeclockKiosk] Realtime broadcast error:', syncErr);
        }

        const isClockIn = res.actionTaken === 'CLOCKED_IN';
        toast.success(
          `${res.user.displayName} successfully ${isClockIn ? 'Clocked In' : 'Clocked Out'}!`,
          {
            title: isClockIn ? 'Shift Started' : 'Shift Completed',
          }
        );

        // Reset inputs
        setUsername('');
        setPin('');

        // Auto-clear result badge after 5 seconds
        setTimeout(() => {
          setPunchResult(null);
        }, 5000);
      } catch (err: any) {
        const msg = err.message || 'Timeclock punch failed. Please check credentials.';
        setErrorMessage(msg);
        setPin('');
        toast.error(msg, { title: 'Timeclock Error' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [username, pin, isSubmitting]
  );

  const handlePinComplete = useCallback(
    (completedPin: string) => {
      if (!username.trim()) {
        setErrorMessage('Please enter your Staff ID / Username first.');
        return;
      }
      setTimeout(() => {
        handlePunch(completedPin);
      }, 100);
    },
    [username, handlePunch]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-[#1a050b]"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 min-h-screen flex-row items-center justify-center p-4 sm:p-6 lg:p-10">
          <View
            className={`w-full max-w-5xl rounded-3xl overflow-hidden bg-[#260812] border border-white/10 shadow-2xl flex-col ${
              isTablet ? 'md:flex-row' : ''
            }`}
          >
            {/* LEFT HERO & LIVE DIGITAL CLOCK PANE */}
            <View
              className={`relative p-8 flex-col justify-between overflow-hidden ${
                isTablet ? 'md:w-5/12 min-h-[580px]' : 'min-h-[260px]'
              }`}
            >
              <ExpoImage
                source={JAZZ_HERO_IMAGE}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                priority="high"
              />
              <View className="absolute inset-0 bg-[#4A1020]/90" />
              <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              {/* Top Brand Block */}
              <View className="relative z-10">
                <View className="flex-row items-center space-x-3 mb-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/20 border border-white/30">
                    <Clock size={20} color="#ffffff" />
                  </View>
                  <View>
                    <Text className="text-xl font-black tracking-tight text-white">
                      Monk's Dream
                    </Text>
                    <Text className="text-xs font-semibold text-rose-200">Timeclock Kiosk</Text>
                  </View>
                </View>

                {isStandaloneTab && (
                  <View className="mt-2 inline-flex flex-row items-center rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1">
                    <View className="h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                    <Text className="text-xs font-bold text-emerald-200">
                      Dedicated Kiosk Tab Active
                    </Text>
                  </View>
                )}
              </View>

              {/* Center Live Clock */}
              <View className="relative z-10 my-6">
                <Text className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
                  {currentTimeStr || '00:00:00'}
                </Text>
                <Text className="text-sm sm:text-base font-medium text-rose-100/90 mt-1">
                  {currentDateStr}
                </Text>
                <View className="mt-3 h-0.5 w-16 bg-rose-400/80 rounded-full" />
              </View>

              {/* Bottom Instructions */}
              <View className="relative z-10 pt-4 border-t border-white/20">
                <Text className="text-xs font-semibold text-white/90">
                  Universal Venue Punch System
                </Text>
                <Text className="text-xs text-white/70 mt-1 leading-relaxed">
                  Every team member punches in and out here using their Staff ID and 4-digit PIN.
                  Shift hours & daily wage baseline are tracked live.
                </Text>
              </View>
            </View>

            {/* RIGHT TIMECLOCK FORM PANE */}
            <View className="flex-1 bg-white p-6 sm:p-8 lg:p-10 flex-col justify-between">
              <View>
                {/* Top Header & Back/New Tab navigation */}
                <View className="flex-row items-center justify-between pb-4 border-b border-stone-100 mb-6">
                  <View>
                    <Text className="text-2xl font-black text-stone-900">Staff Clock-In / Out</Text>
                    <Text className="text-sm font-medium text-stone-500">
                      Punch in for your shift or clock out to end service
                    </Text>
                  </View>

                  {!isStandaloneTab && onBackToLogin ? (
                    <Pressable
                      onPress={onBackToLogin}
                      className="min-h-[44px] px-3.5 flex-row items-center rounded-xl bg-stone-100 active:bg-stone-200"
                    >
                      <ArrowLeft size={16} color="#44403c" />
                      <Text className="ml-1.5 text-sm font-bold text-stone-700">POS Login</Text>
                    </Pressable>
                  ) : (
                    Platform.OS === 'web' && (
                      <Pressable
                        onPress={() => window.open(window.location.origin, '_blank')}
                        className="min-h-[44px] px-3.5 flex-row items-center rounded-xl bg-stone-100 active:bg-stone-200"
                      >
                        <ExternalLink size={16} color="#44403c" />
                        <Text className="ml-1.5 text-sm font-bold text-stone-700">Open POS</Text>
                      </Pressable>
                    )
                  )}
                </View>

                {/* Success Card Confirmation Banner */}
                {punchResult && (
                  <View
                    className={`mb-6 rounded-2xl p-4 border ${
                      punchResult.actionTaken === 'CLOCKED_IN'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <View className="flex-row items-center space-x-2">
                      <CheckCircle2
                        size={22}
                        color={punchResult.actionTaken === 'CLOCKED_IN' ? '#047857' : '#b45309'}
                      />
                      <Text
                        className={`text-lg font-black ml-2 ${
                          punchResult.actionTaken === 'CLOCKED_IN'
                            ? 'text-emerald-900'
                            : 'text-amber-900'
                        }`}
                      >
                        {punchResult.user.displayName} (
                        {punchResult.actionTaken === 'CLOCKED_IN' ? 'Clocked In' : 'Clocked Out'})
                      </Text>
                    </View>

                    <View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <Text className="text-sm font-semibold text-stone-700">
                        Role: {punchResult.user.jobTitle || punchResult.user.role}
                      </Text>
                      <Text className="text-sm text-stone-500">
                        {punchResult.actionTaken === 'CLOCKED_IN'
                          ? `Started: ${new Date(punchResult.clockInAt).toLocaleTimeString()}${punchResult.hoursWorked > 0 ? ` (Resumed · ${punchResult.hoursWorked}h prior)` : ''}`
                          : `Finished: ${new Date(punchResult.clockOutAt).toLocaleTimeString()} (${punchResult.hoursWorked} hrs)`}
                      </Text>
                      <Text className="text-sm font-bold text-stone-800">
                        {punchResult.isAdmin || punchResult.user?.role === 'admin'
                          ? 'Payroll Exempt'
                          : `Shift Base: ₱${Number(punchResult.baseDailyPay).toFixed(2)}`}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <View className="mb-5 flex-row items-center rounded-2xl bg-rose-50 border border-rose-200 p-3.5">
                    <AlertCircle size={18} color="#be123c" />
                    <Text className="ml-2 text-sm font-bold text-rose-800 flex-1">
                      {errorMessage}
                    </Text>
                  </View>
                )}

                {/* Staff ID Input */}
                <View className="mb-5">
                  <Text className="text-sm font-bold text-stone-700 mb-1.5">
                    Staff ID / Username
                  </Text>
                  <TextInput
                    value={username}
                    onChangeText={(val) => {
                      setUsername(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Enter Staff ID (e.g. coltrane_cashier, rosa_dish)"
                    placeholderTextColor="#a8a29e"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="w-full min-h-[50px] rounded-2xl border border-stone-200 bg-stone-50/80 px-4 text-base font-semibold text-stone-900 focus:border-[#800020] focus:bg-white"
                  />
                  <Text className="mt-1 text-xs text-stone-400">
                    Works for all POS and Non-POS team members
                  </Text>
                </View>

                {/* 4-Digit PIN Code Input */}
                <View className="mb-6">
                  <Text className="text-sm font-bold text-stone-700 mb-2">4-Digit Staff PIN</Text>
                  <PinCodeInput
                    value={pin}
                    length={4}
                    onChange={(val) => {
                      setPin(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onComplete={handlePinComplete}
                    isError={!!errorMessage}
                  />
                </View>

                {/* Primary CTA Button */}
                <Pressable
                  onPress={() => handlePunch()}
                  disabled={isSubmitting || !username.trim() || pin.length !== 4}
                  className={`w-full min-h-[52px] items-center justify-center rounded-2xl bg-[#800020] shadow-md transition-all ${
                    isSubmitting || !username.trim() || pin.length !== 4
                      ? 'opacity-40 cursor-not-allowed'
                      : 'active:bg-[#6b001a]'
                  }`}
                >
                  <Text className="text-lg font-black text-white tracking-wide">
                    {isSubmitting ? 'Verifying Punch...' : 'Punch In / Out'}
                  </Text>
                </Pressable>
              </View>

              {/* Bottom Security Note */}
              <View className="pt-6 border-t border-stone-100 flex-row items-center justify-center space-x-2">
                <ShieldCheck size={16} color="#78716c" />
                <Text className="text-xs text-stone-500 ml-1.5">
                  Cryptographically verified punch ledger · Stored securely with pgcrypto Blowfish
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
