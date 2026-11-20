import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plus, UtensilsCrossed, CreditCard, CheckCircle2, User } from 'lucide-react-native';
import { TableItem } from '../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { useLiveElapsedTimer } from '@/features/shared/utils/elapsedTime';
import {
  getOpenTabs,
  deriveTabStatus,
  formatTableDisplayName,
  summarizeTabItems,
  TAB_STATUS_DOT_COLORS,
} from '../domain/tableTabHelpers';
import { styles } from './TableCard.styles';

interface TableCardProps {
  table: TableItem;
  onPress: (table: TableItem, tabIndex?: number) => void;
  onQuickOrder?: (table: TableItem, tabIndex?: number) => void;
  onQuickSettle?: (table: TableItem, tabIndex?: number) => void;
}

export const TableCard: React.FC<TableCardProps> = React.memo(
  ({ table, onPress, onQuickOrder, onQuickSettle }) => {
    const { code, area, seats, status, elapsedTime, totalAmount } = table;

    const isEmpty = status === 'empty';
    const isReady = status === 'ready';
    const isPrep = status === 'preparing';
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

    const statusConfig = useMemo(() => {
      switch (status) {
        case 'ready':
          return {
            label: 'READY',
            bg: '#ecfdf5',
            color: '#047857',
            dotColor: '#10b981',
          };
        case 'preparing':
          return {
            label: 'PREP',
            bg: '#fffbeb',
            color: '#b45309',
            dotColor: '#f59e0b',
          };
        case 'served':
          return {
            label: 'SERVED',
            bg: '#fdf2f4',
            color: '#810021',
            dotColor: '#810021',
          };
        case 'occupied':
          return {
            label: 'OCCUPIED',
            bg: '#f8fafc',
            color: '#334155',
            dotColor: '#64748b',
          };
        case 'empty':
        default:
          return {
            label: 'AVAILABLE',
            bg: '#f5f5f4',
            color: '#78716c',
            dotColor: '#a8a29e',
          };
      }
    }, [status]);

    const formattedAmount =
      totalAmount !== undefined && totalAmount > 0 ? formatCurrency(totalAmount) : '₱0.00';

    const getCardVariantStyle = () => {
      if (isEmpty) return styles.cardEmpty;
      if (isReady) return styles.cardReady;
      if (isPrep) return styles.cardPrep;
      if (isServed) return styles.cardServed;
      return styles.cardOccupied;
    };

    const displayName = useMemo(() => formatTableDisplayName(code, area), [code, area]);

    return (
      <View style={[styles.cardContainer, getCardVariantStyle()]}>
        <Pressable
          onPress={() => onPress(table)}
          style={({ pressed }) => [styles.mainPressableArea, pressed && styles.cardPressed]}
          accessibilityLabel={
            isEmpty
              ? `${displayName}, available. Tap to open tab.`
              : `${displayName}, ${status}, ${openTabs.length} tab${openTabs.length === 1 ? '' : 's'}, total ${formattedAmount}`
          }
        >
          {/* 1. Top Row: Table Identifier + Status Badge */}
          <View style={styles.cardHeader}>
            <View style={styles.codeCol}>
              <Text
                style={[
                  styles.tableCodeText,
                  isEmpty && styles.tableCodeTextEmpty,
                  displayName.length > 10 && styles.tableCodeTextLong,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayName}
              </Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusConfig.dotColor }]} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
              {!isEmpty && (stateTimerIso || elapsedTime) ? (
                <Text style={[styles.timeText, { color: statusConfig.color }]}>
                  · {liveTimer.formattedTimer}
                </Text>
              ) : null}
            </View>
          </View>

          {/* 2. Middle Content: Empty Meta vs. Active Guest/Tabs + Amount */}
          {isEmpty ? (
            <View style={styles.emptyMetaRow}>
              <Text style={styles.emptyMetaText}>
                {seats ? `${seats} ${seats === 1 ? 'seat' : 'seats'} · ` : ''}
                {area === 'bar' ? 'Bar Area' : 'Cafe Area'}
              </Text>
            </View>
          ) : (
            <View>
              <View style={styles.guestAndAmountRow}>
                <View style={styles.guestRowLeft}>
                  {isMultiTab ? (
                    <>
                      {visibleTabs.map((tab) => {
                        const tabStatus = deriveTabStatus(tab);
                        const dotColor = TAB_STATUS_DOT_COLORS[tabStatus];
                        const isTabReady = tabStatus === 'ready';
                        return (
                          <Pressable
                            key={tab.id || tab.tabIndex}
                            onPress={() => onPress(table, tab.tabIndex)}
                            style={({ pressed }) => [
                              styles.tabChip,
                              isTabReady && styles.tabChipReady,
                              pressed && styles.cardPressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Open tab for ${tab.guestName}`}
                          >
                            <View style={[styles.tabChipDot, { backgroundColor: dotColor }]} />
                            <Text style={styles.tabChipText} numberOfLines={1}>
                              {tab.guestName}
                            </Text>
                          </Pressable>
                        );
                      })}
                      {overflowCount > 0 ? (
                        <Pressable
                          onPress={() => onPress(table, openTabs[2]?.tabIndex)}
                          style={({ pressed }) => [
                            styles.overflowBadge,
                            pressed && styles.cardPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`View ${overflowCount} more tabs`}
                        >
                          <Text style={styles.overflowBadgeText}>+{overflowCount}</Text>
                        </Pressable>
                      ) : null}
                    </>
                  ) : (
                    <View style={styles.singleGuestRow}>
                      <User size={15} color="#78716C" strokeWidth={2.3} />
                      <Text style={styles.singleGuestName} numberOfLines={1}>
                        {openTabs[0]?.guestName || 'Guest 1'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.amountCol}>
                  <Text style={styles.amountText}>{formattedAmount}</Text>
                  {isMultiTab ? <Text style={styles.tagWine}>{openTabs.length} TABS</Text> : null}
                </View>
              </View>

              <Text style={styles.itemsSummaryText} numberOfLines={1}>
                {itemsSummary}
              </Text>
            </View>
          )}
        </Pressable>

        {/* 3. Bottom Row: Direct Action Footer */}
        <View style={styles.actionRow}>
          {isEmpty ? (
            <Pressable
              onPress={() => onPress(table)}
              style={({ pressed }) => [styles.actionBtnOpenTab, pressed && styles.cardPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Open Tab at ${displayName}`}
            >
              <Plus size={18} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.actionBtnOpenTabText}>Open Tab</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => (isReady ? onPress(table) : (onQuickOrder || onPress)(table))}
                style={({ pressed }) => [
                  styles.actionBtnPrimary,
                  isReady && styles.actionBtnReady,
                  pressed && styles.cardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  isReady ? `Deliver order for ${displayName}` : `Add order for ${displayName}`
                }
              >
                {isReady ? (
                  <CheckCircle2 size={16} color="#047857" strokeWidth={2.4} />
                ) : (
                  <UtensilsCrossed size={16} color="#1C1917" strokeWidth={2.3} />
                )}
                <Text style={[styles.actionBtnText, isReady && { color: '#047857' }]}>
                  {isReady ? 'Deliver' : '+ Order'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => (onQuickSettle || onPress)(table)}
                style={({ pressed }) => [
                  styles.actionBtnSettle,
                  isServed && styles.actionBtnSettleHighlight,
                  pressed && styles.cardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Settle bill for ${displayName}`}
              >
                <CreditCard size={16} color={isServed ? '#ffffff' : '#810021'} strokeWidth={2.3} />
                <Text style={[styles.actionBtnText, { color: isServed ? '#ffffff' : '#810021' }]}>
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
