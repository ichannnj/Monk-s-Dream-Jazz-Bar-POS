import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '@monks/shared';
import type { ReadingData } from '../../../../data/readings.api';

interface ReadingThermalSheetProps {
  reading: ReadingData;
  title: string;
  drawerLabel: string;
  isYReading: boolean;
}

export const ReadingThermalSheet: React.FC<ReadingThermalSheetProps> = ({
  reading,
  title,
  drawerLabel,
  isYReading,
}) => {
  return (
    <View
      nativeID="monks-reading-thermal-area"
      {...({ id: 'monks-reading-thermal-area' } as any)}
      className="bg-white rounded-2xl border border-stone-300 p-6 shadow-md max-w-sm mx-auto w-full font-mono"
    >
      <View className="items-center border-b border-dashed border-stone-400 pb-4 mb-4">
        <Text className="text-base font-black tracking-widest text-center">
          MONK'S DREAM JAZZ BAR
        </Text>
        <Text className="text-xs text-stone-600 text-center uppercase tracking-wider">
          POS TERMINAL FISCAL REPORT
        </Text>
        <Text className="text-base font-black mt-2 text-center">{title}</Text>
        <Text className="text-xs text-stone-500 mt-1">{drawerLabel}</Text>
        <Text className="text-xs text-stone-500">
          {new Date(reading.generated_at || reading.closed_at || Date.now()).toLocaleString()}
        </Text>
      </View>

      <View className="border-b border-dashed border-stone-400 pb-3 mb-3 space-y-1">
        <View className="flex-row justify-between">
          <Text className="text-xs font-mono">GROSS SALES</Text>
          <Text className="text-xs font-mono font-bold">{formatCurrency(reading.gross_sales)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs font-mono">DISCOUNTS</Text>
          <Text className="text-xs font-mono font-bold">
            -{formatCurrency(reading.discount_total)}
          </Text>
        </View>
        <View className="flex-row justify-between border-t border-stone-200 pt-1">
          <Text className="text-xs font-mono font-bold">NET SALES</Text>
          <Text className="text-xs font-mono font-bold">{formatCurrency(reading.net_sales)}</Text>
        </View>
        {(reading.cafe_sales !== undefined || reading.event_sales !== undefined) && (
          <View className="border-t border-stone-200 pt-1 mt-1 space-y-0.5">
            <View className="flex-row justify-between">
              <Text className="text-[10px] font-mono text-stone-600">CAFE MODE SALES</Text>
              <Text className="text-[10px] font-mono font-bold">
                {formatCurrency(reading.cafe_sales || 0)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[10px] font-mono text-stone-600">EVENT MODE SALES</Text>
              <Text className="text-[10px] font-mono font-bold">
                {formatCurrency(reading.event_sales || 0)}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className="border-b border-dashed border-stone-400 pb-3 mb-3 space-y-1">
        <View className="flex-row justify-between">
          <Text className="text-xs font-mono">VATABLE SALES</Text>
          <Text className="text-xs font-mono">{formatCurrency(reading.vatable_sales)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs font-mono">12% VAT</Text>
          <Text className="text-xs font-mono">{formatCurrency(reading.vat_amount)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs font-mono">10% SERV CHG</Text>
          <Text className="text-xs font-mono">{formatCurrency(reading.service_charge)}</Text>
        </View>
      </View>

      <View className="border-b border-dashed border-stone-400 pb-3 mb-3 space-y-1">
        <View className="flex-row justify-between">
          <Text className="text-xs font-mono">CASH TENDER</Text>
          <Text className="text-xs font-mono font-bold">{formatCurrency(reading.tender_cash)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs font-mono">CARD TENDER</Text>
          <Text className="text-xs font-mono font-bold">{formatCurrency(reading.tender_card)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs font-mono">DIGITAL WALLET</Text>
          <Text className="text-xs font-mono font-bold">
            {formatCurrency(reading.tender_digital)}
          </Text>
        </View>
        <View className="flex-row justify-between border-t border-stone-200 pt-1">
          <Text className="text-xs font-mono font-bold">TOTAL TENDER</Text>
          <Text className="text-xs font-mono font-bold">
            {formatCurrency(reading.total_tender)}
          </Text>
        </View>
      </View>

      <View className="pb-3 space-y-1">
        <View className="flex-row justify-between">
          <Text className="text-xs font-mono">EXPECTED CASH</Text>
          <Text className="text-xs font-mono font-bold">
            {formatCurrency(reading.expected_cash)}
          </Text>
        </View>
        {reading.counted_cash !== undefined && (
          <>
            <View className="flex-row justify-between">
              <Text className="text-xs font-mono">COUNTED CASH</Text>
              <Text className="text-xs font-mono font-bold">
                {formatCurrency(reading.counted_cash)}
              </Text>
            </View>
            <View className="flex-row justify-between border-t border-stone-300 pt-1">
              <Text className="text-xs font-mono font-bold">VARIANCE</Text>
              <Text className="text-xs font-mono font-bold">
                {reading.variance && reading.variance > 0 ? '+' : ''}
                {formatCurrency(reading.variance || 0)}
              </Text>
            </View>
          </>
        )}
      </View>

      {isYReading && (
        <View className="border-t border-dashed border-stone-400 pt-3 pb-2 space-y-2">
          <Text className="text-xs font-mono font-bold">STAFF HANDOVER</Text>
          <Text className="text-[10px] font-mono">
            OUT: {reading.outgoing_staff_name || reading.performed_by_name || 'Staff'}
          </Text>
          <Text className="text-[10px] font-mono">SIG: _____________________</Text>
          <Text className="text-[10px] font-mono">
            IN: {reading.incoming_staff_name || 'Incoming Staff'}
          </Text>
          <Text className="text-[10px] font-mono">SIG: _____________________</Text>
        </View>
      )}

      <View className="items-center border-t border-dashed border-stone-400 pt-3 mt-2">
        <Text className="text-[10px] text-stone-500 uppercase tracking-widest text-center">
          *** END OF REPORT ***
        </Text>
      </View>
    </View>
  );
};
