import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OrderLineItem } from '../../../../../types/floor';

interface RunnerTicketItemListProps {
  items: OrderLineItem[];
}

export const RunnerTicketItemList: React.FC<RunnerTicketItemListProps> = ({ items }) => {
  return (
    <View style={styles.itemsList}>
      {items.map((item) => {
        const isReady = item.status === 'ready' || item.status === 'served';
        const isBar = item.stationTarget === 'bar';

        return (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <View
                style={[styles.stationBadge, { backgroundColor: isBar ? '#e0f2fe' : '#fef3c7' }]}
              >
                <Text style={[styles.stationBadgeText, { color: isBar ? '#0284c7' : '#d97706' }]}>
                  {isBar ? 'BAR' : 'KITCHEN'}
                </Text>
              </View>
              <Text style={[styles.itemName, isReady && styles.itemNameReady]}>
                {item.quantity}x {item.productName}
              </Text>
            </View>

            <View style={[styles.statusChip, isReady && styles.statusChipReady]}>
              <Text style={[styles.statusChipText, isReady && styles.statusChipTextReady]}>
                {isReady ? 'DONE' : 'PREP'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  itemsList: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stationBadgeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  itemNameReady: {
    color: '#15803d',
    fontWeight: '700',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  statusChipReady: {
    backgroundColor: '#dcfce7',
  },
  statusChipText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b7280',
  },
  statusChipTextReady: {
    color: '#16a34a',
  },
});
