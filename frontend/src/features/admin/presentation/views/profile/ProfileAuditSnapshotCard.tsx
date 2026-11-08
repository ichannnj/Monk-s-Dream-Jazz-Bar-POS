import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sparkles, Calendar, Lock, KeyRound, Shield, LogOut } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';

interface ProfileAuditSnapshotCardProps {
  lastLoginAt?: string | null;
  passwordUpdatedAt?: string | null;
  pinUpdatedAt?: string | null;
  onLogout: () => void;
}

export const ProfileAuditSnapshotCard: React.FC<ProfileAuditSnapshotCardProps> = ({
  lastLoginAt,
  passwordUpdatedAt,
  pinUpdatedAt,
  onLogout,
}) => {
  const formatTimestamp = (iso?: string | null) => {
    if (!iso) return 'Not recorded';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs flex-col justify-between">
      <View>
        <View className="flex-row items-center justify-between border-b border-stone-100 pb-3 mb-4">
          <View className="flex-row items-center gap-2.5">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-stone-100 border border-stone-200">
              <Sparkles size={20} color="#44403c" />
            </View>
            <View>
              <Text className="text-lg font-bold text-stone-900">Security & Session Audit</Text>
              <Text className="text-base text-stone-500">Cryptographic Ledger & Access Trail</Text>
            </View>
          </View>
        </View>

        <View className="space-y-3">
          <View className="flex-row items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/70">
            <View className="flex-row items-center gap-2.5">
              <Calendar size={18} color="#78716c" />
              <Text className="text-base font-semibold text-stone-700">Last Successful Login</Text>
            </View>
            <Text className="text-base font-bold text-stone-900">
              {formatTimestamp(lastLoginAt)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/70">
            <View className="flex-row items-center gap-2.5">
              <Lock size={18} color="#78716c" />
              <Text className="text-base font-semibold text-stone-700">Password Last Changed</Text>
            </View>
            <Text className="text-base font-bold text-stone-900">
              {formatTimestamp(passwordUpdatedAt)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/70">
            <View className="flex-row items-center gap-2.5">
              <KeyRound size={18} color="#78716c" />
              <Text className="text-base font-semibold text-stone-700">
                Override PIN Last Changed
              </Text>
            </View>
            <Text className="text-base font-bold text-stone-900">
              {formatTimestamp(pinUpdatedAt)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/70">
            <View className="flex-row items-center gap-2.5">
              <Shield size={18} color="#15803d" />
              <Text className="text-base font-semibold text-stone-700">Encryption Standard</Text>
            </View>
            <View className="rounded-md bg-emerald-50 px-2 py-0.5 border border-emerald-200">
              <Text className="text-base font-black text-emerald-800">
                Postgres pgcrypto Blowfish ($2a$10$)
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="pt-6">
        <Pressable
          onPress={() => {
            toast.info('Administrator session terminated.', { title: 'Signed Out' });
            onLogout();
          }}
          className="min-h-[48px] flex-row items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-6 active:bg-rose-100"
        >
          <LogOut size={18} color="#be123c" className="mr-2" />
          <Text className="text-base font-bold text-rose-700">Sign Out of Admin Console</Text>
        </Pressable>
      </View>
    </View>
  );
};
