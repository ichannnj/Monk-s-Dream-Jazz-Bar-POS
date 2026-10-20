import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet } from 'react-native';
import { X, Plus, Utensils } from 'lucide-react-native';
import { TableItem } from '../../types/floor';
import { toast } from '../../store/useToastStore';

interface OpenTableDirectModalProps {
  visible: boolean;
  table: TableItem | null;
  onClose: () => void;
  onConfirmOpenTab: (tableId: string, guestName: string, guestCount: number) => void;
  isSplitTab?: boolean;
}

export const OpenTableDirectModal: React.FC<OpenTableDirectModalProps> = ({
  visible,
  table,
  onClose,
  onConfirmOpenTab,
  isSplitTab = false,
}) => {
  const [guestName, setGuestName] = useState('');
  const [guestCount, setGuestCount] = useState(2);

  React.useEffect(() => {
    if (visible) {
      setGuestName('');
      setGuestCount(2);
    }
  }, [visible]);

  if (!table) return null;

  const isTableEmpty = table.status === 'empty';
  const activeTabsCount = isTableEmpty
    ? 0
    : table.tabs && table.tabs.length > 0
      ? table.tabs.filter((tab) => tab.status !== 'closed').length
      : table.activeTabs?.length || 0;

  const effectiveIsSplit = !isTableEmpty && (isSplitTab || activeTabsCount > 0);

  const handleConfirm = () => {
    try {
      const finalName = guestName.trim() || `Guest ${activeTabsCount + 1}`;
      onConfirmOpenTab(table.id, finalName, guestCount);
      setGuestName('');
      setGuestCount(2);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to open table tab.', {
        title: 'Table Error',
      });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close modal"
        />
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {effectiveIsSplit
                  ? `Open Split Tab · Table ${table.code}`
                  : `Open Tab · Table ${table.code}`}
              </Text>
              <Text style={styles.subtitle}>
                {effectiveIsSplit
                  ? `Add another party tab to Table ${table.code}`
                  : `Start a new named guest tab at Table ${table.code}`}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close open table modal"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Guest Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.sectionLabel}>Customer / Guest Tab Name:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Miles, Coltrane, Sarah..."
              placeholderTextColor="#9ca3af"
              value={guestName}
              onChangeText={setGuestName}
              autoFocus
            />
          </View>

          {/* Guest Count Stepper */}
          <View style={styles.stepperSection}>
            <Text style={styles.sectionLabel}>Guests Seated:</Text>
            <View style={styles.stepperRow}>
              {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => setGuestCount(num)}
                  style={[styles.guestCountBtn, guestCount === num && styles.guestCountBtnActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${num} guests`}
                >
                  <Text
                    style={[
                      styles.guestCountText,
                      guestCount === num && styles.guestCountTextActive,
                    ]}
                  >
                    {num}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              style={styles.confirmBtn}
              accessibilityRole="button"
              accessibilityLabel={
                effectiveIsSplit ? 'Open Split Tab & Order' : 'Open Tab & Start Order'
              }
            >
              <Plus size={18} color="#ffffff" strokeWidth={2.4} />
              <Text style={styles.confirmBtnText}>
                {effectiveIsSplit ? 'Open Split Tab & Order' : 'Open Tab & Start Order'}
              </Text>
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
    backgroundColor: 'rgba(26, 26, 30, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 540,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  stepperSection: {
    marginBottom: 24,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
  },
  guestCountBtn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestCountBtnActive: {
    backgroundColor: '#641b2a',
  },
  guestCountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4b5563',
    fontVariant: ['tabular-nums'],
  },
  guestCountTextActive: {
    color: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4b5563',
  },
  confirmBtn: {
    flex: 2,
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#641b2a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
