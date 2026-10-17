import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TableItem } from '../../mockData';

interface TableCardProps {
  table: TableItem;
  onPress: (table: TableItem) => void;
}

export const TableCard: React.FC<TableCardProps> = React.memo(({ table, onPress }) => {
  const {
    code,
    seats,
    guests,
    status,
    elapsedTime,
    assignedStaff,
    totalAmount,
    hasOpenCheck,
    activeTabs,
    maxTabs,
  } = table;

  // Status-specific badges & accents
  const getStatusBadge = () => {
    switch (status) {
      case 'ready':
        return {
          label: 'READY',
          bg: '#e8f9ee',
          color: '#15803d',
          dotColor: '#16a34a',
        };
      case 'preparing':
        return {
          label: 'PREP',
          bg: '#fef7e6',
          color: '#b45309',
          dotColor: '#d97706',
        };
      case 'served':
        return {
          label: 'SERVED',
          bg: '#fff1f2',
          color: '#be123c',
          dotColor: '#e11d48',
        };
      case 'occupied':
        return {
          label: 'OCCUPIED',
          bg: '#fdf2f4',
          color: '#832238',
          dotColor: '#832238',
        };
      case 'empty':
      default:
        return {
          label: 'EMPTY',
          bg: '#f3f4f6',
          color: '#9ca3af',
          dotColor: '#d1d5db',
        };
    }
  };

  const statusConfig = getStatusBadge();

  // Format amount with commas if >= 1000
  const formattedAmount =
    totalAmount !== undefined
      ? totalAmount >= 1000
        ? `$ ${totalAmount.toLocaleString('en-US')}`
        : `$ ${totalAmount.toFixed(2)}`
      : null;

  // Derive accurate active tabs list and count
  const activeTabNumbers = React.useMemo(() => {
    const fromTabs = (table.tabs || [])
      .filter((t) => t.status !== 'closed')
      .map((t) => t.tabIndex);
    const fromActiveTabs = activeTabs || [];
    return Array.from(new Set([...fromActiveTabs, ...fromTabs])).sort((a, b) => a - b);
  }, [table.tabs, activeTabs]);

  const activeCount = activeTabNumbers.length;
  const highestActiveTab = activeCount > 0 ? Math.max(...activeTabNumbers) : 0;

  // Total tab slots to render:
  // If table is empty and has no active tabs, show 1 empty slot.
  // Otherwise show at least all active tabs (highestActiveTab) and up to maxTabs/seats capacity.
  const totalSlotsCount = React.useMemo(() => {
    if (status === 'empty' && activeCount === 0) {
      return 1;
    }
    const baseCapacity = Math.max(maxTabs || 1, seats || 1);
    return Math.max(highestActiveTab, baseCapacity, 1);
  }, [status, activeCount, maxTabs, seats, highestActiveTab]);

  const slotNumbers = React.useMemo(() => {
    return Array.from({ length: totalSlotsCount }, (_, i) => i + 1);
  }, [totalSlotsCount]);

  return (
    <Pressable
      onPress={() => onPress(table)}
      style={({ pressed }) => [
        styles.cardContainer,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Table ${code}, ${status}`}
    >
      {/* 1. Top Row: Table Code & Seats + Status & Timer Badge */}
      <View style={styles.cardHeader}>
        <View style={styles.codeCol}>
          <Text style={styles.tableCodeText}>{code}</Text>
          <Text style={styles.seatsText}>
            {guests > 0 ? `${guests}g · ` : ''}
            {seats} seats
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            statusConfig.bg !== 'transparent' && { backgroundColor: statusConfig.bg },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusConfig.dotColor }]} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
          {elapsedTime && status !== 'empty' ? (
            <Text style={[styles.timeText, { color: statusConfig.color }]}>
              · {elapsedTime}
            </Text>
          ) : null}
        </View>
      </View>

      {/* 2. Middle Row: Server Avatar & Financial Balance */}
      <View style={styles.midRow}>
        {assignedStaff ? (
          <View style={styles.staffWrapper}>
            <View style={styles.staffAvatar}>
              <Text style={styles.staffAvatarText}>{assignedStaff.initials}</Text>
            </View>
            <Text style={styles.staffNameText}>{assignedStaff.name.split(' ')[0]}</Text>
          </View>
        ) : (
          <Text style={styles.unassignedText}>Unassigned</Text>
        )}

        <View style={styles.amountWrapper}>
          {formattedAmount ? (
            <Text style={styles.amountText}>{formattedAmount}</Text>
          ) : hasOpenCheck ? (
            <Text style={styles.openCheckText}>Open check</Text>
          ) : (
            <Text style={styles.noCheckText}>Available</Text>
          )}
        </View>
      </View>

      {/* 3. Bottom Row: Tactile Tab Position Circles */}
      <View style={styles.tabsRow}>
        <View style={styles.tabPillsContainer}>
          {slotNumbers.map((tabNum) => {
            const isActive = activeTabNumbers.includes(tabNum);
            return (
              <View
                key={tabNum}
                style={[
                  styles.tabButton,
                  isActive ? styles.tabButtonActive : styles.tabButtonInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    isActive ? styles.tabTextActive : styles.tabTextInactive,
                  ]}
                >
                  {tabNum}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
});

TableCard.displayName = 'TableCard';

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee8e3',
    padding: 16,
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
    minHeight: 156,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  codeCol: {
    justifyContent: 'center',
  },
  tableCodeText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 30,
  },
  seatsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: '#f7f3f0',
    marginBottom: 8,
  },
  staffWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  staffAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fceeed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fad4db',
  },
  staffAvatarText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#832238',
  },
  staffNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  unassignedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  amountWrapper: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  openCheckText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#832238',
  },
  noCheckText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  tabPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  tabButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#641b2a',
    shadowColor: '#641b2a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  tabButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabTextInactive: {
    color: '#9ca3af',
  },
});
