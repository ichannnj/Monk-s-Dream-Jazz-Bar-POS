import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { Flame, Cloud, LogOut } from 'lucide-react-native';

export const Header: React.FC = () => {
  const { currentUser, isOnline, logout } = useAuthStore();

  return (
    <View className="bg-jazz-950 border-b border-jazz-800 px-5 py-3 flex-row items-center justify-between">
      {/* Brand & Active User Info */}
      <View className="flex-row items-center space-x-3">
        <View className="w-11 h-11 rounded-xl bg-jazz-gold/15 border border-jazz-gold/30 items-center justify-center">
          <Flame size={24} color="#f59e0b" />
        </View>
        <View>
          <View className="flex-row items-center space-x-2">
            <Text className="text-white font-extrabold text-base tracking-wide">MONK'S DREAM</Text>
            <View className="px-2 py-0.5 rounded bg-jazz-gold/20 border border-jazz-gold/40">
              <Text className="text-base font-bold text-jazz-gold tracking-wider uppercase">
                CLOUD POS
              </Text>
            </View>
          </View>
          <Text className="text-base text-gray-400 capitalize">
            {currentUser?.displayName} • {currentUser?.role}
          </Text>
        </View>
      </View>

      {/* Cloud Status & Logout */}
      <View className="flex-row items-center space-x-3">
        <View
          className={`flex-row items-center min-h-[48px] px-3 py-1.5 rounded-full ${
            isOnline
              ? 'bg-emerald-950/70 border border-emerald-800'
              : 'bg-rose-950 border border-rose-800'
          }`}
        >
          <Cloud size={16} color={isOnline ? '#10b981' : '#f43f5e'} />
          <Text
            className={`text-base font-semibold ml-2 ${
              isOnline ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isOnline ? 'Cloud Supabase' : 'Offline'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={logout}
          activeOpacity={0.8}
          className="flex-row items-center min-h-[48px] px-4 py-2 rounded-xl bg-jazz-900 border border-jazz-800 space-x-2"
        >
          <LogOut size={16} color="#9ca3af" />
          <Text className="text-base font-bold text-gray-300">Switch User</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
