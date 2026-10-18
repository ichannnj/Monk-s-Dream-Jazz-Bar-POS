import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import {
  X,
  PlusCircle,
  Repeat,
  CreditCard,
  UtensilsCrossed,
  Wine,
  ChefHat,
} from 'lucide-react-native';
import { TableItem } from '../../mockData';

interface TableActionModalProps {
  visible: boolean;
  table: TableItem | null;
  onClose: () => void;
  onTransferTable: (table: TableItem) => void;
  onOpenOrderEntry: (table: TableItem, tabIndex: number) => void;
  onOpenNewTab: (table: TableItem) => void;
  onCheckout: (table: TableItem, tabIndex: number) => void;
}

export const TableActionModal: React.FC<TableActionModalProps> = ({
  visible,
  table,
  onClose,
  onTransferTable,
  onOpenOrderEntry,
  onOpenNewTab,
  onCheckout,
}) => {
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(table?.activeTabs?.[0] || 1);

  React.useEffect(() => {
    if (table) {
      const firstTab = table.tabs?.[0]?.tabIndex ?? table.activeTabs?.[0] ?? 1;
      setSelectedTabIndex((prev) => {
        const stillExists = table.tabs?.some((t) => t.tabIndex === prev);
        return stillExists ? prev : firstTab;
      });
    }
  }, [table]);

  if (!table) return null;

  // Active customer tab data
  const currentTab = (table.tabs || []).find((t) => t.tabIndex === selectedTabIndex);

  const tabTotal = currentTab?.totalAmount ?? (table.totalAmount || 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close modal"
        />
        <View style={styles.modalCard}>
          {/* 1. Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.tableCodeBadge}>
                <Text style={styles.tableCodeText}>{table.code}</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  Table {table.code} · {table.area === 'bar' ? 'Bar Area' : 'Cafe Area'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {table.guests > 0 ? `${table.guests} Guests · ` : ''}
                  {table.seats} Seats ·{' '}
                  {table.assignedStaff ? table.assignedStaff.name : 'Unassigned'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close table actions"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* 2. Tab Selector */}
          {table.tabs && table.tabs.length > 0 ? (
            <View style={styles.tabSelectorRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsButtonGroup}
              >
                {table.tabs.map((tab) => {
                  const isActive = selectedTabIndex === tab.tabIndex;

                  return (
                    <Pressable
                      key={tab.id}
                      onPress={() => setSelectedTabIndex(tab.tabIndex)}
                      style={[styles.tabSelectBtn, isActive && styles.tabSelectBtnActive]}
                    >
                      <Text
                        style={[styles.tabSelectBtnText, isActive && styles.tabSelectBtnTextActive]}
                      >
                        Tab #{tab.tabIndex}: {tab.guestName} (${tab.totalAmount.toFixed(2)})
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* 3. Items on Tab Section */}
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.itemsPreviewBox}>
              <View style={styles.itemsHeaderRow}>
                <Text style={styles.itemsPreviewTitle}>
                  Items ({currentTab?.items.length || 0}) · {currentTab?.guestName || 'Guest Tab'}
                </Text>
                <Text style={styles.itemsHeaderTotal}>${tabTotal.toFixed(2)}</Text>
              </View>

              {currentTab && currentTab.items.length > 0 ? (
                currentTab.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.itemRowLeft}>
                      {item.stationTarget === 'bar' ? (
                        <Wine size={13} color="#0284c7" />
                      ) : (
                        <ChefHat size={13} color="#ea580c" />
                      )}
                      <Text style={styles.itemName}>
                        {item.quantity}x {item.productName}
                      </Text>
                    </View>
                    <Text style={styles.itemPrice}>
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyItemsText}>No items added yet to this tab.</Text>
              )}
            </View>

            {/* 4. Streamlined Actions */}
            <View style={styles.actionsContainer}>
              {/* Primary Actions */}
              <View style={styles.primaryActionsRow}>
                <Pressable
                  onPress={() => {
                    onClose();
                    onOpenOrderEntry(table, selectedTabIndex);
                  }}
                  style={[styles.primaryActionBtn, styles.btnOrder]}
                >
                  <UtensilsCrossed size={16} color="#ffffff" strokeWidth={2.3} />
                  <Text style={styles.primaryActionBtnText}>+ Order Items</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    onClose();
                    onCheckout(table, selectedTabIndex);
                  }}
                  style={[styles.primaryActionBtn, styles.btnSettle]}
                >
                  <CreditCard size={16} color="#ffffff" strokeWidth={2.3} />
                  <Text style={styles.primaryActionBtnText}>Settle · ${tabTotal.toFixed(2)}</Text>
                </Pressable>
              </View>

              {/* Secondary Actions */}
              <View style={styles.secondaryActionsRow}>
                <Pressable
                  onPress={() => {
                    onClose();
                    onTransferTable(table);
                  }}
                  style={styles.secondaryActionBtn}
                >
                  <Repeat size={14} color="#641b2a" strokeWidth={2.2} />
                  <Text style={styles.secondaryActionBtnText}>Transfer Tab/Table</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    onClose();
                    onOpenNewTab(table);
                  }}
                  style={styles.secondaryActionBtn}
                >
                  <PlusCircle size={14} color="#15803d" strokeWidth={2.2} />
                  <Text style={styles.secondaryActionBtnTextGreen}>+ Open Split Tab</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
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
    maxWidth: 540,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
    maxHeight: '90%',
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
  tableCodeBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#641b2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCodeText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  headerTitle: {
    fontSize: 17,
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
  tabSelectorRow: {
    marginBottom: 14,
  },
  tabsButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  tabSelectBtn: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
  },
  tabSelectBtnActive: {
    backgroundColor: '#641b2a',
    borderColor: '#641b2a',
  },
  tabSelectBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#374151',
    fontVariant: ['tabular-nums'],
  },
  tabSelectBtnTextActive: {
    color: '#ffffff',
  },
  contentScroll: {
    maxHeight: 400,
  },
  itemsPreviewBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee8e3',
    gap: 6,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 4,
  },
  itemsPreviewTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    textTransform: 'uppercase',
  },
  itemsHeaderTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#641b2a',
    fontVariant: ['tabular-nums'],
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563',
    fontVariant: ['tabular-nums'],
  },
  emptyItemsText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  actionsContainer: {
    gap: 10,
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnOrder: {
    backgroundColor: '#641b2a',
  },
  btnSettle: {
    backgroundColor: '#15803d',
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryActionBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#641b2a',
  },
  secondaryActionBtnTextGreen: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#15803d',
  },
});
