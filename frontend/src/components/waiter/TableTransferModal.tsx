import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import {
  Repeat,
  X,
  Check,
  ArrowRight,
  Coffee,
  Wine,
  User,
  Sparkles,
} from 'lucide-react-native';
import { TableItem, CustomerTab, TableArea } from '../../mockData';

interface TableTransferModalProps {
  visible: boolean;
  originTable: TableItem | null;
  allTables: TableItem[];
  onClose: () => void;
  onConfirmTransfer: (
    originId: string,
    targetId: string,
    mode: 'entire' | 'tab',
    tabIndex?: number,
    reason?: string
  ) => void;
}

export const TableTransferModal: React.FC<TableTransferModalProps> = ({
  visible,
  originTable,
  allTables,
  onClose,
  onConfirmTransfer,
}) => {
  if (!originTable) return null;

  const [mode, setMode] = useState<'entire' | 'tab'>('entire');
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(
    originTable.tabs?.[0]?.tabIndex ?? originTable.activeTabs[0] ?? 1
  );
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [targetAreaFilter, setTargetAreaFilter] = useState<TableArea | 'all'>('all');
  const [selectedReason, setSelectedReason] = useState<string>('Guest relocation request');

  // Sync tab index when originTable opens
  React.useEffect(() => {
    if (originTable?.tabs && originTable.tabs.length > 0) {
      setSelectedTabIndex(originTable.tabs[0].tabIndex);
    }
    setSelectedTargetId(null);
  }, [originTable]);

  // Destination tables (exclude origin)
  const availableTargets = useMemo(() => {
    return allTables.filter((t) => {
      if (t.id === originTable.id) return false;
      if (targetAreaFilter !== 'all' && t.area !== targetAreaFilter) return false;
      return true;
    });
  }, [allTables, originTable, targetAreaFilter]);

  const presetReasons = [
    'Moved to bar rail',
    'Stage-side jazz seating',
    'Party joined friends',
    'Guest relocation request',
  ];

  const handleConfirm = () => {
    if (!selectedTargetId) return;

    onConfirmTransfer(
      originTable.id,
      selectedTargetId,
      mode,
      mode === 'tab' ? selectedTabIndex : undefined,
      selectedReason
    );
    onClose();
  };

  const selectedTargetTable = allTables.find((t) => t.id === selectedTargetId);
  const originTabs = originTable.tabs || [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Repeat size={20} color="#641b2a" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Transfer Table / Tab</Text>
                <Text style={styles.headerSubtitle}>
                  Origin: Table {originTable.code} ({originTable.area === 'bar' ? 'Bar Area' : 'Cafe Area'})
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close table transfer"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* 1. Mode Selector */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>1. Transfer Scope:</Text>
              <View style={styles.modeRow}>
                <Pressable
                  onPress={() => setMode('entire')}
                  style={[styles.modeBtn, mode === 'entire' && styles.modeBtnActive]}
                >
                  <Text
                    style={[
                      styles.modeBtnText,
                      mode === 'entire' && styles.modeBtnTextActive,
                    ]}
                  >
                    Move Entire Table ({originTabs.length > 0 ? originTabs.length : originTable.activeTabs.length} tabs)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setMode('tab')}
                  style={[styles.modeBtn, mode === 'tab' && styles.modeBtnActive]}
                >
                  <Text
                    style={[
                      styles.modeBtnText,
                      mode === 'tab' && styles.modeBtnTextActive,
                    ]}
                  >
                    Move Specific Customer Tab
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 2. Tab Picker (When mode === 'tab') */}
            {mode === 'tab' ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>2. Select Specific Tab to Relocate:</Text>
                {originTabs.length === 0 ? (
                  <View style={styles.emptyTabsNote}>
                    <Text style={styles.emptyTabsText}>
                      Default Tab #1 (${(originTable.totalAmount || 0).toFixed(2)})
                    </Text>
                  </View>
                ) : (
                  <View style={styles.tabListGroup}>
                    {originTabs.map((tab) => {
                      const isSelected = selectedTabIndex === tab.tabIndex;

                      return (
                        <Pressable
                          key={tab.id}
                          onPress={() => setSelectedTabIndex(tab.tabIndex)}
                          style={[
                            styles.tabPickerCard,
                            isSelected && styles.tabPickerCardSelected,
                          ]}
                        >
                          <View style={styles.tabPickerLeft}>
                            <View
                              style={[
                                styles.radioCircle,
                                isSelected && styles.radioCircleSelected,
                              ]}
                            >
                              {isSelected ? <View style={styles.radioDot} /> : null}
                            </View>

                            <View>
                              <Text style={styles.tabGuestName}>
                                Guest: "{tab.guestName}" (Tab #{tab.tabIndex})
                              </Text>
                              <Text style={styles.tabItemsPreview}>
                                {tab.items.length} items: {tab.items.map((i) => i.productName).slice(0, 2).join(', ')}
                                {tab.items.length > 2 ? '...' : ''}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.tabAmount}>
                            ${tab.totalAmount.toFixed(2)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}

            {/* 3. Relocation Reason */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>
                {mode === 'tab' ? '3.' : '2.'} Relocation Reason:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reasonsScroll}
              >
                {presetReasons.map((reason, idx) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => setSelectedReason(reason)}
                      style={[
                        styles.reasonChip,
                        isSelected && styles.reasonChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          isSelected && styles.reasonChipTextSelected,
                        ]}
                      >
                        {reason}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 4. Destination Table Picker */}
            <View style={styles.sectionBlock}>
              <View style={styles.destinationHeaderRow}>
                <Text style={styles.sectionLabel}>
                  {mode === 'tab' ? '4.' : '3.'} Select Destination Table:
                </Text>

                {/* Area filter tabs */}
                <View style={styles.areaFilterRow}>
                  <Pressable
                    onPress={() => setTargetAreaFilter('all')}
                    style={[
                      styles.areaPill,
                      targetAreaFilter === 'all' && styles.areaPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.areaPillText,
                        targetAreaFilter === 'all' && styles.areaPillTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setTargetAreaFilter('cafe')}
                    style={[
                      styles.areaPill,
                      targetAreaFilter === 'cafe' && styles.areaPillActive,
                    ]}
                  >
                    <Coffee size={11} color={targetAreaFilter === 'cafe' ? '#ffffff' : '#6b7280'} />
                    <Text
                      style={[
                        styles.areaPillText,
                        targetAreaFilter === 'cafe' && styles.areaPillTextActive,
                      ]}
                    >
                      Cafe
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setTargetAreaFilter('bar')}
                    style={[
                      styles.areaPill,
                      targetAreaFilter === 'bar' && styles.areaPillActive,
                    ]}
                  >
                    <Wine size={11} color={targetAreaFilter === 'bar' ? '#ffffff' : '#6b7280'} />
                    <Text
                      style={[
                        styles.areaPillText,
                        targetAreaFilter === 'bar' && styles.areaPillTextActive,
                      ]}
                    >
                      Bar
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.tableGrid}>
                {availableTargets.map((target) => {
                  const isSelected = selectedTargetId === target.id;
                  const targetActiveCount =
                    target.tabs && target.tabs.length > 0
                      ? target.tabs.filter((t) => t.status !== 'closed').length
                      : target.activeTabs.length;
                  const isTargetEmpty = target.status === 'empty' || targetActiveCount === 0;

                  return (
                    <Pressable
                      key={target.id}
                      onPress={() => setSelectedTargetId(target.id)}
                      style={[
                        styles.targetCard,
                        isSelected && styles.targetCardSelected,
                        isTargetEmpty
                          ? styles.targetCardEmpty
                          : styles.targetCardOccupied,
                      ]}
                    >
                      <Text
                        style={[
                          styles.targetCode,
                          isSelected && styles.targetCodeSelected,
                        ]}
                      >
                        {target.code}
                      </Text>
                      <Text style={styles.targetStatus}>
                        {isTargetEmpty
                          ? '🟢 Available'
                          : `👥 ${targetActiveCount} ${targetActiveCount === 1 ? 'tab' : 'tabs'}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Selection Summary & Execute Button */}
          <View style={styles.footerRow}>
            <View style={styles.targetSummaryTextCol}>
              {selectedTargetTable ? (
                <Text style={styles.targetSummaryText}>
                  Target:{' '}
                  <Text style={styles.targetSummaryBold}>
                    Table {selectedTargetTable.code} ({selectedTargetTable.area === 'bar' ? 'Bar Area' : 'Cafe Area'})
                  </Text>
                </Text>
              ) : (
                <Text style={styles.targetSummaryTextMuted}>
                  Select a destination table above
                </Text>
              )}
            </View>

            <View style={styles.footerActions}>
              <Pressable onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                disabled={!selectedTargetId}
                style={[
                  styles.confirmBtn,
                  !selectedTargetId && styles.confirmBtnDisabled,
                ]}
              >
                <Text style={styles.confirmBtnText}>Confirm Transfer</Text>
                <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 6 }} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 10, 16, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fceeed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyScroll: {
    maxHeight: 520,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4b5563',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f5efe9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e8e2dc',
  },
  modeBtnActive: {
    backgroundColor: '#641b2a',
    borderColor: '#641b2a',
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  tabListGroup: {
    gap: 8,
  },
  tabPickerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  tabPickerCardSelected: {
    borderColor: '#641b2a',
    backgroundColor: '#fffdfd',
  },
  tabPickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#641b2a',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#641b2a',
  },
  tabGuestName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  tabItemsPreview: {
    fontSize: 11.5,
    color: '#6b7280',
    marginTop: 2,
  },
  tabAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#641b2a',
  },
  emptyTabsNote: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  emptyTabsText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '600',
  },
  reasonsScroll: {
    gap: 8,
  },
  reasonChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonChipSelected: {
    backgroundColor: '#641b2a',
    borderColor: '#641b2a',
  },
  reasonChipText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#4b5563',
  },
  reasonChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  destinationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  areaFilterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  areaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 38,
    borderRadius: 9,
    backgroundColor: '#f3f4f6',
  },
  areaPillActive: {
    backgroundColor: '#641b2a',
  },
  areaPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  areaPillTextActive: {
    color: '#ffffff',
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  targetCard: {
    width: '31%',
    minHeight: 64,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  targetCardEmpty: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  targetCardOccupied: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  targetCardSelected: {
    borderColor: '#641b2a',
    backgroundColor: '#fff1f2',
  },
  targetCode: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1f2937',
  },
  targetCodeSelected: {
    color: '#641b2a',
  },
  targetStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 14,
    marginTop: 6,
  },
  targetSummaryTextCol: {
    flex: 1,
    marginRight: 12,
  },
  targetSummaryText: {
    fontSize: 13,
    color: '#4b5563',
  },
  targetSummaryBold: {
    fontWeight: '800',
    color: '#641b2a',
  },
  targetSummaryTextMuted: {
    fontSize: 12.5,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#4b5563',
  },
  confirmBtn: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: '#641b2a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#ffffff',
  },
});
