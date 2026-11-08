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
import type { CheckOrderType } from '../../domain/check.types';

export interface ChecksFilterToolbarProps {
  selectedMode: 'all' | 'CAFE' | 'EVENT';
  selectedChannel: 'all' | CheckOrderType;
  searchQuery: string;
  isRefreshing: boolean;
  checksCount: number;
  onModeChange: (mode: 'all' | 'CAFE' | 'EVENT') => void;
  onChannelChange: (channel: 'all' | CheckOrderType) => void;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onExportExcel: () => void;
}

export const ChecksFilterToolbar: React.FC<ChecksFilterToolbarProps> = ({
  selectedMode,
  selectedChannel,
  searchQuery,
  isRefreshing,
  checksCount,
  onModeChange,
  onChannelChange,
  onSearchChange,
  onRefresh,
  onExportExcel,
}) => {
  const modeOptions: PosDropdownOption<'all' | 'CAFE' | 'EVENT'>[] = [
    { value: 'all', label: 'All Modes', icon: Layers },
    { value: 'CAFE', label: '☀️ Cafe Mode', icon: Coffee },
    { value: 'EVENT', label: '🎷 Event Mode', icon: Sparkles },
  ];

  const channelOptions: PosDropdownOption<'all' | CheckOrderType>[] = [
    { value: 'all', label: 'All Channels', badge: checksCount, icon: Layers },
    { value: 'dine_in', label: 'Dine-In Tables', icon: Coffee },
    { value: 'takeout', label: 'Takeout Counter', icon: ShoppingBag },
    { value: 'online_delivery', label: 'Online Delivery', icon: Bike },
  ];

  return (
    <View className="bg-white border-b border-stone-200/80 p-3.5 sm:p-5">
      <View className="flex-col lg:flex-row lg:items-center justify-between gap-3">
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-2xl bg-[#800020] items-center justify-center shadow-xs">
            <Receipt size={20} color="#ffffff" strokeWidth={2.4} />
          </View>
          <Text className="text-xl font-black text-stone-900 tracking-tight">
            Checks &amp; Settlement History
          </Text>
        </View>

        <View className="flex-row flex-wrap items-center gap-2.5">
          <PosDropdown
            options={modeOptions}
            value={selectedMode}
            onChange={onModeChange}
            sheetTitle="Filter by Operating Mode"
            className="flex-1 sm:flex-initial min-w-[148px]"
          />

          <PosDropdown
            options={channelOptions}
            value={selectedChannel}
            onChange={onChannelChange}
            sheetTitle="Filter by Order Channel"
            className="flex-1 sm:flex-initial min-w-[165px]"
          />

          {/* Search Input */}
          <View className="flex-row items-center bg-stone-100 border border-stone-300 rounded-xl px-3.5 py-2 min-h-[48px] w-full sm:w-64">
            <Search size={18} color="#78716c" />
            <TextInput
              className="flex-1 ml-2 text-base text-stone-900"
              placeholder="Search check #, guest, table..."
              placeholderTextColor="#a8a29e"
              value={searchQuery}
              onChangeText={onSearchChange}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => onSearchChange('')} className="p-1">
                <X size={16} color="#78716c" />
              </Pressable>
            )}
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={onRefresh}
              className="w-12 h-12 rounded-xl bg-white border border-stone-300 items-center justify-center active:bg-stone-100 shadow-xs"
              accessibilityRole="button"
              accessibilityLabel="Refresh checks"
            >
              <RefreshCw size={18} color="#57534e" className={isRefreshing ? 'animate-spin' : ''} />
            </Pressable>

            <Pressable
              onPress={onExportExcel}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 active:bg-emerald-100 flex-row items-center gap-2 shadow-xs"
            >
              <FileSpreadsheet size={18} color="#047857" />
              <Text className="text-base font-bold text-emerald-800">Export</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};
