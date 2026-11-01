import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput } from 'react-native';
import { X, Lock, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { useAuthStore } from '@/features/auth/application/useAuthStore';
import { readingsApi, type ReadingData, type ZReadingRecord } from '../../../data/readings.api';

interface ZCloseShiftModalProps {
  visible: boolean;
  activeReading: ReadingData | null;
  drawerScope: 'consolidated' | 'main' | 'bar';
  onClose: () => void;
  onZReadingSuccess: (record: ZReadingRecord) => void;
}

export const ZCloseShiftModal: React.FC<ZCloseShiftModalProps> = ({
  visible,
  activeReading,
  drawerScope,
  onClose,
  onZReadingSuccess,
}) => {
  const { currentUser } = useAuthStore();
  const [countedCashInput, setCountedCashInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!activeReading) return null;

  const expectedCash = activeReading.expected_cash || 0;
  const countedCash = parseFloat(countedCashInput) || 0;
  const hasEnteredCash = countedCashInput.trim().length > 0;
  const variance = countedCash - expectedCash;

  const drawerLabel =
    drawerScope === 'bar'
      ? 'Bar Station Till'
      : drawerScope === 'main'
        ? 'Main Floor Till'
        : 'Consolidated Venue (All Tills)';

  const handleClose = () => {
    setCountedCashInput('');
    setNotes('');
    onClose();
  };

  const handleConfirmCloseShift = async () => {
    if (!hasEnteredCash) {
      toast.warning('Please enter the physical cash counted in drawer', {
        title: 'Cash Count Required',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const zRecord = await readingsApi.closeShiftAndGenerateZReading({
        drawer: drawerScope,
        countedCash,
        performedBy: currentUser?.id || null,
        notes: notes.trim() || undefined,
      });

      toast.success(
        `Shift closed successfully! Z-Reading #${zRecord.z_number} recorded (Variance: ${formatCurrency(variance)})`,
        { title: 'Z-Reading Generated' }
      );

      handleClose();
      onZReadingSuccess(zRecord);
    } catch (err: any) {
      console.error('[ZCloseShiftModal] error closing shift:', err);
      toast.error(err.message || 'Failed to complete Z-reading shift close', {
        title: 'Closing Error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/75 justify-center items-center p-4">
        <Pressable className="absolute inset-0" onPress={handleClose} />

        <View className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-stone-200">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-stone-200">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-stone-900 items-center justify-center">
                <Lock size={20} color="#ffffff" />
              </View>
              <View>
                <Text className="text-xl font-extrabold text-stone-900">
                  Perform Z-Reading & Shift Close
                </Text>
                <Text className="text-base text-stone-500 font-medium">
                  {drawerLabel} • Permanent Fiscal Audit
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleClose}
              className="w-9 h-9 rounded-xl bg-stone-100 items-center justify-center active:bg-stone-200"
            >
              <X size={18} color="#57534e" />
            </Pressable>
          </View>

          {/* Expected System Balance */}
          <View className="bg-stone-50 border border-stone-200 rounded-2xl p-4 my-4 items-center">
            <Text className="text-base text-stone-500 font-bold uppercase tracking-wider">
              System Calculated Cash Expected:
            </Text>
            <Text className="text-3xl font-black text-stone-900 mt-1">
              {formatCurrency(expectedCash)}
            </Text>
            <Text className="text-base text-stone-500 mt-1">
              Starting Float ({formatCurrency(activeReading.opening_float)}) + Cash Sales (
              {formatCurrency(activeReading.tender_cash)}) + Net In/Out
            </Text>
          </View>

          {/* Physical Cash Input */}
          <View className="mb-4">
            <Text className="text-base font-bold text-stone-700 mb-1.5">
              Actual Counted Cash in Drawer (₱):
            </Text>
            <View className="relative">
              <TextInput
                className="bg-stone-50 border border-stone-300 rounded-xl px-4 py-3 text-lg font-black text-stone-900 min-h-[48px]"
                keyboardType="numeric"
                placeholder="Count bills and coins..."
                placeholderTextColor="#a8a29e"
                value={countedCashInput}
                onChangeText={setCountedCashInput}
                autoFocus
              />
            </View>
          </View>

          {/* Live Variance Calculation */}
          {hasEnteredCash && (
            <View
              className={`p-4 rounded-xl border mb-4 flex-row items-center justify-between ${
                variance === 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : variance > 0
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-red-50 border-red-200'
              }`}
            >
              <View className="flex-row items-center gap-2">
                {variance === 0 ? (
                  <CheckCircle2 size={20} color="#059669" />
                ) : (
                  <AlertTriangle size={20} color={variance > 0 ? '#d97706' : '#dc2626'} />
                )}
                <Text
                  className={`text-base font-black ${
                    variance === 0
                      ? 'text-emerald-800'
                      : variance > 0
                        ? 'text-amber-800'
                        : 'text-red-800'
                  }`}
                >
                  {variance === 0
                    ? '✓ PERFECT BALANCE'
                    : variance > 0
                      ? '▲ CASH SURPLUS (OVER)'
                      : '▼ CASH SHORTAGE (DEFICIT)'}
                </Text>
              </View>
              <Text
                className={`text-xl font-black ${
                  variance === 0
                    ? 'text-emerald-800'
                    : variance > 0
                      ? 'text-amber-800'
                      : 'text-red-800'
                }`}
              >
                {variance > 0 ? '+' : ''}
                {formatCurrency(variance)}
              </Text>
            </View>
          )}

          {/* Shift Closing Notes */}
          <View className="mb-5">
            <Text className="text-base font-bold text-stone-700 mb-1.5">
              Closing Audit Notes (Optional):
            </Text>
            <TextInput
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-base text-stone-800 min-h-[48px]"
              placeholder="E.g., Verified by Manager, safe drop executed..."
              placeholderTextColor="#a8a29e"
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 pt-2">
            <Pressable
              onPress={handleClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-stone-100 items-center justify-center active:bg-stone-200 min-h-[48px]"
            >
              <Text className="text-base font-bold text-stone-700">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirmCloseShift}
              disabled={isSubmitting || !hasEnteredCash}
              className={`flex-1 py-3 rounded-xl items-center justify-center min-h-[48px] ${
                isSubmitting || !hasEnteredCash
                  ? 'bg-stone-300 opacity-60'
                  : 'bg-[#800020] active:bg-[#600018]'
              }`}
            >
              <Text className="text-base font-extrabold text-white">
                {isSubmitting ? 'Closing Shift...' : 'Confirm & Lock Z-Close'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
