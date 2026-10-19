import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { X, Plus, Minus, AlertCircle } from 'lucide-react-native';
import { StockInventoryItem } from '../types';

interface AdjustStockModalProps {
  visible: boolean;
  onClose: () => void;
  inventory: StockInventoryItem[];
  onUpdateCount: (id: string, delta: number) => void;
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  visible,
  onClose,
  inventory,
  onUpdateCount,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close adjust stock modal"
        />
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>Adjust Bar Stock</Text>
              <Text style={styles.modalSubtitle}>
                Live inventory on-hand & automatic depletion threshold safeguards
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Items */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {inventory.map((item) => {
              const isLow = item.inStockCount <= item.lowStockThreshold;
              const isZero = item.inStockCount <= 0;

              return (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.infoCol}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.unitText}>{item.unit}</Text>
                      {isZero ? (
                        <View style={styles.depletedBadge}>
                          <Text style={styles.depletedBadgeText}>DEPLETED (OUT OF STOCK)</Text>
                        </View>
                      ) : isLow ? (
                        <View style={styles.lowBadge}>
                          <Text style={styles.lowBadgeText}>LOW STOCK</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Stepper */}
                  <View style={styles.stepperContainer}>
                    <Pressable
                      onPress={() => onUpdateCount(item.id, -1)}
                      style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                    >
                      <Minus size={16} color="#374151" />
                    </Pressable>

                    <Text style={styles.countText}>{item.inStockCount}</Text>

                    <Pressable
                      onPress={() => onUpdateCount(item.id, 1)}
                      style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                    >
                      <Plus size={16} color="#374151" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footerRow}>
            <View style={styles.tipBox}>
              <AlertCircle size={14} color="#6b7280" />
              <Text style={styles.tipText}>
                When stock reaches 0, the POS automatically marks the product as Out of Stock.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Save & Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  list: {
    maxHeight: 340,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoCol: {
    flex: 1,
    marginRight: 16,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  unitText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  depletedBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  depletedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#991b1b',
  },
  lowBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lowBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stepBtnPressed: {
    backgroundColor: '#f3f4f6',
  },
  countText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    minWidth: 40,
    textAlign: 'center',
  },
  footerRow: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  doneBtn: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
