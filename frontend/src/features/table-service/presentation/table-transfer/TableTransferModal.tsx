import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { Repeat, X, Coffee, Wine, ArrowRight } from 'lucide-react-native';
import { TableItem, TableArea } from '../../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { toast } from '../../../shared/toast/useToastStore';
import { sortTablesInOrder } from '@/features/floor/domain/tableTabHelpers';
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
  const [selectedReason, setSelectedReason] = useState<string>('Guest relocation');

  // Sync tab index when originTable changes
  React.useEffect(() => {
    if (originTable?.tabs && originTable.tabs.length > 0) {
      setSelectedTabIndex(originTable.tabs[0].tabIndex);
    }
    setSelectedTargetId(null);
  }, [originTable, visible]);

  // Destination tables (exclude origin, sorted in Cafe -> Bar numeric order)
  const availableTargets = useMemo(() => {
    if (!originTable) return [];
    const filtered = allTables.filter((t) => {
      if (t.id === originTable.id) return false;
      if (targetAreaFilter !== 'all' && t.area !== targetAreaFilter) return false;
      return true;
    });
    return sortTablesInOrder(filtered);
  }, [allTables, originTable, targetAreaFilter]);

  if (!originTable) return null;

  const presetReasons = ['Guest relocation', 'Bar seating', 'Joined friends', 'Stage seating'];

  const handleConfirm = () => {
    if (!selectedTargetId) {
      toast.warning('Please select a destination table.', {
        title: 'Destination Required',
      });
      return;
    }

    try {
      onConfirmTransfer(
        originTable.id,
        selectedTargetId,
        mode,
        mode === 'tab' ? selectedTabIndex : undefined,
        selectedReason
      );
      toast.success(
        `Transferred ${mode === 'entire' ? 'Table ' + originTable.code : 'Tab #' + selectedTabIndex} to Table ${selectedTargetTable?.code}.`,
        { title: 'Transfer Completed' }
      );
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete table transfer.', {
        title: 'Transfer Error',
      });
    }
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
                <Repeat size={18} color="#810021" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Transfer · Table {originTable.code}</Text>
                <Text style={styles.headerSubtitle}>
                  {originTable.area === 'bar' ? 'Bar Area' : 'Cafe Area'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close table transfer"
            >
              <X size={20} color="#1A1617" />
            </Pressable>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* 1. Mode Selector */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Scope:</Text>
              <View style={styles.modeRow}>
                <Pressable
                  onPress={() => setMode('entire')}
                  style={[styles.modeBtn, mode === 'entire' && styles.modeBtnActive]}
                >
                  <Text style={[styles.modeBtnText, mode === 'entire' && styles.modeBtnTextActive]}>
                    Entire Table ({originTabs.length || originTable.activeTabs.length} tabs)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setMode('tab')}
                  style={[styles.modeBtn, mode === 'tab' && styles.modeBtnActive]}
                >
                  <Text style={[styles.modeBtnText, mode === 'tab' && styles.modeBtnTextActive]}>
                    Single Tab
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 2. Tab Picker (When mode === 'tab') */}
            {mode === 'tab' ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Tab to Relocate:</Text>
                {originTabs.length === 0 ? (
                  <View style={styles.emptyTabsNote}>
                    <Text style={styles.emptyTabsText}>
                      Tab #1 ({formatCurrency(originTable.totalAmount || 0)})
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
                                Tab #{tab.tabIndex}: {tab.guestName}
                              </Text>
                              <Text style={styles.tabItemsPreview}>{tab.items.length} items</Text>
                            </View>
                          </View>

                          <Text style={styles.tabAmount}>{formatCurrency(tab.totalAmount)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}

            {/* 3. Reason */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Reason:</Text>
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
                <Text style={styles.sectionLabel}>Destination:</Text>

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
                    <Coffee size={11} color={targetAreaFilter === 'cafe' ? '#F7F5F2' : '#78716C'} />
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
                    <Wine size={11} color={targetAreaFilter === 'bar' ? '#F7F5F2' : '#78716C'} />
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
                  const targetOpenTabs = (target.tabs || []).filter((t) => t.status !== 'closed');
                  const targetActiveCount =
                    targetOpenTabs.length > 0 ? targetOpenTabs.length : target.activeTabs.length;
                  const isTargetEmpty = target.status === 'empty' || targetActiveCount === 0;
                  const targetTabPreview =
                    targetOpenTabs.length === 1
                      ? targetOpenTabs[0].guestName
                      : targetOpenTabs.length > 1
                        ? `${targetOpenTabs[0].guestName} +${targetOpenTabs.length - 1}`
                        : `${targetActiveCount} tabs`;

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
                      <Text
                        style={[styles.targetStatus, isSelected && { color: '#F7F5F2' }]}
                        numberOfLines={1}
                      >
                        {isTargetEmpty ? 'Available' : targetTabPreview}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footerRow}>
            <View style={styles.targetSummaryTextCol}>
              {selectedTargetTable ? (
                <Text style={styles.targetSummaryText}>
                  Target:{' '}
                  <Text style={styles.targetSummaryBold}>Table {selectedTargetTable.code}</Text>
                </Text>
              ) : (
                <Text style={styles.targetSummaryTextMuted}>Select destination table</Text>
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
                <Text style={styles.confirmBtnText}>
                  {selectedTargetTable ? `Transfer to ${selectedTargetTable.code}` : 'Transfer'}
                </Text>
                <ArrowRight size={16} color="#F7F5F2" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
