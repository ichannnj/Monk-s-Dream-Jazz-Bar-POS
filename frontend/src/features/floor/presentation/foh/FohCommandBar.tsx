import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Layers, BellRing, Utensils, ShoppingBag, Clock } from 'lucide-react-native';

export type FohQueueFilter = 'all' | 'ready' | 'dine_in' | 'off_premise';

interface FohCommandBarProps {
  currentFilter: FohQueueFilter;
  onFilterChange: (filter: FohQueueFilter) => void;
  counts: {
    all: number;
    ready: number;
    dineIn: number;
    offPremise: number;
  };
  isMobile?: boolean;
}

export const FohCommandBar: React.FC<FohCommandBarProps> = ({
  currentFilter,
  onFilterChange,
  counts,
  isMobile = false,
}) => {
  const filterPills: {
    id: FohQueueFilter;
    label: string;
    count: number;
    Icon: any;
    isUrgent?: boolean;
  }[] = [
    {
      id: 'all',
      label: 'All Active',
      count: counts.all,
      Icon: Layers,
    },
    {
      id: 'ready',
      label: 'Buzzout Ready',
      count: counts.ready,
      Icon: BellRing,
      isUrgent: true,
    },
    {
      id: 'dine_in',
      label: 'Dine-In Tables',
      count: counts.dineIn,
      Icon: Utensils,
    },
    {
      id: 'off_premise',
      label: 'Takeout / Online',
      count: counts.offPremise,
      Icon: ShoppingBag,
    },
  ];

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {/* Title & Status Summary */}
      <View style={styles.titleSection}>
        <View style={styles.badgeRow}>
          <Text style={styles.titleText}>FOH Expediter Pass</Text>
          {counts.ready > 0 ? (
            <View style={styles.urgentBadge}>
              <BellRing size={14} color="#ffffff" />
              <Text style={styles.urgentBadgeText}>
                {counts.ready} {counts.ready === 1 ? 'ORDER READY' : 'ORDERS READY'}
              </Text>
            </View>
          ) : (
            <View style={styles.idleBadge}>
              <Clock size={14} color="#6b7280" />
              <Text style={styles.idleBadgeText}>Pass Synced</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitleText}>
          Assemble prepared drinks & food rounds, run dishes to guest tables, and dispatch
          off-premise orders.
        </Text>
      </View>

      {/* Filter Segment Pills */}
      <View style={styles.filterRow}>
        {filterPills.map((pill) => {
          const isActive = currentFilter === pill.id;
          const { Icon } = pill;
          return (
            <Pressable
              key={pill.id}
              onPress={() => onFilterChange(pill.id)}
              style={({ pressed }) => [
                styles.filterPill,
                isActive && styles.filterPillActive,
                pill.isUrgent && pill.count > 0 && !isActive && styles.filterPillUrgent,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Icon
                size={16}
                color={
                  isActive ? '#ffffff' : pill.isUrgent && pill.count > 0 ? '#15803d' : '#64748b'
                }
              />
              <Text
                style={[
                  styles.filterPillLabel,
                  isActive && styles.filterPillLabelActive,
                  pill.isUrgent && pill.count > 0 && !isActive && styles.filterPillLabelUrgent,
                ]}
              >
                {pill.label}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  isActive && styles.countBadgeActive,
                  pill.isUrgent && pill.count > 0 && !isActive && styles.countBadgeUrgent,
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    isActive && styles.countBadgeTextActive,
                    pill.isUrgent && pill.count > 0 && !isActive && styles.countBadgeTextUrgent,
                  ]}
                >
                  {pill.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  containerMobile: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  titleSection: {
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748b',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  urgentBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  idleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  idleBadgeText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  filterPill: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#800020',
    borderColor: '#800020',
  },
  filterPillUrgent: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  filterPillLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillLabelActive: {
    color: '#ffffff',
  },
  filterPillLabelUrgent: {
    color: '#15803d',
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countBadgeUrgent: {
    backgroundColor: '#bbf7d0',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  countBadgeTextActive: {
    color: '#ffffff',
  },
  countBadgeTextUrgent: {
    color: '#14532d',
  },
});
