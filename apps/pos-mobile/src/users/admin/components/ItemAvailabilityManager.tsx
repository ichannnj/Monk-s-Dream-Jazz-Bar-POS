import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { INITIAL_MENU, MenuItem } from '../../../mockData';
import { Ban, CheckCircle2, AlertOctagon } from 'lucide-react-native';

export const ItemAvailabilityManager: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU);

  const toggleAvailability = (id: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
      )
    );
  };

  return (
    <View className="bg-jazz-900 border border-jazz-800 rounded-2xl p-4 flex-1">
      <View className="flex-row items-center justify-between pb-3 border-b border-jazz-800 mb-3">
        <View className="flex-row items-center space-x-2">
          <AlertOctagon size={18} color="#f59e0b" />
          <Text className="text-white font-extrabold text-sm">
            86 Item Manager (Instant Stock Availability)
          </Text>
        </View>
        <Text className="text-[11px] text-gray-400">
          Syncs instantly with all Waiter & KDS screens
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="space-y-2">
          {menuItems.map((item) => (
            <View
              key={item.id}
              className="flex-row items-center justify-between p-2.5 rounded-xl bg-jazz-950/70 border border-jazz-850"
            >
              <View className="flex-1 pr-3">
                <Text
                  className={`text-xs font-bold ${
                    item.isAvailable ? 'text-white' : 'text-gray-500 line-through'
                  }`}
                >
                  {item.name}
                </Text>
                <Text className="text-[10px] text-gray-400">
                  {item.category} • Stations: {item.stations.join(', ')}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleAvailability(item.id)}
                className={`px-3 py-1.5 rounded-lg flex-row items-center space-x-1 border ${
                  item.isAvailable
                    ? 'bg-emerald-950/50 border-emerald-700 text-emerald-400'
                    : 'bg-rose-950/70 border-rose-600 text-rose-400'
                }`}
              >
                {item.isAvailable ? (
                  <>
                    <CheckCircle2 size={12} color="#34d399" />
                    <Text className="text-[11px] font-bold text-emerald-400 ml-1">
                      Available
                    </Text>
                  </>
                ) : (
                  <>
                    <Ban size={12} color="#f43f5e" />
                    <Text className="text-[11px] font-bold text-rose-400 ml-1">
                      86'd (Sold Out)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
