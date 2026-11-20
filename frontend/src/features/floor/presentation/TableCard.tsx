import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plus, UtensilsCrossed, CreditCard, CheckCircle2, User } from 'lucide-react-native';
import { TableItem, TableStatus } from '../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { useLiveElapsedTimer } from '@/features/shared/utils/elapsedTime';
import {
  getOpenTabs,
  deriveTabStatus,
  formatTableDisplayName,
  summarizeTabItems,
} from '../domain/tableTabHelpers';

interface TableCardProps {
  table: TableItem;
  onPress: (table: TableItem, tabIndex?: number) => void;
  onQuickOrder?: (table: TableItem, tabIndex?: number) => void;
  onQuickSettle?: (table: TableItem, tabIndex?: number) => void;
}

const STATUS_STYLE_MAP: Record<
  TableStatus,
  {
    label: string;
    cardBorder: string;
    badgeBg: string;
    badgeText: string;
    dotBg: string;
  }
> = {
  ready: {
    label: 'READY',
    cardBorder: 'border-2 border-emerald-500',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    dotBg: 'bg-emerald-500',
  },
  preparing: {
    label: 'PREP',
    cardBorder: 'border-2 border-amber-500',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    dotBg: 'bg-amber-500',
  },
  served: {
    label: 'SERVED',
    cardBorder: 'border-2 border-[#810021]',
    badgeBg: 'bg-[#fdf2f4]',
    badgeText: 'text-[#810021]',
    dotBg: 'bg-[#810021]',
  },
  occupied: {
    label: 'OPEN',
    cardBorder: 'border-2 border-stone-400',
    badgeBg: 'bg-stone-100',
    badgeText: 'text-[#1c1917]',
    dotBg: 'bg-stone-600',
  },
  empty: {
    label: 'AVAILABLE',
    cardBorder: 'border border-stone-200',
    badgeBg: 'bg-[#faf8f5]',
    badgeText: 'text-[#57534E]',
    dotBg: 'bg-stone-400',
  },
};

const TAB_DOT_CLASS_MAP: Record<Exclude<TableStatus, 'empty'>, string> = {
  ready: 'bg-emerald-500',
  preparing: 'bg-amber-500',
  served: 'bg-[#810021]',
  occupied: 'bg-stone-500',
};

export const TableCard: React.FC<TableCardProps> = React.memo(
  ({ table, onPress, onQuickOrder, onQuickSettle }) => {
    const { code, area, seats, status, elapsedTime, totalAmount } = table;

    const isEmpty = status === 'empty';
    const isReady = status === 'ready';
    const isServed = status === 'served';

    const openTabs = useMemo(() => getOpenTabs(table), [table]);
    const isMultiTab = openTabs.length > 1;
    const visibleTabs = useMemo(() => openTabs.slice(0, 2), [openTabs]);
    const overflowCount = Math.max(0, openTabs.length - 2);

    const stateTimerIso = useMemo(() => {
      if (table.stateChangedAt) return table.stateChangedAt;
      if (table.occupiedSinceIso) return table.occupiedSinceIso;
      const isos = openTabs.filter((t) => t.openedAtIso).map((t) => t.openedAtIso as string);
      return isos[0];
    }, [table.stateChangedAt, table.occupiedSinceIso, openTabs]);

    const liveTimer = useLiveElapsedTimer(stateTimerIso, elapsedTime, 'floor', !isEmpty);

    const itemsSummary = useMemo(
      () => (isEmpty ? '' : summarizeTabItems(undefined, openTabs)),
      [isEmpty, openTabs]
    );

    const statusVisual = STATUS_STYLE_MAP[status] ?? STATUS_STYLE_MAP.empty;
    const formattedAmount =
      totalAmount !== undefined && totalAmount > 0 ? formatCurrency(totalAmount) : '₱0.00';
    const displayName = useMemo(() => formatTableDisplayName(code, area), [code, area]);

    return (
      <View
        className={`h-[228px] justify-between rounded-2xl bg-white p-3.5 ${statusVisual.cardBorder}`}
      >
        <View className="flex-1 justify-between">
          {/* 1. Top Clickable Header & Primary Summary (never wraps nested Pressable chips) */}
          <Pressable
            onPress={() => onPress(table)}
            className={`${isEmpty ? 'flex-1 justify-between ' : ''}active:opacity-90`}
            accessibilityRole="button"
            accessibilityLabel={
              isEmpty
                ? `${displayName}, available. Tap to open tab.`
                : `${displayName}, ${status}, ${openTabs.length} tab${openTabs.length === 1 ? '' : 's'}, total ${formattedAmount}`
            }
          >
            {/* Top Row: Table Identifier + Status/Timer Pill */}
            <View className="mb-2.5 flex-row items-center justify-between gap-2">
              <View className="min-w-0 flex-1 justify-center">
                <Text
                  className={`font-black tracking-tight ${
                    displayName.length > 10 ? 'text-pos-lg' : 'text-pos-xl'
                  } ${isEmpty ? 'text-[#44403C]' : 'text-[#1c1917]'}`}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {displayName}
                </Text>
              </View>

              <View
                className={`shrink-0 flex-row items-center gap-1.5 rounded-xl px-3 py-1.5 ${statusVisual.badgeBg}`}
              >
                <View className={`h-2.5 w-2.5 rounded-full ${statusVisual.dotBg}`} />
                <Text className={`text-base font-bold ${statusVisual.badgeText}`}>
                  {statusVisual.label}
                </Text>
                {!isEmpty && (stateTimerIso || elapsedTime) ? (
                  <Text className={`text-base font-bold tabular-nums ${statusVisual.badgeText}`}>
                    · {liveTimer.formattedTimer}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Available Metadata */}
            {isEmpty ? (
              <View className="flex-1 justify-center border-t border-stone-100 py-2">
                <Text className="text-base font-medium text-[#57534E]">
                  {seats ? `${seats} ${seats === 1 ? 'seat' : 'seats'} · ` : ''}
                  {area === 'bar' ? 'Bar Area' : 'Cafe Area'}
                </Text>
              </View>
            ) : null}
          </Pressable>

          {/* 2. Active Middle Body: Single-Row Guest/Tabs + Amount, then 1-line Items Summary */}
          {!isEmpty ? (
            <View className="flex-1 justify-between border-t border-stone-200/80 pt-2.5">
              <View className="flex-row items-center justify-between gap-2">
                {isMultiTab ? (
                  <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
                    {visibleTabs.map((tab) => {
                      const tabStatus = deriveTabStatus(tab);
                      const dotClass = TAB_DOT_CLASS_MAP[tabStatus];
                      const isTabReady = tabStatus === 'ready';
                      return (
                        <Pressable
                          key={tab.id || tab.tabIndex}
                          onPress={() => onPress(table, tab.tabIndex)}
                          className={`min-h-[48px] shrink flex-row items-center gap-1.5 rounded-xl border px-2.5 py-2 active:opacity-85 ${
                            isTabReady
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-stone-300 bg-[#faf8f5]'
                          }`}
                          accessibilityRole="button"
                          accessibilityLabel={`Open tab for ${tab.guestName}`}
                        >
                          <View className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
                          <Text
                            className="max-w-[84px] text-base font-semibold text-[#1c1917]"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {tab.guestName}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {overflowCount > 0 ? (
                      <Pressable
                        onPress={() => onPress(table, openTabs[2]?.tabIndex)}
                        className="min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-xl border border-[#810021]/25 bg-[#fdf2f4] px-2.5 active:opacity-85"
                        accessibilityRole="button"
                        accessibilityLabel={`View ${overflowCount} more tabs`}
                      >
                        <Text className="text-base font-bold tabular-nums text-[#810021]">
                          +{overflowCount}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <Pressable
                    onPress={() => onPress(table)}
                    className="min-h-[48px] min-w-0 flex-1 flex-row items-center gap-2 active:opacity-85"
                    accessibilityRole="button"
                    accessibilityLabel={`Open tab for ${openTabs[0]?.guestName || 'Guest 1'}`}
                  >
                    <User size={18} color="#57534E" strokeWidth={2.2} />
                    <Text
                      className="shrink text-base font-bold text-[#1c1917]"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {openTabs[0]?.guestName || 'Guest 1'}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => onPress(table)}
                  className="shrink-0 active:opacity-85"
                  accessibilityRole="button"
                  accessibilityLabel={`Total ${formattedAmount} for ${displayName}`}
                >
                  <Text className="text-pos-xl font-black tabular-nums text-[#1c1917]">
                    {formattedAmount}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => onPress(table)}
                className="justify-center py-1 active:opacity-90"
                accessibilityRole="button"
                accessibilityLabel={`Open ${displayName} items summary`}
              >
                <Text
                  className="text-base font-medium text-[#57534E]"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {itemsSummary}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* 3. Bottom Row: Direct Action Footer (≥ 48px touch targets) */}
        <View className="flex-row gap-2.5 pt-1">
          {isEmpty ? (
            <Pressable
              onPress={() => onPress(table)}
              className="min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-stone-300 bg-[#faf8f5] px-4 py-2.5 active:bg-stone-200"
              accessibilityRole="button"
              accessibilityLabel={`Open Tab at ${displayName}`}
            >
              <Plus size={18} color="#810021" strokeWidth={2.5} />
              <Text className="text-base font-bold text-[#1c1917]">Open Tab</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => (isReady ? onPress(table) : (onQuickOrder || onPress)(table))}
                className={`min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl px-3 py-2.5 active:opacity-85 ${
                  isReady ? 'bg-emerald-700' : 'border border-stone-300 bg-[#faf8f5]'
                }`}
                accessibilityRole="button"
                accessibilityLabel={
                  isReady ? `Deliver order for ${displayName}` : `Add order for ${displayName}`
                }
              >
                {isReady ? (
                  <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.4} />
                ) : (
                  <UtensilsCrossed size={18} color="#1c1917" strokeWidth={2.3} />
                )}
                <Text
                  className={`text-base font-bold ${isReady ? 'text-white' : 'text-[#1c1917]'}`}
                >
                  {isReady ? 'Deliver' : '+ Order'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => (onQuickSettle || onPress)(table)}
                className={`min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl px-3 py-2.5 active:opacity-85 ${
                  isServed ? 'bg-[#810021]' : 'border-[1.5px] border-[#810021]/35 bg-white'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`Settle bill for ${displayName}`}
              >
                <CreditCard size={18} color={isServed ? '#ffffff' : '#810021'} strokeWidth={2.3} />
                <Text
                  className={`text-base font-bold ${isServed ? 'text-white' : 'text-[#810021]'}`}
                >
                  Settle
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  }
);

TableCard.displayName = 'TableCard';
