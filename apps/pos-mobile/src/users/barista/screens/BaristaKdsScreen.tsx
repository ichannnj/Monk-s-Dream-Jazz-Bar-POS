import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { INITIAL_TICKETS, StationTicket } from '../../../mockData';
import { BaristaTicketCard } from '../components/BaristaTicketCard';
import { Coffee, Flame, RefreshCw } from 'lucide-react-native';

export const BaristaKdsScreen: React.FC = () => {
  const [tickets, setTickets] = useState<StationTicket[]>(
    INITIAL_TICKETS.filter((t) => t.station === 'cafe')
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
          <View className="p-2.5 rounded-2xl bg-blue-950/80 border border-blue-600">
            <Coffee size={22} color="#60a5fa" />
          </View>
          <View>
            <View className="flex-row items-center space-x-2">
              <Text className="text-white font-black text-lg">
                Barista KDS Station
              </Text>
              <View className="px-2 py-0.5 rounded bg-blue-900/60 border border-blue-500">
                <Text className="text-[10px] font-bold text-blue-300 uppercase">
                  Coffee & Espresso Bar
                </Text>
              </View>
            </View>
            <Text className="text-xs text-gray-400">
              Single-origins • Pour-overs • Cold brews • Realtime ticket queue
            </Text>
          </View>
        </View>

        <View className="flex-row items-center space-x-2">
          <View className="px-3 py-1.5 rounded-xl bg-jazz-900 border border-jazz-800">
            <Text className="text-xs font-bold text-gray-300">
              Active Orders: {tickets.filter((t) => t.status !== 'SERVED').length}
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
                All coffee orders completed! Standing by for new tickets.
              </Text>
            </View>
          ) : (
            tickets.map((t) => (
              <View key={t.id} className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 p-2">
                <BaristaTicketCard ticket={t} onUpdateStatus={handleUpdate} />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};
