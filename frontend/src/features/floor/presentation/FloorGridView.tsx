import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LayoutGrid } from 'lucide-react-native';
import { TableItem, TakeoutOrder, OnlineDeliveryOrder } from '@/types/floor';
import { TableCard } from './TableCard';
import { TakeoutQueueCard } from '@/features/takeout';
import { OnlineDeliveryCard } from '@/features/delivery';

export interface FloorGridViewProps {
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
  onResetFilters?: () => void;
}

const SectionHeader: React.FC<{ title: string; badge: string }> = ({ title, badge }) => (
  <View className="w-full flex-row items-center justify-between pt-4 pb-2 border-b border-[#E7E5E4]/80 mb-3">
    <Text className="text-base font-bold text-[#1C1917]">{title}</Text>
    <Text className="text-base font-medium tabular-nums text-[#57534E]">{badge}</Text>
  </View>
);

export const FloorGridView: React.FC<FloorGridViewProps> = ({
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
      <View className="w-full py-14 px-6 items-center justify-center bg-white rounded-2xl border border-[#E7E5E4] my-4">
        <View className="w-14 h-14 rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] items-center justify-center mb-4">
          <LayoutGrid size={26} color="#57534E" strokeWidth={2} />
        </View>
        <Text className="text-pos-lg font-bold text-[#1C1917] text-center mb-1">
          No Tables or Orders Found
        </Text>
        <Text className="text-base text-[#57534E] text-center max-w-md mb-6 leading-relaxed">
          No dine-in tables, takeout orders, or delivery cards match your search or filter.
        </Text>
        {onResetFilters ? (
          <Pressable
            onPress={onResetFilters}
            className="min-h-[48px] px-6 rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] items-center justify-center active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Clear search and reset filters"
          >
            <Text className="text-base font-semibold text-[#1C1917]">
              Clear Search &amp; Filters
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View className="w-full gap-4">
      {/* Cafe Area Tables */}
      {cafeTables.length > 0 ? (
        <View className="w-full">
          {renderHeaders ? (
            <SectionHeader
              title="Cafe Area"
              badge={`${cafeTables.filter((t) => t.status !== 'empty').length}/${cafeTables.length} occupied`}
            />
          ) : null}
          <View className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4">
            {cafeTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onPress={onTablePress}
                onQuickOrder={onQuickOrder}
                onQuickSettle={onQuickSettle}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Bar Area Tables */}
      {barTables.length > 0 ? (
        <View className="w-full">
          {renderHeaders ? (
            <SectionHeader
              title="Bar Area"
              badge={`${barTables.filter((t) => t.status !== 'empty').length}/${barTables.length} occupied`}
            />
          ) : null}
          <View className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4">
            {barTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onPress={onTablePress}
                onQuickOrder={onQuickOrder}
                onQuickSettle={onQuickSettle}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Takeout & Delivery */}
      {offPremiseCount > 0 ? (
        <View className="w-full">
          {renderHeaders ? (
            <SectionHeader title="Takeout & Delivery" badge={`${offPremiseCount} active`} />
          ) : null}
          <View className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4">
            {filteredTakeoutOrders.map((toOrder) => (
              <TakeoutQueueCard
                key={toOrder.id}
                order={toOrder}
                onPress={onTakeoutPress}
                onPayTakeout={onTakeoutPay}
                onMarkReady={onTakeoutReady}
                onMarkCollected={onTakeoutCollected}
              />
            ))}

            {filteredOnlineOrders.map((olOrder) => (
              <OnlineDeliveryCard
                key={olOrder.id}
                order={olOrder}
                onPress={onOnlinePress}
                onMarkReady={onOnlineReady}
                onHandToRider={onOnlineHandToRider}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};
