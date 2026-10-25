import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { Repeat, X, ArrowRight, ArrowLeft, Coffee, Wine, CheckCircle2 } from 'lucide-react-native';
import { TableItem, TableArea } from '../../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { toast } from '../../../shared/toast/useToastStore';
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
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<'entire' | 'tab'>('entire');
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(
    originTable?.tabs?.[0]?.tabIndex ?? originTable?.activeTabs?.[0] ?? 1
  );
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [targetAreaFilter, setTargetAreaFilter] = useState<TableArea | 'all'>('all');
  const [selectedReason, setSelectedReason] = useState<string>('Guest relocation request');

  // Sync tab index and reset step when originTable opens
  React.useEffect(() => {
    if (originTable?.tabs && originTable.tabs.length > 0) {
      setSelectedTabIndex(originTable.tabs[0].tabIndex);
    }
    setSelectedTargetId(null);
    setStep(1);
  }, [originTable, visible]);

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

  const handleGoToReview = () => {
    if (!selectedTargetId) {
      toast.warning('Please select a destination table before proceeding to review.', {
        title: 'Destination Required',
      });
      return;
    }
    setStep(2);
  };

  const handleConfirm = () => {
    if (!selectedTargetId) {
      toast.warning('Please select a destination table to transfer to.', {
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
        `Successfully transferred ${mode === 'entire' ? 'Table ' + originTable.code : 'Tab #' + selectedTabIndex} to Table ${selectedTargetTable?.code}.`,
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
  const tabBeingTransferred = originTabs.find((t) => t.tabIndex === selectedTabIndex);

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
                <Text style={styles.headerTitle}>
                  {step === 1 ? 'Transfer Table / Tab (Step 1/2)' : 'Confirm Transfer (Step 2/2)'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  Origin:{' '}
                  {originTable.code.toLowerCase().startsWith('cafe') ||
                  originTable.code.toLowerCase().startsWith('bar')
                    ? originTable.code
                    : `${originTable.area === 'bar' ? 'Bar' : 'Cafe'} ${originTable.code}`}{' '}
                  ({originTable.area === 'bar' ? 'Bar Area' : 'Cafe Area'})
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

          {step === 1 ? (
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
                      style={[styles.modeBtnText, mode === 'entire' && styles.modeBtnTextActive]}
                    >
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
                        Default Tab #1 ({formatCurrency(originTable.totalAmount || 0)})
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
                                  {tab.items.length} items:{' '}
                                  {tab.items
                                    .map((i) => i.productName)
                                    .slice(0, 2)
                                    .join(', ')}
                                  {tab.items.length > 2 ? '...' : ''}
                                </Text>
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
                      style={[
                        styles.areaPill,
                        targetAreaFilter === 'cafe' && styles.areaPillActive,
                      ]}
                    >
                      <Coffee
                        size={11}
                        color={targetAreaFilter === 'cafe' ? '#ffffff' : '#6b7280'}
                      />
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
          ) : (
            /* STEP 2: REVIEW & CONFIRMATION */
            <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 16, paddingVertical: 8 }}>
                {/* Transfer Visual Route */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#f9fafb',
                    borderRadius: 18,
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: '#e5e7eb',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, color: '#6b7280', fontWeight: '600' }}>
                      From Origin
                    </Text>
                    <Text
                      style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 2 }}
                    >
                      Table {originTable.code}
                    </Text>
                    <Text
                      style={{ fontSize: 16, color: '#641b2a', fontWeight: '700', marginTop: 2 }}
                    >
                      {originTable.area === 'bar' ? 'Bar Area' : 'Cafe Area'}
                    </Text>
                  </View>

                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#641b2a',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginHorizontal: 12,
                    }}
                  >
                    <ArrowRight size={22} color="#ffffff" />
                  </View>

                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 16, color: '#6b7280', fontWeight: '600' }}>
                      To Destination
                    </Text>
                    <Text
                      style={{ fontSize: 20, fontWeight: '800', color: '#15803d', marginTop: 2 }}
                    >
                      Table {selectedTargetTable?.code}
                    </Text>
                    <Text
                      style={{ fontSize: 16, color: '#15803d', fontWeight: '700', marginTop: 2 }}
                    >
                      {selectedTargetTable?.area === 'bar' ? 'Bar Area' : 'Cafe Area'}
                    </Text>
                  </View>
                </View>

                {/* Scope & Details Card */}
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 18,
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: '#fceeed',
                  }}
                >
                  <Text
                    style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 }}
                  >
                    Transfer Summary
                  </Text>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 16, color: '#4b5563' }}>Scope:</Text>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                        {mode === 'entire'
                          ? 'Entire Table (All Tabs)'
                          : `Single Tab #${selectedTabIndex}`}
                      </Text>
                    </View>

                    {mode === 'tab' && tabBeingTransferred ? (
                      <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 16, color: '#4b5563' }}>Guest Name:</Text>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                            {tabBeingTransferred.guestName}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 16, color: '#4b5563' }}>Tab Items:</Text>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                            {tabBeingTransferred.items.length} items (
                            {formatCurrency(tabBeingTransferred.totalAmount)})
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 16, color: '#4b5563' }}>Total Balance:</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#641b2a' }}>
                          {formatCurrency(originTable.totalAmount || 0)}
                        </Text>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 16, color: '#4b5563' }}>Reason:</Text>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#6b7280' }}>
                        {selectedReason}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Destination Occupancy Preview Note */}
                <View
                  style={{
                    backgroundColor:
                      selectedTargetTable?.status === 'empty' ? '#f0fdf4' : '#eff6ff',
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: selectedTargetTable?.status === 'empty' ? '#bbf7d0' : '#bfdbfe',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: selectedTargetTable?.status === 'empty' ? '#15803d' : '#1d4ed8',
                      fontWeight: '600',
                    }}
                  >
                    {selectedTargetTable?.status === 'empty'
                      ? `🟢 Table ${selectedTargetTable?.code} is currently available. It will become occupied immediately upon transfer.`
                      : `ℹ️ Table ${selectedTargetTable?.code} is currently occupied. The transferred tab(s) will merge cleanly into its existing active tabs.`}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Footer Selection Summary & Execute Button */}
          <View style={styles.footerRow}>
            {step === 1 ? (
              <>
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
                    onPress={handleGoToReview}
                    disabled={!selectedTargetId}
                    style={[styles.confirmBtn, !selectedTargetId && styles.confirmBtnDisabled]}
                  >
                    <Text style={styles.confirmBtnText}>Review Transfer</Text>
                    <ArrowRight size={18} color="#ffffff" />
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.targetSummaryTextCol}>
                  <Pressable
                    onPress={() => setStep(1)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    <ArrowLeft size={18} color="#641b2a" />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#641b2a' }}>
                      Back to Selection
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.footerActions}>
                  <Pressable onPress={onClose} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleConfirm}
                    style={[styles.confirmBtn, { backgroundColor: '#15803d' }]}
                  >
                    <CheckCircle2 size={18} color="#ffffff" />
                    <Text style={styles.confirmBtnText}>Confirm Transfer</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
