import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ItemAvailabilityManager } from '../components/ItemAvailabilityManager';
import { HardwareTerminalControls } from '../components/HardwareTerminalControls';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react-native';

export const AdminDashboardScreen: React.FC = () => {
  return (
    <View className="flex-1 bg-jazz-950 p-4">
      {/* KPI Stats Row */}
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 p-3.5 rounded-2xl bg-jazz-900 border border-jazz-800">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[11px] font-bold text-gray-400">Total Shift Sales</Text>
            <DollarSign size={16} color="#f59e0b" />
          </View>
          <Text className="text-xl font-black text-jazz-gold">₱142,850.00</Text>
          <Text className="text-[10px] text-emerald-400 mt-1 font-semibold">+18% vs yesterday</Text>
        </View>

        <View className="flex-1 p-3.5 rounded-2xl bg-jazz-900 border border-jazz-800">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[11px] font-bold text-gray-400">Active Covers / Tabs</Text>
            <TrendingUp size={16} color="#60a5fa" />
          </View>
          <Text className="text-xl font-black text-white">8 Tables / 26 Guests</Text>
          <Text className="text-[10px] text-gray-400 mt-1 font-semibold">Peak jazz set 20:00</Text>
        </View>

        <View className="flex-1 p-3.5 rounded-2xl bg-jazz-900 border border-jazz-800">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[11px] font-bold text-gray-400">Staff Active</Text>
            <Users size={16} color="#a78bfa" />
          </View>
          <Text className="text-xl font-black text-white">7 Devices Online</Text>
          <Text className="text-[10px] text-emerald-400 mt-1 font-semibold">LAN 192.168.50.0/24</Text>
        </View>

        <View className="flex-1 p-3.5 rounded-2xl bg-jazz-900 border border-jazz-800">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[11px] font-bold text-gray-400">HLC Sync Pulse</Text>
            <Activity size={16} color="#34d399" />
          </View>
          <Text className="text-xl font-black text-emerald-400">Synced (0 lag)</Text>
          <Text className="text-[10px] text-gray-400 mt-1 font-semibold">Postgres Local Record</Text>
        </View>
      </View>

      {/* Main Administrative Control Grid */}
      <View className="flex-1 flex-row gap-4">
        {/* Left: 86 Item Manager */}
        <View className="flex-1">
          <ItemAvailabilityManager />
        </View>

        {/* Right: Hardware controls & Diagnostics */}
        <View className="w-96 flex-col space-y-4">
          <HardwareTerminalControls />

          {/* Quick Staff Roles Overview */}
          <View className="bg-jazz-900 border border-jazz-800 rounded-2xl p-4 flex-1">
            <Text className="text-white font-extrabold text-sm mb-2">
              Staff & Assigned Stations
            </Text>
            <View className="space-y-2">
              {[
                { name: 'Manager Miles', role: 'admin', ip: '192.168.50.10 (PC)' },
                { name: 'Server Chet', role: 'waiter_cashier', ip: 'Tablet #1' },
                { name: 'Server Nina', role: 'waiter_cashier', ip: 'Tablet #2' },
                { name: 'Barista Tablet', role: 'barista', ip: 'Coffee KDS' },
                { name: 'Kitchen Tablet', role: 'kitchen', ip: 'Food KDS' },
                { name: 'Bartender Tablet', role: 'bartender', ip: 'Liquor KDS' },
              ].map((staff, idx) => (
                <View
                  key={idx}
                  className="flex-row items-center justify-between p-2 rounded-xl bg-jazz-950/60 border border-jazz-850"
                >
                  <View>
                    <Text className="text-white text-xs font-bold">{staff.name}</Text>
                    <Text className="text-[10px] text-gray-400">{staff.ip}</Text>
                  </View>
                  <View className="px-2 py-0.5 rounded bg-jazz-gold/15 border border-jazz-gold/30">
                    <Text className="text-[9px] font-bold text-jazz-gold uppercase">
                      {staff.role}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};
