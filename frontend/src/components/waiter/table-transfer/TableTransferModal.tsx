import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { Repeat, X, Check, ArrowRight, Coffee, Wine, User, Sparkles } from 'lucide-react-native';
import { TableItem, CustomerTab, TableArea } from '../../../mockData';
import { styles } from './TableTransferModal.styles';

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
  const [mode, setMode] = useState<'entire' | 'tab'>('entire');
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(
    originTable?.tabs?.[0]?.tabIndex ?? originTable?.activeTabs?.[0] ?? 1
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
    if (!originTable) return [];
    return allTables.filter((t) => {
      if (t.id === originTable.id) return false;
      if (targetAreaFilter !== 'all' && t.area !== targetAreaFilter) return false;
      return true;
    });
  }, [allTables, originTable, targetAreaFilter]);

  if (!originTable) return null;

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
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close modal"
        />
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
                  Origin: Table {originTable.code} (
                  {originTable.area === 'bar' ? 'Bar Area' : 'Cafe Area'})
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
                  <Text style={[styles.modeBtnText, mode === 'entire' && styles.modeBtnTextActive]}>
                    Move Entire Table (
                    {originTabs.length > 0 ? originTabs.length : originTable.activeTabs.length}{' '}
                    tabs)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setMode('tab')}
                  style={[styles.modeBtn, mode === 'tab' && styles.modeBtnActive]}
                >
                  <Text style={[styles.modeBtnText, mode === 'tab' && styles.modeBtnTextActive]}>
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
                          style={[styles.tabPickerCard, isSelected && styles.tabPickerCardSelected]}
                        >
                          <View style={styles.tabPickerLeft}>
                            <View
                              style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}
                            >
                              {isSelected ? <View style={styles.radioDot} /> : null}
                            </View>

                            <View>
                              <Text style={styles.tabGuestName}>
                                Guest: "{tab.guestName}" (Tab #{tab.tabIndex})
                              </Text>
                              <Text style={styles.tabItemsPreview}>
                                {tab.items.length} items:{' '}
                                {tab.items
                                  .map((i) => i.productName)
                                  .slice(0, 2)
                                  .join(', ')}
                                {tab.items.length > 2 ? '...' : ''}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.tabAmount}>${tab.totalAmount.toFixed(2)}</Text>
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
                      style={[styles.reasonChip, isSelected && styles.reasonChipSelected]}
                    >
                      <Text
                        style={[styles.reasonChipText, isSelected && styles.reasonChipTextSelected]}
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
                    style={[styles.areaPill, targetAreaFilter === 'all' && styles.areaPillActive]}
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
                    style={[styles.areaPill, targetAreaFilter === 'cafe' && styles.areaPillActive]}
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
                    style={[styles.areaPill, targetAreaFilter === 'bar' && styles.areaPillActive]}
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
                        isTargetEmpty ? styles.targetCardEmpty : styles.targetCardOccupied,
                      ]}
                    >
                      <Text style={[styles.targetCode, isSelected && styles.targetCodeSelected]}>
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
                    Table {selectedTargetTable.code} (
                    {selectedTargetTable.area === 'bar' ? 'Bar Area' : 'Cafe Area'})
                  </Text>
                </Text>
              ) : (
                <Text style={styles.targetSummaryTextMuted}>Select a destination table above</Text>
              )}
            </View>

            <View style={styles.footerActions}>
              <Pressable onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                disabled={!selectedTargetId}
                style={[styles.confirmBtn, !selectedTargetId && styles.confirmBtnDisabled]}
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
