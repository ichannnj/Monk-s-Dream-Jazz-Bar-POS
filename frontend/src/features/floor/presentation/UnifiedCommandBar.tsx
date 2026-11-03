import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Sparkles, Coffee, Wine, ShoppingBag, Bike, PlusCircle } from 'lucide-react-native';
import { ChannelCategory, TableStatus } from '../../../types/floor';
import { PosDropdown, PosDropdownOption } from '@/features/shared';

export type StatusFilter = 'all' | TableStatus;

interface UnifiedCommandBarProps {
  selectedChannel: ChannelCategory;
  onChannelChange: (channel: ChannelCategory) => void;
  selectedStatus: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
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
  const channelOptions: PosDropdownOption<ChannelCategory>[] = [
    {
      value: 'all',
      label: 'All Channels',
      badge: channelCounts.all,
      icon: Sparkles,
      description: 'Show all tables, takeout, and delivery orders',
    },
    {
      value: 'cafe',
      label: 'Cafe Area',
      badge: channelCounts.cafe,
      icon: Coffee,
      description: 'Daytime cafe tables and counter service',
    },
    {
      value: 'bar',
      label: 'Bar Area',
      badge: channelCounts.bar,
      icon: Wine,
      description: 'Live jazz stage and cocktail bar seating',
    },
    {
      value: 'takeout',
      label: 'Takeout',
      badge: channelCounts.takeout,
      icon: ShoppingBag,
      description: 'Walk-in to-go pickup queue',
    },
    {
      value: 'online',
      label: 'Delivery',
      badge: channelCounts.online,
      icon: Bike,
      description: 'GrabFood & Foodpanda courier queue',
    },
  ];

  const statusOptions: PosDropdownOption<StatusFilter>[] = [
    { value: 'all', label: 'All Statuses', badge: statusCounts.all },
    {
      value: 'occupied',
      label: 'Occupied',
      badge: statusCounts.occupied,
      dotColor: '#be123c',
    },
    {
      value: 'preparing',
      label: 'Preparing',
      badge: statusCounts.preparing,
      dotColor: '#b45309',
    },
    {
      value: 'ready',
      label: 'Ready',
      badge: statusCounts.ready,
      dotColor: '#15803d',
    },
    {
      value: 'empty',
      label: 'Available',
      badge: statusCounts.empty,
      dotColor: '#6b7280',
    },
  ];

  const newOrderActions: PosDropdownOption<'tab' | 'takeout' | 'delivery'>[] = [
    ...(onOpenTableTab
      ? [
          {
            value: 'tab' as const,
            label: '+ Open Table Tab',
            description: 'Assign a new dine-in guest tab to a table',
            icon: PlusCircle,
          },
        ]
      : []),
    ...(onNewTakeout
      ? [
          {
            value: 'takeout' as const,
            label: '+ New Walk-In Takeout',
            description: 'Create a counter to-go order ticket',
            icon: ShoppingBag,
          },
        ]
      : []),
    ...(onInputOnlineOrder
      ? [
          {
            value: 'delivery' as const,
            label: '+ Input Delivery Order',
            description: 'Log a GrabFood or Foodpanda courier order',
            icon: Bike,
          },
        ]
      : []),
  ];

  const handleActionSelect = (action: 'tab' | 'takeout' | 'delivery') => {
    if (action === 'tab') onOpenTableTab?.();
    else if (action === 'takeout') onNewTakeout?.();
    else if (action === 'delivery') onInputOnlineOrder?.();
  };

  return (
    <View style={styles.container}>
      {/* Left: Channel & Status Filter Dropdowns */}
      <View className="flex-row flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
        <PosDropdown
          options={channelOptions}
          value={selectedChannel}
          onChange={onChannelChange}
          sheetTitle="Filter Floor by Channel"
          className="flex-1 sm:flex-initial min-w-[148px]"
        />

        <PosDropdown
          options={statusOptions}
          value={selectedStatus}
          onChange={onStatusChange}
          sheetTitle="Filter Floor by Status"
          className="flex-1 sm:flex-initial min-w-[140px]"
        />
      </View>

      {/* Right: + New Order Dropdown, Operating Mode Toggle & Staff Pill */}
      <View className="flex-row flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
        {newOrderActions.length > 0 ? (
          <PosDropdown
            mode="action"
            options={newOrderActions}
            onChange={handleActionSelect}
            triggerLabel="+ New Order"
            triggerIcon={PlusCircle}
            variant="wine"
            sheetTitle="Create New Order or Tab"
            className="flex-1 sm:flex-initial min-w-[150px]"
          />
        ) : null}

        <Pressable
          onPress={onToggleOperatingMode}
          style={({ pressed }) => [
            styles.modePill,
            operatingMode === 'EVENT' ? styles.modePillEvent : styles.modePillCafe,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Operating Mode: ${operatingMode === 'EVENT' ? 'Event Mode' : 'Cafe Mode'}. Tap to switch.`}
        >
          {operatingMode === 'EVENT' ? (
            <>
              <Sparkles size={16} color="#d97706" />
              <Text style={styles.modeTextEvent}>🎷 Event</Text>
            </>
          ) : (
            <>
              <Coffee size={16} color="#0284c7" />
              <Text style={styles.modeTextCafe}>☀️ Cafe</Text>
            </>
          )}
        </Pressable>

        {/* Compact Staff Pill (Visible on Tablet/Desktop >= 768px) */}
        <View style={styles.staffPill} className="hidden md:flex">
          <View style={styles.staffAvatar}>
            <Text style={styles.staffAvatarText}>{staffInitials}</Text>
          </View>
          <Text style={styles.staffNameText}>{staffName.split(' ')[0]}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  channelSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f0ec',
    borderRadius: 15,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    minHeight: 44,
    borderRadius: 12,
  },
  segmentBtnActive: {
    backgroundColor: '#641b2a',
    shadowColor: '#641b2a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countBadgeInactive: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  countTextActive: {
    color: '#ffffff',
  },
  countTextInactive: {
    color: '#6b7280',
  },
  quickActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  actionBtnWine: {
    backgroundColor: '#641b2a',
  },
  actionBtnEmerald: {
    backgroundColor: '#15803d',
  },
  actionBtnAmber: {
    backgroundColor: '#d97706',
  },
  actionBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusChipActive: {
    backgroundColor: '#1f2937',
    borderColor: '#1f2937',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusChipText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#4b5563',
  },
  statusChipTextActive: {
    color: '#ffffff',
  },
  statusCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9ca3af',
    fontVariant: ['tabular-nums'],
  },
  statusCountTextActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  staffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: '#fceeed',
    borderWidth: 1,
    borderColor: '#fad4db',
  },
  staffAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#641b2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  staffNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#832238',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    minWidth: 48,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  modePillCafe: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  modePillEvent: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  modeTextCafe: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0369a1',
  },
  modeTextEvent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#b45309',
  },
});
