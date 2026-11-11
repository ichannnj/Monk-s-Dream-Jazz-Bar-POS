import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useVirtualKeyboard, TouchTextInput } from '@/features/shared';
import {
  X,
  ArrowRightLeft,
  Plus,
  Check,
  Minus,
  Wine,
  ChefHat,
  UserCheck,
} from 'lucide-react-native';
import { TableItem, OrderLineItem, CustomerTab } from '@/types/floor';
import { formatCurrency } from '@monks/shared';
import { useOrderStore } from '@/features/orders';
import { toast } from '@/features/shared/toast/useToastStore';

interface TableItemTransferModalProps {
  visible: boolean;
  table: TableItem | null;
  sourceTabIndex: number;
  onClose: () => void;
  onTransferSuccess?: () => void;
}

export const TableItemTransferModal: React.FC<TableItemTransferModalProps> = ({
  visible,
  table,
  sourceTabIndex,
  onClose,
  onTransferSuccess,
}) => {
  const { transferOrderItemsToTab } = useOrderStore();

  const sourceTab = useMemo(
    () => table?.tabs?.find((t) => t.tabIndex === sourceTabIndex),
    [table, sourceTabIndex]
  );

  const availableTargetTabs = useMemo(
    () => (table?.tabs || []).filter((t) => t.tabIndex !== sourceTabIndex),
    [table, sourceTabIndex]
  );

  // Selected quantities to move: { [orderItemId]: quantityToMove }
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // Destination: either a tabIndex number or 'new'
  const [targetDestination, setTargetDestination] = useState<number | 'new'>(
    availableTargetTabs.length > 0 ? availableTargetTabs[0].tabIndex : 'new'
  );

  const [newTabCustomName, setNewTabCustomName] = useState<string>('Senior Citizen Tab');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isKeyboardOpen, keyboardHeight, viewportHeight, dismissKeyboard } = useVirtualKeyboard();

  const handleBackdropPress = () => {
    if (isKeyboardOpen) {
      dismissKeyboard();
    }
    onClose();
  };

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedQuantities({});
      setTargetDestination(
        availableTargetTabs.length > 0 ? availableTargetTabs[0].tabIndex : 'new'
      );
      setNewTabCustomName('Senior Citizen Tab');
      setIsSubmitting(false);
    }
  }, [visible, availableTargetTabs]);

  if (!visible || !table || !sourceTab) return null;

  const activeItems = (sourceTab.items || []).filter((i) => i.status !== 'cancelled');

  const totalSelectedItemsCount = Object.values(selectedQuantities).reduce(
    (acc, qty) => acc + (qty || 0),
    0
  );

  const handleToggleSelectAll = (item: OrderLineItem) => {
    const current = selectedQuantities[item.id] || 0;
    setSelectedQuantities((prev) => ({
      ...prev,
      [item.id]: current > 0 ? 0 : item.quantity,
    }));
  };

  const handleAdjustQuantity = (item: OrderLineItem, delta: number) => {
    const current = selectedQuantities[item.id] || 0;
    const next = Math.max(0, Math.min(item.quantity, current + delta));
    setSelectedQuantities((prev) => ({
      ...prev,
      [item.id]: next,
    }));
  };

  const handleConfirmTransfer = async () => {
    if (totalSelectedItemsCount === 0) {
      toast.warning('Please select at least one item to move.');
      return;
    }

    const itemTransfers = Object.entries(selectedQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

    setIsSubmitting(true);
    try {
      await transferOrderItemsToTab(
        table.id,
        sourceTabIndex,
        targetDestination,
        itemTransfers,
        targetDestination === 'new' ? newTabCustomName : undefined
      );

      const destLabel =
        targetDestination === 'new' ? newTabCustomName : `Tab #${targetDestination}`;

      toast.success(
        `Moved ${totalSelectedItemsCount} item(s) from Tab #${sourceTabIndex} to ${destLabel}.`,
        { title: 'Items Transferred' }
      );

      if (onTransferSuccess) onTransferSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to transfer items. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 bg-black/75 items-center p-3 sm:p-5"
        style={{
          justifyContent: isKeyboardOpen ? 'flex-start' : 'center',
          paddingTop: isKeyboardOpen ? 12 : undefined,
          paddingBottom: isKeyboardOpen ? Math.min(keyboardHeight, 320) + 16 : undefined,
        }}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleBackdropPress}
          accessibilityLabel="Close modal"
        />

        <View
          className="w-full max-w-xl bg-white rounded-3xl p-5 sm:p-6 shadow-2xl flex-col"
          style={{
            maxHeight: isKeyboardOpen ? Math.max(260, viewportHeight - 24) : '92%',
          }}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-100">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-2xl bg-wine-800 items-center justify-center">
                <ArrowRightLeft size={20} color="#ffffff" strokeWidth={2.5} />
              </View>
              <View>
                <Text className="text-xl font-extrabold text-gray-900">Split / Move Items</Text>
                <Text className="text-sm font-semibold text-gray-500">
                  Table {table.code} · From Tab #{sourceTabIndex} ({sourceTab.guestName})
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
              accessibilityRole="button"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={isKeyboardOpen ? { paddingBottom: 48 } : undefined}
          >
            {/* 1. Destination Tab Section */}
            <View className="mb-5 bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
              <Text className="text-xs font-black uppercase tracking-wider text-amber-900 mb-2">
                Move Selected Items To:
              </Text>

              <View className="flex-row flex-wrap gap-2 mb-3">
                {availableTargetTabs.map((tb) => {
                  const isSelected = targetDestination === tb.tabIndex;
                  return (
                    <Pressable
                      key={tb.tabIndex}
                      onPress={() => setTargetDestination(tb.tabIndex)}
                      className={`py-2 px-3.5 rounded-xl border flex-row items-center gap-2 ${
                        isSelected
                          ? 'bg-wine-900 border-wine-900'
                          : 'bg-white border-gray-300 active:bg-gray-50'
                      }`}
                    >
                      <Text
                        className={`text-sm font-bold ${
                          isSelected ? 'text-white' : 'text-gray-800'
                        }`}
                      >
                        Tab #{tb.tabIndex} ({tb.guestName})
                      </Text>
                      {isSelected && <Check size={16} color="#ffffff" strokeWidth={3} />}
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={() => setTargetDestination('new')}
                  className={`py-2 px-3.5 rounded-xl border flex-row items-center gap-2 ${
                    targetDestination === 'new'
                      ? 'bg-wine-900 border-wine-900'
                      : 'bg-white border-dashed border-wine-400 active:bg-wine-50'
                  }`}
                >
                  <Plus
                    size={16}
                    color={targetDestination === 'new' ? '#ffffff' : '#641b2a'}
                    strokeWidth={2.5}
                  />
                  <Text
                    className={`text-sm font-bold ${
                      targetDestination === 'new' ? 'text-white' : 'text-wine-900'
                    }`}
                  >
                    + New Sub-Tab
                  </Text>
                  {targetDestination === 'new' && (
                    <Check size={16} color="#ffffff" strokeWidth={3} />
                  )}
                </Pressable>
              </View>

              {/* Sub-tab Name Input when "New Sub-Tab" is selected */}
              {targetDestination === 'new' && (
                <View className="bg-white rounded-xl p-3 border border-amber-300">
                  <Text className="text-xs font-bold text-gray-700 mb-1.5">
                    New Sub-Tab Name / Purpose:
                  </Text>
                  <TouchTextInput
                    value={newTabCustomName}
                    onChangeText={setNewTabCustomName}
                    placeholder="e.g. Senior Citizen Tab"
                    placeholderTextColor="#9ca3af"
                    containerClassName="mb-2"
                    className="font-semibold bg-gray-50 text-base"
                  />
                  {/* Quick Preset Chips */}
                  <View className="flex-row flex-wrap gap-1.5">
                    {['Senior Citizen (SC)', 'PWD Guest', 'Bar Drinks Only', 'Guest 2'].map(
                      (preset) => (
                        <Pressable
                          key={preset}
                          onPress={() => setNewTabCustomName(preset)}
                          className="py-1 px-2.5 rounded-md bg-amber-100 active:bg-amber-200 border border-amber-200"
                        >
                          <Text className="text-xs font-bold text-amber-900">{preset}</Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* 2. Items List */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-2.5">
                <Text className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Select Items to Move ({activeItems.length})
                </Text>
                <Text className="text-xs font-semibold text-gray-400">
                  Tap item or use +/- for partial quantity
                </Text>
              </View>

              {activeItems.length === 0 ? (
                <View className="p-8 items-center justify-center bg-gray-50 rounded-2xl">
                  <Text className="text-gray-400 font-medium text-sm">
                    No active items on this tab.
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {activeItems.map((item) => {
                    const selectedQty = selectedQuantities[item.id] || 0;
                    const isSelected = selectedQty > 0;

                    return (
                      <View
                        key={item.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-wine-50/50 border-wine-300 shadow-sm'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <View className="flex-row justify-between items-center">
                          {/* Item Info */}
                          <Pressable
                            onPress={() => handleToggleSelectAll(item)}
                            className="flex-1 flex-row items-center gap-2.5 mr-2"
                          >
                            <View
                              className={`w-5 h-5 rounded-md border items-center justify-center ${
                                isSelected
                                  ? 'bg-wine-800 border-wine-800'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                            </View>

                            <View className="flex-1">
                              <View className="flex-row items-center gap-1.5">
                                {item.stationTarget === 'bar' ? (
                                  <Wine size={14} color="#0284c7" />
                                ) : (
                                  <ChefHat size={14} color="#ea580c" />
                                )}
                                <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                                  {item.productName}
                                </Text>
                              </View>
                              <Text className="text-xs text-gray-500 font-medium">
                                {formatCurrency(item.unitPrice)} each · Total on tab:{' '}
                                {item.quantity}
                              </Text>
                            </View>
                          </Pressable>

                          {/* Quantity Counter */}
                          <View className="flex-row items-center gap-2 bg-gray-100 rounded-xl p-1 border border-gray-200">
                            <Pressable
                              onPress={() => handleAdjustQuantity(item, -1)}
                              disabled={selectedQty === 0}
                              className={`w-7 h-7 rounded-lg items-center justify-center ${
                                selectedQty === 0
                                  ? 'opacity-30'
                                  : 'bg-white active:bg-gray-200 shadow-sm'
                              }`}
                            >
                              <Minus size={14} color="#374151" strokeWidth={2.5} />
                            </Pressable>

                            <Text className="text-sm font-extrabold text-gray-900 min-w-[20px] text-center">
                              {selectedQty}
                            </Text>

                            <Pressable
                              onPress={() => handleAdjustQuantity(item, 1)}
                              disabled={selectedQty >= item.quantity}
                              className={`w-7 h-7 rounded-lg items-center justify-center ${
                                selectedQty >= item.quantity
                                  ? 'opacity-30'
                                  : 'bg-white active:bg-gray-200 shadow-sm'
                              }`}
                            >
                              <Plus size={14} color="#374151" strokeWidth={2.5} />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Action Bar */}
          <View className="pt-3 border-t border-gray-100 flex-row items-center gap-3">
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              className="py-3 px-5 rounded-2xl bg-gray-100 active:bg-gray-200 min-h-[48px] items-center justify-center"
            >
              <Text className="text-sm font-bold text-gray-700">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirmTransfer}
              disabled={totalSelectedItemsCount === 0 || isSubmitting}
              className={`flex-1 py-3 px-5 rounded-2xl flex-row items-center justify-center gap-2 min-h-[48px] ${
                totalSelectedItemsCount === 0 || isSubmitting
                  ? 'bg-gray-300 opacity-60'
                  : 'bg-wine-900 active:bg-wine-950 shadow-md'
              }`}
            >
              <ArrowRightLeft size={18} color="#ffffff" strokeWidth={2.3} />
              <Text className="text-base font-extrabold text-white">
                {isSubmitting
                  ? 'Moving...'
                  : totalSelectedItemsCount > 0
                    ? `Move ${totalSelectedItemsCount} Item(s)`
                    : 'Select Items to Move'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
