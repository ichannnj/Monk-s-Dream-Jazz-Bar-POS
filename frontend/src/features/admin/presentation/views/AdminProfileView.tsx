import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Shield } from 'lucide-react-native';
import { useAuthStore } from '@/features/auth';
import { toast } from '@/features/shared/toast/useToastStore';
import { posApi } from '@/features/shared/infrastructure/api';
import { realtimeGateway } from '@/features/shared';
import { ProfileIdentityCard } from './profile/ProfileIdentityCard';
import { ProfilePasswordCard } from './profile/ProfilePasswordCard';
import { ProfileManagerPinCard } from './profile/ProfileManagerPinCard';
import { ProfileAuditSnapshotCard } from './profile/ProfileAuditSnapshotCard';

export const AdminProfileView: React.FC = () => {
  const { currentUser, updateCurrentUser, logout } = useAuthStore();

  // 1. Personal Profile State
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [jobTitle, setJobTitle] = useState(currentUser?.jobTitle || 'General Manager');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

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

  const staffInitials =
    (displayName || currentUser?.displayName || 'Admin')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AD';

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
        <ProfileIdentityCard
          displayName={displayName}
          setDisplayName={setDisplayName}
          username={username}
          setUsername={setUsername}
          jobTitle={jobTitle}
          setJobTitle={setJobTitle}
          email={email}
          setEmail={setEmail}
          phone={phone}
          setPhone={setPhone}
          staffInitials={staffInitials}
          isUpdatingProfile={isUpdatingProfile}
          onSaveProfile={handleSaveProfile}
        />

        <ProfilePasswordCard
          currentPassword={currentPassword}
          setCurrentPassword={setCurrentPassword}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          showCurrentPassword={showCurrentPassword}
          setShowCurrentPassword={setShowCurrentPassword}
          showNewPassword={showNewPassword}
          setShowNewPassword={setShowNewPassword}
          isUpdatingPassword={isUpdatingPassword}
          onChangePassword={handleChangePassword}
        />

        <ProfileManagerPinCard
          pinPasswordVerify={pinPasswordVerify}
          setPinPasswordVerify={setPinPasswordVerify}
          newOverridePin={newOverridePin}
          setNewOverridePin={setNewOverridePin}
          confirmOverridePin={confirmOverridePin}
          setConfirmOverridePin={setConfirmOverridePin}
          showPinPassword={showPinPassword}
          setShowPinPassword={setShowPinPassword}
          isUpdatingPin={isUpdatingPin}
          onChangeOverridePin={handleChangeOverridePin}
        />

        <ProfileAuditSnapshotCard
          lastLoginAt={currentUser?.lastLoginAt}
          passwordUpdatedAt={currentUser?.passwordUpdatedAt}
          pinUpdatedAt={currentUser?.pinUpdatedAt}
          onLogout={logout}
        />
      </View>
    </ScrollView>
  );
};
