import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  Users,
  Bell,
  ChefHat,
  ConciergeBell,
  Utensils,
  Clock,
} from 'lucide-react-native';
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

  // Status-specific badges & icons
  const getStatusBadge = () => {
    switch (status) {
      case 'ready':
        return {
          label: 'READY',
          bg: '#e8f9ee',
          color: '#15803d',
          Icon: Bell,
          iconBg: '#dcfce7',
          iconColor: '#15803d',
        };
      case 'preparing':
        return {
          label: 'PREPARING',
          bg: '#fef7e6',
          color: '#b45309',
          Icon: ChefHat,
          iconBg: '#fef3c7',
          iconColor: '#b45309',
        };
      case 'served':
        return {
          label: 'FOOD SERVED',
          bg: '#fff1f2',
          color: '#be123c',
          Icon: ConciergeBell,
          iconBg: '#ffe4e6',
          iconColor: '#be123c',
          hasDot: true,
        };
      case 'occupied':
        return {
          label: 'OCCUPIED',
          bg: 'transparent',
          color: '#1a1a1e',
          Icon: Users,
          iconBg: '#fceeed',
          iconColor: '#832238',
        };
      case 'empty':
      default:
        return {
          label: 'EMPTY',
          bg: 'transparent',
          color: '#6b7280',
          Icon: Utensils,
          iconBg: '#f5f0ec',
          iconColor: '#9ca3af',
        };
    }
  };

  const statusConfig = getStatusBadge();
  const CategoryIcon = statusConfig.Icon;

  // Format amount with commas if >= 1000
  const formattedAmount =
    totalAmount !== undefined
      ? totalAmount >= 1000
        ? `$ ${totalAmount.toLocaleString('en-US')}`
        : `$ ${totalAmount.toFixed(2)}`
      : null;

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
      {/* 1. Top Status Banner */}
      <View
        style={[
          styles.statusBar,
          statusConfig.bg !== 'transparent' && { backgroundColor: statusConfig.bg },
        ]}
      >
        <View style={styles.statusLeft}>
          {statusConfig.hasDot ? <View style={styles.servedDot} /> : null}
          <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>

        <View style={styles.timeWrapper}>
          <Clock size={11} color="#6b7280" />
          <Text style={styles.timeText}>{elapsedTime}</Text>
        </View>
      </View>

      {/* 2. Main Row: Category Icon + Table Code & Seats */}
      <View style={styles.mainInfoRow}>
        <View style={[styles.iconCircle, { backgroundColor: statusConfig.iconBg }]}>
          <CategoryIcon size={20} color={statusConfig.iconColor} strokeWidth={2} />
        </View>

        <View style={styles.tableTextCol}>
          <Text style={styles.tableCodeText}>{code}</Text>
          <Text style={styles.seatsText}>
            {guests > 0 ? `${guests} ${guests === 1 ? 'guest' : 'guests'} · ` : ''}
            {seats} seats
          </Text>
        </View>
      </View>

      {/* 3. Middle Check & Server Details */}
      <View style={styles.checkRow}>
        {assignedStaff ? (
          <View style={styles.staffAvatar}>
            <Text style={styles.staffAvatarText}>{assignedStaff.initials}</Text>
          </View>
        ) : (
          <View style={styles.staffAvatarPlaceholder} />
        )}

        <View style={styles.amountWrapper}>
          {formattedAmount ? (
            <Text style={styles.amountText}>{formattedAmount}</Text>
          ) : hasOpenCheck ? (
            <Text style={styles.openCheckText}>Open check</Text>
          ) : (
            <Text style={styles.noCheckText}>No open check</Text>
          )}
        </View>
      </View>

      {/* 4. Bottom Tabs Row */}
      <View style={styles.tabsRow}>
        {maxTabs > 1 ? (
          Array.from({ length: maxTabs }, (_, i) => i + 1).map((tabNum) => {
            const isActive = activeTabs.includes(tabNum);
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
          })
        ) : (
          <View
            style={[
              styles.tabButton,
              activeTabs.includes(1) ? styles.tabButtonActive : styles.tabButtonEmpty,
            ]}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTabs.includes(1) ? styles.tabTextActive : styles.tabTextMuted,
              ]}
            >
              1
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});

TableCard.displayName = 'TableCard';

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#eee8e3',
    padding: 16,
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    justifyContent: 'space-between',
    minHeight: 200,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  servedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  mainInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableTextCol: {
    justifyContent: 'center',
  },
  tableCodeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 28,
  },
  seatsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f7f3f0',
    marginBottom: 10,
  },
  staffAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fceeed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fad4db',
  },
  staffAvatarPlaceholder: {
    width: 24,
    height: 24,
  },
  staffAvatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#832238',
  },
  amountWrapper: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.3,
  },
  openCheckText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  noCheckText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  tabButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#641b2a',
    shadowColor: '#641b2a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonInactive: {
    backgroundColor: 'transparent',
  },
  tabButtonEmpty: {
    backgroundColor: 'transparent',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabTextInactive: {
    color: '#9ca3af',
  },
  tabTextMuted: {
    color: '#9ca3af',
  },
});
