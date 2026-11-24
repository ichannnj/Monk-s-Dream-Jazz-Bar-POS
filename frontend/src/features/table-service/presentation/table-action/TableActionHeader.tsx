import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { TableItem } from '../../../../types/floor';
import { formatCurrency } from '@monks/shared';
import {
  formatFloorAreaLabel,
  formatTableDisplayName,
  getOpenTabs,
} from '@/features/floor/domain/tableTabHelpers';

interface TableActionHeaderProps {
  table: TableItem;
  onClose: () => void;
}

export const TableActionHeader: React.FC<TableActionHeaderProps> = ({ table, onClose }) => {
  const displayName = formatTableDisplayName(table.code, table.area);
  const openTabs = getOpenTabs(table);
  const tabCount = openTabs.length;
  const tableTotal =
    table.totalAmount ?? openTabs.reduce((sum, t) => sum + (t.totalAmount || 0), 0);

  return (
    <View className="flex-row justify-between items-center mb-3.5">
      <View className="flex-row items-center gap-3 flex-1 min-w-0 pr-2">
        <View className="px-3.5 h-12 rounded-2xl bg-[#810021] items-center justify-center shadow-xs">
          <Text className="text-white text-lg font-black">{displayName}</Text>
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 flex-wrap">
            {tabCount > 1 ? (
              <View className="px-2.5 py-1 rounded-lg bg-[#F5EBEF] border border-[#810021]/20">
                <Text className="text-sm font-extrabold text-[#810021]">
                  {tabCount} Tabs · {formatCurrency(tableTotal)}
                </Text>
              </View>
            ) : (
              <Text className="text-base font-extrabold text-stone-900">
                {openTabs[0]?.guestName || 'Active Tab'}
              </Text>
            )}
          </View>
          <Text className="text-xs text-stone-500 font-semibold mt-0.5">
            {formatFloorAreaLabel(table.area)}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onClose}
        className="min-w-[48px] min-h-[48px] rounded-xl bg-[#EFECE6] border border-stone-200 items-center justify-center active:bg-stone-100"
        accessibilityRole="button"
        accessibilityLabel="Close modal"
      >
        <X size={20} color="#1A1617" />
      </Pressable>
    </View>
  );
};
