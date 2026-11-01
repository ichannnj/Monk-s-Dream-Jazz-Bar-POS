import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput } from 'react-native';
import { X, ArrowRightLeft, CheckCircle2, AlertTriangle, UserCheck } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { useAuthStore } from '@/features/auth/application/useAuthStore';
import { readingsApi, type ReadingData, type YReadingRecord } from '../../../data/readings.api';

interface YCloseShiftModalProps {
  visible: boolean;
  activeReading: ReadingData | null;
  drawerScope: 'consolidated' | 'main' | 'bar';
  onClose: () => void;
  onYReadingSuccess: (record: YReadingRecord) => void;
}

export const YCloseShiftModal: React.FC<YCloseShiftModalProps> = ({
  visible,
  activeReading,
  drawerScope,
  onClose,
  onYReadingSuccess,
}) => {
  const { currentUser } = useAuthStore();
  const [countedCashInput, setCountedCashInput] = useState('');
  const [incomingStaff, setIncomingStaff] = useState('');
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

  const outgoingStaffName = currentUser?.displayName || 'Shift Cashier';

  const handleClose = () => {
    setCountedCashInput('');
    setIncomingStaff('');
    setNotes('');
    onClose();
  };

  const handleConfirmHandover = async () => {
    if (!hasEnteredCash) {
      toast.warning('Please enter the physical cash counted in drawer', {
        title: 'Cash Count Required',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const yRecord = await readingsApi.closeShiftAndGenerateYReading({
        drawer: drawerScope,
        countedCash,
        outgoingStaffId: currentUser?.id || null,
        incomingStaffName: incomingStaff.trim() || 'Next Shift Staff',
        notes: notes.trim() || undefined,
      });

      toast.success(
        `Shift Handover Y-#${yRecord.y_number} generated! Reconciled with ${formatCurrency(variance)} variance.`,
        { title: 'Handover Completed' }
      );

      handleClose();
      onYReadingSuccess(yRecord);
    } catch (err: any) {
      console.error('[YCloseShiftModal] Error executing shift handover:', err);
      toast.error(err.message || 'Failed to complete shift handover', {
        title: 'Handover Error',
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
              <View className="w-10 h-10 rounded-xl bg-amber-600 items-center justify-center">
                <ArrowRightLeft size={20} color="#ffffff" />
              </View>
              <View>
                <Text className="text-xl font-extrabold text-stone-900">
                  Cashier Shift Handover (Y-Reading)
                </Text>
                <Text className="text-base text-stone-500 font-medium">
                  {drawerLabel} • Staff Till Rotation
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

          {/* Expected System Cash */}
          <View className="bg-stone-50 border border-stone-200 rounded-2xl p-4 my-4 items-center">
            <Text className="text-base text-stone-500 font-bold uppercase tracking-wider">
              System Calculated Cash Expected:
            </Text>
            <Text className="text-3xl font-black text-stone-900 mt-1">
              {formatCurrency(expectedCash)}
            </Text>
            <Text className="text-base text-stone-500 mt-1">
              Outgoing Cashier:{' '}
              <Text className="font-bold text-stone-800">{outgoingStaffName}</Text>
            </Text>
          </View>

          {/* Physical Cash Count */}
          <View className="mb-4">
            <Text className="text-base font-bold text-stone-700 mb-1.5">
              Actual Physical Cash Counted in Drawer (₱):
            </Text>
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
                    ? '✓ BALANCED TILL'
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

          {/* Incoming Staff Member */}
          <View className="mb-4">
            <Text className="text-base font-bold text-stone-700 mb-1.5">
              Incoming Staff Name / Next Shift Cashier:
            </Text>
            <TextInput
              className="bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-base text-stone-800 min-h-[48px]"
              placeholder="E.g., Miles (Evening Bartender)"
              placeholderTextColor="#a8a29e"
              value={incomingStaff}
              onChangeText={setIncomingStaff}
            />
          </View>

          {/* Handover Notes */}
          <View className="mb-5">
            <Text className="text-base font-bold text-stone-700 mb-1.5">
              Handover Remarks (Optional):
            </Text>
            <TextInput
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-base text-stone-800 min-h-[48px]"
              placeholder="E.g., Till verified together, coins restocked..."
              placeholderTextColor="#a8a29e"
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Actions */}
          <View className="flex-row gap-3 pt-2">
            <Pressable
              onPress={handleClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-stone-100 items-center justify-center active:bg-stone-200 min-h-[48px]"
            >
              <Text className="text-base font-bold text-stone-700">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirmHandover}
              disabled={isSubmitting || !hasEnteredCash}
              className={`flex-1 py-3 rounded-xl items-center justify-center min-h-[48px] ${
                isSubmitting || !hasEnteredCash
                  ? 'bg-stone-300 opacity-60'
                  : 'bg-amber-600 active:bg-amber-700'
              }`}
            >
              <Text className="text-base font-extrabold text-white">
                {isSubmitting ? 'Recording Handover...' : 'Confirm Shift Handover'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
