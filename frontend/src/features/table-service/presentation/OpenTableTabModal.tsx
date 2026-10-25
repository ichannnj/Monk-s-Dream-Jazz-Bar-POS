import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import { X, Users, Utensils, Check, Plus } from 'lucide-react-native';
import { TableItem } from '../../../types/floor';
import { toast } from '../../shared/toast/useToastStore';

interface OpenTableTabModalProps {
  visible: boolean;
  tables: TableItem[];
  preselectedTable?: TableItem | null;
  onClose: () => void;
  onConfirmOpenTab: (tableId: string, guestName: string, guestCount: number) => void;
}

export const OpenTableTabModal: React.FC<OpenTableTabModalProps> = ({
  visible,
  tables,
  preselectedTable,
  onClose,
  onConfirmOpenTab,
}) => {
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [guestCount, setGuestCount] = useState(2);

  // Clean initialization whenever modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedTableId('');
      setGuestName('');
      setGuestCount(2);
    }
  }, [visible]);

  const currentTable = tables.find((t) => t.id === selectedTableId);
  const isCurrentEmpty = !currentTable || currentTable.status === 'empty';
  const activeTabsCount = isCurrentEmpty
    ? 0
    : currentTable?.tabs && currentTable.tabs.length > 0
      ? currentTable.tabs.filter((tab) => tab.status !== 'closed').length
      : currentTable?.activeTabs.length || 0;
  const isSplitTab = !isCurrentEmpty && activeTabsCount > 0;

  const handleConfirm = () => {
    if (!selectedTableId) {
      toast.warning('Please select an available table before opening a tab.', {
        title: 'Table Required',
      });
      return;
    }

    try {
      const finalName = guestName.trim() || `Guest ${activeTabsCount + 1}`;
      onConfirmOpenTab(selectedTableId, finalName, guestCount);
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
                {currentTable ? `Open Table Tab · ${currentTable.code}` : 'Open Table Tab'}
              </Text>
              <Text style={styles.subtitle}>
                {currentTable
                  ? isSplitTab
                    ? `Add another party tab to Table ${currentTable.code}`
                    : `Start a new named guest tab at Table ${currentTable.code}`
                  : 'Choose an available table and start a guest tab for dine-in seating'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close open table tab"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Table Selector */}
          <Text style={styles.sectionLabel}>Select Table:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tableScroll}
            contentContainerStyle={styles.tableScrollContent}
          >
            {tables.map((t) => {
              const isSelected = selectedTableId === t.id;
              const activeCount =
                t.tabs && t.tabs.length > 0
                  ? t.tabs.filter((tab) => tab.status !== 'closed').length
                  : t.activeTabs.length;
              const isEmpty = t.status === 'empty' || activeCount === 0;

              return (
                <Pressable
                  key={t.id}
                  onPress={() => setSelectedTableId(t.id)}
                  style={[
                    styles.tableChip,
                    isSelected && styles.tableChipSelected,
                    isEmpty ? styles.tableChipEmpty : styles.tableChipOccupied,
                  ]}
                >
                  <Text style={[styles.tableChipText, isSelected && styles.tableChipTextSelected]}>
                    {t.code}
                  </Text>
                  <Text style={styles.tableChipSub}>
                    {isEmpty ? 'Available' : `${activeCount} ${activeCount === 1 ? 'tab' : 'tabs'}`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

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
              style={[styles.confirmBtn, !selectedTableId && styles.confirmBtnDisabled]}
              disabled={!selectedTableId}
            >
              <Plus size={18} color="#ffffff" strokeWidth={2.4} />
              <Text style={styles.confirmBtnText}>
                {isSplitTab ? 'Open Split Tab & Order' : 'Open Tab & Start Order'}
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
    maxWidth: 560,
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
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 3,
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
  tableScroll: {
    maxHeight: 84,
    marginBottom: 16,
  },
  tableScrollContent: {
    gap: 10,
    paddingRight: 10,
  },
  tableChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 84,
    minHeight: 52,
    borderWidth: 1.5,
  },
  tableChipEmpty: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  tableChipOccupied: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  tableChipSelected: {
    borderColor: '#641b2a',
    backgroundColor: '#641b2a',
  },
  tableChipText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f2937',
  },
  tableChipTextSelected: {
    color: '#ffffff',
  },
  tableChipSub: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 18,
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
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
