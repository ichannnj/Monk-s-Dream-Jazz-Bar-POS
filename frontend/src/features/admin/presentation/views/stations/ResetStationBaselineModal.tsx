import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ActivityIndicator } from 'react-native';
import { RotateCcw, X, ShieldAlert, Check } from 'lucide-react-native';
import { adminApi } from '../../../data/admin.api';
import { toast } from '@/features/shared/toast/useToastStore';

interface ResetStationBaselineModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetStationBaselineModal: React.FC<ResetStationBaselineModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleConfirmReset = async () => {
    if (pin.length !== 4) {
      setError('Please enter the 4-digit Manager PIN (e.g. 9999).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await adminApi.resetStationMetrics(pin);
      if (!res.success) {
        setError(res.error || 'Invalid Manager PIN. Authorization denied.');
        setIsSubmitting(false);
        return;
      }

      toast.success('Station shift baseline reset. Metrics are now calculating fresh.', {
        title: 'Shift Baseline Reset',
      });
      setPin('');
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reset station baseline.');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setPin('');
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-4">
        <Pressable className="absolute inset-0" onPress={handleClose} />
        <View className="w-full max-w-md rounded-2xl border border-stone-800 bg-[#1c1917] p-6 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-stone-800 pb-4">
            <View className="flex-row items-center space-x-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <RotateCcw size={20} color="#f59e0b" />
              </View>
              <View className="ml-3">
                <Text className="text-lg font-bold text-white">Reset Shift Baseline</Text>
                <Text className="text-xs text-stone-400">Manager Authorization Required</Text>
              </View>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              className="rounded-lg p-1.5 hover:bg-stone-800"
            >
              <X size={18} color="#a8a29e" />
            </Pressable>
          </View>

          {/* Body Notice */}
          <View className="mt-4 rounded-xl border border-amber-900/40 bg-amber-950/20 p-3.5">
            <View className="flex-row items-start space-x-2.5">
              <ShieldAlert size={18} color="#f59e0b" />
              <View className="ml-2 flex-1">
                <Text className="text-xs font-semibold text-amber-300">
                  Non-Destructive Shift Reset
                </Text>
                <Text className="mt-0.5 text-xs text-stone-300 leading-relaxed">
                  Resets average turnaround timers and completed order counts to start fresh from
                  this moment for the active shift. All order history and sales data remain
                  permanently preserved in the database.
                </Text>
              </View>
            </View>
          </View>

          {/* PIN Display */}
          <View className="my-5 items-center">
            <Text className="mb-2 text-xs font-medium text-stone-400">
              Enter 4-Digit Manager PIN (Default: 9999)
            </Text>
            <View className="flex-row items-center space-x-3">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <View
                    key={idx}
                    className={`h-11 w-11 items-center justify-center rounded-xl border-2 ${
                      filled
                        ? 'border-amber-500 bg-amber-500/20'
                        : 'border-stone-700 bg-stone-900/60'
                    }`}
                  >
                    {filled ? (
                      <View className="h-3 w-3 rounded-full bg-amber-400" />
                    ) : (
                      <View className="h-2 w-2 rounded-full bg-stone-700" />
                    )}
                  </View>
                );
              })}
            </View>
            {error && (
              <Text className="mt-2 text-xs font-semibold text-rose-400 text-center">{error}</Text>
            )}
          </View>

          {/* Numeric Keypad */}
          <View className="space-y-2">
            <View className="flex-row space-x-2">
              {['1', '2', '3'].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => handleKeyPress(num)}
                  className="flex-1 items-center justify-center rounded-xl border border-stone-800 bg-stone-900/90 py-3 active:bg-amber-500/20"
                >
                  <Text className="text-lg font-bold text-white">{num}</Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row space-x-2">
              {['4', '5', '6'].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => handleKeyPress(num)}
                  className="flex-1 items-center justify-center rounded-xl border border-stone-800 bg-stone-900/90 py-3 active:bg-amber-500/20"
                >
                  <Text className="text-lg font-bold text-white">{num}</Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row space-x-2">
              {['7', '8', '9'].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => handleKeyPress(num)}
                  className="flex-1 items-center justify-center rounded-xl border border-stone-800 bg-stone-900/90 py-3 active:bg-amber-500/20"
                >
                  <Text className="text-lg font-bold text-white">{num}</Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row space-x-2">
              <Pressable
                onPress={handleClear}
                className="flex-1 items-center justify-center rounded-xl border border-stone-800 bg-stone-900/60 py-3 active:bg-stone-800"
              >
                <Text className="text-xs font-semibold text-stone-400">Clear</Text>
              </Pressable>
              <Pressable
                onPress={() => handleKeyPress('0')}
                className="flex-1 items-center justify-center rounded-xl border border-stone-800 bg-stone-900/90 py-3 active:bg-amber-500/20"
              >
                <Text className="text-lg font-bold text-white">0</Text>
              </Pressable>
              <Pressable
                onPress={handleBackspace}
                className="flex-1 items-center justify-center rounded-xl border border-stone-800 bg-stone-900/60 py-3 active:bg-stone-800"
              >
                <Text className="text-xs font-semibold text-stone-400">⌫</Text>
              </Pressable>
            </View>
          </View>

          {/* Actions */}
          <View className="mt-5 flex-row items-center space-x-3">
            <Pressable
              onPress={handleClose}
              disabled={isSubmitting}
              className="flex-1 items-center justify-center rounded-xl border border-stone-700 bg-stone-800 py-3 active:bg-stone-700"
            >
              <Text className="text-sm font-semibold text-stone-300">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirmReset}
              disabled={isSubmitting || pin.length !== 4}
              className={`flex-1 flex-row items-center justify-center rounded-xl py-3 ${
                pin.length === 4 && !isSubmitting
                  ? 'bg-amber-500 active:bg-amber-600'
                  : 'bg-stone-800 opacity-50'
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={16} color="#ffffff" />
                  <Text className="ml-1.5 text-sm font-bold text-white">Confirm Reset</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
