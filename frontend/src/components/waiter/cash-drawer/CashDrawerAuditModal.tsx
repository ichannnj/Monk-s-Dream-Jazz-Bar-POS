import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';

interface CashDrawerAuditModalProps {
  visible: boolean;
  expectedBalance: number;
  countedCash: string;
  onCountedCashChange: (val: string) => void;
  onClose: () => void;
  onPrintZReport: (numericCounted: number, variance: number) => void;
}

export const CashDrawerAuditModal: React.FC<CashDrawerAuditModalProps> = ({
  visible,
  expectedBalance,
  countedCash,
  onCountedCashChange,
  onClose,
  onPrintZReport,
}) => {
  const [auditDone, setAuditDone] = useState(false);

  const numericCounted = parseFloat(countedCash) || 0;
  const variance = numericCounted - expectedBalance;

  const handleClose = () => {
    setAuditDone(false);
    onClose();
  };

  const handlePrint = () => {
    onPrintZReport(numericCounted, variance);
    setAuditDone(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/75 justify-center items-center p-4">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityLabel="Close modal"
        />
        <View className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
            <Text className="text-base font-extrabold text-jazz-text">End-of-Shift Cash Audit</Text>
            <Pressable
              onPress={handleClose}
              className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
            >
              <X size={18} color="#6b7280" />
            </Pressable>
          </View>

          {/* Calculated System Balance */}
          <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 my-3 items-center">
            <Text className="text-xs text-gray-500 font-bold uppercase tracking-wider">
              Calculated System Cash Expected:
            </Text>
            <Text className="text-2xl font-black text-jazz-text tabular-nums mt-1">
              {formatCurrency(expectedBalance)}
            </Text>
          </View>

          {/* Counted Physical Cash Input */}
          <View className="my-2">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Actual Physical Cash Counted in Drawer (₱):
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-extrabold text-jazz-text mt-1.5"
              keyboardType="numeric"
              placeholder="Count physical bills & coins..."
              placeholderTextColor="#9ca3af"
              value={countedCash}
              onChangeText={(val) => {
                onCountedCashChange(val);
                setAuditDone(true);
              }}
              autoFocus
            />
          </View>

          {/* Discrepancy Variance Box */}
          {auditDone && countedCash.length > 0 ? (
            <View
              className={`p-3 rounded-xl border mt-2 items-center ${
                variance === 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : variance > 0
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-red-50 border-red-200'
              }`}
            >
              <Text
                className={`text-xs font-black ${
                  variance === 0
                    ? 'text-emerald-700'
                    : variance > 0
                      ? 'text-amber-700'
                      : 'text-red-700'
                }`}
              >
                {variance === 0
                  ? '✓ PERFECT BALANCE'
                  : variance > 0
                    ? '▲ OVER (SURPLUS)'
                    : '▼ SHORT (DISCREPANCY)'}
              </Text>
              <Text
                className={`text-lg font-black tabular-nums mt-0.5 ${
                  variance === 0
                    ? 'text-emerald-700'
                    : variance > 0
                      ? 'text-amber-700'
                      : 'text-red-700'
                }`}
              >
                {variance > 0 ? '+' : ''}
                {formatCurrency(variance)}
              </Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View className="flex-row gap-3 pt-4">
            <Pressable
              onPress={handleClose}
              className="flex-1 py-3 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200 min-h-[44px]"
            >
              <Text className="text-sm font-bold text-gray-700">Close</Text>
            </Pressable>
            <Pressable
              onPress={handlePrint}
              className="flex-1 py-3 rounded-xl bg-slate-900 items-center justify-center active:opacity-90 min-h-[44px]"
            >
              <Text className="text-sm font-extrabold text-white">Print Shift Z-Report</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
