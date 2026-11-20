import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LayoutGrid } from 'lucide-react-native';
import { TableItem, TakeoutOrder, OnlineDeliveryOrder } from '@/types/floor';
import { TableCard } from './TableCard';
import { TakeoutQueueCard } from '@/features/takeout';
import { OnlineDeliveryCard } from '@/features/delivery';
import { styles } from './WaiterCashierScreen.styles';

export interface FloorGridViewProps {
  cardWidth: any;
  filteredTables: TableItem[];
  filteredTakeoutOrders: TakeoutOrder[];
  filteredOnlineOrders: OnlineDeliveryOrder[];
  showSectionHeaders?: boolean;
  onTablePress: (table: TableItem, tabIndex?: number) => void;
  onQuickOrder?: (table: TableItem, tabIndex?: number) => void;
  onQuickSettle?: (table: TableItem, tabIndex?: number) => void;
  onTakeoutPress: (order: TakeoutOrder) => void;
  onTakeoutPay?: (order: TakeoutOrder, collectAfterPay?: boolean) => void;
  onTakeoutReady: (id: string) => void;
  onTakeoutCollected: (id: string) => void;
  onOnlinePress: (order: OnlineDeliveryOrder) => void;
  onOnlineReady: (id: string) => void;
  onOnlineHandToRider: (id: string) => void;
  onLayoutGrid: (width: number) => void;
  onResetFilters?: () => void;
}

const SectionHeader: React.FC<{ title: string; badge: string }> = ({ title, badge }) => (
  <View className="w-full flex-row items-center justify-between pt-2 pb-1 px-1">
    <Text className="text-xs font-extrabold uppercase tracking-wider text-stone-500">{title}</Text>
    <Text className="text-xs font-bold text-stone-400">{badge}</Text>
  </View>
);

export const FloorGridView: React.FC<FloorGridViewProps> = ({
  cardWidth,
  filteredTables,
  filteredTakeoutOrders,
  filteredOnlineOrders,
  showSectionHeaders = false,
  onTablePress,
  onQuickOrder,
  onQuickSettle,
  onTakeoutPress,
  onTakeoutPay,
  onTakeoutReady,
  onTakeoutCollected,
  onOnlinePress,
  onOnlineReady,
  onOnlineHandToRider,
  onLayoutGrid,
  onResetFilters,
}) => {
  const cafeTables = useMemo(
    () => filteredTables.filter((t) => t.area === 'cafe'),
    [filteredTables]
  );
  const barTables = useMemo(() => filteredTables.filter((t) => t.area === 'bar'), [filteredTables]);
  const offPremiseCount = filteredTakeoutOrders.length + filteredOnlineOrders.length;

  const activeSectionsCount =
    (cafeTables.length > 0 ? 1 : 0) +
    (barTables.length > 0 ? 1 : 0) +
    (offPremiseCount > 0 ? 1 : 0);
  const renderHeaders = showSectionHeaders && activeSectionsCount > 1;

  const hasItems =
    filteredTables.length > 0 ||
    filteredTakeoutOrders.length > 0 ||
    filteredOnlineOrders.length > 0;

  if (!hasItems) {
    return (
      <View
        onLayout={(e) => onLayoutGrid(e.nativeEvent.layout.width)}
        className="w-full py-16 px-6 items-center justify-center bg-white/70 rounded-3xl border border-gray-200 my-4"
      >
        <View className="w-16 h-16 rounded-2xl bg-wine-50 items-center justify-center mb-4">
          <LayoutGrid size={32} color="#7e2235" strokeWidth={2.2} />
        </View>
        <Text className="text-pos-lg font-bold text-gray-900 text-center mb-1">
          No Tables or Orders Found
        </Text>
        <Text className="text-base text-gray-600 text-center max-w-md mb-6 leading-relaxed">
          No dine-in tables, takeout orders, or delivery cards match your search or filter.
        </Text>
        {onResetFilters ? (
          <Pressable
            onPress={onResetFilters}
            className="min-h-[48px] px-6 rounded-xl bg-wine-700 items-center justify-center active:opacity-90 shadow-sm"
            accessibilityRole="button"
            accessibilityLabel="Clear search and reset filters"
          >
            <Text className="text-base font-bold text-white tracking-wide">
              Clear Search & Filters
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.tablesGrid} onLayout={(e) => onLayoutGrid(e.nativeEvent.layout.width)}>
      {/* Cafe Area Tables */}
      {renderHeaders && cafeTables.length > 0 ? (
        <SectionHeader
          title="Cafe Area"
          badge={`${cafeTables.filter((t) => t.status !== 'empty').length}/${cafeTables.length} occupied`}
        />
      ) : null}
      {cafeTables.map((table) => (
        <View key={table.id} style={[styles.cardCol, { width: cardWidth }]}>
          <TableCard
            table={table}
            onPress={onTablePress}
            onQuickOrder={onQuickOrder}
            onQuickSettle={onQuickSettle}
          />
        </View>
      ))}

      {/* Bar Area Tables */}
      {renderHeaders && barTables.length > 0 ? (
        <SectionHeader
          title="Bar Area"
          badge={`${barTables.filter((t) => t.status !== 'empty').length}/${barTables.length} occupied`}
        />
      ) : null}
      {barTables.map((table) => (
        <View key={table.id} style={[styles.cardCol, { width: cardWidth }]}>
          <TableCard
            table={table}
            onPress={onTablePress}
            onQuickOrder={onQuickOrder}
            onQuickSettle={onQuickSettle}
          />
        </View>
      ))}

      {/* Takeout & Delivery */}
      {renderHeaders && offPremiseCount > 0 ? (
        <SectionHeader title="Takeout & Delivery" badge={`${offPremiseCount} active`} />
      ) : null}
      {filteredTakeoutOrders.map((toOrder) => (
        <View key={toOrder.id} style={[styles.cardCol, { width: cardWidth }]}>
          <TakeoutQueueCard
            order={toOrder}
            onPress={onTakeoutPress}
            onPayTakeout={onTakeoutPay}
            onMarkReady={onTakeoutReady}
            onMarkCollected={onTakeoutCollected}
          />
        </View>
      ))}

      {filteredOnlineOrders.map((olOrder) => (
        <View key={olOrder.id} style={[styles.cardCol, { width: cardWidth }]}>
          <OnlineDeliveryCard
            order={olOrder}
            onPress={onOnlinePress}
            onMarkReady={onOnlineReady}
            onHandToRider={onOnlineHandToRider}
          />
        </View>
      ))}
    </View>
  );
};
