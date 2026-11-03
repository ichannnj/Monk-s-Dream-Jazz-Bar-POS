import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  Package,
  AlertOctagon,
  Sliders,
  Layers,
  Sparkles,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';
import { PosDropdown, PosDropdownOption, useResponsive } from '@/features/shared';

export type KdsStageFilter = 'new' | 'preparing' | 'ready';

export interface KdsToolbarProps {
  stationName?: string;
  isOnline?: boolean;
  staffName?: string;
  staffInitials?: string;
  onStaffPress?: () => void;
  stationSubtitle: string;
  activeTicketsCount: number;
  outOfStockCount: number;
  newCount?: number;
  preparingCount?: number;
  readyCount?: number;
  mobileStage?: KdsStageFilter;
  onMobileStageChange?: (stage: KdsStageFilter) => void;
  onOpenAvailability: () => void;
  onOpenOutOfStockList: () => void;
  onOpenStockAdjust: () => void;
}

export const KdsToolbar: React.FC<KdsToolbarProps> = ({
  stationName = 'Station KDS',
  isOnline = true,
  staffName = 'Staff',
  staffInitials = 'ST',
  onStaffPress,
  activeTicketsCount,
  outOfStockCount,
  newCount = 0,
  preparingCount = 0,
  readyCount = 0,
  mobileStage = 'new',
  onMobileStageChange,
  onOpenAvailability,
  onOpenOutOfStockList,
  onOpenStockAdjust,
}) => {
  const { isMobile } = useResponsive();

  const stageOptions: PosDropdownOption<KdsStageFilter>[] = [
    {
      value: 'new',
      label: 'New Orders',
      badge: newCount,
      icon: Sparkles,
      dotColor: '#2563eb',
    },
    {
      value: 'preparing',
      label: 'Preparing',
      badge: preparingCount,
      icon: Clock,
      dotColor: '#d97706',
    },
    {
      value: 'ready',
      label: 'Ready for Pickup',
      badge: readyCount,
      icon: CheckCircle2,
      dotColor: '#16a34a',
    },
  ];

  const stockActions: PosDropdownOption<'availability' | 'oos_list' | 'adjust_stock'>[] = [
    {
      value: 'availability',
      label: 'Mark Item Out of Stock (86)',
      description: 'Toggle menu item availability for this station',
      icon: AlertOctagon,
    },
    {
      value: 'oos_list',
      label: 'Out of Stock Items',
      badge: outOfStockCount,
      description: 'View and restore currently 86’d station items',
      icon: Layers,
      variant: outOfStockCount > 0 ? 'danger' : 'default',
    },
    {
      value: 'adjust_stock',
      label: 'Adjust Raw Stock Counts',
      description: 'Update live ingredient & par inventory counts',
      icon: Sliders,
    },
  ];

  const handleStockAction = (action: 'availability' | 'oos_list' | 'adjust_stock') => {
    if (action === 'availability') onOpenAvailability();
    else if (action === 'oos_list') onOpenOutOfStockList();
    else if (action === 'adjust_stock') onOpenStockAdjust();
  };

  return (
    <View className="bg-white rounded-2xl border border-stone-200/90 px-4 py-3 mb-3 flex-row flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* Left: Station Title + Online Badge + Active Ticket Pill */}
      <View className="flex-row items-center flex-wrap gap-2.5">
        <Text className="text-xl font-extrabold text-stone-900 tracking-tight">{stationName}</Text>

        <View
          className={`flex-row items-center rounded-full px-2.5 py-1 border ${
            isOnline ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
          }`}
        >
          <View
            className={`w-2 h-2 rounded-full mr-1.5 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}
          />
          <Text
            className={`text-base font-bold ${isOnline ? 'text-emerald-800' : 'text-rose-800'}`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        <View className="rounded-xl bg-stone-100 border border-stone-200 px-2.5 py-1">
          <Text className="text-base font-bold text-stone-700">{activeTicketsCount} Active</Text>
        </View>
      </View>

      {/* Right: Mobile Stage Selector + Stock & 86 Dropdown + Staff Button */}
      <View className="flex-row items-center flex-wrap gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
        {isMobile && onMobileStageChange ? (
          <PosDropdown
            options={stageOptions}
            value={mobileStage}
            onChange={onMobileStageChange}
            sheetTitle="Select Ticket Stage"
            className="flex-1 min-w-[155px]"
          />
        ) : null}

        <PosDropdown
          mode="action"
          options={stockActions}
          onChange={handleStockAction}
          triggerLabel="Stock & 86"
          triggerIcon={Package}
          triggerBadge={outOfStockCount > 0 ? `${outOfStockCount} 86'd` : undefined}
          variant={outOfStockCount > 0 ? 'wine' : 'white'}
          sheetTitle="Station Stock & 86 Controls"
          className="flex-1 sm:flex-initial min-w-[150px]"
        />

        {onStaffPress ? (
          <Pressable
            onPress={onStaffPress}
            style={({ pressed }) => [styles.staffBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Station staff ${staffName}`}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{staffInitials}</Text>
            </View>
            <Text style={styles.staffNameText} className="hidden md:flex">
              {staffName.split(' ')[0]}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  staffBtn: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#fcf9f9',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#800020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  staffNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1917',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
