import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export interface KdsToolbarProps {
  stationSubtitle: string;
  activeTicketsCount: number;
  outOfStockCount: number;
  onOpenAvailability: () => void;
  onOpenOutOfStockList: () => void;
  onOpenStockAdjust: () => void;
}

export const KdsToolbar: React.FC<KdsToolbarProps> = ({
  stationSubtitle,
  activeTicketsCount,
  outOfStockCount,
  onOpenAvailability,
  onOpenOutOfStockList,
  onOpenStockAdjust,
}) => {
  return (
    <View style={styles.toolbarRow}>
      <View style={styles.toolbarTitleCol}>
        <Text style={styles.pageTitle}>Orders</Text>
        <Text style={styles.pageSubtitle}>
          {stationSubtitle} · {activeTicketsCount} active tickets
        </Text>
      </View>

      <View style={styles.toolbarActions}>
        <Pressable
          onPress={onOpenAvailability}
          style={({ pressed }) => [styles.btnAvailability, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnAvailabilityText}>Mark Out of Stock</Text>
        </Pressable>

        <Pressable
          onPress={onOpenOutOfStockList}
          style={({ pressed }) => [styles.btnOutOfStockCount, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnOutOfStockCountText}>Out of Stock ({outOfStockCount})</Text>
        </Pressable>

        <Pressable
          onPress={onOpenStockAdjust}
          style={({ pressed }) => [styles.btnAdjustStock, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnAdjustStockText}>Adjust Stock</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toolbarTitleCol: {
    gap: 2,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btnAvailability: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAvailabilityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  btnOutOfStockCount: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnOutOfStockCountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991b1b',
  },
  btnAdjustStock: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAdjustStockText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
