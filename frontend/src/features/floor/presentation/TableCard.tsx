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

const STATUS_VISUAL_MAP: Record<
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
    label: 'Ready',
    cardBorder: 'border-emerald-300',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
    dotBg: 'bg-emerald-500',
  },
  preparing: {
    label: 'Prep',
    cardBorder: 'border-amber-300',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
    dotBg: 'bg-amber-500',
  },
  served: {
    label: 'Served',
    cardBorder: 'border-[#810021]/30',
    badgeBg: 'bg-[#810021]/10 border-[#810021]/20',
    badgeText: 'text-[#810021]',
    dotBg: 'bg-[#810021]',
  },
  occupied: {
    label: 'Open',
    cardBorder: 'border-[#D6CFC7]',
    badgeBg: 'bg-[#FAF8F5] border-[#E7E5E4]',
    badgeText: 'text-[#1C1917]',
    dotBg: 'bg-[#78716C]',
  },
  empty: {
    label: 'Available',
    cardBorder: 'border-[#E7E5E4]',
    badgeBg: 'bg-[#FAF8F5] border-[#E7E5E4]',
    badgeText: 'text-[#57534E]',
    dotBg: 'bg-[#A8A29E]',
  },
};

const TAB_DOT_CLASS_MAP: Record<Exclude<TableStatus, 'empty'>, string> = {
  ready: 'bg-emerald-500',
  preparing: 'bg-amber-500',
  served: 'bg-[#810021]',
  occupied: 'bg-[#78716C]',
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

    const statusVisual = STATUS_VISUAL_MAP[status] ?? STATUS_VISUAL_MAP.empty;
    const formattedAmount =
      totalAmount !== undefined && totalAmount > 0 ? formatCurrency(totalAmount) : '₱0.00';
    const displayName = useMemo(() => formatTableDisplayName(code, area), [code, area]);

    return (
      <View
        className={`min-h-[188px] sm:min-h-[216px] justify-between rounded-2xl bg-white border p-4 ${statusVisual.cardBorder}`}
      >
        <View className="flex-1 justify-between">
          {/* 1. Top Clickable Header */}
          <Pressable
            onPress={() => onPress(table)}
            className={`${isEmpty ? 'flex-1 justify-between ' : ''}active:opacity-85`}
            accessibilityRole="button"
            accessibilityLabel={
              isEmpty
                ? `${displayName}, available. Tap to open tab.`
                : `${displayName}, ${status}, ${openTabs.length} tab${openTabs.length === 1 ? '' : 's'}, total ${formattedAmount}`
            }
          >
            {/* Top Row: Table Identifier + Quiet Status/Timer Pill */}
            <View className="mb-2.5 flex-row items-center justify-between gap-2">
              <View className="min-w-0 flex-1 justify-center">
                <Text
                  className={`font-extrabold tracking-tight ${
                    displayName.length > 10 ? 'text-pos-lg' : 'text-pos-xl'
                  } ${isEmpty ? 'text-[#44403C]' : 'text-[#1C1917]'}`}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {displayName}
                </Text>
              </View>

              <View
                className={`shrink-0 flex-row items-center gap-1.5 rounded-full border px-3 py-1 ${statusVisual.badgeBg}`}
              >
                <View className={`h-2 w-2 rounded-full ${statusVisual.dotBg}`} />
                <Text className={`text-base font-semibold ${statusVisual.badgeText}`}>
                  {statusVisual.label}
                </Text>
                {!isEmpty && (stateTimerIso || elapsedTime) ? (
                  <Text
                    className={`text-base font-semibold tabular-nums ${statusVisual.badgeText}`}
                  >
                    · {liveTimer.formattedTimer}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Available Metadata */}
            {isEmpty ? (
              <View className="flex-1 justify-center border-t border-[#E7E5E4]/80 py-2">
                <Text className="text-base font-medium text-[#57534E]">
                  {seats ? `${seats} ${seats === 1 ? 'seat' : 'seats'} · ` : ''}
                  {area === 'bar' ? 'Bar Area' : 'Cafe Area'}
                </Text>
              </View>
            ) : null}
          </Pressable>

          {/* 2. Active Middle Body: Guest/Tabs + Amount, then 1-line Items Summary */}
          {!isEmpty ? (
            <View className="flex-1 justify-between border-t border-[#E7E5E4]/80 pt-2.5">
              <View className="flex-row items-center justify-between gap-2">
                {isMultiTab ? (
                  <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
                    {visibleTabs.map((tab) => {
                      const tabStatus = deriveTabStatus(tab);
                      const dotClass = TAB_DOT_CLASS_MAP[tabStatus];
                      return (
                        <Pressable
                          key={tab.id || tab.tabIndex}
                          onPress={() => onPress(table, tab.tabIndex)}
                          className="min-h-[48px] shrink flex-row items-center gap-1.5 rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] px-2.5 py-2 active:opacity-80"
                          accessibilityRole="button"
                          accessibilityLabel={`Open tab for ${tab.guestName}`}
                        >
                          <View className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
                          <Text
                            className="max-w-[90px] text-base font-semibold text-[#1C1917]"
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
                        className="min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-xl border border-[#810021]/20 bg-[#810021]/10 px-2.5 active:opacity-80"
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
                    className="min-h-[48px] min-w-0 flex-1 flex-row items-center gap-2 active:opacity-80"
                    accessibilityRole="button"
                    accessibilityLabel={`Open tab for ${openTabs[0]?.guestName || 'Guest 1'}`}
                  >
                    <User size={18} color="#57534E" strokeWidth={2} />
                    <Text
                      className="shrink text-base font-semibold text-[#1C1917]"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {openTabs[0]?.guestName || 'Guest 1'}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => onPress(table)}
                  className="shrink-0 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel={`Total ${formattedAmount} for ${displayName}`}
                >
                  <Text className="text-pos-xl font-extrabold tabular-nums text-[#1C1917]">
                    {formattedAmount}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => onPress(table)}
                className="justify-center py-1 active:opacity-85"
                accessibilityRole="button"
                accessibilityLabel={`Open ${displayName} items summary`}
              >
                <Text
                  className="text-base font-normal text-[#57534E]"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {itemsSummary}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* 3. Bottom Row: Quiet Direct Action Footer (>= 48px touch targets) */}
        <View className="flex-row gap-2.5 pt-2">
          {isEmpty ? (
            <Pressable
              onPress={() => onPress(table)}
              className="min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-[#810021] px-4 py-2.5 active:opacity-85"
              accessibilityRole="button"
              accessibilityLabel={`Open Tab at ${displayName}`}
            >
              <Plus size={18} color="#F5F5F5" strokeWidth={2.2} />
              <Text className="text-base font-semibold text-white">Open Tab</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => (isReady ? onPress(table) : (onQuickOrder || onPress)(table))}
                className={`min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl px-3 py-2.5 active:opacity-80 ${
                  isReady
                    ? 'bg-emerald-50 border border-emerald-300'
                    : 'bg-[#FAF8F5] border border-[#E7E5E4]'
                }`}
                accessibilityRole="button"
                accessibilityLabel={
                  isReady ? `Deliver order for ${displayName}` : `Add order for ${displayName}`
                }
              >
                {isReady ? (
                  <CheckCircle2 size={18} color="#065F46" strokeWidth={2.2} />
                ) : (
                  <UtensilsCrossed size={18} color="#1C1917" strokeWidth={2} />
                )}
                <Text
                  className={`text-base font-semibold ${
                    isReady ? 'text-emerald-900' : 'text-[#1C1917]'
                  }`}
                >
                  {isReady ? 'Deliver' : '+ Order'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => (onQuickSettle || onPress)(table)}
                className={`min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl px-3 py-2.5 active:opacity-80 ${
                  isServed ? 'bg-[#810021]' : 'bg-white border border-[#E7E5E4]'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`Settle bill for ${displayName}`}
              >
                <CreditCard size={18} color={isServed ? '#F5F5F5' : '#1C1917'} strokeWidth={2} />
                <Text
                  className={`text-base font-semibold ${
                    isServed ? 'text-white' : 'text-[#1C1917]'
                  }`}
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
