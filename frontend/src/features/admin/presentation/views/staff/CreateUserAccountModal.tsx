import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import {
  UserCheck,
  Shield,
  KeyRound,
  Mail,
  Phone,
  Briefcase,
  AtSign,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type StaffRoleType } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';

interface CreateUserAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const POS_SYSTEM_ROLES: { value: StaffRoleType; label: string; desc: string }[] = [
  {
    value: 'waiter',
    label: 'Waiter & FOH Server',
    desc: 'Floor service, expediting & firing chits',
  },
  { value: 'cashier', label: 'Cashier', desc: 'Billing, tender settlement & drawer' },
  { value: 'station_bar', label: 'Bar Station', desc: 'Cocktail & beverage prep queue' },
  { value: 'station_cafe', label: 'Cafe Station', desc: 'Espresso, coffee & pastry queue' },
  { value: 'station_food', label: 'Kitchen Station', desc: 'Food & culinary prep queue' },
  { value: 'admin', label: 'Manager / Admin', desc: 'Full back-office & POS oversight' },
];

export const CreateUserAccountModal: React.FC<CreateUserAccountModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<StaffRoleType>('waiter');
  const [jobTitle, setJobTitle] = useState('');
  const [baseDailyRate, setBaseDailyRate] = useState('645.00');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setDisplayName('');
      setUsername('');
      setPin('');
      setRole('waiter');
      setJobTitle('');
      setBaseDailyRate('645.00');
      setPhone('');
      setEmail('');
      setAdminPassword('');
      setShowAdminPassword(false);
    }
  }, [visible]);

  const handleDisplayNameChange = (val: string) => {
    setDisplayName(val);
    // Auto-suggest username if username hasn't been manually customized heavily
    if (
      !username ||
      username ===
        displayName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
    ) {
      const suggested = val
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      setUsername(suggested);
    }
  };

  const handlePinChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 4);
    setPin(digitsOnly);
  };

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast.error('Full display name is required', { title: 'Validation Error' });
      return;
    }
    if (!username.trim()) {
      toast.error('Staff ID / Username is required for POS login', { title: 'Validation Error' });
      return;
    }
    if (!/^\d{4}$/.test(pin.trim())) {
      toast.error('A 4-digit numeric PIN is required for POS login', {
        title: 'Invalid PIN',
      });
      return;
    }

    if (role === 'admin' && adminPassword.length < 8) {
      toast.error('Admin accounts require an initial password of at least 8 characters', {
        title: 'Password Required',
      });
      return;
    }

    const parsedRate = role === 'admin' ? 0 : parseFloat(baseDailyRate);
    if (role !== 'admin' && (isNaN(parsedRate) || parsedRate < 0)) {
      toast.error('Please enter a valid daily shift rate', { title: 'Validation Error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.createStaffUser({
        display_name: displayName.trim(),
        username: username.trim(),
        pin: pin.trim(),
        role,
        job_title: jobTitle.trim() || (role === 'admin' ? 'Administrator' : null),
        base_daily_rate: role === 'admin' ? 0 : parsedRate,
        phone: phone.trim() || null,
        email: email.trim() || null,
        password: role === 'admin' ? adminPassword : null,
      });

      toast.success(
        `Created POS user account for ${displayName.trim()} (@${username.trim().toLowerCase()})`,
        { title: 'User Account Created' }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.message?.includes('duplicate key')
        ? 'That Staff ID / Username is already taken. Please choose another.'
        : err?.message || 'Failed to create staff user account';
      toast.error(msg, { title: 'Creation Failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title="Create POS Staff User Account"
      subtitle="Grant app login credentials (Username + 4-digit PIN) and assign a terminal role"
      icon={<UserCheck size={20} color="#800020" />}
      size="lg"
      footer={
        <>
          <Pressable
            onPress={onClose}
            disabled={isSubmitting}
            className="min-h-[48px] px-5 items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50"
          >
            <Text className="text-base font-bold text-stone-600">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#800020] active:opacity-90 ${
              isSubmitting ? 'opacity-50' : ''
            }`}
          >
            <Text className="text-base font-bold text-white">
              {isSubmitting ? 'Creating Account...' : 'Create User Account'}
            </Text>
          </Pressable>
        </>
      }
    >
      <View className="space-y-4">
        {/* Identity & Login Credentials Banner */}
        <View className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
          <Text className="text-sm font-bold text-emerald-900">
            POS App User (Workflow Enabled)
          </Text>
          <Text className="mt-0.5 text-sm text-emerald-800">
            This staff member will be able to sign into POS terminals using their Staff ID and
            4-digit security PIN.
          </Text>
        </View>

        <View className="flex-col sm:flex-row gap-4">
          <View className="flex-1">
            <AdminInput
              label="Full Display Name"
              required
              placeholder="e.g. Dizzy (Cashier) or Dizzy Gillespie"
              value={displayName}
              onChangeText={handleDisplayNameChange}
            />
          </View>
          <View className="flex-1">
            <AdminInput
              label="Staff ID / Login Username"
              required
              autoCapitalize="none"
              placeholder="e.g. dizzy_cashier"
              value={username}
              onChangeText={(val) => setUsername(val.toLowerCase().replace(/\s+/g, '_'))}
              leftElement={<AtSign size={16} color="#78716c" />}
              helperText="Lowercase letters, numbers, and underscores"
            />
          </View>
        </View>

        <View className="flex-col sm:flex-row gap-4">
          <View className="flex-1">
            <AdminInput
              label={role === 'admin' ? '4-Digit Manager Override PIN' : '4-Digit Security PIN'}
              required
              keyboardType="number-pad"
              maxLength={4}
              placeholder="e.g. 4321"
              value={pin}
              onChangeText={handlePinChange}
              leftElement={<KeyRound size={16} color="#800020" />}
              helperText={
                role === 'admin'
                  ? `${pin.length}/4 digits — For Floor POS overrides & supervisor approvals`
                  : `${pin.length}/4 digits — Required for POS login`
              }
            />
          </View>
          <View className="flex-1">
            {role === 'admin' ? (
              <View className="rounded-xl border border-stone-200 bg-stone-50 p-3 justify-center min-h-[50px]">
                <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Payroll Status
                </Text>
                <Text className="text-sm font-bold text-stone-900 mt-0.5">
                  Exempt · Salary / Management
                </Text>
                <Text className="text-xs text-stone-500 mt-0.5">
                  Admin accounts do not receive daily shift payroll
                </Text>
              </View>
            ) : (
              <AdminNumberInput
                label="Base Daily Shift Rate"
                mode="currency"
                value={baseDailyRate}
                onChangeText={setBaseDailyRate}
                placeholder="645.00"
                helperText="PH Minimum Wage baseline: ₱645.00 / shift"
              />
            )}
          </View>
        </View>

        {role === 'admin' && (
          <View className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2">
            <View className="flex-row items-center gap-2">
              <Lock size={16} color="#b45309" />
              <Text className="text-base font-bold text-amber-900">
                Initial Administrator Password <Text className="text-rose-600 font-bold">*</Text>
              </Text>
            </View>
            <View className="flex-row items-center rounded-xl border border-amber-300 bg-white px-3.5 h-[50px]">
              <TextInput
                value={adminPassword}
                onChangeText={setAdminPassword}
                placeholder="Minimum 8 characters (e.g. MonksDream9999!)"
                placeholderTextColor="#a8a29e"
                secureTextEntry={!showAdminPassword}
                autoCapitalize="none"
                style={{ fontSize: 16, flex: 1, color: '#1c1917' }}
              />
              <Pressable onPress={() => setShowAdminPassword(!showAdminPassword)} className="p-2">
                {showAdminPassword ? (
                  <EyeOff size={18} color="#78716c" />
                ) : (
                  <Eye size={18} color="#a8a29e" />
                )}
              </Pressable>
            </View>
            <Text className="text-sm font-medium text-amber-800">
              Required for signing in to the Administrator Back-Office console. Stored as Blowfish
              bcrypt hash.
            </Text>
          </View>
        )}

        {/* System Role Selector */}
        <View>
          <View className="mb-2 flex-row items-center">
            <Shield size={16} color="#44403c" />
            <Text className="ml-1.5 text-base font-semibold text-stone-800">
              System Terminal Role <Text className="text-rose-600 font-bold">*</Text>
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2.5">
            {POS_SYSTEM_ROLES.map((item) => {
              const isSelected = role === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setRole(item.value)}
                  className={`min-w-[150px] flex-1 rounded-xl border p-3 ${
                    isSelected
                      ? 'border-[#800020] bg-[#800020]/5'
                      : 'border-stone-200 bg-stone-50/60 active:bg-stone-100'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-sm font-bold ${
                        isSelected ? 'text-[#800020]' : 'text-stone-900'
                      }`}
                    >
                      {item.label}
                    </Text>
                    <View
                      className={`h-4 w-4 rounded-full border items-center justify-center ${
                        isSelected ? 'border-[#800020] bg-[#800020]' : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isSelected && <View className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </View>
                  </View>
                  <Text className="mt-1 text-xs text-stone-500">{item.desc}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Custom Job Title & Contact Info */}
        <AdminInput
          label="Custom Job Title / Designation (Optional)"
          placeholder="e.g. Lead Mixologist, Senior Floor Server, Night Manager"
          value={jobTitle}
          onChangeText={setJobTitle}
          leftElement={<Briefcase size={16} color="#78716c" />}
        />

        <View className="flex-col sm:flex-row gap-4">
          <View className="flex-1">
            <AdminInput
              label="Contact Phone"
              placeholder="+63 917 000 0000"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              leftElement={<Phone size={16} color="#78716c" />}
            />
          </View>
          <View className="flex-1">
            <AdminInput
              label="Email Address"
              placeholder="staff@monksdream.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              leftElement={<Mail size={16} color="#78716c" />}
            />
          </View>
        </View>
      </View>
    </AdminModal>
  );
};
