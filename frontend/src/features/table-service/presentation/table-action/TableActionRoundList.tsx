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
    <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4">
      {/* Header Row */}
      <View className="flex-row justify-between items-center pb-3 border-b border-gray-200 mb-3">
        <Text className="text-base font-extrabold text-gray-800">
          Tab #{selectedTabIndex}: {currentTab?.guestName || 'Guest Tab'} (
          {currentTab?.items.length || 0} items)
        </Text>
        <Text className="text-lg font-black text-wine-900">{formatCurrency(tabTotal)}</Text>
      </View>

      {/* Rounds list or Empty */}
      {rounds.length > 0 ? (
        <View className="gap-3.5">
          {rounds.map((round) => (
            <View
              key={round.roundNum}
              className="bg-white rounded-2xl border border-gray-200 p-3.5 shadow-sm"
            >
              {/* Round Header */}
              <View className="flex-row justify-between items-center mb-3 pb-2.5 border-b border-gray-100">
                <View className="flex-row items-center gap-2.5">
                  <View className="w-8 h-8 rounded-lg bg-wine-100 items-center justify-center">
                    <Text className="text-base font-black text-wine-800">R{round.roundNum}</Text>
                  </View>
                  <View>
                    <Text className="text-base font-bold text-gray-900">
                      Round {round.roundNum}
                    </Text>
                    <Text className="text-base text-gray-500 font-medium">
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
                    className="text-base font-bold uppercase tracking-wider"
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
                      className="flex-row justify-between items-center py-1.5 border-b border-gray-50"
                    >
                      <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                        {item.stationTarget === 'bar' ? (
                          <Wine size={16} color={isVoided ? '#9ca3af' : '#0284c7'} />
                        ) : (
                          <ChefHat size={16} color={isVoided ? '#9ca3af' : '#ea580c'} />
                        )}
                        <Text
                          className={`text-base font-medium flex-1 ${
                            isVoided ? 'line-through text-gray-400' : 'text-gray-800'
                          }`}
                          numberOfLines={1}
                        >
                          {item.quantity}x {item.productName}
                        </Text>

                        {/* Item Status Badge */}
                        <View
                          className={`px-2 py-0.5 rounded ${
                            item.status === 'ready'
                              ? 'bg-emerald-100'
                              : item.status === 'preparing'
                                ? 'bg-amber-100'
                                : item.status === 'served'
                                  ? 'bg-slate-100'
                                  : isVoided
                                    ? 'bg-rose-100'
                                    : 'bg-gray-100'
                          }`}
                        >
                          <Text
                            className={`text-base font-bold uppercase ${
                              item.status === 'ready'
                                ? 'text-emerald-700'
                                : item.status === 'preparing'
                                  ? 'text-amber-800'
                                  : item.status === 'served'
                                    ? 'text-slate-600'
                                    : isVoided
                                      ? 'text-rose-700'
                                      : 'text-gray-500'
                            }`}
                          >
                            {isVoided ? 'VOIDED' : item.status}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2.5">
                        <Text
                          className={`text-base font-bold ${
                            isVoided ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </Text>

                        {!isVoided ? (
                          <Pressable
                            onPress={() => onOpenVoidModal(item)}
                            className="min-h-[48px] min-w-[48px] rounded-xl bg-rose-50 items-center justify-center active:bg-rose-100"
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
        <Text className="text-base text-gray-400 text-center py-4 italic">
          No items added yet to this tab.
        </Text>
      )}
    </View>
  );
};
