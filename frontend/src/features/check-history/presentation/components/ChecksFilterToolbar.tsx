import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import {
  Receipt,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Coffee,
  ShoppingBag,
  Bike,
  Sparkles,
  X,
} from 'lucide-react-native';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { PosActionButton } from '@/features/shared/ui/PosActionButton';
import type { CheckOrderType } from '../../domain/check.types';

export interface ChecksFilterToolbarProps {
  selectedMode: 'all' | 'CAFE' | 'EVENT';
  selectedChannel: 'all' | CheckOrderType;
  searchQuery: string;
  isRefreshing?: boolean;
  isExporting?: boolean;
  checksCount: number;
  onModeChange: (mode: 'all' | 'CAFE' | 'EVENT') => void;
  onChannelChange: (channel: 'all' | CheckOrderType) => void;
  onSearchChange: (query: string) => void;
  onRefresh?: () => void;
  onExportExcel: () => void | Promise<void>;
}

export const ChecksFilterToolbar: React.FC<ChecksFilterToolbarProps> = ({
  selectedMode,
  selectedChannel,
  searchQuery,
  isExporting = false,
  checksCount,
  onModeChange,
  onChannelChange,
  onSearchChange,
  onExportExcel,
}) => {
  const modeOptions: PosDropdownOption<'all' | 'CAFE' | 'EVENT'>[] = [
    { value: 'all', label: 'All Modes', icon: Layers },
    { value: 'CAFE', label: 'Cafe Mode', icon: Coffee },
    { value: 'EVENT', label: 'Event Mode', icon: Sparkles },
  ];

  const channelOptions: PosDropdownOption<'all' | CheckOrderType>[] = [
    { value: 'all', label: 'All Channels', badge: checksCount, icon: Layers },
    { value: 'dine_in', label: 'Dine-In', icon: Coffee },
    { value: 'takeout', label: 'Takeout', icon: ShoppingBag },
    { value: 'online_delivery', label: 'Delivery', icon: Bike },
  ];

  return (
    <View className="bg-white border border-[#E2DED6] rounded-2xl p-3 sm:p-4 mb-3.5">
      <View className="flex-row flex-wrap items-center justify-between gap-2.5">
        {/* Search Input */}
        <View className="flex-row items-center bg-[#EFECE6] border border-stone-300 rounded-xl px-3.5 py-2 min-h-[48px] flex-1 min-w-[200px]">
          <Search size={18} color="#78716c" />
          <TextInput
            className="flex-1 ml-2 text-base text-stone-900"
            placeholder="Search check #, guest, table..."
            placeholderTextColor="#a8a29e"
            value={searchQuery}
            onChangeText={onSearchChange}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => onSearchChange('')}
              className="p-1"
              accessibilityLabel="Clear search"
            >
              <X size={16} color="#78716c" />
            </Pressable>
          )}
        </View>

        {/* Filter Dropdowns & Export */}
        <View className="flex-row flex-wrap items-center gap-2">
          <PosDropdown
            options={modeOptions}
            value={selectedMode}
            onChange={onModeChange}
            sheetTitle="Filter by Operating Mode"
            className="flex-1 sm:flex-initial min-w-[130px]"
          />

          <PosDropdown
            options={channelOptions}
            value={selectedChannel}
            onChange={onChannelChange}
            sheetTitle="Filter by Order Channel"
            className="flex-1 sm:flex-initial min-w-[140px]"
          />

          <PosActionButton
            onPress={onExportExcel}
            loading={isExporting}
            label="Export"
            loadingLabel="Exporting…"
            icon={FileSpreadsheet}
            variant="secondary"
            accessibilityLabel="Export checks register to Excel"
          />
        </View>
      </View>
    </View>
  );
};
