import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { User, Briefcase, AtSign, Mail, Phone } from 'lucide-react-native';

interface ProfileIdentityCardProps {
  displayName: string;
  setDisplayName: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  jobTitle: string;
  setJobTitle: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  staffInitials: string;
  isUpdatingProfile: boolean;
  onSaveProfile: () => void;
}

export const ProfileIdentityCard: React.FC<ProfileIdentityCardProps> = ({
  displayName,
  setDisplayName,
  username,
  setUsername,
  jobTitle,
  setJobTitle,
  email,
  setEmail,
  phone,
  setPhone,
  staffInitials,
  isUpdatingProfile,
  onSaveProfile,
}) => {
  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs">
      <View className="flex-row items-center justify-between border-b border-stone-100 pb-4 mb-5">
        <View className="flex-row items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-[#800020]/10 border border-[#800020]/25">
            <Text className="text-xl font-black text-[#800020]">{staffInitials}</Text>
          </View>
          <View>
            <Text className="text-lg font-bold text-stone-900">
              {displayName || 'Administrator'}
            </Text>
            <Text className="text-base font-semibold text-[#800020]">
              @{username || 'admin'} · {jobTitle}
            </Text>
          </View>
        </View>
        <View className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1">
          <Text className="text-base font-bold text-emerald-700">Active Admin</Text>
        </View>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-base font-bold text-stone-700 mb-1.5">Full Display Name</Text>
          <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 h-[50px]">
            <User size={18} color="#78716c" className="mr-2.5" />
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter full name"
              placeholderTextColor="#a8a29e"
              style={{ fontSize: 16, flex: 1, color: '#1c1917' }}
            />
          </View>
        </View>

        <View>
          <Text className="text-base font-bold text-stone-700 mb-1.5">
            Admin Username (Login ID)
          </Text>
          <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 h-[50px]">
            <AtSign size={18} color="#78716c" className="mr-2.5" />
            <TextInput
              value={username}
              onChangeText={(val) =>
                setUsername(val.toLowerCase().replace(/^@+/, '').replace(/\s+/g, '_'))
              }
              placeholder="username"
              placeholderTextColor="#a8a29e"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ fontSize: 16, flex: 1, color: '#1c1917' }}
            />
          </View>
          <Text className="mt-1 text-xs text-stone-500">
            Lowercase letters, numbers, and underscores (e.g. miles_manager)
          </Text>
        </View>

        <View>
          <Text className="text-base font-bold text-stone-700 mb-1.5">Job Title</Text>
          <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 h-[50px]">
            <Briefcase size={18} color="#78716c" className="mr-2.5" />
            <TextInput
              value={jobTitle}
              onChangeText={setJobTitle}
              placeholder="General Manager, Owner, etc."
              placeholderTextColor="#a8a29e"
              style={{ fontSize: 16, flex: 1, color: '#1c1917' }}
            />
          </View>
        </View>

        <View className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <View>
            <Text className="text-base font-bold text-stone-700 mb-1.5">Email Address</Text>
            <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 h-[50px]">
              <Mail size={18} color="#78716c" className="mr-2.5" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="admin@monksdream.com"
                placeholderTextColor="#a8a29e"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ fontSize: 16, flex: 1, color: '#1c1917' }}
              />
            </View>
          </View>

          <View>
            <Text className="text-base font-bold text-stone-700 mb-1.5">Phone Number</Text>
            <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 h-[50px]">
              <Phone size={18} color="#78716c" className="mr-2.5" />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+63 917 123 4567"
                placeholderTextColor="#a8a29e"
                keyboardType="phone-pad"
                style={{ fontSize: 16, flex: 1, color: '#1c1917' }}
              />
            </View>
          </View>
        </View>

        <View className="pt-2">
          <Pressable
            onPress={onSaveProfile}
            disabled={isUpdatingProfile}
            className="min-h-[48px] items-center justify-center rounded-xl bg-[#800020] px-6 active:opacity-90 shadow-xs"
          >
            <Text className="text-base font-bold text-white">
              {isUpdatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
