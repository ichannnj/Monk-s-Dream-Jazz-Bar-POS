import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { Repeat, X, Check, ArrowRight } from 'lucide-react-native';
import { TableItem } from '../../mockData';

interface TableTransferModalProps {
  visible: boolean;
  originTable: TableItem | null;
  allTables: TableItem[];
  onClose: () => void;
  onConfirmTransfer: (originId: string, targetId: string, mode: 'entire' | 'tab') => void;
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
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const availableTargets = allTables.filter((t) => t.id !== originTable.id);

  const handleConfirm = () => {
    if (selectedTargetId) {
      onConfirmTransfer(originTable.id, selectedTargetId, mode);
      onClose();
    }
  };

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

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Mode Selector */}
          <View style={styles.modeContainer}>
            <Text style={styles.sectionLabel}>Transfer Scope:</Text>
            <View style={styles.modeRow}>
              <Pressable
                onPress={() => setMode('entire')}
                style={[styles.modeBtn, mode === 'entire' && styles.modeBtnActive]}
              >
                <Text style={[styles.modeBtnText, mode === 'entire' && styles.modeBtnTextActive]}>
                  Move Entire Table ({originTable.activeTabs.length} tabs)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMode('tab')}
                style={[styles.modeBtn, mode === 'tab' && styles.modeBtnActive]}
              >
                <Text style={[styles.modeBtnText, mode === 'tab' && styles.modeBtnTextActive]}>
                  Move Single Tab
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Target Table Selector */}
          <Text style={styles.sectionLabel}>Select Destination Table:</Text>
          <ScrollView style={styles.tableGridScroll} contentContainerStyle={styles.tableGrid}>
            {availableTargets.map((target) => {
              const isSelected = selectedTargetId === target.id;
              const isEmpty = target.status === 'empty';

              return (
                <Pressable
                  key={target.id}
                  onPress={() => setSelectedTargetId(target.id)}
                  style={[
                    styles.targetCard,
                    isSelected && styles.targetCardSelected,
                    isEmpty ? styles.targetCardEmpty : styles.targetCardOccupied,
                  ]}
                >
                  <Text style={[styles.targetCode, isSelected && styles.targetCodeSelected]}>
                    {target.code}
                  </Text>
                  <Text style={styles.targetStatus}>
                    {isEmpty ? 'Available' : `${target.activeTabs.length} tabs`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Footer Execute Button */}
          <View style={styles.footerRow}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={!selectedTargetId}
              style={[styles.confirmBtn, !selectedTargetId && styles.confirmBtnDisabled]}
            >
              <Text style={styles.confirmBtnText}>Execute Transfer</Text>
              <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 6 }} />
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
    backgroundColor: 'rgba(28, 10, 16, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
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
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  modeContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f5efe9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e2dc',
  },
  modeBtnActive: {
    backgroundColor: '#641b2a',
    borderColor: '#641b2a',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  tableGridScroll: {
    maxHeight: 220,
    marginBottom: 20,
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  targetCard: {
    width: '30%',
    paddingVertical: 14,
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
    backgroundColor: '#fdf5f6',
  },
  targetCode: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  targetCodeSelected: {
    color: '#641b2a',
  },
  targetStatus: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#4b5563',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#641b2a',
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});
