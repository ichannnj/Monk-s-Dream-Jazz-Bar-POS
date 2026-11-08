import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react-native';

interface ProfileManagerPinCardProps {
  pinPasswordVerify: string;
  setPinPasswordVerify: (val: string) => void;
  newOverridePin: string;
  setNewOverridePin: (val: string) => void;
  confirmOverridePin: string;
  setConfirmOverridePin: (val: string) => void;
  showPinPassword: boolean;
  setShowPinPassword: (val: boolean) => void;
  isUpdatingPin: boolean;
  onChangeOverridePin: () => void;
}

export const ProfileManagerPinCard: React.FC<ProfileManagerPinCardProps> = ({
  pinPasswordVerify,
  setPinPasswordVerify,
  newOverridePin,
  setNewOverridePin,
  confirmOverridePin,
  setConfirmOverridePin,
  showPinPassword,
  setShowPinPassword,
  isUpdatingPin,
  onChangeOverridePin,
}) => {
  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs">
      <View className="flex-row items-center justify-between border-b border-stone-100 pb-3 mb-4">
        <View className="flex-row items-center gap-2.5">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200">
            <KeyRound size={20} color="#be123c" />
          </View>
          <View>
            <Text className="text-lg font-bold text-stone-900">Floor Manager Override PIN</Text>
            <Text className="text-base text-stone-500">
              4-Digit Code for Floor POS Authorizations
            </Text>
          </View>
        </View>
      </View>

      <View className="rounded-xl bg-amber-50/70 border border-amber-200 p-3.5 mb-4">
        <View className="flex-row items-start gap-2.5">
          <AlertTriangle size={18} color="#b45309" className="shrink-0 mt-0.5" />
          <Text className="text-base text-amber-900 leading-relaxed flex-1">
            This 4-digit PIN is strictly for quick floor operations: item voids after kitchen prep
            and Daytime/Event mode switches. It does <Text className="font-bold">NOT</Text> grant
            access to this Back-Office console.
          </Text>
        </View>
      </View>

      <View className="space-y-3.5">
        <View>
          <Text className="text-base font-bold text-stone-700 mb-1.5">
            Verify Current Admin Password
          </Text>
          <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 h-[50px]">
            <TextInput
              value={pinPasswordVerify}
              onChangeText={setPinPasswordVerify}
              placeholder="Enter admin password to authorize"
              placeholderTextColor="#a8a29e"
              secureTextEntry={!showPinPassword}
              autoCapitalize="none"
              style={{ fontSize: 16, flex: 1, color: '#1c1917' }}
            />
            <Pressable onPress={() => setShowPinPassword(!showPinPassword)} className="p-2">
              {showPinPassword ? (
                <EyeOff size={18} color="#78716c" />
              ) : (
                <Eye size={18} color="#a8a29e" />
              )}
            </Pressable>
          </View>
        </View>

        <View className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <View>
            <Text className="text-base font-bold text-stone-700 mb-1.5">
              New 4-Digit Override PIN
            </Text>
            <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 h-[50px]">
              <TextInput
                value={newOverridePin}
                onChangeText={(v) => setNewOverridePin(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="4 digits (e.g. 9999)"
                placeholderTextColor="#a8a29e"
                keyboardType="number-pad"
                maxLength={4}
                style={{
                  fontSize: 16,
                  flex: 1,
                  color: '#1c1917',
                  fontVariant: ['tabular-nums'],
                }}
              />
            </View>
          </View>

          <View>
            <Text className="text-base font-bold text-stone-700 mb-1.5">Confirm New PIN</Text>
            <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 h-[50px]">
              <TextInput
                value={confirmOverridePin}
                onChangeText={(v) => setConfirmOverridePin(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="Re-enter 4 digits"
                placeholderTextColor="#a8a29e"
                keyboardType="number-pad"
                maxLength={4}
                style={{
                  fontSize: 16,
                  flex: 1,
                  color: '#1c1917',
                  fontVariant: ['tabular-nums'],
                }}
              />
            </View>
          </View>
        </View>

        <View className="pt-2">
          <Pressable
            onPress={onChangeOverridePin}
            disabled={isUpdatingPin || !pinPasswordVerify || newOverridePin.length !== 4}
            className={`min-h-[48px] items-center justify-center rounded-xl bg-[#800020] px-6 active:opacity-90 shadow-xs ${
              isUpdatingPin || !pinPasswordVerify || newOverridePin.length !== 4 ? 'opacity-50' : ''
            }`}
          >
            <Text className="text-base font-bold text-white">
              {isUpdatingPin ? 'Rotating Override PIN...' : 'Save New Override PIN'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
