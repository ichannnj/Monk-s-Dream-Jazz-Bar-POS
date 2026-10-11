import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { INITIAL_TICKETS, StationTicket } from '../../../mockData';
import { KitchenTicketCard } from '../components/KitchenTicketCard';
import { UtensilsCrossed, Flame } from 'lucide-react-native';

export const KitchenKdsScreen: React.FC = () => {
  const [tickets, setTickets] = useState<StationTicket[]>(
    INITIAL_TICKETS.filter((t) => t.station === 'food')
  );

  const handleUpdate = (id: string, status: StationTicket['status']) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
  };

  return (
    <View className="flex-1 bg-jazz-950 p-4">
      {/* Header Banner */}
      <View className="flex-row items-center justify-between pb-3 mb-4 border-b border-jazz-850">
        <View className="flex-row items-center space-x-3">
          <View className="p-2.5 rounded-2xl bg-emerald-950/80 border border-emerald-600">
            <UtensilsCrossed size={22} color="#34d399" />
          </View>
          <View>
            <View className="flex-row items-center space-x-2">
              <Text className="text-white font-black text-lg">
                Kitchen KDS Station
              </Text>
              <View className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-500">
                <Text className="text-[10px] font-bold text-emerald-300 uppercase">
                  Hot Line & Grill
                </Text>
              </View>
            </View>
            <Text className="text-xs text-gray-400">
              Burgers • Calamari • Truffle Fries • Charcuterie boards • Auto-deduct on ready
            </Text>
          </View>
        </View>

        <View className="flex-row items-center space-x-2">
          <View className="px-3 py-1.5 rounded-xl bg-jazz-900 border border-jazz-800">
            <Text className="text-xs font-bold text-gray-300">
              Active Food Orders: {tickets.filter((t) => t.status !== 'SERVED').length}
            </Text>
          </View>
        </View>
      </View>

      {/* Ticket Grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap -mx-2">
          {tickets.length === 0 ? (
            <View className="w-full py-20 items-center justify-center">
              <Text className="text-gray-500 text-sm font-semibold">
                Kitchen order queue is clear! Standing by.
              </Text>
            </View>
          ) : (
            tickets.map((t) => (
              <View key={t.id} className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 p-2">
                <KitchenTicketCard ticket={t} onUpdateStatus={handleUpdate} />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};
