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
import { TableItem, OrderLineItem } from '../../mockData';
import { useAuthStore } from '../../store/useAuthStore';
import { useOrderStore } from '../../store/useOrderStore';
import { toast } from '../../store/useToastStore';

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
  const { voidOrderItem } = useOrderStore();

  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(table?.activeTabs?.[0] || 1);
  const [itemToVoid, setItemToVoid] = useState<OrderLineItem | null>(null);
  const [voidReason, setVoidReason] = useState<string>('Customer Changed Mind');
  const [managerPin, setManagerPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);

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

            {/* 3. Items on Tab Section - Segmented per Round */}
            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.itemsPreviewBox}>
                <View style={styles.itemsHeaderRow}>
                  <Text style={styles.itemsPreviewTitle}>
                    Tab #{selectedTabIndex}: {currentTab?.guestName || 'Guest Tab'} (
                    {currentTab?.items.length || 0} items)
                  </Text>
                  <Text style={styles.itemsHeaderTotal}>${tabTotal.toFixed(2)}</Text>
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
                                {round.items.length} item{round.items.length > 1 ? 's' : ''} · $
                                {round.roundTotal.toFixed(2)}
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
                                      paddingHorizontal: 5,
                                      paddingVertical: 1,
                                      borderRadius: 4,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 10,
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
                                    ${(item.unitPrice * item.quantity).toFixed(2)}
                                  </Text>

                                  {!isVoided ? (
                                    <Pressable
                                      onPress={() => handleOpenVoidModal(item)}
                                      style={{
                                        padding: 5,
                                        borderRadius: 6,
                                        backgroundColor: '#fef2f2',
                                      }}
                                      accessibilityRole="button"
                                      accessibilityLabel={`Void ${item.productName}`}
                                    >
                                      <Trash2 size={13} color="#ef4444" />
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

              {/* 4. Streamlined Actions */}
              <View style={styles.actionsContainer}>
                {/* Primary Actions */}
                <View style={styles.primaryActionsRow}>
                  <Pressable
                    onPress={() => {
                      onClose();
                      onOpenOrderEntry(table, selectedTabIndex, nextRound);
                    }}
                    style={[styles.primaryActionBtn, styles.btnOrder]}
                  >
                    <UtensilsCrossed size={16} color="#ffffff" strokeWidth={2.3} />
                    <Text style={styles.primaryActionBtnText}>+ Start Round {nextRound} Order</Text>
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

      {/* Void / Cancellation Modal */}
      {isVoidModalOpen && itemToVoid ? (
        <Modal
          visible={isVoidModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsVoidModalOpen(false)}
        >
          <View style={styles.backdrop}>
            <View
              style={{
                width: '90%',
                maxWidth: 420,
                backgroundColor: '#ffffff',
                borderRadius: 18,
                padding: 20,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: '#fee2e2',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={18} color="#b91c1c" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>
                      Void Order Item
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                      {itemToVoid.quantity}x {itemToVoid.productName} ($
                      {(itemToVoid.unitPrice * itemToVoid.quantity).toFixed(2)})
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => setIsVoidModalOpen(false)} style={styles.closeBtn}>
                  <X size={18} color="#6b7280" />
                </Pressable>
              </View>

              {/* Status Warning */}
              {itemToVoid.status === 'preparing' || itemToVoid.status === 'ready' ? (
                <View
                  style={{
                    backgroundColor: '#fffbeb',
                    borderWidth: 1,
                    borderColor: '#fef3c7',
                    borderRadius: 10,
                    padding: 10,
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400e' }}>
                    ⚠️ Item already in {itemToVoid.status.toUpperCase()} stage!
                  </Text>
                  <Text style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
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
                    borderRadius: 10,
                    padding: 10,
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>
                    Pre-Preparation Cancellation
                  </Text>
                  <Text style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>
                    Item is PENDING. Voiding will restore ingredient stocks to inventory.
                  </Text>
                </View>
              )}

              {/* Reason Selector */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 }}>
                Cancellation Reason:
              </Text>
              <View style={{ gap: 6, marginBottom: 14 }}>
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
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: voidReason === r ? '#641b2a' : '#e5e7eb',
                      backgroundColor: voidReason === r ? '#fdf2f4' : '#ffffff',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
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
                <View style={{ marginBottom: 14 }}>
                  <Text
                    style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 4 }}
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
                      borderWidth: 1.5,
                      borderColor: pinError ? '#ef4444' : '#d1d5db',
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 16,
                      fontWeight: '700',
                      letterSpacing: 4,
                      textAlign: 'center',
                    }}
                  />
                  {pinError ? (
                    <Text style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{pinError}</Text>
                  ) : null}
                </View>
              ) : null}

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setIsVoidModalOpen(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: '#f3f4f6',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#4b5563' }}>
                    Keep Item
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmVoid}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: '#b91c1c',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                    Confirm Void
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
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
  roundsListContainer: {
    gap: 10,
    marginTop: 4,
  },
  roundCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    gap: 8,
  },
  roundCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  roundTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundNumberBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  roundTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  roundSubtitleText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  roundStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roundStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  roundItemsList: {
    gap: 4,
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
