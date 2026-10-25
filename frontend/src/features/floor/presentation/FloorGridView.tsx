import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LayoutGrid } from 'lucide-react-native';
import { TableItem, TakeoutOrder, OnlineDeliveryOrder } from '../../../types/floor';
import { TableCard } from './TableCard';
import { TakeoutQueueCard } from '../../../components/waiter/TakeoutQueueCard';
import { OnlineDeliveryCard } from '../../../components/waiter/OnlineDeliveryCard';
import { styles } from '../../../components/waiter/WaiterCashierScreen.styles';

export interface FloorGridViewProps {
  cardWidth: any;
  filteredTables: TableItem[];
  filteredTakeoutOrders: TakeoutOrder[];
  filteredOnlineOrders: OnlineDeliveryOrder[];
  onTablePress: (table: TableItem) => void;
  onTakeoutPress: (order: TakeoutOrder) => void;
  onTakeoutReady: (id: string) => void;
  onTakeoutCollected: (id: string) => void;
  onOnlinePress: (order: OnlineDeliveryOrder) => void;
  onOnlineReady: (id: string) => void;
  onOnlineHandToRider: (id: string) => void;
  onLayoutGrid: (width: number) => void;
  onResetFilters?: () => void;
}

export const FloorGridView: React.FC<FloorGridViewProps> = ({
  cardWidth,
  filteredTables,
  filteredTakeoutOrders,
  filteredOnlineOrders,
  onTablePress,
  onTakeoutPress,
  onTakeoutReady,
  onTakeoutCollected,
  onOnlinePress,
  onOnlineReady,
  onOnlineHandToRider,
  onLayoutGrid,
  onResetFilters,
}) => {
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
          No dine-in tables, takeout orders, or delivery cards match the active filter criteria.
        </Text>
        {onResetFilters ? (
          <Pressable
            onPress={onResetFilters}
            className="min-h-[48px] px-6 rounded-xl bg-wine-700 items-center justify-center active:opacity-90 shadow-sm"
            accessibilityRole="button"
            accessibilityLabel="Reset all filters"
          >
            <Text className="text-base font-bold text-white tracking-wide">
              Reset Filters to All
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.tablesGrid} onLayout={(e) => onLayoutGrid(e.nativeEvent.layout.width)}>
      {/* Dine-In Physical Tables */}
      {filteredTables.map((table) => (
        <View key={table.id} style={[styles.cardCol, { width: cardWidth }]}>
          <TableCard table={table} onPress={onTablePress} />
        </View>
      ))}

      {/* Walk-In Takeout Queue Cards */}
      {filteredTakeoutOrders.map((toOrder) => (
        <View key={toOrder.id} style={[styles.cardCol, { width: cardWidth }]}>
          <TakeoutQueueCard
            order={toOrder}
            onPress={onTakeoutPress}
            onMarkReady={onTakeoutReady}
            onMarkCollected={onTakeoutCollected}
          />
        </View>
      ))}

      {/* Online Delivery Queue Cards (GrabFood & Foodpanda) */}
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
