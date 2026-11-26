import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Wine, ChefHat, Trash2, Ticket, Edit3, Plus, Check } from 'lucide-react-native';
import { OrderLineItem, CustomerTab } from '../../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { useLiveNow, getItemElapsedMetrics } from '../../../shared/utils/elapsedTime';
import { useKeyedCooldown } from '../../../shared/hooks/useAsyncAction';

export interface RoundGroup {
  roundNum: number;
  items: OrderLineItem[];
  roundTotal: number;
  statusText: string;
  statusBg: string;
  statusColor: string;
}

interface TableActionRoundListProps {
  currentTab?: CustomerTab;
  tabTotal: number;
  selectedTabIndex: number;
  rounds: RoundGroup[];
  onOpenVoidModal: (item: OrderLineItem) => void;
  onServeItem?: (item: OrderLineItem) => void;
  onServeRoundReady?: (roundNum: number) => void;
  onEditDoorCharge?: () => void;
  onAddDoorCharge?: () => void;
}

export const TableActionRoundList: React.FC<TableActionRoundListProps> = ({
  currentTab,
  tabTotal,
  selectedTabIndex,
  rounds,
  onOpenVoidModal,
  onServeItem,
  onServeRoundReady,
  onEditDoorCharge,
  onAddDoorCharge,
}) => {
  const nowMs = useLiveNow(true);
  const { lock } = useKeyedCooldown(500);
  // Check if currentTab has door charge
  const doorChargeItem = currentTab?.items.find(
    (i) =>
      i.status !== 'cancelled' &&
      (i.categorySlug === 'door_charge' ||
        i.productId === 'd1000001-0000-0000-0000-000000000001' ||
        i.productName?.toLowerCase().includes('door charge'))
  );

  return (
    <View className="bg-[#EFECE6] border border-stone-200 rounded-2xl p-4 mb-4">
      {/* Header Row */}
      <View className="flex-row justify-between items-center pb-3 border-b border-stone-200 mb-3">
        <Text className="text-base font-extrabold text-stone-900">
          Tab #{selectedTabIndex}: {currentTab?.guestName || 'Guest'} ·{' '}
          {currentTab?.items.length || 0} items
        </Text>
        <Text className="text-lg font-black text-[#810021]">{formatCurrency(tabTotal)}</Text>
      </View>

      {/* Door Charge Admission Banner */}
      <View className="bg-white rounded-xl border border-stone-200 p-3 mb-3">
        {doorChargeItem ? (
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-lg bg-[#EFECE6] border border-stone-200 items-center justify-center">
                <Ticket size={16} color="#810021" />
              </View>
              <View>
                <Text className="text-sm font-bold text-stone-900">
                  Cover: {doorChargeItem.quantity} Pax ·{' '}
                  {formatCurrency(doorChargeItem.unitPrice * doorChargeItem.quantity)}
                </Text>
                <Text className="text-xs text-stone-500 font-medium">
                  {formatCurrency(doorChargeItem.unitPrice)} / head
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-1.5">
              {onEditDoorCharge && (
                <Pressable
                  onPress={onEditDoorCharge}
                  className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EFECE6] border border-stone-200 active:bg-stone-100 min-h-[36px]"
                >
                  <Edit3 size={13} color="#810021" />
                  <Text className="text-xs font-bold text-[#810021]">Edit</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => onOpenVoidModal(doorChargeItem)}
                className="p-1.5 rounded-lg bg-stone-50 border border-stone-200 active:bg-stone-100 min-h-[36px] min-w-[36px] items-center justify-center"
                accessibilityLabel="Void Door Charge"
              >
                <Trash2 size={13} color="#78716C" />
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-2">
              <Ticket size={15} color="#78716C" />
              <Text className="text-xs text-stone-500 font-semibold">No door cover</Text>
            </View>
            {onAddDoorCharge && (
              <Pressable
                onPress={onAddDoorCharge}
                className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EFECE6] border border-stone-200 active:bg-stone-100 min-h-[36px]"
              >
                <Plus size={13} color="#810021" />
                <Text className="text-xs font-bold text-[#810021]">+ Cover</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Rounds list or Empty */}
      {rounds.length > 0 ? (
        <View className="gap-3.5">
          {rounds.map((round) => (
            <View
              key={round.roundNum}
              className="bg-white rounded-2xl border border-stone-200 p-3.5 shadow-xs"
            >
              {/* Round Header */}
              <View className="flex-row justify-between items-center mb-3 pb-2.5 border-b border-stone-100">
                <View className="flex-row items-center gap-2.5">
                  <View className="w-8 h-8 rounded-lg bg-[#EFECE6] border border-stone-200 items-center justify-center">
                    <Text className="text-base font-black text-[#810021]">R{round.roundNum}</Text>
                  </View>
                  <View>
                    <Text className="text-base font-bold text-stone-900">
                      Round {round.roundNum}
                    </Text>
                    <Text className="text-sm text-stone-500 font-medium">
                      {round.items.length} item{round.items.length > 1 ? 's' : ''} ·{' '}
                      {formatCurrency(round.roundTotal)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-2">
                  {onServeRoundReady &&
                  round.items.filter((i) => i.status === 'ready').length > 0 ? (
                    <Pressable
                      onPress={() => {
                        if (!lock(`table:round-serve:${round.roundNum}`)) return;
                        onServeRoundReady(round.roundNum);
                      }}
                      className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#810021] active:opacity-85 min-h-[36px]"
                      accessibilityRole="button"
                      accessibilityLabel={`Serve ready items in Round ${round.roundNum}`}
                    >
                      <Check size={13} color="#F7F5F2" strokeWidth={2.5} />
                      <Text className="text-xs font-bold text-white">
                        Serve Ready ({round.items.filter((i) => i.status === 'ready').length})
                      </Text>
                    </Pressable>
                  ) : null}

                  <View
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: round.statusBg }}
                  >
                    <Text
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: round.statusColor }}
                    >
                      {round.statusText}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Round Items */}
              <View className="gap-2.5">
                {round.items.map((item, idx) => {
                  const isVoided = item.status === 'cancelled';
                  const isReady = item.status === 'ready';
                  const metrics = getItemElapsedMetrics(item, nowMs);
                  return (
                    <View
                      key={item.id || idx}
                      className="flex-row justify-between items-center py-1.5 border-b border-stone-100"
                    >
                      <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                        {item.stationTarget === 'bar' ? (
                          <Wine size={16} color={isVoided ? '#9ca3af' : '#810021'} />
                        ) : (
                          <ChefHat size={16} color={isVoided ? '#9ca3af' : '#1A1617'} />
                        )}
                        <View className="flex-1">
                          <Text
                            className={`text-base font-medium ${
                              isVoided ? 'line-through text-stone-400' : 'text-stone-800'
                            }`}
                            numberOfLines={1}
                          >
                            {item.quantity}x {item.productName}
                          </Text>
                          {item.variantSelections && item.variantSelections.length > 0 ? (
                            <Text className="text-xs text-stone-600 font-bold mt-0.5">
                              {item.variantSelections
                                .map((s) => s.optionNameSnapshot)
                                .filter(Boolean)
                                .join(', ')}
                            </Text>
                          ) : null}
                          {item.modifiers && item.modifiers.length > 0 ? (
                            <Text className="text-xs text-[#810021] font-semibold mt-0.5">
                              + {item.modifiers.join(', ')}
                            </Text>
                          ) : null}
                          {item.notes ? (
                            <Text className="text-xs text-stone-500 italic mt-0.5">
                              "{item.notes}"
                            </Text>
                          ) : null}
                          {metrics.breakdown.summaryText ? (
                            <Text className="text-[11px] text-stone-400 font-medium mt-0.5 tabular-nums">
                              {metrics.breakdown.summaryText}
                            </Text>
                          ) : null}
                        </View>

                        {/* Per-Item Live Elapsed Timer Pill */}
                        {!isVoided ? (
                          <View
                            className={`px-2 py-0.5 rounded ${
                              metrics.isFrozen
                                ? 'bg-stone-100'
                                : metrics.urgency === 'late'
                                  ? 'bg-rose-100'
                                  : metrics.urgency === 'warning'
                                    ? 'bg-amber-100'
                                    : 'bg-[#EFECE6]'
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold tabular-nums ${
                                metrics.isFrozen
                                  ? 'text-stone-500'
                                  : metrics.urgency === 'late'
                                    ? 'text-rose-800'
                                    : metrics.urgency === 'warning'
                                      ? 'text-amber-800'
                                      : 'text-stone-700'
                              }`}
                            >
                              {metrics.displayTimer}
                            </Text>
                          </View>
                        ) : null}

                        {/* Item Status Badge */}
                        <View
                          className={`px-2 py-0.5 rounded ${
                            isReady
                              ? 'bg-[#810021]'
                              : isVoided
                                ? 'bg-stone-100'
                                : 'bg-[#EFECE6] border border-stone-200'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold uppercase ${
                              isReady
                                ? 'text-white'
                                : isVoided
                                  ? 'text-stone-400'
                                  : 'text-stone-700'
                            }`}
                          >
                            {isVoided ? 'VOIDED' : item.status}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        <Text
                          className={`text-base font-bold ${
                            isVoided ? 'line-through text-stone-400' : 'text-stone-900'
                          }`}
                        >
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </Text>

                        {isReady && onServeItem ? (
                          <Pressable
                            onPress={() => {
                              if (!lock(`table:item-serve:${item.id}`)) return;
                              onServeItem(item);
                            }}
                            className="min-h-[44px] px-2.5 rounded-xl bg-[#810021] flex-row items-center justify-center gap-1 active:opacity-85"
                            accessibilityRole="button"
                            accessibilityLabel={`Serve ${item.productName}`}
                          >
                            <Check size={14} color="#F7F5F2" strokeWidth={2.5} />
                            <Text className="text-xs font-bold text-white">Serve</Text>
                          </Pressable>
                        ) : null}

                        {!isVoided ? (
                          <Pressable
                            onPress={() => onOpenVoidModal(item)}
                            className="min-h-[44px] min-w-[44px] rounded-xl bg-stone-100 border border-stone-200 items-center justify-center active:bg-stone-200"
                            accessibilityRole="button"
                            accessibilityLabel={`Void ${item.productName}`}
                          >
                            <Trash2 size={16} color="#78716C" />
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
        <Text className="text-sm text-stone-400 text-center py-4 italic">
          No items added yet to this tab.
        </Text>
      )}
    </View>
  );
};
