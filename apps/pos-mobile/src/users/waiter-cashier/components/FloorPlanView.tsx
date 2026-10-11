import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { TableItem } from '../../../mockData';

interface FloorPlanViewProps {
  tables: TableItem[];
  selectedTableNumber: number | null;
  onSelectTable: (tableNumber: number) => void;
}

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({
  tables,
  selectedTableNumber,
  onSelectTable,
}) => {
  const formatPHP = (centavos: number) => `₱${(centavos / 100).toFixed(2)}`;

  const getBadge = (status: TableItem['status']) => {
    switch (status) {
      case 'EMPTY':
        return { text: 'Available', bg: 'bg-emerald-950/60', border: 'border-emerald-800', col: 'text-emerald-400' };
      case 'OCCUPIED':
        return { text: 'Occupied', bg: 'bg-blue-950/60', border: 'border-blue-800', col: 'text-blue-400' };
      case 'PREPARING':
        return { text: 'In Prep', bg: 'bg-amber-950/60', border: 'border-amber-800', col: 'text-amber-400' };
      case 'READY':
        return { text: 'Ready', bg: 'bg-green-950/60', border: 'border-green-600', col: 'text-green-300' };
      case 'SERVED':
        return { text: 'Served', bg: 'bg-indigo-950/60', border: 'border-indigo-800', col: 'text-indigo-400' };
      case 'BILL_REQUESTED':
        return { text: 'Bill Req', bg: 'bg-rose-950/60', border: 'border-rose-800', col: 'text-rose-400' };
      default:
        return { text: 'Open', bg: 'bg-gray-800', border: 'border-gray-700', col: 'text-gray-300' };
    }
  };

  return (
    <View className="flex-1 bg-jazz-900/60 border-r border-jazz-850 p-3">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-xs font-black text-jazz-gold uppercase tracking-wider">
          Floor Layout
        </Text>
        <Text className="text-[10px] text-gray-500 font-medium">14 Zones</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Main Floor */}
        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
          Main Dining Floor
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {tables
            .filter((t) => t.section === 'main_floor')
            .map((table) => {
              const isSelected = selectedTableNumber === table.tableNumber;
              const badge = getBadge(table.status);
              return (
                <TouchableOpacity
                  key={table.id}
                  onPress={() => onSelectTable(table.tableNumber)}
                  className={`w-[72px] p-2 rounded-xl border ${
                    isSelected
                      ? 'bg-jazz-gold/20 border-jazz-gold shadow-md'
                      : `${badge.bg} ${badge.border}`
                  }`}
                >
                  <Text
                    className={`text-xs font-black ${
                      isSelected ? 'text-jazz-gold' : 'text-gray-100'
                    }`}
                  >
                    T-{table.tableNumber}
                  </Text>
                  <Text className={`text-[9px] ${badge.col} font-bold`}>
                    {badge.text}
                  </Text>
                  {table.totalCentavos ? (
                    <Text className="text-[9px] text-gray-300 font-semibold mt-0.5">
                      {formatPHP(table.totalCentavos)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
        </View>

        {/* Mezzanine */}
        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
          Mezzanine Lounge
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {tables
            .filter((t) => t.section === 'mezzanine')
            .map((table) => {
              const isSelected = selectedTableNumber === table.tableNumber;
              const badge = getBadge(table.status);
              return (
                <TouchableOpacity
                  key={table.id}
                  onPress={() => onSelectTable(table.tableNumber)}
                  className={`w-[72px] p-2 rounded-xl border ${
                    isSelected
                      ? 'bg-jazz-gold/20 border-jazz-gold shadow-md'
                      : `${badge.bg} ${badge.border}`
                  }`}
                >
                  <Text
                    className={`text-xs font-black ${
                      isSelected ? 'text-jazz-gold' : 'text-gray-100'
                    }`}
                  >
                    T-{table.tableNumber}
                  </Text>
                  <Text className={`text-[9px] ${badge.col} font-bold`}>
                    {badge.text}
                  </Text>
                  {table.totalCentavos ? (
                    <Text className="text-[9px] text-gray-300 font-semibold mt-0.5">
                      {formatPHP(table.totalCentavos)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
        </View>

        {/* Bar Seats */}
        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
          Bar Counter Seats
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-3">
          {tables
            .filter((t) => t.section === 'bar_counter')
            .map((table) => {
              const isSelected = selectedTableNumber === table.tableNumber;
              const badge = getBadge(table.status);
              return (
                <TouchableOpacity
                  key={table.id}
                  onPress={() => onSelectTable(table.tableNumber)}
                  className={`w-[72px] p-2 rounded-xl border ${
                    isSelected
                      ? 'bg-jazz-gold/20 border-jazz-gold shadow-md'
                      : `${badge.bg} ${badge.border}`
                  }`}
                >
                  <Text
                    className={`text-xs font-black ${
                      isSelected ? 'text-jazz-gold' : 'text-gray-100'
                    }`}
                  >
                    B-{table.tableNumber - 10}
                  </Text>
                  <Text className={`text-[9px] ${badge.col} font-bold`}>
                    {badge.text}
                  </Text>
                  {table.totalCentavos ? (
                    <Text className="text-[9px] text-gray-300 font-semibold mt-0.5">
                      {formatPHP(table.totalCentavos)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
        </View>
      </ScrollView>
    </View>
  );
};
