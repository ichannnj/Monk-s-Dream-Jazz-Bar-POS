import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { PlusCircle, Repeat, CreditCard, UtensilsCrossed, Trash2 } from 'lucide-react-native';
import { TableItem, OrderLineItem } from '../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { useOrderStore } from '../../orders/application/useOrderStore';
import { toast } from '../../shared/toast/useToastStore';
import { ConfirmationModal } from '../../../components/shared/ConfirmationModal';
import { TableActionHeader } from './table-action/TableActionHeader';
import { TableActionTabSelector } from './table-action/TableActionTabSelector';
import { TableActionRoundList, RoundGroup } from './table-action/TableActionRoundList';
import { TableActionVoidModal } from './table-action/TableActionVoidModal';

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
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isConfirmCloseEmptyOpen, setIsConfirmCloseEmptyOpen] = useState(false);

  useEffect(() => {
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
  const rounds: RoundGroup[] = useMemo(() => {
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
    setIsVoidModalOpen(true);
  };

  const handleConfirmVoid = async (reason: string, pin?: string) => {
    if (!itemToVoid || !table) return;

    const isPostPrep = itemToVoid.status === 'preparing' || itemToVoid.status === 'ready';
    const staffId = currentUser?.id || '00000000-0000-0000-0000-000000000001';
    await voidOrderItem(itemToVoid.id, staffId, reason, table.id, selectedTabIndex);

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
        <View className="flex-1 bg-black/75 justify-center items-center p-5">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Close modal"
          />
          <View className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl max-h-[90%] flex-col">
            {/* 1. Header */}
            <TableActionHeader table={table} onClose={onClose} />

            {/* 2. Tab Selector */}
            {table.tabs && table.tabs.length > 0 ? (
              <TableActionTabSelector
                tabs={table.tabs}
                selectedTabIndex={selectedTabIndex}
                onSelectTab={setSelectedTabIndex}
              />
            ) : null}

            {/* 3. Items on Tab Section - Segmented per Round */}
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <TableActionRoundList
                currentTab={currentTab}
                tabTotal={tabTotal}
                selectedTabIndex={selectedTabIndex}
                rounds={rounds}
                onOpenVoidModal={handleOpenVoidModal}
              />

              {/* 4. Natural Service Progression Actions */}
              <View className="gap-3 pt-2">
                {/* 1. ORDERING: Start Order / Next Round */}
                <Pressable
                  onPress={() => {
                    onClose();
                    onOpenOrderEntry(table, selectedTabIndex, nextRound);
                  }}
                  className="flex-row items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-wine-800 active:bg-wine-900 min-h-[48px] shadow-sm"
                  accessibilityRole="button"
                  accessibilityLabel={`Start Round ${nextRound} Order`}
                >
                  <UtensilsCrossed size={18} color="#ffffff" strokeWidth={2.3} />
                  <Text className="text-base font-extrabold text-white">
                    + Start Round {nextRound} Order
                  </Text>
                </Pressable>

                {/* 2 & 3. TAB MANAGEMENT: Split Tab & Transfer */}
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => {
                      onClose();
                      onOpenNewTab(table);
                    }}
                    className="flex-1 flex-row items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-emerald-600 bg-emerald-50 active:bg-emerald-100 min-h-[48px]"
                    accessibilityRole="button"
                    accessibilityLabel="Open Split Tab"
                  >
                    <PlusCircle size={18} color="#15803d" strokeWidth={2.2} />
                    <Text className="text-base font-bold text-emerald-800">+ Open Split Tab</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      onClose();
                      onTransferTable(table);
                    }}
                    className="flex-1 flex-row items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-wine-300 bg-wine-50 active:bg-wine-100 min-h-[48px]"
                    accessibilityRole="button"
                    accessibilityLabel="Transfer Tab or Table"
                  >
                    <Repeat size={18} color="#641b2a" strokeWidth={2.2} />
                    <Text className="text-base font-bold text-wine-900">Transfer Tab/Table</Text>
                  </Pressable>
                </View>

                {/* 4. BILLING: Settle Tab */}
                <Pressable
                  onPress={() => {
                    onClose();
                    onCheckout(table, selectedTabIndex);
                  }}
                  className="flex-row items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-emerald-700 active:bg-emerald-800 min-h-[48px] shadow-sm"
                  accessibilityRole="button"
                  accessibilityLabel={`Settle Tab for ${formatCurrency(tabTotal)}`}
                >
                  <CreditCard size={18} color="#ffffff" strokeWidth={2.3} />
                  <Text className="text-base font-extrabold text-white">
                    Settle Tab · {formatCurrency(tabTotal)}
                  </Text>
                </Pressable>

                {/* 5. CLEANUP: Close Empty Tab */}
                {hasZeroItems ? (
                  <Pressable
                    onPress={() => setIsConfirmCloseEmptyOpen(true)}
                    className="flex-row items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-amber-300 bg-amber-50 active:bg-amber-100 min-h-[48px]"
                    accessibilityRole="button"
                    accessibilityLabel="Close empty tab"
                  >
                    <Trash2 size={16} color="#b45309" strokeWidth={2.2} />
                    <Text className="text-base font-bold text-amber-900">
                      Close / Clean Empty Tab #{selectedTabIndex}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Void Modal */}
      {isVoidModalOpen && itemToVoid ? (
        <TableActionVoidModal
          visible={isVoidModalOpen}
          item={itemToVoid}
          onClose={() => {
            setIsVoidModalOpen(false);
            setItemToVoid(null);
          }}
          onConfirmVoid={handleConfirmVoid}
        />
      ) : null}

      {/* Confirmation Modal for closing empty tab */}
      <ConfirmationModal
        visible={isConfirmCloseEmptyOpen}
        title="Close Empty Customer Tab?"
        message={`Tab #${selectedTabIndex} has 0 items. Are you sure you want to remove it and release the seat?`}
        confirmText="Yes, Close Tab"
        cancelText="Keep Tab Open"
        onConfirm={handleExecuteCloseEmptyTab}
        onCancel={() => setIsConfirmCloseEmptyOpen(false)}
        variant="warning"
      />
    </>
  );
};
