import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { OrderLineItem } from '../../../../../types/floor';
import { useLiveNow, getItemElapsedMetrics } from '@/features/shared/utils/elapsedTime';
import { useKeyedCooldown } from '@/features/shared/hooks/useAsyncAction';

interface RunnerTicketItemListProps {
  items: OrderLineItem[];
  onDeliverItem?: (item: OrderLineItem) => void;
}

export const RunnerTicketItemList: React.FC<RunnerTicketItemListProps> = ({
  items,
  onDeliverItem,
}) => {
  const hasActive = items.some((i) => i.status !== 'served' && i.status !== 'cancelled');
  const nowMs = useLiveNow(hasActive);
  const { lock } = useKeyedCooldown(500);

  return (
    <View style={styles.itemsList}>
      {items.map((item) => {
        const isReady = item.status === 'ready';
        const isServed = item.status === 'served';
        const isBar = item.stationTarget === 'bar';
        const metrics = getItemElapsedMetrics(item, nowMs);

        const timerBg = isServed
          ? '#f3f4f6'
          : metrics.urgency === 'late'
            ? '#fee2e2'
            : metrics.urgency === 'warning'
              ? '#fef3c7'
              : '#efeae3';
        const timerColor = isServed
          ? '#6b7280'
          : metrics.urgency === 'late'
            ? '#b91c1c'
            : metrics.urgency === 'warning'
              ? '#b45309'
              : '#374151';

        return (
          <View key={item.id} style={[styles.itemRow, isServed && { opacity: 0.65 }]}>
            <View style={styles.itemLeft}>
              <View
                style={[styles.stationBadge, { backgroundColor: isBar ? '#e0f2fe' : '#fef3c7' }]}
              >
                <Text style={[styles.stationBadgeText, { color: isBar ? '#0284c7' : '#d97706' }]}>
                  {isBar ? 'BAR' : 'KITCHEN'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.itemName,
                    isReady && styles.itemNameReady,
                    isServed && { color: '#6b7280' },
                  ]}
                >
                  {item.quantity}x {item.productName}
                </Text>
                {item.modifiers && item.modifiers.length > 0 ? (
                  <Text style={styles.itemModText}>+ {item.modifiers.join(', ')}</Text>
                ) : null}
                {item.notes ? <Text style={styles.itemNoteText}>"{item.notes}"</Text> : null}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  backgroundColor: timerBg,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: timerColor,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {metrics.displayTimer}
                </Text>
              </View>

              {isReady && onDeliverItem ? (
                <Pressable
                  onPress={() => {
                    if (!lock(`runner:item:${item.id}`)) return;
                    onDeliverItem(item);
                  }}
                  style={({ pressed }) => [
                    {
                      minHeight: 40,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      backgroundColor: '#810021',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Deliver ${item.productName}`}
                >
                  <Check size={14} color="#F7F5F2" strokeWidth={2.5} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#F7F5F2' }}>Deliver</Text>
                </Pressable>
              ) : (
                <View
                  style={[
                    styles.statusChip,
                    isReady && styles.statusChipReady,
                    isServed && { backgroundColor: '#f3f4f6' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      isReady && styles.statusChipTextReady,
                      isServed && { color: '#6b7280' },
                    ]}
                  >
                    {metrics.stageLabel}
                  </Text>
                </View>
              )}
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
  itemModText: {
    fontSize: 14,
    color: '#810021',
    fontWeight: '600',
    marginTop: 2,
  },
  itemNoteText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 1,
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
