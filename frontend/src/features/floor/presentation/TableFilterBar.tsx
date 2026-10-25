import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import {
  Coffee,
  Wine,
  Utensils,
  Users,
  ChefHat,
  Bell,
  ConciergeBell,
  ShoppingBag,
  Bike,
  Sparkles,
} from 'lucide-react-native';
import { TableStatus, ChannelCategory } from '../../../types/floor';

export type StatusFilter = 'all' | TableStatus;

interface TableFilterBarProps {
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
}

export const TableFilterBar: React.FC<TableFilterBarProps> = ({
  selectedChannel,
  onChannelChange,
  selectedStatus,
  onStatusChange,
  channelCounts,
  statusCounts,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Left: Operational Channel / Area Pills */}
        <View style={styles.areaGroup}>
          {/* All */}
          <Pressable
            onPress={() => onChannelChange('all')}
            style={[
              styles.areaPill,
              selectedChannel === 'all' ? styles.areaPillActive : styles.areaPillInactive,
            ]}
          >
            <Sparkles
              size={14}
              color={selectedChannel === 'all' ? '#ffffff' : '#4b5563'}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.pillText,
                selectedChannel === 'all' ? styles.pillTextActive : styles.pillTextInactive,
              ]}
            >
              All Channels ({channelCounts.all})
            </Text>
          </Pressable>

          {/* Cafe Area */}
          <Pressable
            onPress={() => onChannelChange('cafe')}
            style={[
              styles.areaPill,
              selectedChannel === 'cafe' ? styles.areaPillActive : styles.areaPillInactive,
            ]}
          >
            <Coffee
              size={14}
              color={selectedChannel === 'cafe' ? '#ffffff' : '#4b5563'}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.pillText,
                selectedChannel === 'cafe' ? styles.pillTextActive : styles.pillTextInactive,
              ]}
            >
              Cafe Area ({channelCounts.cafe})
            </Text>
          </Pressable>

          {/* Bar Area */}
          <Pressable
            onPress={() => onChannelChange('bar')}
            style={[
              styles.areaPill,
              selectedChannel === 'bar' ? styles.areaPillActive : styles.areaPillInactive,
            ]}
          >
            <Wine
              size={14}
              color={selectedChannel === 'bar' ? '#ffffff' : '#4b5563'}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.pillText,
                selectedChannel === 'bar' ? styles.pillTextActive : styles.pillTextInactive,
              ]}
            >
              Bar Area ({channelCounts.bar})
            </Text>
          </Pressable>

          {/* Takeout Queue */}
          <Pressable
            onPress={() => onChannelChange('takeout')}
            style={[
              styles.areaPill,
              selectedChannel === 'takeout'
                ? styles.areaPillEmeraldActive
                : styles.areaPillInactive,
            ]}
          >
            <ShoppingBag
              size={14}
              color={selectedChannel === 'takeout' ? '#ffffff' : '#15803d'}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.pillText,
                selectedChannel === 'takeout' ? styles.pillTextActive : { color: '#15803d' },
              ]}
            >
              Takeout Queue ({channelCounts.takeout})
            </Text>
          </Pressable>

          {/* Online Delivery */}
          <Pressable
            onPress={() => onChannelChange('online')}
            style={[
              styles.areaPill,
              selectedChannel === 'online' ? styles.areaPillAmberActive : styles.areaPillInactive,
            ]}
          >
            <Bike
              size={14}
              color={selectedChannel === 'online' ? '#ffffff' : '#b45309'}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.pillText,
                selectedChannel === 'online' ? styles.pillTextActive : { color: '#b45309' },
              ]}
            >
              Online Delivery ({channelCounts.online})
            </Text>
          </Pressable>
        </View>

        {/* Vertical Divider */}
        <View style={styles.divider} />

        {/* Right: Status Filter Pills */}
        <View style={styles.statusGroup}>
          {/* All */}
          <Pressable
            onPress={() => onStatusChange('all')}
            style={[styles.statusPill, selectedStatus === 'all' && styles.statusPillAllActive]}
          >
            <Text
              style={[
                styles.statusPillText,
                selectedStatus === 'all' && styles.statusPillTextWhite,
              ]}
            >
              All
            </Text>
            <View
              style={[
                styles.statusBadge,
                selectedStatus === 'all'
                  ? styles.statusBadgeWhiteOnWine
                  : styles.statusBadgeDefault,
              ]}
            >
              <Text
                style={
                  selectedStatus === 'all'
                    ? styles.statusBadgeTextWhite
                    : styles.statusBadgeTextDark
                }
              >
                {statusCounts.all}
              </Text>
            </View>
          </Pressable>

          {/* Empty */}
          <Pressable
            onPress={() => onStatusChange('empty')}
            style={[
              styles.statusPill,
              styles.pillEmpty,
              selectedStatus === 'empty' && styles.pillSelectedBorder,
            ]}
          >
            <Utensils size={13} color="#6b7280" />
            <Text style={styles.statusPillText}>Empty</Text>
            <View style={styles.statusBadgeDefault}>
              <Text style={styles.statusBadgeTextDark}>{statusCounts.empty}</Text>
            </View>
          </Pressable>

          {/* Occupied */}
          <Pressable
            onPress={() => onStatusChange('occupied')}
            style={[
              styles.statusPill,
              styles.pillOccupied,
              selectedStatus === 'occupied' && styles.pillSelectedBorder,
            ]}
          >
            <Users size={13} color="#832238" />
            <Text style={[styles.statusPillText, { color: '#832238' }]}>Occupied</Text>
            <View style={styles.badgeWineSoft}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#832238' }}>
                {statusCounts.occupied}
              </Text>
            </View>
          </Pressable>

          {/* Preparing */}
          <Pressable
            onPress={() => onStatusChange('preparing')}
            style={[
              styles.statusPill,
              styles.pillPreparing,
              selectedStatus === 'preparing' && styles.pillSelectedBorder,
            ]}
          >
            <ChefHat size={13} color="#b45309" />
            <Text style={[styles.statusPillText, { color: '#b45309' }]}>Preparing</Text>
            <View style={styles.badgeAmberSoft}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#b45309' }}>
                {statusCounts.preparing}
              </Text>
            </View>
          </Pressable>

          {/* Ready */}
          <Pressable
            onPress={() => onStatusChange('ready')}
            style={[
              styles.statusPill,
              styles.pillReady,
              selectedStatus === 'ready' && styles.pillSelectedBorder,
            ]}
          >
            <Bell size={13} color="#0369a1" />
            <Text style={[styles.statusPillText, { color: '#0369a1' }]}>Ready</Text>
            <View style={styles.badgeCyanSoft}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369a1' }}>
                {statusCounts.ready}
              </Text>
            </View>
          </Pressable>

          {/* Served */}
          <Pressable
            onPress={() => onStatusChange('served')}
            style={[
              styles.statusPill,
              styles.pillServed,
              selectedStatus === 'served' && styles.pillSelectedBorder,
            ]}
          >
            <ConciergeBell size={13} color="#4338ca" />
            <Text style={[styles.statusPillText, { color: '#4338ca' }]}>Served</Text>
            <View style={styles.badgeIndigoSoft}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#4338ca' }}>
                {statusCounts.served}
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  areaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  areaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
  },
  areaPillActive: {
    backgroundColor: '#641b2a',
  },
  areaPillEmeraldActive: {
    backgroundColor: '#15803d',
  },
  areaPillAmberActive: {
    backgroundColor: '#d97706',
  },
  areaPillInactive: {
    backgroundColor: '#f3f4f6',
  },
  pillText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  pillTextInactive: {
    color: '#4b5563',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  statusPillAllActive: {
    backgroundColor: '#641b2a',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  statusPillTextWhite: {
    color: '#ffffff',
  },
  pillEmpty: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  pillOccupied: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  pillPreparing: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  pillReady: {
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
  },
  pillServed: {
    backgroundColor: '#e0e7ff',
    borderColor: '#c7d2fe',
  },
  pillSelectedBorder: {
    borderWidth: 1.5,
    borderColor: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  statusBadgeWhiteOnWine: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusBadgeDefault: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeWineSoft: {
    backgroundColor: '#fceeed',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeAmberSoft: {
    backgroundColor: '#fef9c3',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeCyanSoft: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeIndigoSoft: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  statusBadgeTextWhite: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  statusBadgeTextDark: {
    fontSize: 11,
    fontWeight: '800',
    color: '#374151',
  },
});
