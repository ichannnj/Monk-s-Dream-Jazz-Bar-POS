import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { TableItem } from '../../../types/floor';

interface TableActionHeaderProps {
  table: TableItem;
  onClose: () => void;
}

export const TableActionHeader: React.FC<TableActionHeaderProps> = ({ table, onClose }) => {
  return (
    <View className="flex-row justify-between items-center mb-4">
      <View className="flex-row items-center gap-3">
        <View className="w-12 h-12 rounded-2xl bg-wine-800 items-center justify-center shadow-sm">
          <Text className="text-white text-xl font-black">{table.code}</Text>
        </View>
        <View>
          <Text className="text-xl font-extrabold text-gray-900 tracking-tight">
            Table {table.code} · Active Session
          </Text>
          <Text className="text-base text-gray-500 font-medium">
            {table.guests > 0 ? `${table.guests} Guests · ` : ''}Status:{' '}
            {table.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onClose}
        className="min-w-[48px] min-h-[48px] rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
        accessibilityRole="button"
        accessibilityLabel="Close modal"
      >
        <X size={20} color="#6b7280" />
      </Pressable>
    </View>
  );
};
