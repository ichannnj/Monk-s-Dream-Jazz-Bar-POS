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
  ShoppingBag,
} from 'lucide-react-native';
import { TableItem, CustomerTab } from '../../mockData';

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
  if (!table) return null;

  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(
    table.activeTabs[0] || 1
  );

  // Active customer tab data
  const currentTab = (table.tabs || []).find(
    (t) => t.tabIndex === selectedTabIndex
  );

  const tabTotal = currentTab?.totalAmount ?? (table.totalAmount || 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.tableCodeBadge}>
                <Text style={styles.tableCodeText}>{table.code}</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  Table {table.code} • {table.area === 'bar' ? 'Bar Area' : 'Cafe Area'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {table.guests > 0 ? `${table.guests} Guests · ` : ''}
                  {table.seats} Seats · Elapsed: {table.elapsedTime}
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Tab Selector if multiple tabs */}
          {table.tabs && table.tabs.length > 0 ? (
            <View style={styles.tabSelectorRow}>
              <Text style={styles.selectorLabel}>Active Customer Tabs:</Text>
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
                      style={[
                        styles.tabSelectBtn,
                        isActive && styles.tabSelectBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabSelectBtnText,
                          isActive && styles.tabSelectBtnTextActive,
                        ]}
                      >
                        Tab #{tab.tabIndex}: {tab.guestName} (${tab.totalAmount.toFixed(2)})
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Current Tab Details */}
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Guest Name:</Text>
                <Text style={styles.guestHighlight}>
                  {currentTab?.guestName || 'Table Guest'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tab Subtotal:</Text>
                <Text style={styles.summaryAmount}>${tabTotal.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Server in Charge:</Text>
                <Text style={styles.summaryValue}>
                  {table.assignedStaff ? table.assignedStaff.name : 'Jess Santos'}
                </Text>
              </View>
            </View>

            {/* Active Items on this tab */}
            {currentTab && currentTab.items.length > 0 ? (
              <View style={styles.itemsPreviewBox}>
                <Text style={styles.itemsPreviewTitle}>Items on Tab:</Text>
                {currentTab.items.map((item, idx) => (
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
                ))}
              </View>
            ) : null}

            {/* Quick Actions List according to REQUIREMENTS.md */}
            <Text style={styles.sectionHeader}>Floor Actions</Text>
            <View style={styles.actionsGrid}>
              {/* Order / Add Items */}
              <Pressable
                onPress={() => {
                  onClose();
                  onOpenOrderEntry(table, selectedTabIndex);
                }}
                style={[styles.actionBtn, styles.actionBtnOrder]}
              >
                <UtensilsCrossed size={18} color="#ffffff" />
                <View style={styles.actionBtnTextCol}>
                  <Text style={[styles.actionBtnTitle, { color: '#ffffff' }]}>
                    + Order Menu Items
                  </Text>
                  <Text style={[styles.actionBtnSub, { color: '#fceeed' }]}>
                    Open catalog, modifiers & send to KDS
                  </Text>
                </View>
              </Pressable>

              {/* Checkout & Settle Tab */}
              <Pressable
                onPress={() => {
                  onClose();
                  onCheckout(table, selectedTabIndex);
                }}
                style={[styles.actionBtn, styles.actionBtnSettle]}
              >
                <CreditCard size={18} color="#ffffff" />
                <View style={styles.actionBtnTextCol}>
                  <Text style={[styles.actionBtnTitle, { color: '#ffffff' }]}>
                    Checkout & Print Receipt
                  </Text>
                  <Text style={[styles.actionBtnSub, { color: '#f7d7dc' }]}>
                    Cash, Card, QR Wallet settlement
                  </Text>
                </View>
              </Pressable>

              {/* Transfer Table / Tab */}
              <Pressable
                onPress={() => {
                  onClose();
                  onTransferTable(table);
                }}
                style={styles.actionBtn}
              >
                <Repeat size={18} color="#641b2a" />
                <View style={styles.actionBtnTextCol}>
                  <Text style={styles.actionBtnTitle}>Transfer Table / Tab</Text>
                  <Text style={styles.actionBtnSub}>
                    Move full table or tab to bar rail
                  </Text>
                </View>
              </Pressable>

              {/* Open Split Tab */}
              <Pressable
                onPress={() => {
                  onClose();
                  onOpenNewTab(table);
                }}
                style={styles.actionBtn}
              >
                <PlusCircle size={18} color="#15803d" />
                <View style={styles.actionBtnTextCol}>
                  <Text style={styles.actionBtnTitle}>Open Split Tab</Text>
                  <Text style={styles.actionBtnSub}>
                    Add another named bill for shared table
                  </Text>
                </View>
              </Pressable>
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
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
    maxHeight: '90%',
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
  tabSelectorRow: {
    marginBottom: 14,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  tabsButtonGroup: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  tabSelectBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabSelectBtnActive: {
    backgroundColor: '#641b2a',
    borderColor: '#641b2a',
  },
  tabSelectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  tabSelectBtnTextActive: {
    color: '#ffffff',
  },
  contentScroll: {
    maxHeight: 460,
  },
  summaryCard: {
    backgroundColor: '#fcfaf9',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0e6e4',
    marginBottom: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  guestHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  summaryValue: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '700',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#641b2a',
  },
  itemsPreviewBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  itemsPreviewTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4b5563',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1f2937',
  },
  itemPrice: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4b5563',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsGrid: {
    gap: 10,
    paddingBottom: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionBtnOrder: {
    backgroundColor: '#641b2a',
    borderColor: '#641b2a',
  },
  actionBtnSettle: {
    backgroundColor: '#15803d',
    borderColor: '#15803d',
  },
  actionBtnTextCol: {
    flex: 1,
  },
  actionBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  actionBtnSub: {
    fontSize: 11.5,
    color: '#6b7280',
    marginTop: 2,
  },
});
