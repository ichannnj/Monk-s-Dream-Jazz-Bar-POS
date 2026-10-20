import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView, TextInput } from 'react-native';
import {
  X,
  PlusCircle,
  Repeat,
  CreditCard,
  UtensilsCrossed,
  Wine,
  ChefHat,
  Trash2,
  AlertTriangle,
} from 'lucide-react-native';
import { TableItem, OrderLineItem } from '../../types/floor';
import { formatCurrency } from '@monks/shared';
import { useAuthStore } from '../../store/useAuthStore';
import { useOrderStore } from '../../store/useOrderStore';
import { toast } from '../../store/useToastStore';
import { ConfirmationModal } from '../shared/ConfirmationModal';

interface TableActionModalProps {
  visible: boolean;
  table: TableItem | null;
  onClose: () => void;
  onTransferTable: (table: TableItem) => void;
  onOpenOrderEntry: (table: TableItem, tabIndex: number, roundNumber?: number) => void;
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
  const { currentUser } = useAuthStore();
  const { voidOrderItem, closeEmptyTab } = useOrderStore();

  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(table?.activeTabs?.[0] || 1);
  const [itemToVoid, setItemToVoid] = useState<OrderLineItem | null>(null);
  const [voidReason, setVoidReason] = useState<string>('Customer Changed Mind');
  const [managerPin, setManagerPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isConfirmCloseEmptyOpen, setIsConfirmCloseEmptyOpen] = useState(false);

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

  // Group active customer tab items by round
  const rounds = React.useMemo(() => {
    if (!currentTab || !currentTab.items || currentTab.items.length === 0) {
      return [];
    }
    const map = new Map<number, OrderLineItem[]>();
    currentTab.items.forEach((item) => {
      const r = item.roundNumber || 1;
      if (!map.has(r)) {
        map.set(r, []);
      }
      map.get(r)!.push(item);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNum, items]) => {
        const activeItems = items.filter((i) => i.status !== 'cancelled');
        const allCancelled = items.length > 0 && activeItems.length === 0;
        const allReady = activeItems.length > 0 && activeItems.every((i) => i.status === 'ready');
        const allServed = activeItems.length > 0 && activeItems.every((i) => i.status === 'served');
        const hasPrep = activeItems.some((i) => i.status === 'preparing');

        let statusText = 'NEW';
        let statusBg = '#eff6ff';
        let statusColor = '#1d4ed8';

        if (allCancelled) {
          statusText = 'VOIDED';
          statusBg = '#fee2e2';
          statusColor = '#b91c1c';
        } else if (allServed) {
          statusText = 'SERVED';
          statusBg = '#f1f5f9';
          statusColor = '#475569';
        } else if (allReady) {
          statusText = 'READY';
          statusBg = '#dcfce7';
          statusColor = '#15803d';
        } else if (hasPrep) {
          statusText = 'PREPARING';
          statusBg = '#fef3c7';
          statusColor = '#b45309';
        }

        const roundTotal = items
          .filter((i) => i.status !== 'cancelled')
          .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

        return {
          roundNum,
          items,
          statusText,
          statusBg,
          statusColor,
          roundTotal,
        };
      });
  }, [currentTab]);

  const maxRound =
    currentTab && currentTab.items.length > 0
      ? Math.max(...currentTab.items.map((i) => i.roundNumber || 1))
      : 0;
  const nextRound = maxRound + 1;

  const handleOpenVoidModal = (item: OrderLineItem) => {
    setItemToVoid(item);
    setVoidReason(
      item.status === 'pending' ? 'Customer Changed Mind' : 'Preparation Error / Spoilage'
    );
    setManagerPin('');
    setPinError('');
    setIsVoidModalOpen(true);
  };

  const handleConfirmVoid = async () => {
    if (!itemToVoid || !table) return;

    const isPostPrep = itemToVoid.status === 'preparing' || itemToVoid.status === 'ready';

    if (isPostPrep) {
      if (managerPin !== '9999') {
        setPinError('Invalid Manager PIN. Admin PIN (9999) required for post-prep waste.');
        return;
      }
    }

    const staffId = currentUser?.id || '00000000-0000-0000-0000-000000000001';
    await voidOrderItem(itemToVoid.id, staffId, voidReason, table.id, selectedTabIndex);

    toast.success(
      `${itemToVoid.productName} voided (${isPostPrep ? 'Waste Logged' : 'Stock Restored'})`,
      {
        title: 'Item Cancelled',
      }
    );

    setIsVoidModalOpen(false);
    setItemToVoid(null);
  };

  const handleExecuteCloseEmptyTab = () => {
    try {
      closeEmptyTab(table.id, selectedTabIndex);
      toast.info(`Tab #${selectedTabIndex} closed and released.`, {
        title: 'Empty Tab Closed',
      });
      setIsConfirmCloseEmptyOpen(false);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to close empty tab.', {
        title: 'Tab Error',
      });
    }
  };

  const hasZeroItems = (currentTab?.items.length || 0) === 0;

  return (
    <>
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
                    {table.code.toLowerCase().startsWith('cafe') ||
                    table.code.toLowerCase().startsWith('bar')
                      ? table.code
                      : `${table.area === 'bar' ? 'Bar' : 'Cafe'} ${table.code}`}{' '}
                    · {table.area === 'bar' ? 'Bar Area' : 'Cafe Area'}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {table.guests > 0 ? `${table.guests} Guests · ` : ''}
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
                          style={[
                            styles.tabSelectBtnText,
                            isActive && styles.tabSelectBtnTextActive,
                          ]}
                        >
                          Tab #{tab.tabIndex}: {tab.guestName} ({formatCurrency(tab.totalAmount)})
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* 3. Items on Tab Section - Segmented per Round */}
            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.itemsPreviewBox}>
                <View style={styles.itemsHeaderRow}>
                  <Text style={styles.itemsPreviewTitle}>
                    Tab #{selectedTabIndex}: {currentTab?.guestName || 'Guest Tab'} (
                    {currentTab?.items.length || 0} items)
                  </Text>
                  <Text style={styles.itemsHeaderTotal}>{formatCurrency(tabTotal)}</Text>
                </View>

                {rounds.length > 0 ? (
                  <View style={styles.roundsListContainer}>
                    {rounds.map((round) => (
                      <View key={round.roundNum} style={styles.roundCard}>
                        {/* Round Header */}
                        <View style={styles.roundCardHeader}>
                          <View style={styles.roundTitleGroup}>
                            <View style={styles.roundNumberBadge}>
                              <Text style={styles.roundNumberBadgeText}>R{round.roundNum}</Text>
                            </View>
                            <View>
                              <Text style={styles.roundTitleText}>Round {round.roundNum}</Text>
                              <Text style={styles.roundSubtitleText}>
                                {round.items.length} item{round.items.length > 1 ? 's' : ''} ·{' '}
                                {formatCurrency(round.roundTotal)}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={[styles.roundStatusBadge, { backgroundColor: round.statusBg }]}
                          >
                            <Text
                              style={[styles.roundStatusBadgeText, { color: round.statusColor }]}
                            >
                              {round.statusText}
                            </Text>
                          </View>
                        </View>

                        {/* Round Items */}
                        <View style={styles.roundItemsList}>
                          {round.items.map((item, idx) => {
                            const isVoided = item.status === 'cancelled';
                            return (
                              <View key={item.id || idx} style={styles.itemRow}>
                                <View style={styles.itemRowLeft}>
                                  {item.stationTarget === 'bar' ? (
                                    <Wine size={13} color={isVoided ? '#9ca3af' : '#0284c7'} />
                                  ) : (
                                    <ChefHat size={13} color={isVoided ? '#9ca3af' : '#ea580c'} />
                                  )}
                                  <Text
                                    style={[
                                      styles.itemName,
                                      isVoided && {
                                        textDecorationLine: 'line-through',
                                        color: '#9ca3af',
                                      },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {item.quantity}x {item.productName}
                                  </Text>

                                  {/* Item Status Badge */}
                                  <View
                                    style={{
                                      backgroundColor:
                                        item.status === 'ready'
                                          ? '#dcfce7'
                                          : item.status === 'preparing'
                                            ? '#fef3c7'
                                            : item.status === 'served'
                                              ? '#f1f5f9'
                                              : isVoided
                                                ? '#fee2e2'
                                                : '#f3f4f6',
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 6,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 16,
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        color:
                                          item.status === 'ready'
                                            ? '#15803d'
                                            : item.status === 'preparing'
                                              ? '#b45309'
                                              : item.status === 'served'
                                                ? '#475569'
                                                : isVoided
                                                  ? '#b91c1c'
                                                  : '#6b7280',
                                      }}
                                    >
                                      {isVoided ? 'VOIDED' : item.status}
                                    </Text>
                                  </View>
                                </View>

                                <View
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                >
                                  <Text
                                    style={[
                                      styles.itemPrice,
                                      isVoided && {
                                        textDecorationLine: 'line-through',
                                        color: '#9ca3af',
                                      },
                                    ]}
                                  >
                                    {formatCurrency(item.unitPrice * item.quantity)}
                                  </Text>

                                  {!isVoided ? (
                                    <Pressable
                                      onPress={() => handleOpenVoidModal(item)}
                                      style={{
                                        minWidth: 48,
                                        minHeight: 48,
                                        borderRadius: 12,
                                        backgroundColor: '#fef2f2',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                      accessibilityRole="button"
                                      accessibilityLabel={`Void ${item.productName}`}
                                    >
                                      <Trash2 size={18} color="#ef4444" />
                                    </Pressable>
                                  ) : null}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyItemsText}>No items added yet to this tab.</Text>
                )}
              </View>

              {/* 4. Natural Service Progression Actions */}
              <View style={styles.actionsContainer}>
                {/* 1. ORDERING: Start Order / Next Round */}
                <Pressable
                  onPress={() => {
                    onClose();
                    onOpenOrderEntry(table, selectedTabIndex, nextRound);
                  }}
                  style={[styles.primaryActionBtn, styles.btnOrder]}
                  accessibilityRole="button"
                  accessibilityLabel={`Start Round ${nextRound} Order`}
                >
                  <UtensilsCrossed size={18} color="#ffffff" strokeWidth={2.3} />
                  <Text style={styles.primaryActionBtnText}>+ Start Round {nextRound} Order</Text>
                </Pressable>

                {/* 2 & 3. TAB MANAGEMENT: Split Tab & Transfer */}
                <View style={styles.secondaryActionsRow}>
                  {/* Step 2: Split Tab */}
                  <Pressable
                    onPress={() => {
                      onClose();
                      onOpenNewTab(table);
                    }}
                    style={styles.secondaryActionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Open Split Tab"
                  >
                    <PlusCircle size={18} color="#15803d" strokeWidth={2.2} />
                    <Text style={styles.secondaryActionBtnTextGreen}>+ Open Split Tab</Text>
                  </Pressable>

                  {/* Step 3: Transfer Table / Tab */}
                  <Pressable
                    onPress={() => {
                      onClose();
                      onTransferTable(table);
                    }}
                    style={styles.secondaryActionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Transfer Tab or Table"
                  >
                    <Repeat size={18} color="#641b2a" strokeWidth={2.2} />
                    <Text style={styles.secondaryActionBtnText}>Transfer Tab/Table</Text>
                  </Pressable>
                </View>

                {/* 4. BILLING: Settle Tab */}
                <Pressable
                  onPress={() => {
                    onClose();
                    onCheckout(table, selectedTabIndex);
                  }}
                  style={[styles.primaryActionBtn, styles.btnSettle]}
                  accessibilityRole="button"
                  accessibilityLabel={`Settle Tab for ${formatCurrency(tabTotal)}`}
                >
                  <CreditCard size={18} color="#ffffff" strokeWidth={2.3} />
                  <Text style={styles.primaryActionBtnText}>
                    Settle Tab · {formatCurrency(tabTotal)}
                  </Text>
                </Pressable>

                {/* 5. CLEANUP: Close Empty Tab (if 0 items on tab) */}
                {hasZeroItems ? (
                  <Pressable
                    onPress={() => setIsConfirmCloseEmptyOpen(true)}
                    style={styles.closeEmptyTabBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Close empty tab"
                  >
                    <Trash2 size={16} color="#b45309" strokeWidth={2.2} />
                    <Text style={styles.closeEmptyTabBtnText}>
                      Close / Clean Empty Tab #{selectedTabIndex}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Void / Cancellation Modal */}
      {isVoidModalOpen && itemToVoid ? (
        <Modal
          visible={isVoidModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsVoidModalOpen(false)}
        >
          <View style={styles.backdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setIsVoidModalOpen(false)}
              accessibilityLabel="Close void modal"
            />
            <View
              style={{
                width: '90%',
                maxWidth: 480,
                backgroundColor: '#ffffff',
                borderRadius: 24,
                padding: 24,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: '#fee2e2',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={22} color="#b91c1c" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>
                      Void Order Item
                    </Text>
                    <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 2 }}>
                      {itemToVoid.quantity}x {itemToVoid.productName} (
                      {formatCurrency(itemToVoid.unitPrice * itemToVoid.quantity)})
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => setIsVoidModalOpen(false)} style={styles.closeBtn}>
                  <X size={20} color="#6b7280" />
                </Pressable>
              </View>

              {/* Status Warning */}
              {itemToVoid.status === 'preparing' || itemToVoid.status === 'ready' ? (
                <View
                  style={{
                    backgroundColor: '#fffbeb',
                    borderWidth: 1,
                    borderColor: '#fef3c7',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#92400e' }}>
                    ⚠️ Item already in {itemToVoid.status.toUpperCase()} stage!
                  </Text>
                  <Text style={{ fontSize: 16, color: '#b45309', marginTop: 4, lineHeight: 22 }}>
                    Ingredients were used. Voiding will record a loss in waste logs and requires
                    Manager PIN (9999).
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: '#f0fdf4',
                    borderWidth: 1,
                    borderColor: '#bbf7d0',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#166534' }}>
                    Pre-Preparation Cancellation
                  </Text>
                  <Text style={{ fontSize: 16, color: '#15803d', marginTop: 4, lineHeight: 22 }}>
                    Item is PENDING. Voiding will restore ingredient stocks to inventory.
                  </Text>
                </View>
              )}

              {/* Reason Selector */}
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 8 }}>
                Cancellation Reason:
              </Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {[
                  'Customer Changed Mind',
                  'Accidental Entry',
                  'Preparation Error / Spoilage',
                  'Customer Return',
                ].map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setVoidReason(r)}
                    style={{
                      minHeight: 48,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: voidReason === r ? '#641b2a' : '#e5e7eb',
                      backgroundColor: voidReason === r ? '#fdf2f4' : '#ffffff',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: voidReason === r ? '#641b2a' : '#4b5563',
                      }}
                    >
                      {r}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Manager PIN (if post-prep) */}
              {itemToVoid.status === 'preparing' || itemToVoid.status === 'ready' ? (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{ fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 }}
                  >
                    Manager 4-Digit PIN (9999):
                  </Text>
                  <TextInput
                    value={managerPin}
                    onChangeText={(txt) => {
                      setManagerPin(txt);
                      setPinError('');
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    placeholder="Enter 4-digit PIN"
                    placeholderTextColor="#9ca3af"
                    style={{
                      minHeight: 48,
                      borderWidth: 1.5,
                      borderColor: pinError ? '#ef4444' : '#d1d5db',
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 18,
                      fontWeight: '700',
                      letterSpacing: 4,
                      textAlign: 'center',
                    }}
                  />
                  {pinError ? (
                    <Text style={{ fontSize: 16, color: '#ef4444', marginTop: 4 }}>{pinError}</Text>
                  ) : null}
                </View>
              ) : null}

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => setIsVoidModalOpen(false)}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: '#f3f4f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#4b5563' }}>
                    Keep Item
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmVoid}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: '#b91c1c',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#ffffff' }}>
                    Confirm Void
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Confirmation Modal: Close / Release Empty Tab */}
      <ConfirmationModal
        visible={isConfirmCloseEmptyOpen}
        title="Close Empty Tab"
        message={`Are you sure you want to close Tab #${selectedTabIndex} ("${currentTab?.guestName || 'Guest'}")? If this is the only active tab, Table ${table.code} will be released back to empty.`}
        confirmText="Yes, Close Tab"
        cancelText="Keep Tab"
        variant="warning"
        onConfirm={handleExecuteCloseEmptyTab}
        onCancel={() => setIsConfirmCloseEmptyOpen(false)}
      />
    </>
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
    fontSize: 16,
    color: '#6b7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
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
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
    textTransform: 'uppercase',
  },
  itemsHeaderTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#641b2a',
    fontVariant: ['tabular-nums'],
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4b5563',
    fontVariant: ['tabular-nums'],
  },
  emptyItemsText: {
    fontSize: 16,
    color: '#9ca3af',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  roundsListContainer: {
    gap: 10,
    marginTop: 4,
  },
  roundCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 8,
  },
  roundCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  roundTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundNumberBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#475569',
  },
  roundTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  roundSubtitleText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  roundStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roundStatusBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  roundItemsList: {
    gap: 6,
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
    gap: 8,
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
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryActionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#641b2a',
  },
  secondaryActionBtnTextGreen: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803d',
  },
  closeEmptyTabBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    marginTop: 4,
  },
  closeEmptyTabBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#b45309',
  },
});
