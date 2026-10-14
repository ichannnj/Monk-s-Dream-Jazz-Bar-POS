import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import {
  Sparkles,
  Server,
  Database,
  Smartphone,
  ShieldCheck,
  PlusCircle,
} from 'lucide-react-native';

export const HomeScreen: React.FC = () => {
  const { currentUser } = useAuthStore();

  return (
    <ScrollView className="flex-1 bg-jazz-950 p-6">
      <View className="max-w-4xl w-full mx-auto space-y-6">
        {/* Welcome Banner */}
        <View className="bg-jazz-900/90 border border-jazz-800 rounded-3xl p-6 shadow-xl">
          <View className="flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center space-x-2">
                <Text className="text-2xl font-black text-white">
                  Welcome, {currentUser?.displayName}
                </Text>
                <Sparkles size={20} color="#f59e0b" />
              </View>
              <Text className="text-gray-400 text-xs mt-1">
                Signed in as <Text className="text-jazz-gold font-bold uppercase">{currentUser?.role}</Text> • Monk's Dream Jazz Bar Platform
              </Text>
            </View>

            <View className="px-3 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-800">
              <Text className="text-emerald-400 font-bold text-xs">Template Active</Text>
            </View>
          </View>
        </View>

        {/* System Architecture Cards */}
        <View className="flex-row flex-wrap -mx-2">
          {/* Card 1: Frontend */}
          <View className="w-full md:w-1/3 p-2">
            <View className="bg-jazz-900/60 border border-jazz-800 rounded-2xl p-4 h-full justify-between">
              <View className="flex-row items-center space-x-2.5 mb-2">
                <View className="p-2 rounded-xl bg-blue-950/80 border border-blue-800/60">
                  <Smartphone size={18} color="#60a5fa" />
                </View>
                <View>
                  <Text className="text-white font-extrabold text-xs">Frontend</Text>
                  <Text className="text-gray-400 text-[10px]">React Native (Expo)</Text>
                </View>
              </View>
              <Text className="text-gray-400 text-xs">
                Clean UI template with NativeWind v4 styling & staff PIN login.
              </Text>
            </View>
          </View>

          {/* Card 2: Backend */}
          <View className="w-full md:w-1/3 p-2">
            <View className="bg-jazz-900/60 border border-jazz-800 rounded-2xl p-4 h-full justify-between">
              <View className="flex-row items-center space-x-2.5 mb-2">
                <View className="p-2 rounded-xl bg-purple-950/80 border border-purple-800/60">
                  <Server size={18} color="#c084fc" />
                </View>
                <View>
                  <Text className="text-white font-extrabold text-xs">Backend</Text>
                  <Text className="text-gray-400 text-[10px]">NestJS (Fastify)</Text>
                </View>
              </View>
              <Text className="text-gray-400 text-xs">
                Cloud-deployed REST API with staff authentication and health probes.
              </Text>
            </View>
          </View>

          {/* Card 3: Database & ORM */}
          <View className="w-full md:w-1/3 p-2">
            <View className="bg-jazz-900/60 border border-jazz-800 rounded-2xl p-4 h-full justify-between">
              <View className="flex-row items-center space-x-2.5 mb-2">
                <View className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/60">
                  <Database size={18} color="#34d399" />
                </View>
                <View>
                  <Text className="text-white font-extrabold text-xs">Database & ORM</Text>
                  <Text className="text-gray-400 text-[10px]">Supabase & Prisma</Text>
                </View>
              </View>
              <Text className="text-gray-400 text-xs">
                Cloud PostgreSQL on Supabase managed via type-safe Prisma schema.
              </Text>
            </View>
          </View>
        </View>

        {/* Clean Template Blank Canvas */}
        <View className="bg-jazz-900/40 border border-dashed border-jazz-700/60 rounded-3xl p-10 items-center justify-center my-4">
          <View className="w-14 h-14 rounded-2xl bg-jazz-gold/10 border border-jazz-gold/30 items-center justify-center mb-3">
            <PlusCircle size={28} color="#f59e0b" />
          </View>
          <Text className="text-white font-bold text-base text-center">
            Clean Canvas Ready
          </Text>
          <Text className="text-gray-400 text-xs text-center max-w-md mt-1.5 leading-relaxed">
            All previous workflows, station tickets, and order processors have been removed. This clean template is ready for your new business processes, controllers, and screens.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};
