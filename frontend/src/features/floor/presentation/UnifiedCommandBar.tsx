import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import {
  Sparkles,
  Coffee,
  Wine,
  ShoppingBag,
  Bike,
  PlusCircle,
  Printer,
  CloudOff,
  Search,
  X,
} from 'lucide-react-native';
import { ChannelCategory, TableStatus } from '../../../types/floor';
import { PosDropdown, PosDropdownOption, useResponsive } from '@/features/shared';
import { TodaysEventBanner } from '@/features/events';
import { HardwareStationToggleModal, useDeviceHardwareStation } from '@/features/printer';
import { useOrderStore } from '@/features/orders';

export type StatusFilter = 'all' | TableStatus;

interface UnifiedCommandBarProps {
  selectedChannel: ChannelCategory;
  onChannelChange: (channel: ChannelCategory) => void;
  selectedStatus: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  channelCounts: {
    all: number;
    cafe: number;
    bar: number;
    takeout: number;
    online: number;
  };
  statusCounts: {
    all: number;
    empty: number;
    occupied: number;
    preparing: number;
    ready: number;
    served: number;
  };
  onOpenTableTab?: () => void;
  onNewTakeout?: () => void;
  onInputOnlineOrder?: () => void;
  staffName?: string;
  staffInitials?: string;
  operatingMode?: 'CAFE' | 'EVENT';
  onToggleOperatingMode?: () => void;
}

export const UnifiedCommandBar: React.FC<UnifiedCommandBarProps> = ({
  selectedChannel,
  onChannelChange,
  selectedStatus,
  onStatusChange,
  searchQuery = '',
  onSearchChange,
  channelCounts,
  statusCounts,
  onOpenTableTab,
  onNewTakeout,
  onInputOnlineOrder,
  staffName = 'Floor Staff',
  staffInitials = 'MD',
  operatingMode = 'CAFE',
  onToggleOperatingMode,
}) => {
  const { isMobile } = useResponsive();
  const [stationModalVisible, setStationModalVisible] = useState(false);
  const isHardwareStation = useDeviceHardwareStation((s) => s.isHardwareStation);
  const offlineQueueCount = useOrderStore((s) => s.offlineQueue?.length || 0);

  const channelOptions: PosDropdownOption<ChannelCategory>[] = [
    { value: 'all', label: 'All Channels', badge: channelCounts.all, icon: Sparkles },
    { value: 'cafe', label: 'CAFE AREA', badge: channelCounts.cafe, icon: Coffee },
    { value: 'bar', label: 'MUSIC LOUNGE', badge: channelCounts.bar, icon: Wine },
    { value: 'takeout', label: 'Takeout', badge: channelCounts.takeout, icon: ShoppingBag },
    { value: 'online', label: 'Delivery', badge: channelCounts.online, icon: Bike },
  ];

  const statusOptions: PosDropdownOption<StatusFilter>[] = [
    { value: 'all', label: 'All Statuses', badge: statusCounts.all },
    { value: 'occupied', label: 'Occupied', badge: statusCounts.occupied, dotColor: '#64748b' },
    { value: 'preparing', label: 'Preparing', badge: statusCounts.preparing, dotColor: '#f59e0b' },
    { value: 'ready', label: 'Ready', badge: statusCounts.ready, dotColor: '#10b981' },
    { value: 'served', label: 'Served', badge: statusCounts.served, dotColor: '#810021' },
    { value: 'empty', label: 'Available', badge: statusCounts.empty, dotColor: '#a8a29e' },
  ];

  const newOrderActions: PosDropdownOption<'tab' | 'takeout' | 'delivery'>[] = [
    ...(onOpenTableTab
      ? [{ value: 'tab' as const, label: '+ Open Table Tab', icon: PlusCircle }]
      : []),
    ...(onNewTakeout
      ? [{ value: 'takeout' as const, label: '+ New Walk-In Takeout', icon: ShoppingBag }]
      : []),
    ...(onInputOnlineOrder
      ? [{ value: 'delivery' as const, label: '+ Input Delivery Order', icon: Bike }]
      : []),
  ];

  const handleActionSelect = (action: 'tab' | 'takeout' | 'delivery') => {
    if (action === 'tab') onOpenTableTab?.();
    else if (action === 'takeout') onNewTakeout?.();
    else if (action === 'delivery') onInputOnlineOrder?.();
  };

  if (isMobile) {
    return (
      <View className="w-full gap-2.5 mb-3">
        {/* Mobile Row 1: Search + Primary "+ New" CTA */}
        <View className="flex-row items-center gap-2">
          {onSearchChange ? (
            <View className="flex-1 min-h-[48px] flex-row items-center bg-white border border-[#E2DED6] rounded-xl px-3">
              <Search size={18} color="#78716C" strokeWidth={2} />
              <TextInput
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search table or guest..."
                placeholderTextColor="#A8A29E"
                className="flex-1 ml-2 text-base text-[#1A1617] font-medium min-h-[44px]"
                accessibilityLabel="Search tables or guest names"
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => onSearchChange('')}
                  hitSlop={10}
                  className="w-8 h-8 rounded-full bg-[#EFECE6] border border-[#E2DED6] items-center justify-center ml-1"
                  accessibilityRole="button"
                  accessibilityLabel="Clear floor search"
                >
                  <X size={16} color="#44403C" />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {newOrderActions.length > 0 ? (
            <PosDropdown
              mode="action"
              options={newOrderActions}
              onChange={handleActionSelect}
              triggerLabel="+ New"
              triggerIcon={PlusCircle}
              variant="wine"
              sheetTitle="Create New Order or Tab"
              className="shrink-0"
            />
          ) : null}
        </View>

        {/* Mobile Row 2: Horizontally Scrollable Filter & Mode Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row items-center gap-2">
            <PosDropdown
              options={channelOptions}
              value={selectedChannel}
              onChange={onChannelChange}
              sheetTitle="Filter Floor by Channel"
            />

            <PosDropdown
              options={statusOptions}
              value={selectedStatus}
              onChange={onStatusChange}
              sheetTitle="Filter Floor by Status"
            />

            <Pressable
              onPress={onToggleOperatingMode}
              className={`min-h-[48px] min-w-[48px] px-3.5 rounded-xl border flex-row items-center gap-2 active:opacity-80 ${
                operatingMode === 'EVENT'
                  ? 'bg-[#810021] border-[#810021]'
                  : 'bg-white border-[#E2DED6]'
              }`}
              accessibilityRole="button"
              accessibilityLabel={`Operating Mode: ${operatingMode === 'EVENT' ? 'Event Mode' : 'Cafe Mode'}. Tap to switch.`}
            >
              {operatingMode === 'EVENT' ? (
                <>
                  <Sparkles size={16} color="#F7F5F2" />
                  <Text className="text-base font-bold text-white">Event</Text>
                </>
              ) : (
                <>
                  <Coffee size={16} color="#1A1617" />
                  <Text className="text-base font-bold text-[#1A1617]">Cafe</Text>
                </>
              )}
            </Pressable>

            {offlineQueueCount > 0 ? (
              <View
                className="min-h-[48px] px-3.5 rounded-xl bg-amber-50 border border-amber-300 flex-row items-center gap-1.5"
                accessibilityRole="alert"
                accessibilityLabel={`${offlineQueueCount} offline transactions queued.`}
              >
                <CloudOff size={16} color="#B45309" />
                <Text className="text-base font-bold text-amber-900 tabular-nums">
                  {offlineQueueCount} Queued
                </Text>
              </View>
            ) : null}

            <TodaysEventBanner compact />
          </View>
        </ScrollView>

        <HardwareStationToggleModal
          visible={stationModalVisible}
          onClose={() => setStationModalVisible(false)}
        />
      </View>
    );
  }

  // Tablet & Desktop (>= 768px)
  return (
    <View className="bg-white border border-[#E2DED6] rounded-2xl px-4 py-3 mb-4 flex-row flex-wrap items-center justify-between gap-3">
      {/* Left: Channel, Status, Search & Tonight's Event */}
      <View className="flex-row flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
        <PosDropdown
          options={channelOptions}
          value={selectedChannel}
          onChange={onChannelChange}
          sheetTitle="Filter Floor by Channel"
        />

        <PosDropdown
          options={statusOptions}
          value={selectedStatus}
          onChange={onStatusChange}
          sheetTitle="Filter Floor by Status"
        />

        {onSearchChange ? (
          <View className="min-h-[48px] flex-row items-center bg-[#EFECE6] border border-[#E2DED6] rounded-xl px-3 flex-1 min-w-[180px] max-w-[260px]">
            <Search size={18} color="#78716C" strokeWidth={2} />
            <TextInput
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder="Table or guest..."
              placeholderTextColor="#A8A29E"
              className="flex-1 ml-2 text-base text-[#1A1617] font-medium min-h-[44px]"
              accessibilityLabel="Search tables or guest names"
            />
            {searchQuery.length > 0 ? (
              <Pressable
                onPress={() => onSearchChange('')}
                hitSlop={10}
                className="w-8 h-8 rounded-full bg-white border border-[#E2DED6] items-center justify-center ml-1"
                accessibilityRole="button"
                accessibilityLabel="Clear floor search"
              >
                <X size={16} color="#44403C" />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <TodaysEventBanner compact />
      </View>

      {/* Right: + New Order, Offline Pill, Mode Toggle, Station, Staff */}
      <View className="flex-row flex-wrap items-center gap-2.5">
        {newOrderActions.length > 0 ? (
          <PosDropdown
            mode="action"
            options={newOrderActions}
            onChange={handleActionSelect}
            triggerLabel="+ New Order"
            triggerIcon={PlusCircle}
            variant="wine"
            sheetTitle="Create New Order or Tab"
          />
        ) : null}

        {offlineQueueCount > 0 ? (
          <View
            className="min-h-[48px] px-3.5 rounded-xl bg-amber-50 border border-amber-300 flex-row items-center gap-1.5"
            accessibilityRole="alert"
            accessibilityLabel={`${offlineQueueCount} offline transactions queued. Syncing automatically.`}
          >
            <CloudOff size={16} color="#B45309" />
            <Text className="text-base font-bold text-amber-900 tabular-nums">
              {offlineQueueCount} Queued
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={onToggleOperatingMode}
          className={`min-h-[48px] min-w-[48px] px-3.5 rounded-xl border flex-row items-center gap-2 active:opacity-80 ${
            operatingMode === 'EVENT'
              ? 'bg-[#810021] border-[#810021]'
              : 'bg-[#EFECE6] border-[#E2DED6]'
          }`}
          accessibilityRole="button"
          accessibilityLabel={`Operating Mode: ${operatingMode === 'EVENT' ? 'Event Mode' : 'Cafe Mode'}. Tap to switch.`}
        >
          {operatingMode === 'EVENT' ? (
            <>
              <Sparkles size={16} color="#F7F5F2" />
              <Text className="text-base font-bold text-white">Event</Text>
            </>
          ) : (
            <>
              <Coffee size={16} color="#1A1617" />
              <Text className="text-base font-bold text-[#1A1617]">Cafe</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => setStationModalVisible(true)}
          className={`min-h-[48px] px-3.5 rounded-xl border flex-row items-center gap-2 active:opacity-80 ${
            isHardwareStation
              ? 'bg-[#810021]/10 border-[#810021]/30'
              : 'bg-[#EFECE6] border-[#E2DED6]'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Hardware Printer & Cash Drawer Station Settings"
        >
          <Printer size={16} color={isHardwareStation ? '#810021' : '#57534E'} />
          <Text
            className={`text-base font-semibold ${
              isHardwareStation ? 'text-[#810021]' : 'text-[#57534E]'
            }`}
          >
            {isHardwareStation ? 'Station Active' : 'Station'}
          </Text>
        </Pressable>

        <View className="min-h-[48px] px-3 rounded-xl bg-[#EFECE6] border border-[#E2DED6] flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-full bg-[#810021] items-center justify-center">
            <Text className="text-xs font-bold text-white">{staffInitials}</Text>
          </View>
          <Text className="text-base font-semibold text-[#1A1617]">{staffName.split(' ')[0]}</Text>
        </View>
      </View>

      <HardwareStationToggleModal
        visible={stationModalVisible}
        onClose={() => setStationModalVisible(false)}
      />
    </View>
  );
};
