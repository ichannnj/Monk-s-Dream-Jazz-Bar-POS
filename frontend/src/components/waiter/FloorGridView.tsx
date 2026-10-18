import React from 'react';
import { View } from 'react-native';
import { TableItem, TakeoutOrder, OnlineDeliveryOrder } from '../../mockData';
import { TableCard } from './TableCard';
import { TakeoutQueueCard } from './TakeoutQueueCard';
import { OnlineDeliveryCard } from './OnlineDeliveryCard';
import { styles } from './WaiterCashierScreen.styles';

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
}) => {
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
