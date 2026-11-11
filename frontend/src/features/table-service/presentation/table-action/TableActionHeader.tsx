import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { TableItem } from '../../../../types/floor';

interface TableActionHeaderProps {
  table: TableItem;
  onClose: () => void;
}

export const TableActionHeader: React.FC<TableActionHeaderProps> = ({ table, onClose }) => {
  return (
    <View className="flex-row justify-between items-center mb-4">
      <View className="flex-row items-center gap-3">
        <View className="w-12 h-12 rounded-2xl bg-[#810021] items-center justify-center shadow-xs">
          <Text className="text-white text-xl font-black">{table.code}</Text>
        </View>
        <View>
          <Text className="text-xl font-extrabold text-stone-900 tracking-tight">
            Table {table.code}
          </Text>
          <Text className="text-sm text-stone-500 font-medium">
            {table.guests > 0 ? `${table.guests} Guests · ` : ''}Status:{' '}
            {table.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onClose}
        className="min-w-[44px] min-h-[44px] rounded-xl bg-[#FAF8F5] border border-stone-200 items-center justify-center active:bg-stone-100"
        accessibilityRole="button"
        accessibilityLabel="Close modal"
      >
        <X size={20} color="#1c1917" />
      </Pressable>
    </View>
  );
};
