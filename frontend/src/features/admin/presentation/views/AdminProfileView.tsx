import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import {
  User,
  Shield,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Briefcase,
  AtSign,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  LogOut,
  Calendar,
  Sparkles,
} from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
import { toast } from '@/features/shared/toast/useToastStore';
import { posApi } from '@/features/shared/infrastructure/api';
import { realtimeGateway } from '@/features/shared';

export const AdminProfileView: React.FC = () => {
  const { currentUser, updateCurrentUser, logout } = useAuthStore();

  // 1. Personal Profile State
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [jobTitle, setJobTitle] = useState(currentUser?.jobTitle || 'General Manager');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Sync form inputs with currentUser whenever it changes/hydrates
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setUsername(currentUser.username || '');
      setJobTitle(currentUser.jobTitle || 'General Manager');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  // 2. Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 3. Manager Override PIN State
  const [pinPasswordVerify, setPinPasswordVerify] = useState('');
  const [newOverridePin, setNewOverridePin] = useState('');
  const [confirmOverridePin, setConfirmOverridePin] = useState('');
  const [showPinPassword, setShowPinPassword] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // Password Strength Checklist
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

  const staffInitials =
    (displayName || currentUser?.displayName || 'Admin')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AD';

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

  // Submit Personal Profile Update
  const handleSaveProfile = async () => {
    if (!currentUser?.id) return;
    if (!displayName.trim()) {
      toast.warning('Display name cannot be empty.');
      return;
    }
    const cleanUsername = username.trim().toLowerCase().replace(/^@+/, '').replace(/\s+/g, '_');
    if (!cleanUsername) {
      toast.warning('Username cannot be empty.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await posApi.updateAdminProfile({
        userId: currentUser.id,
        displayName: displayName.trim(),
        username: cleanUsername,
        jobTitle: jobTitle.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      if (res && res.success && res.user) {
        updateCurrentUser({
          displayName: res.user.displayName,
          username: res.user.username,
          jobTitle: res.user.jobTitle,
          email: res.user.email,
          phone: res.user.phone,
        });
        setUsername(res.user.username);
        setDisplayName(res.user.displayName);
        realtimeGateway.broadcastPosSync('staff_member_updated');
        toast.success('Admin profile identity updated successfully.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update admin profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Submit Password Change
  const handleChangePassword = async () => {
    if (!currentUser?.id) return;
    if (!currentPassword) {
      toast.warning('Please enter your current admin password.');
      return;
    }
    if (newPassword.length < 8) {
      toast.warning('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning('New password and confirmation do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await posApi.changeAdminPassword(currentUser.id, currentPassword, newPassword);
      if (res && res.success) {
        updateCurrentUser({
          passwordUpdatedAt: res.passwordUpdatedAt || new Date().toISOString(),
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        realtimeGateway.broadcastPosSync('staff_password_reset');
        toast.success(
          'Admin password updated successfully. Stored as bcrypt Blowfish hash ($2a$10$).'
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update admin password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Submit Manager Override PIN Rotation
  const handleChangeOverridePin = async () => {
    if (!currentUser?.id) return;
    if (!pinPasswordVerify) {
      toast.warning('Please verify your current admin password to rotate override PIN.');
      return;
    }
    if (!/^\d{4}$/.test(newOverridePin.trim())) {
      toast.warning('New Floor Override PIN must be exactly 4 numeric digits.');
      return;
    }
    if (newOverridePin !== confirmOverridePin) {
      toast.warning('New Override PIN and confirmation do not match.');
      return;
    }

    setIsUpdatingPin(true);
    try {
      const res = await posApi.changeAdminOverridePin(
        currentUser.id,
        pinPasswordVerify,
        newOverridePin.trim()
      );
      if (res && res.success) {
        updateCurrentUser({
          pinUpdatedAt: res.pinUpdatedAt || new Date().toISOString(),
        });
        setPinPasswordVerify('');
        setNewOverridePin('');
        setConfirmOverridePin('');
        realtimeGateway.broadcastPosSync('staff_pin_reset');
        toast.success('Floor Manager Override PIN rotated successfully. Stored as bcrypt hash.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to rotate floor override PIN.');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-[#fcf9f9] p-4 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      {/* View Header */}
      <View className="mb-6">
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#800020] shadow-sm">
            <Shield size={24} color="#ffffff" />
          </View>
          <View>
            <Text className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              Admin Profile & Security
            </Text>
            <Text className="mt-0.5 text-base text-stone-500">
              Manage your back-office credentials, bcrypt password, and Floor POS override PIN.
            </Text>
          </View>
        </View>
      </View>

      {/* Responsive Grid: 2 Columns on Tablet/Desktop */}
      <View className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {/* CARD 1: Personal Profile Identity */}
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
                onPress={handleSaveProfile}
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

        {/* CARD 2: Password Security & Rotation */}
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
                <Pressable
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="p-2"
                >
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
              <Text className="text-base font-bold text-stone-700 mb-1.5">
                Confirm New Password
              </Text>
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
                <Text className="mt-1 text-xs font-semibold text-rose-600">
                  Passwords do not match
                </Text>
              )}
            </View>

            <View className="pt-2">
              <Pressable
                onPress={handleChangePassword}
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

        {/* CARD 3: Floor Manager Override PIN (4-Digit) */}
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
                This 4-digit PIN is strictly for quick floor operations: item voids after kitchen
                prep and Daytime/Event mode switches. It does <Text className="font-bold">NOT</Text>{' '}
                grant access to this Back-Office console.
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
                onPress={handleChangeOverridePin}
                disabled={isUpdatingPin || !pinPasswordVerify || newOverridePin.length !== 4}
                className={`min-h-[48px] items-center justify-center rounded-xl bg-[#800020] px-6 active:opacity-90 shadow-xs ${
                  isUpdatingPin || !pinPasswordVerify || newOverridePin.length !== 4
                    ? 'opacity-50'
                    : ''
                }`}
              >
                <Text className="text-base font-bold text-white">
                  {isUpdatingPin ? 'Rotating Override PIN...' : 'Save New Override PIN'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* CARD 4: Security & Session Audit Snapshot */}
        <View className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs flex-col justify-between">
          <View>
            <View className="flex-row items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <View className="flex-row items-center gap-2.5">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-stone-100 border border-stone-200">
                  <Sparkles size={20} color="#44403c" />
                </View>
                <View>
                  <Text className="text-lg font-bold text-stone-900">Security & Session Audit</Text>
                  <Text className="text-base text-stone-500">
                    Cryptographic Ledger & Access Trail
                  </Text>
                </View>
              </View>
            </View>

            <View className="space-y-3">
              <View className="flex-row items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                <View className="flex-row items-center gap-2.5">
                  <Calendar size={18} color="#78716c" />
                  <Text className="text-base font-semibold text-stone-700">
                    Last Successful Login
                  </Text>
                </View>
                <Text className="text-base font-bold text-stone-900">
                  {formatTimestamp(currentUser?.lastLoginAt)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                <View className="flex-row items-center gap-2.5">
                  <Lock size={18} color="#78716c" />
                  <Text className="text-base font-semibold text-stone-700">
                    Password Last Changed
                  </Text>
                </View>
                <Text className="text-base font-bold text-stone-900">
                  {formatTimestamp(currentUser?.passwordUpdatedAt)}
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
                  {formatTimestamp(currentUser?.pinUpdatedAt)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                <View className="flex-row items-center gap-2.5">
                  <Shield size={18} color="#15803d" />
                  <Text className="text-base font-semibold text-stone-700">
                    Encryption Standard
                  </Text>
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
                logout();
              }}
              className="min-h-[48px] flex-row items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-6 active:bg-rose-100"
            >
              <LogOut size={18} color="#be123c" className="mr-2" />
              <Text className="text-base font-bold text-rose-700">Sign Out of Admin Console</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
