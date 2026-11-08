import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react-native';

interface ProfilePasswordCardProps {
  currentPassword: string;
  setCurrentPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  showCurrentPassword: boolean;
  setShowCurrentPassword: (val: boolean) => void;
  showNewPassword: boolean;
  setShowNewPassword: (val: boolean) => void;
  isUpdatingPassword: boolean;
  onChangePassword: () => void;
}

export const ProfilePasswordCard: React.FC<ProfilePasswordCardProps> = ({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  isUpdatingPassword,
  onChangePassword,
}) => {
  const passwordHasLength = newPassword.length >= 8;
  const passwordHasUpper = /[A-Z]/.test(newPassword);
  const passwordHasNumber = /[0-9]/.test(newPassword);
  const passwordHasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const strengthScore = [
    passwordHasLength,
    passwordHasUpper,
    passwordHasNumber,
    passwordHasSymbol,
  ].filter(Boolean).length;

  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmitPassword =
    !isUpdatingPassword &&
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs">
      <View className="flex-row items-center justify-between border-b border-stone-100 pb-3 mb-4">
        <View className="flex-row items-center gap-2.5">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-200">
            <Lock size={20} color="#b45309" />
          </View>
          <View>
            <Text className="text-lg font-bold text-stone-900">Change Admin Password</Text>
            <Text className="text-base text-stone-500">Back-Office Portal Authentication</Text>
          </View>
        </View>
      </View>

      <View className="space-y-3.5">
        <View>
          <Text className="text-base font-bold text-stone-700 mb-1.5">Current Password</Text>
          <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 h-[50px]">
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor="#a8a29e"
              secureTextEntry={!showCurrentPassword}
              autoCapitalize="none"
              style={{ fontSize: 16, flex: 1, color: '#1c1917' }}
            />
            <Pressable onPress={() => setShowCurrentPassword(!showCurrentPassword)} className="p-2">
              {showCurrentPassword ? (
                <EyeOff size={18} color="#78716c" />
              ) : (
                <Eye size={18} color="#a8a29e" />
              )}
            </Pressable>
          </View>
        </View>

        <View>
          <Text className="text-base font-bold text-stone-700 mb-1.5">New Password</Text>
          <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 h-[50px]">
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimum 8 characters"
              placeholderTextColor="#a8a29e"
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              style={{ fontSize: 16, flex: 1, color: '#1c1917' }}
            />
            <Pressable onPress={() => setShowNewPassword(!showNewPassword)} className="p-2">
              {showNewPassword ? (
                <EyeOff size={18} color="#78716c" />
              ) : (
                <Eye size={18} color="#a8a29e" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Live Password Strength Meter */}
        {newPassword.length > 0 && (
          <View className="rounded-xl bg-stone-50 p-3 border border-stone-200/60">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-semibold text-stone-600">Password Strength</Text>
              <Text
                className={`text-base font-bold ${
                  strengthScore >= 4
                    ? 'text-emerald-700'
                    : strengthScore >= 2
                      ? 'text-amber-700'
                      : 'text-rose-700'
                }`}
              >
                {strengthScore >= 4 ? 'Strong' : strengthScore >= 2 ? 'Moderate' : 'Weak'}
              </Text>
            </View>
            <View className="flex-row gap-1.5 mb-3">
              {[1, 2, 3, 4].map((step) => (
                <View
                  key={step}
                  className={`h-1.5 flex-1 rounded-full ${
                    strengthScore >= step
                      ? strengthScore >= 4
                        ? 'bg-emerald-500'
                        : strengthScore >= 2
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      : 'bg-stone-200'
                  }`}
                />
              ))}
            </View>

            <View className="flex-row flex-wrap gap-2">
              <View className="flex-row items-center gap-1">
                <CheckCircle2 size={14} color={passwordHasLength ? '#15803d' : '#a8a29e'} />
                <Text
                  className={`text-base ${passwordHasLength ? 'text-stone-800 font-bold' : 'text-stone-400'}`}
                >
                  8+ chars
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <CheckCircle2 size={14} color={passwordHasUpper ? '#15803d' : '#a8a29e'} />
                <Text
                  className={`text-base ${passwordHasUpper ? 'text-stone-800 font-bold' : 'text-stone-400'}`}
                >
                  Uppercase
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <CheckCircle2 size={14} color={passwordHasNumber ? '#15803d' : '#a8a29e'} />
                <Text
                  className={`text-base ${passwordHasNumber ? 'text-stone-800 font-bold' : 'text-stone-400'}`}
                >
                  Number
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <CheckCircle2 size={14} color={passwordHasSymbol ? '#15803d' : '#a8a29e'} />
                <Text
                  className={`text-base ${passwordHasSymbol ? 'text-stone-800 font-bold' : 'text-stone-400'}`}
                >
                  Symbol
                </Text>
              </View>
            </View>
          </View>
        )}

        <View>
          <Text className="text-base font-bold text-stone-700 mb-1.5">Confirm New Password</Text>
          <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 h-[50px]">
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor="#a8a29e"
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              style={{ fontSize: 16, flex: 1, color: '#1c1917' }}
            />
          </View>
          {passwordMismatch && (
            <Text className="mt-1 text-xs font-semibold text-rose-600">Passwords do not match</Text>
          )}
        </View>

        <View className="pt-2">
          <Pressable
            onPress={onChangePassword}
            disabled={!canSubmitPassword}
            className={`min-h-[48px] items-center justify-center rounded-xl bg-stone-900 px-6 active:opacity-90 shadow-xs ${
              !canSubmitPassword ? 'opacity-50' : ''
            }`}
          >
            <Text className="text-base font-bold text-white">
              {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
