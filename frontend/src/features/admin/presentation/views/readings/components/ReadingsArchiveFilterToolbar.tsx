import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import {
  Search,
  X,
  FileSpreadsheet,
  Lock,
  ArrowRightLeft,
  Layers,
  Coins,
  Receipt,
} from 'lucide-react-native';
import { Text } from 'react-native';
import { PosDropdown, PosDropdownOption } from '@/features/shared';

interface ReadingsArchiveFilterToolbarProps {
  historyTab: 'z_readings' | 'y_handovers';
  onHistoryTabChange: (tab: 'z_readings' | 'y_handovers') => void;
  zCount: number;
  yCount: number;
  archiveDrawer: 'all' | 'consolidated' | 'main' | 'bar';
  onArchiveDrawerChange: (drawer: 'all' | 'consolidated' | 'main' | 'bar') => void;
  archiveSearch: string;
  onArchiveSearchChange: (search: string) => void;
  onExportArchive: () => void;
}

export const ReadingsArchiveFilterToolbar: React.FC<ReadingsArchiveFilterToolbarProps> = ({
  historyTab,
  onHistoryTabChange,
  zCount,
  yCount,
  archiveDrawer,
  onArchiveDrawerChange,
  archiveSearch,
  onArchiveSearchChange,
  onExportArchive,
}) => {
  const historyTabOptions: PosDropdownOption<'z_readings' | 'y_handovers'>[] = [
    {
      value: 'z_readings',
      label: 'Daily Z-Readings Archive',
      badge: zCount,
      icon: Lock,
    },
    {
      value: 'y_handovers',
      label: 'Shift Handover Y-Reports',
      badge: yCount,
      icon: ArrowRightLeft,
    },
  ];

  const archiveTillOptions: PosDropdownOption<'all' | 'consolidated' | 'main' | 'bar'>[] = [
    { value: 'all', label: 'All Tills', icon: Layers },
    { value: 'consolidated', label: 'Consolidated', icon: Layers },
    { value: 'main', label: 'Main Floor Till', icon: Coins },
    { value: 'bar', label: 'Bar Station Till', icon: Receipt },
  ];

  return (
    <View className="flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-4 bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs">
      <View className="flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
        <PosDropdown
          options={historyTabOptions}
          value={historyTab}
          onChange={onHistoryTabChange}
          prefixLabel="Archive:"
          sheetTitle="Select Historical Readings Archive"
          className="w-full sm:w-64"
        />

        <PosDropdown
          options={archiveTillOptions}
          value={archiveDrawer}
          onChange={onArchiveDrawerChange}
          prefixLabel="Till:"
          sheetTitle="Filter Archive by Till"
          className="w-full sm:w-48"
        />

        <View className="flex-row items-center bg-stone-100 border border-stone-300 rounded-xl px-3 py-2 flex-1 min-h-[48px]">
          <Search size={16} color="#78716c" />
          <TextInput
            className="flex-1 ml-2 text-base text-stone-900"
            placeholder="Search reading #, staff, notes..."
            placeholderTextColor="#a8a29e"
            value={archiveSearch}
            onChangeText={onArchiveSearchChange}
          />
          {archiveSearch.length > 0 && (
            <Pressable onPress={() => onArchiveSearchChange('')} className="p-1">
              <X size={16} color="#78716c" />
            </Pressable>
          )}
        </View>
      </View>

      <Pressable
        onPress={onExportArchive}
        className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 active:bg-emerald-100 shadow-xs min-h-[48px] justify-center"
      >
        <FileSpreadsheet size={16} color="#047857" />
        <Text className="text-base font-bold text-emerald-800">Export Archive (.xls)</Text>
      </Pressable>
    </View>
  );
};
