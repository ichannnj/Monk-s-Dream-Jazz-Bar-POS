import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { X, CheckCircle2, RotateCcw } from 'lucide-react-native';
import { BarProductStock } from './OutOfStockModal';

export interface OutOfStockListModalProps {
  visible: boolean;
  onClose: () => void;
  outOfStockItems: BarProductStock[];
  onRestock: (productId: string) => void;
  onOpenAvailabilityManager: () => void;
}

export const OutOfStockListModal: React.FC<OutOfStockListModalProps> = ({
  visible,
  onClose,
  outOfStockItems,
  onRestock,
  onOpenAvailabilityManager,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>Out of Stock Items ({outOfStockItems.length})</Text>
              <Text style={styles.modalSubtitle}>
                Items currently blocked from FOH waiter ordering and tickets
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {outOfStockItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <CheckCircle2 size={36} color="#16a34a" />
                <Text style={styles.emptyTitle}>All Bar Items In Stock</Text>
                <Text style={styles.emptySubtitle}>No items are currently marked unavailable.</Text>
              </View>
            ) : (
              outOfStockItems.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.tagRow}>
                      <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockBadgeText}>OUT OF STOCK</Text>
                      </View>
                      <Text style={styles.itemCat}>{item.category.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => onRestock(item.id)}
                    style={({ pressed }) => [styles.restockButton, pressed && styles.buttonPressed]}
                  >
                    <RotateCcw size={14} color="#15803d" />
                    <Text style={styles.restockText}>Mark In Stock</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footerRow}>
            <Pressable
              onPress={() => {
                onClose();
                onOpenAvailabilityManager();
              }}
              style={({ pressed }) => [styles.addOutOfStockButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.addOutOfStockText}>+ Mark Another Item Out of Stock</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Backward-compatible alias
export const EightySixListModal = OutOfStockListModal;

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
    maxWidth: 520,
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
    maxHeight: 300,
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  outOfStockBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outOfStockBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#991b1b',
  },
  itemCat: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  restockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  restockText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803d',
  },
  footerRow: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  addOutOfStockButton: {
    backgroundColor: '#fdf2f4',
    borderWidth: 1.5,
    borderColor: '#fbcfe8',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  addOutOfStockText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#701a31',
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
