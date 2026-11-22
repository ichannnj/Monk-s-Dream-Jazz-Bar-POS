import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import { X, Users, Utensils, Check, Plus } from 'lucide-react-native';
import { TableItem } from '../../../types/floor';
import { toast } from '../../shared/toast/useToastStore';
import { useVirtualKeyboard } from '../../shared';
import { useEventStore } from '@/features/events';
import { sortTablesInOrder } from '@/features/floor/domain/tableTabHelpers';

interface OpenTableTabModalProps {
  visible: boolean;
  tables: TableItem[];
  preselectedTable?: TableItem | null;
  onClose: () => void;
  onConfirmOpenTab: (
    tableId: string,
    guestName: string,
    guestCount: number,
    includeDoorCharge?: boolean,
    doorChargePax?: number,
    doorChargePrice?: number
  ) => void;
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
  const { isKeyboardOpen, keyboardHeight, viewportHeight, dismissKeyboard } = useVirtualKeyboard();
  const todayEvent = useEventStore((s) => s.getTodayActiveEvent());
  const [includeDoorCharge, setIncludeDoorCharge] = useState(false);
  const [doorChargePax, setDoorChargePax] = useState<number>(2);
  const [doorChargePrice, setDoorChargePrice] = useState<string>('300');

  const handleBackdropPress = () => {
    if (isKeyboardOpen) {
      dismissKeyboard();
    }
    onClose();
  };

  // Clean initialization whenever modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedTableId('');
      setGuestName('');
      setGuestCount(2);
      setDoorChargePax(2);
      setDoorChargePrice(
        String(todayEvent?.has_door_charge ? (todayEvent.door_charge_amount ?? 0) : 0)
      );
      setIncludeDoorCharge(
        Boolean(todayEvent?.has_door_charge && (todayEvent?.door_charge_amount || 0) > 0)
      );
    }
  }, [visible, todayEvent]);

  // Keep doorChargePax in sync with guestCount by default unless customized
  React.useEffect(() => {
    setDoorChargePax(guestCount);
  }, [guestCount]);

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
      const numericPrice = parseFloat(doorChargePrice) || 0;
      onConfirmOpenTab(
        selectedTableId,
        finalName,
        guestCount,
        includeDoorCharge,
        doorChargePax,
        numericPrice
      );
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
      <View
        style={[
          styles.backdrop,
          isKeyboardOpen && {
            justifyContent: 'flex-start',
            paddingTop: 16,
            paddingBottom: Math.min(keyboardHeight, 320) + 16,
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleBackdropPress}
          accessibilityLabel="Close modal"
        />
        <View
          style={[
            styles.modalCard,
            isKeyboardOpen && {
              maxHeight: Math.max(260, viewportHeight - 24),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {currentTable
                ? isSplitTab
                  ? `Split Tab · ${currentTable.code}`
                  : `Open Tab · ${currentTable.code}`
                : 'Open Table Tab'}
            </Text>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close open table tab"
            >
              <X size={20} color="#1A1617" />
            </Pressable>
          </View>

          {/* Table Selector */}
          <Text style={styles.sectionLabel}>Table:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tableScroll}
            contentContainerStyle={styles.tableScrollContent}
          >
            {sortTablesInOrder(tables).map((t) => {
              const isSelected = selectedTableId === t.id;
              const openTabs = (t.tabs || []).filter((tab) => tab.status !== 'closed');
              const activeCount = openTabs.length > 0 ? openTabs.length : t.activeTabs.length;
              const isEmpty = t.status === 'empty' || activeCount === 0;
              const tabPreview =
                openTabs.length === 1
                  ? openTabs[0].guestName
                  : openTabs.length > 1
                    ? `${openTabs[0].guestName} +${openTabs.length - 1}`
                    : `${activeCount} ${activeCount === 1 ? 'tab' : 'tabs'}`;

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
                  <Text style={styles.tableChipSub} numberOfLines={1}>
                    {isEmpty ? 'Available' : tabPreview}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 10 }}
          >
            {/* Guest Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.sectionLabel}>Guest Name:</Text>
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <TextInput
                  style={[styles.textInput, guestName.length > 0 && { paddingRight: 40 }]}
                  placeholder="Guest Name (Optional)"
                  placeholderTextColor="#a8a29e"
                  value={guestName}
                  onChangeText={setGuestName}
                  autoFocus
                />
                {guestName.length > 0 && (
                  <Pressable
                    onPress={() => setGuestName('')}
                    hitSlop={8}
                    style={{
                      position: 'absolute',
                      right: 12,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#E2DED6',
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear name"
                  >
                    <X size={14} color="#44403c" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Guest Count Stepper */}
            <View style={styles.stepperSection}>
              <Text style={styles.sectionLabel}>Guests:</Text>
              <View style={styles.stepperRow}>
                {[1, 2, 3, 4, 5, 6, 8].map((num) => (
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

            {/* Door Charge Quick Toggle & Editor */}
            {todayEvent?.has_door_charge && (todayEvent?.door_charge_amount || 0) > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Pressable
                  onPress={() => setIncludeDoorCharge(!includeDoorCharge)}
                  style={({ pressed }) => [
                    styles.doorChargeRow,
                    includeDoorCharge && styles.doorChargeRowActive,
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: includeDoorCharge }}
                >
                  <View
                    style={[
                      styles.doorChargeCheck,
                      includeDoorCharge && styles.doorChargeCheckActive,
                    ]}
                  >
                    {includeDoorCharge && <Check size={14} color="#F7F5F2" strokeWidth={3} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.doorChargeTitle}>
                      Door Cover: ₱{(parseFloat(doorChargePrice) || 0).toLocaleString()} ×{' '}
                      {doorChargePax} = ₱
                      {((parseFloat(doorChargePrice) || 0) * doorChargePax).toLocaleString()}
                    </Text>
                  </View>
                </Pressable>

                {/* Inline Adjustment when Checked */}
                {includeDoorCharge && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: '#EFECE6',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E2DED6',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1617' }}>
                        Pax:
                      </Text>
                      <Pressable
                        onPress={() => setDoorChargePax((p) => Math.max(1, p - 1))}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: '#F7F5F2',
                          borderWidth: 1,
                          borderColor: '#d6d3d1',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1A1617' }}>
                          -
                        </Text>
                      </Pressable>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '800',
                          color: '#810021',
                          minWidth: 20,
                          textAlign: 'center',
                        }}
                      >
                        {doorChargePax}
                      </Text>
                      <Pressable
                        onPress={() => setDoorChargePax((p) => p + 1)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: '#F7F5F2',
                          borderWidth: 1,
                          borderColor: '#d6d3d1',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1A1617' }}>
                          +
                        </Text>
                      </Pressable>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1617' }}>
                        ₱ / head:
                      </Text>
                      <TextInput
                        style={{
                          width: 72,
                          height: 32,
                          backgroundColor: '#F7F5F2',
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#d6d3d1',
                          textAlign: 'center',
                          fontSize: 14,
                          fontWeight: '700',
                          color: '#1A1617',
                          padding: 0,
                        }}
                        value={doorChargePrice}
                        onChangeText={setDoorChargePrice}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

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
              <Plus size={18} color="#F7F5F2" strokeWidth={2.4} />
              <Text style={styles.confirmBtnText}>{isSplitTab ? 'Split Tab' : 'Open Tab'}</Text>
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
    backgroundColor: '#F7F5F2',
    borderRadius: 24,
    width: '100%',
    maxWidth: 560,
    maxHeight: '96%',
    padding: 18,
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
    backgroundColor: '#EFECE6',
    borderWidth: 1,
    borderColor: '#E2DED6',
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
    borderColor: '#810021',
    backgroundColor: '#810021',
  },
  tableChipText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f2937',
  },
  tableChipTextSelected: {
    color: '#F7F5F2',
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
    backgroundColor: '#EFECE6',
    borderWidth: 1.5,
    borderColor: '#E2DED6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestCountBtnActive: {
    backgroundColor: '#810021',
    borderColor: '#810021',
  },
  guestCountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4b5563',
    fontVariant: ['tabular-nums'],
  },
  guestCountTextActive: {
    color: '#F7F5F2',
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
    backgroundColor: '#EFECE6',
    borderWidth: 1.5,
    borderColor: '#E2DED6',
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
    backgroundColor: '#810021',
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
    color: '#F7F5F2',
  },
  doorChargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EFECE6',
    borderWidth: 1.5,
    borderColor: '#E2DED6',
    marginBottom: 16,
    gap: 12,
  },
  doorChargeRowActive: {
    backgroundColor: '#F5EBEF',
    borderColor: '#810021',
  },
  doorChargeCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F5F2',
  },
  doorChargeCheckActive: {
    backgroundColor: '#810021',
    borderColor: '#810021',
  },
  doorChargeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
  },
  doorChargeSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
});
