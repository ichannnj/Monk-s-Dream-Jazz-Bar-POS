import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { CheckCircle2, AlertTriangle, Printer, FileSpreadsheet } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';

interface ShiftReconciliationControlsProps {
  variance: number;
  hasEnteredCash: boolean;
  autoPrintThermal: boolean;
  autoDownloadExcel: boolean;
  onTogglePrintThermal: () => void;
  onToggleDownloadExcel: () => void;
}

export const ShiftReconciliationControls: React.FC<ShiftReconciliationControlsProps> = ({
  variance,
  hasEnteredCash,
  autoPrintThermal,
  autoDownloadExcel,
  onTogglePrintThermal,
  onToggleDownloadExcel,
}) => {
  return (
    <>
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
              variance === 0 ? 'text-emerald-800' : variance > 0 ? 'text-amber-800' : 'text-red-800'
            }`}
          >
            {variance > 0 ? '+' : ''}
            {formatCurrency(variance)}
          </Text>
        </View>
      )}

      <View className="bg-stone-50 rounded-2xl border border-stone-200 p-4 mb-2">
        <Text className="text-base font-extrabold text-stone-500 uppercase tracking-wider mb-2">
          Automated Closeout Actions:
        </Text>

        <View className="flex-row items-center justify-between py-2 border-b border-stone-200/60 min-h-[48px]">
          <View className="flex-row items-center gap-2.5">
            <Printer size={18} color="#44403c" />
            <Text className="text-base font-bold text-stone-800">
              Auto-print 80mm Handover Y-Slip
            </Text>
          </View>
          <Pressable
            onPress={onTogglePrintThermal}
            className={`w-8 h-8 rounded-lg items-center justify-center border min-h-[48px] min-w-[48px] ${
              autoPrintThermal ? 'bg-amber-600 border-amber-600' : 'bg-white border-stone-300'
            }`}
          >
            {autoPrintThermal && <CheckCircle2 size={18} color="#ffffff" />}
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between py-2 min-h-[48px]">
          <View className="flex-row items-center gap-2.5">
            <FileSpreadsheet size={18} color="#059669" />
            <Text className="text-base font-bold text-stone-800">
              Auto-download Styled Excel Report (.xls)
            </Text>
          </View>
          <Pressable
            onPress={onToggleDownloadExcel}
            className={`w-8 h-8 rounded-lg items-center justify-center border min-h-[48px] min-w-[48px] ${
              autoDownloadExcel ? 'bg-amber-600 border-amber-600' : 'bg-white border-stone-300'
            }`}
          >
            {autoDownloadExcel && <CheckCircle2 size={18} color="#ffffff" />}
          </Pressable>
        </View>
      </View>
    </>
  );
};
