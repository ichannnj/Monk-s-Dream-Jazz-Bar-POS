import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { X, Sparkles, Coffee, ShieldCheck, Clock, AlertTriangle } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';

interface ManagerModeSwitchModalProps {
  visible: boolean;
  currentMode: 'CAFE' | 'EVENT';
  isAdminUser: boolean;
  onClose: () => void;
  onConfirmSwitch: (nextMode: 'CAFE' | 'EVENT') => Promise<void>;
}

export const ManagerModeSwitchModal: React.FC<ManagerModeSwitchModalProps> = ({
  visible,
  currentMode,
  isAdminUser,
  onClose,
  onConfirmSwitch,
}) => {
  const nextMode = currentMode === 'CAFE' ? 'EVENT' : 'CAFE';
  const [managerPin, setManagerPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setManagerPin('');
      setPinError('');
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (!isAdminUser) {
      if (managerPin !== '9999') {
        setPinError('Invalid Manager PIN. Default PIN is 9999.');
        toast.error('Invalid Manager PIN. Action denied.', {
          title: 'Authorization Required',
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onConfirmSwitch(nextMode);
      onClose();
    } catch {
      toast.error('Failed to switch operating mode.', {
        title: 'Mode Update Failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-stone-950/75 justify-center items-center p-4 sm:p-5">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close mode switch modal"
        />

        <View className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl elevation-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3 flex-1 pr-2">
              <View
                className={`w-12 h-12 rounded-2xl items-center justify-center ${
                  nextMode === 'EVENT' ? 'bg-amber-100' : 'bg-sky-100'
                }`}
              >
                {nextMode === 'EVENT' ? (
                  <Sparkles size={24} color="#d97706" strokeWidth={2.4} />
                ) : (
                  <Coffee size={24} color="#0284c7" strokeWidth={2.4} />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-stone-900">
                  Confirm Switch to {nextMode === 'EVENT' ? 'Event Mode' : 'Cafe Mode'}?
                </Text>
                <Text className="text-base text-stone-500 font-medium">
                  Currently in {currentMode === 'EVENT' ? '🎷 Event Mode' : '☀️ Cafe Mode'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="w-12 h-12 rounded-xl bg-stone-100 items-center justify-center active:bg-stone-200"
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={20} color="#78716c" />
            </Pressable>
          </View>

          {/* Confirmation Prompt & Revenue Segregation Notice */}
          <View
            className={`p-4 rounded-2xl mb-3.5 border ${
              nextMode === 'EVENT'
                ? 'bg-amber-50/80 border-amber-200'
                : 'bg-sky-50/80 border-sky-200'
            }`}
          >
            <View className="flex-row items-center gap-2 mb-1.5">
              <AlertTriangle size={18} color={nextMode === 'EVENT' ? '#b45309' : '#0369a1'} />
              <Text
                className={`text-base font-bold ${
                  nextMode === 'EVENT' ? 'text-amber-950' : 'text-sky-950'
                }`}
              >
                Are you sure you want to change the venue operating mode?
              </Text>
            </View>
            <Text
              className={`text-base font-semibold leading-relaxed ${
                nextMode === 'EVENT' ? 'text-amber-900' : 'text-sky-900'
              }`}
            >
              {nextMode === 'EVENT'
                ? '🎷 Live Jazz Night: All new dine-in tabs, takeout, and delivery orders will be tagged as Event Mode.'
                : '☀️ Daytime Operations: All new dine-in tabs, takeout, and delivery orders will be tagged as Cafe Mode.'}
            </Text>
            <Text className="text-base text-stone-600 mt-1.5">
              Existing open tabs retain their original mode upon settlement.
            </Text>
          </View>

          {/* 6:00 AM Automatic Revert Schedule Notice */}
          <View className="flex-row items-start gap-3 p-3.5 rounded-2xl mb-5 bg-stone-100/90 border border-stone-200">
            <View className="mt-0.5">
              <Clock size={18} color="#800020" />
            </View>
            <Text className="flex-1 text-base font-medium text-stone-700 leading-snug">
              <Text className="font-bold text-stone-900">6:00 AM Auto-Reset: </Text>
              Event Mode automatically reverts back to Daytime Cafe Mode every morning at 6:00 AM.
            </Text>
          </View>

          {/* Manager PIN Input (if not admin) */}
          {!isAdminUser && (
            <View className="mb-5">
              <View className="flex-row items-center gap-2 mb-2">
                <ShieldCheck size={18} color="#800020" />
                <Text className="text-base font-bold text-stone-800">Enter Manager PIN</Text>
              </View>
              <TextInput
                value={managerPin}
                onChangeText={(val) => {
                  setManagerPin(val);
                  setPinError('');
                }}
                placeholder="4-digit PIN (9999)"
                placeholderTextColor="#a8a29e"
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-3 text-lg font-bold text-stone-900 min-h-[48px]"
                autoFocus
              />
              {pinError ? (
                <Text className="text-base font-semibold text-rose-600 mt-2">{pinError}</Text>
              ) : null}
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3.5 bg-stone-100 rounded-2xl items-center justify-center active:bg-stone-200 min-h-[48px]"
              accessibilityRole="button"
            >
              <Text className="text-base font-bold text-stone-700">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={isSubmitting}
              className={`flex-1 py-3.5 rounded-2xl items-center justify-center active:opacity-90 min-h-[48px] ${
                nextMode === 'EVENT' ? 'bg-amber-600' : 'bg-sky-600'
              }`}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-base font-bold text-white">
                  Confirm {nextMode === 'EVENT' ? 'Event' : 'Cafe'} Mode
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
