import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Wine, ChefHat, Trash2 } from 'lucide-react-native';
import { OrderLineItem, CustomerTab } from '../../../../types/floor';
import { formatCurrency } from '@monks/shared';

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
}

export const TableActionRoundList: React.FC<TableActionRoundListProps> = ({
  currentTab,
  tabTotal,
  selectedTabIndex,
  rounds,
  onOpenVoidModal,
}) => {
  return (
    <View className="bg-[#FAF8F5] border border-stone-200 rounded-2xl p-4 mb-4">
      {/* Header Row */}
      <View className="flex-row justify-between items-center pb-3 border-b border-stone-200 mb-3">
        <Text className="text-base font-extrabold text-stone-800">
          Tab #{selectedTabIndex}: {currentTab?.guestName || 'Guest Tab'} (
          {currentTab?.items.length || 0} items)
        </Text>
        <Text className="text-lg font-black text-[#810021]">{formatCurrency(tabTotal)}</Text>
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
                  <View className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-stone-200 items-center justify-center">
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

              {/* Round Items */}
              <View className="gap-2.5">
                {round.items.map((item, idx) => {
                  const isVoided = item.status === 'cancelled';
                  return (
                    <View
                      key={item.id || idx}
                      className="flex-row justify-between items-center py-1.5 border-b border-stone-100"
                    >
                      <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                        {item.stationTarget === 'bar' ? (
                          <Wine size={16} color={isVoided ? '#9ca3af' : '#810021'} />
                        ) : (
                          <ChefHat size={16} color={isVoided ? '#9ca3af' : '#1C1917'} />
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
                        </View>

                        {/* Item Status Badge */}
                        <View
                          className={`px-2 py-0.5 rounded ${
                            item.status === 'ready'
                              ? 'bg-[#810021]'
                              : isVoided
                                ? 'bg-stone-100'
                                : 'bg-[#FAF8F5] border border-stone-200'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold uppercase ${
                              item.status === 'ready'
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

                      <View className="flex-row items-center gap-2.5">
                        <Text
                          className={`text-base font-bold ${
                            isVoided ? 'line-through text-stone-400' : 'text-stone-900'
                          }`}
                        >
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </Text>

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
