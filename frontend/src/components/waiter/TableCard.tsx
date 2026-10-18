import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Plus, Utensils, Receipt } from 'lucide-react-native';
import { TableItem } from '../../mockData';

interface TableCardProps {
  table: TableItem;
  onPress: (table: TableItem) => void;
}

export const TableCard: React.FC<TableCardProps> = React.memo(({ table, onPress }) => {
  const { code, seats, guests, status, elapsedTime, totalAmount, hasOpenCheck, activeTabs } = table;

  const isEmpty = status === 'empty';
  const isReady = status === 'ready';
  const isPrep = status === 'preparing';
  const isServed = status === 'served';

  // Derive accurate active tabs count
  const activeTabCount = useMemo(() => {
    const fromTabs = (table.tabs || []).filter((t) => t.status !== 'closed').map((t) => t.tabIndex);
    const fromActiveTabs = activeTabs || [];
    return new Set([...fromActiveTabs, ...fromTabs]).size;
  }, [table.tabs, activeTabs]);

  // Derive 1-line items snippet preview
  const itemsSummary = useMemo(() => {
    if (isEmpty) return 'Available · Ready for guests';
    const allItems = (table.tabs || []).flatMap((t) => t.items || []);
    if (allItems.length === 0) {
      return hasOpenCheck ? 'Tab active · No items added yet' : 'No items';
    }
    return allItems.map((i) => `${i.quantity}x ${i.productName}`).join(', ');
  }, [table.tabs, isEmpty, hasOpenCheck]);

  // Status configuration badge
  const getStatusBadge = () => {
    switch (status) {
      case 'ready':
        return {
          label: 'READY',
          bg: '#e8f9ee',
          color: '#15803d',
          dotColor: '#16a34a',
        };
      case 'preparing':
        return {
          label: 'PREP',
          bg: '#fef7e6',
          color: '#b45309',
          dotColor: '#d97706',
        };
      case 'served':
        return {
          label: 'SERVED',
          bg: '#fff1f2',
          color: '#be123c',
          dotColor: '#e11d48',
        };
      case 'occupied':
        return {
          label: 'OCCUPIED',
          bg: '#fdf2f4',
          color: '#832238',
          dotColor: '#832238',
        };
      case 'empty':
      default:
        return {
          label: 'AVAILABLE',
          bg: '#f3f4f6',
          color: '#6b7280',
          dotColor: '#9ca3af',
        };
    }
  };

  const statusConfig = getStatusBadge();

  // Format amount with commas if >= 1000
  const formattedAmount =
    totalAmount !== undefined && totalAmount > 0
      ? totalAmount >= 1000
        ? `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `$${totalAmount.toFixed(2)}`
      : null;

  // Card border & background based on status
  const getCardVariantStyle = () => {
    if (isEmpty) return styles.cardEmpty;
    if (isReady) return styles.cardReady;
    if (isPrep) return styles.cardPrep;
    if (isServed) return styles.cardServed;
    return styles.cardOccupied;
  };

  return (
    <View style={[styles.cardContainer, getCardVariantStyle()]}>
      <Pressable
        onPress={() => onPress(table)}
        style={({ pressed }) => [styles.mainPressableArea, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={
          isEmpty
            ? `Table ${code}, ${seats} seats, available. Tap to open tab.`
            : `Table ${code}, ${guests} of ${seats} seats, ${status}, total ${formattedAmount || 'open check'}`
        }
      >
        {/* 1. Top Row: Table Identifier + Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.codeCol}>
            <Text style={[styles.tableCodeText, isEmpty && styles.tableCodeTextEmpty]}>
              Table {code}
            </Text>
            <Text style={[styles.seatsText, isEmpty && styles.seatsTextEmpty]}>
              {isEmpty
                ? `${seats} seats`
                : guests > 0
                  ? `${guests} / ${seats} seats`
                  : `${seats} seats`}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.dotColor }]} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
            {!isEmpty && elapsedTime ? (
              <Text style={[styles.timeText, { color: statusConfig.color }]}>· {elapsedTime}</Text>
            ) : null}
          </View>
        </View>

        {/* 2. Middle Row: Items Line + Amount & Tab Tag */}
        <View style={styles.midRow}>
          <Text
            style={[styles.itemsSummaryText, isEmpty && styles.itemsSummaryTextEmpty]}
            numberOfLines={1}
          >
            {itemsSummary}
          </Text>
          <View style={styles.amountCol}>
            <Text style={[styles.amountText, isEmpty && styles.amountTextEmpty]}>
              {formattedAmount ? formattedAmount : isEmpty ? '$0.00' : '$0.00'}
            </Text>
            {isEmpty ? (
              <Text style={styles.tagEmpty}>EMPTY</Text>
            ) : activeTabCount > 1 ? (
              <Text style={styles.tagWine}>{activeTabCount} TABS</Text>
            ) : (
              <Text style={styles.tagWine}>DINE-IN</Text>
            )}
          </View>
        </View>
      </Pressable>

      {/* 3. Bottom Row: Direct Action Button */}
      <View style={styles.actionRow}>
        {isEmpty ? (
          <Pressable
            onPress={() => onPress(table)}
            style={({ pressed }) => [styles.actionBtnOpenTab, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open Tab at Table ${code}`}
          >
            <Plus size={15} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.actionBtnOpenTabText}>OPEN TABLE TAB</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => onPress(table)}
            style={({ pressed }) => [styles.actionBtnManage, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Manage Table ${code}`}
          >
            <Utensils size={14} color="#832238" strokeWidth={2.3} />
            <Text style={styles.actionBtnManageText}>
              {status === 'served' ? 'SETTLE BILL / ORDER' : 'VIEW & ADD ORDERS'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

TableCard.displayName = 'TableCard';

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#eee8e3',
    padding: 15,
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
    minHeight: 156,
  },
  cardOccupied: {
    backgroundColor: '#ffffff',
    borderColor: '#fad4db',
  },
  cardReady: {
    backgroundColor: '#fbfdfc',
    borderColor: '#bbf7d0',
  },
  cardPrep: {
    backgroundColor: '#ffffff',
    borderColor: '#fef3c7',
  },
  cardServed: {
    backgroundColor: '#ffffff',
    borderColor: '#fecdd3',
  },
  cardEmpty: {
    backgroundColor: '#fcfbfa',
    borderColor: '#e8e2dc',
  },
  mainPressableArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  codeCol: {
    justifyContent: 'center',
  },
  tableCodeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.2,
  },
  tableCodeTextEmpty: {
    color: '#374151',
  },
  seatsText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  seatsTextEmpty: {
    color: '#9ca3af',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 10,
  },
  statusDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  timeText: {
    fontSize: 11.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  itemsSummaryText: {
    flex: 1,
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  itemsSummaryTextEmpty: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  amountTextEmpty: {
    color: '#9ca3af',
    fontWeight: '700',
  },
  tagWine: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#832238',
    marginTop: 1,
  },
  tagEmpty: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#9ca3af',
    marginTop: 1,
  },
  actionRow: {
    paddingTop: 6,
  },
  actionBtnOpenTab: {
    backgroundColor: '#832238',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#832238',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnOpenTabText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  actionBtnManage: {
    backgroundColor: '#fdf2f4',
    borderWidth: 1,
    borderColor: '#fad4db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  actionBtnManageText: {
    color: '#832238',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
