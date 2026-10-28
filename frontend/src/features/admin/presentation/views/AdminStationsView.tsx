import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Wine, Coffee, UtensilsCrossed, PackageCheck } from 'lucide-react-native';

interface AdminStationsViewProps {
  onLaunchStation?: (station: string) => void;
}

export const AdminStationsView: React.FC<AdminStationsViewProps> = () => {
  const stations = [
    {
      id: 'bar',
      name: 'Bar Station KDS',
      role: 'Bartender & Cocktail Mixology',
      icon: Wine,
      color: 'bg-amber-600',
      activeTickets: 6,
      avgTime: '06:40',
      targetTime: '10:00',
      status: 'Online',
      lateCount: 1,
      stockouts: ['House Bourbon'],
    },
    {
      id: 'cafe',
      name: 'Cafe & Barista KDS',
      role: 'Espresso Bar & Teas',
      icon: Coffee,
      color: 'bg-stone-700',
      activeTickets: 7,
      avgTime: '05:55',
      targetTime: '10:00',
      status: 'Online',
      lateCount: 0,
      stockouts: ['Oat Milk'],
    },
    {
      id: 'kitchen',
      name: 'Kitchen Hot Food KDS',
      role: 'Main Line Chef & Appetizers',
      icon: UtensilsCrossed,
      color: 'bg-rose-700',
      activeTickets: 4,
      avgTime: '12:15',
      targetTime: '15:00',
      status: 'Online',
      lateCount: 0,
      stockouts: [],
    },
    {
      id: 'runner',
      name: 'FOH Runner Expediter',
      role: 'Tablet Buzzout & Tray Dispatch',
      icon: PackageCheck,
      color: 'bg-emerald-700',
      activeTickets: 2,
      avgTime: '02:10',
      targetTime: '03:00',
      status: 'Online',
      lateCount: 0,
      stockouts: [],
    },
  ];

  return (
    <ScrollView className="flex-1 bg-[#fcf9f9] p-8" showsVerticalScrollIndicator={false}>
      <View className="mb-6">
        <Text className="text-3xl font-extrabold tracking-tight text-stone-900">
          Live Stations Operations & Turnaround Hub
        </Text>
        <Text className="mt-1 text-base text-stone-500">
          Real-time monitoring across Bar, Cafe, Kitchen Line, and Expediter Runner tablets.
        </Text>
      </View>

      <View className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stations.map((st) => {
          const IconComp = st.icon;
          return (
            <View
              key={st.id}
              className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs"
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center space-x-3">
                  <View className={`h-11 w-11 items-center justify-center rounded-xl ${st.color}`}>
                    <IconComp size={22} color="#ffffff" />
                  </View>
                  <View className="ml-3">
                    <Text className="text-lg font-bold text-stone-900">{st.name}</Text>
                    <Text className="text-xs text-stone-500">{st.role}</Text>
                  </View>
                </View>

                <View className="flex-row items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1">
                  <View className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />
                  <Text className="text-xs font-semibold text-emerald-700">{st.status}</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between rounded-xl bg-stone-50 p-4 mb-4">
                <View>
                  <Text className="text-xs text-stone-400">Active Queue</Text>
                  <Text className="text-2xl font-black text-stone-900">{st.activeTickets}</Text>
                </View>

                <View>
                  <Text className="text-xs text-stone-400">Avg Turnaround</Text>
                  <Text className="text-2xl font-black text-stone-900">{st.avgTime}</Text>
                </View>

                <View>
                  <Text className="text-xs text-stone-400">Target Time</Text>
                  <Text className="text-2xl font-black text-stone-500">{st.targetTime}</Text>
                </View>

                <View>
                  <Text className="text-xs text-stone-400">Overdue / Late</Text>
                  <Text
                    className={`text-2xl font-black ${
                      st.lateCount > 0 ? 'text-rose-600' : 'text-stone-900'
                    }`}
                  >
                    {st.lateCount}
                  </Text>
                </View>
              </View>

              {st.stockouts.length > 0 ? (
                <View className="flex-row items-center rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <Text className="text-xs font-semibold text-amber-900">
                    Station 86'd Items: {st.stockouts.join(', ')}
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <Text className="text-xs font-medium text-emerald-800">
                    All station ingredients in stock
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};
