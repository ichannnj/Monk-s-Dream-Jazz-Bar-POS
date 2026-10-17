import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import {
  Sparkles,
  Coffee,
  Wine,
  ShoppingBag,
  Bike,
  PlusCircle,
  Clock,
  ChevronDown,
} from 'lucide-react-native';
import { ChannelCategory, TableStatus } from '../../mockData';

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
  staffName = 'Jess Santos',
  staffInitials = 'JS',
}) => {
  const channelItems: { id: ChannelCategory; label: string; count: number; Icon: any }[] = [
    { id: 'all', label: 'All', count: channelCounts.all, Icon: Sparkles },
    { id: 'cafe', label: 'Cafe', count: channelCounts.cafe, Icon: Coffee },
    { id: 'bar', label: 'Bar', count: channelCounts.bar, Icon: Wine },
    { id: 'takeout', label: 'Takeout', count: channelCounts.takeout, Icon: ShoppingBag },
    { id: 'online', label: 'Delivery', count: channelCounts.online, Icon: Bike },
  ];

  const statusItems: { id: StatusFilter; label: string; count: number; color?: string }[] = [
    { id: 'all', label: 'All', count: statusCounts.all },
    { id: 'occupied', label: 'Occupied', count: statusCounts.occupied, color: '#be123c' },
    { id: 'preparing', label: 'Prep', count: statusCounts.preparing, color: '#b45309' },
    { id: 'ready', label: 'Ready', count: statusCounts.ready, color: '#15803d' },
    { id: 'empty', label: 'Empty', count: statusCounts.empty, color: '#6b7280' },
  ];

  return (
    <View style={styles.container}>
      {/* 1. Left: Channel Segmented Switcher */}
      <View style={styles.channelSegment}>
        {channelItems.map((item) => {
          const isActive = selectedChannel === item.id;
          const { Icon } = item;

          return (
            <Pressable
              key={item.id}
              onPress={() => onChannelChange(item.id)}
              style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
            >
              <Icon
                size={15}
                color={isActive ? '#ffffff' : '#6b7280'}
                strokeWidth={isActive ? 2.4 : 2}
              />
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {item.label}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  isActive ? styles.countBadgeActive : styles.countBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    isActive ? styles.countTextActive : styles.countTextInactive,
                  ]}
                >
                  {item.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* 2. Center: Sleek Quick Actions */}
      <View style={styles.quickActionsGroup}>
        {onOpenTableTab ? (
          <Pressable
            onPress={onOpenTableTab}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnWine,
              pressed && styles.actionBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open Table Tab"
          >
            <PlusCircle size={16} color="#ffffff" strokeWidth={2.4} />
            <Text style={styles.actionBtnText}>+ Tab</Text>
          </Pressable>
        ) : null}

        {onNewTakeout ? (
          <Pressable
            onPress={onNewTakeout}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnEmerald,
              pressed && styles.actionBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="New Takeout"
          >
            <ShoppingBag size={16} color="#ffffff" strokeWidth={2.4} />
            <Text style={styles.actionBtnText}>+ To-Go</Text>
          </Pressable>
        ) : null}

        {onInputOnlineOrder ? (
          <Pressable
            onPress={onInputOnlineOrder}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnAmber,
              pressed && styles.actionBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Input Delivery Order"
          >
            <Bike size={16} color="#ffffff" strokeWidth={2.4} />
            <Text style={styles.actionBtnText}>+ Delivery</Text>
          </Pressable>
        ) : null}
      </View>

      {/* 3. Right: Status Filter & Staff Pill */}
      <View style={styles.rightSection}>
        {/* Status Filter Chips */}
        <View style={styles.statusGroup}>
          {statusItems.map((s) => {
            const isActive = selectedStatus === s.id;

            return (
              <Pressable
                key={s.id}
                onPress={() => onStatusChange(s.id)}
                style={[
                  styles.statusChip,
                  isActive && styles.statusChipActive,
                  s.color && !isActive ? { borderColor: `${s.color}30` } : null,
                ]}
              >
                {s.color ? (
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: s.color },
                      isActive && { backgroundColor: '#ffffff' },
                    ]}
                  />
                ) : null}
                <Text
                  style={[
                    styles.statusChipText,
                    isActive && styles.statusChipTextActive,
                    s.color && !isActive ? { color: s.color } : null,
                  ]}
                >
                  {s.label}
                </Text>
                <Text
                  style={[
                    styles.statusCountText,
                    isActive && styles.statusCountTextActive,
                  ]}
                >
                  {s.count}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Staff & Clock Pill */}
        <View style={styles.staffPill}>
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
    fontSize: 13.5,
    fontWeight: '800',
    color: '#832238',
  },
});
