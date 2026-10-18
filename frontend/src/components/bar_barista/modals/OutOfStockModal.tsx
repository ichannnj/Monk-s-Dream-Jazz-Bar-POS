import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Modal } from 'react-native';
import { X, Search, AlertTriangle, Check } from 'lucide-react-native';

export interface BarProductStock {
  id: string;
  name: string;
  category: string;
  is86: boolean;
  stockCount?: number;
}

export interface OutOfStockModalProps {
  visible: boolean;
  onClose: () => void;
  products: BarProductStock[];
  onToggleAvailability: (productId: string, isUnavailable: boolean, reason?: string) => void;
}

export const OutOfStockModal: React.FC<OutOfStockModalProps> = ({
  visible,
  onClose,
  products,
  onToggleAvailability,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReason, setSelectedReason] = useState('Depleted / Zero Stock');

  const reasons = [
    'Depleted / Zero Stock',
    'Keg Empty / Tap Closed',
    'Missing Garnish / Mixers',
    'Quality Hold / Batch Issue',
  ];

  const filtered = products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>Item Availability</Text>
              <Text style={styles.modalSubtitle}>
                Declare items out of stock across all floor tablets & stations
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <Search size={18} color="#9ca3af" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search beverage or bar item..."
              placeholderTextColor="#9ca3af"
              style={styles.searchInput}
            />
          </View>

          {/* Reason Pills */}
          <View style={styles.reasonSection}>
            <Text style={styles.reasonLabel}>REASON FOR UNAVAILABILITY</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.reasonScroll}
            >
              {reasons.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setSelectedReason(r)}
                  style={[styles.reasonPill, selectedReason === r && styles.reasonPillActive]}
                >
                  <Text
                    style={[styles.reasonText, selectedReason === r && styles.reasonTextActive]}
                  >
                    {r}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Product List */}
          <ScrollView style={styles.productList} showsVerticalScrollIndicator={false}>
            {filtered.map((item) => (
              <View key={item.id} style={styles.productRow}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productMeta}>
                    {item.category.toUpperCase()} · In Stock: {item.stockCount ?? 12}
                  </Text>
                </View>

                {item.is86 ? (
                  <Pressable
                    onPress={() => onToggleAvailability(item.id, false)}
                    style={({ pressed }) => [styles.restockButton, pressed && styles.buttonPressed]}
                  >
                    <Check size={14} color="#15803d" />
                    <Text style={styles.restockText}>Mark In Stock</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => onToggleAvailability(item.id, true, selectedReason)}
                    style={({ pressed }) => [styles.outOfStockBtn, pressed && styles.buttonPressed]}
                  >
                    <AlertTriangle size={14} color="#991b1b" />
                    <Text style={styles.outOfStockBtnText}>Mark Out of Stock</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Backward-compatible alias
export const EightySixModal = OutOfStockModal;

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
    maxWidth: 580,
    maxHeight: '85%',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  reasonSection: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  reasonScroll: {
    flexDirection: 'row',
  },
  reasonPill: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
  },
  reasonPillActive: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  reasonTextActive: {
    color: '#991b1b',
    fontWeight: '800',
  },
  productList: {
    maxHeight: 320,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  productMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  outOfStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
  },
  outOfStockBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991b1b',
  },
  restockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
  },
  restockText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803d',
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
