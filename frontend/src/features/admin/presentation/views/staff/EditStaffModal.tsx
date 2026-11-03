import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Edit3, Shield, Briefcase, Phone, Mail, AtSign } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type StaffMemberAdmin, type StaffRoleType } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';
import { POS_SYSTEM_ROLES } from './CreateUserAccountModal';
import { VENUE_STAFF_PRESETS } from './CreateNonWorkflowStaffModal';

interface EditStaffModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staff: StaffMemberAdmin | null;
}

export const EditStaffModal: React.FC<EditStaffModalProps> = ({
  visible,
  onClose,
  onSuccess,
  staff,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<StaffRoleType>('waiter');
  const [jobTitle, setJobTitle] = useState('');
  const [baseDailyRate, setBaseDailyRate] = useState('645.00');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (staff && visible) {
      setDisplayName(staff.display_name || '');
      setUsername(staff.username || '');
      setRole((staff.role as StaffRoleType) || 'waiter');
      setJobTitle(staff.job_title || '');
      setBaseDailyRate(Number(staff.base_daily_rate ?? 645).toFixed(2));
      setPhone(staff.phone || '');
      setEmail(staff.email || '');
      setIsActive(staff.is_active ?? true);
    }
  }, [staff, visible]);

  const handleSubmit = async () => {
    if (!staff) return;
    if (!displayName.trim()) {
      toast.error('Full display name is required', { title: 'Validation Error' });
      return;
    }

    const parsedRate = parseFloat(baseDailyRate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      toast.error('Please enter a valid daily shift rate', { title: 'Validation Error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.updateStaffMember(staff.id, {
        display_name: displayName.trim(),
        username: username.trim() || staff.username,
        role: staff.is_workflow_staff ? role : (staff.role as StaffRoleType),
        job_title: jobTitle.trim() || null,
        base_daily_rate: parsedRate,
        phone: phone.trim() || null,
        email: email.trim() || null,
        is_active: isActive,
      });

      toast.success(`Updated profile for ${displayName.trim()}`, {
        title: 'Staff Profile Saved',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update staff profile', {
        title: 'Update Error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!staff) return null;

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title={`Edit Profile: ${staff.display_name}`}
      subtitle={
        staff.is_workflow_staff
          ? 'POS App User Account — Edit role, rate, and contact details'
          : 'Venue Personnel (Non-User) — Edit designation, rate, and contact details'
      }
      icon={<Edit3 size={20} color="#800020" />}
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>
        </>
      }
    >
      <View className="space-y-4">
        <View className="flex-col sm:flex-row gap-4">
          <View className="flex-1">
            <AdminInput
              label="Full Display Name"
              required
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>
          <View className="flex-1">
            <AdminInput
              label={staff.is_workflow_staff ? 'Staff ID / Username' : 'Staff Reference ID'}
              required
              autoCapitalize="none"
              value={username}
              onChangeText={(val) => setUsername(val.toLowerCase().replace(/\s+/g, '_'))}
              leftElement={<AtSign size={16} color="#78716c" />}
            />
          </View>
        </View>

        {staff.is_workflow_staff ? (
          <View>
            <View className="mb-2 flex-row items-center">
              <Shield size={16} color="#44403c" />
              <Text className="ml-1.5 text-base font-semibold text-stone-800">
                System Terminal Role
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {POS_SYSTEM_ROLES.map((item) => {
                const isSelected = role === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setRole(item.value)}
                    className={`rounded-xl border px-3.5 py-2.5 ${
                      isSelected
                        ? 'border-[#800020] bg-[#800020]/10'
                        : 'border-stone-200 bg-stone-50 active:bg-stone-100'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        isSelected ? 'text-[#800020]' : 'text-stone-700'
                      }`}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View>
            <Text className="mb-2 text-sm font-semibold text-stone-700">
              Quick Select Venue Designation
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {VENUE_STAFF_PRESETS.map((preset) => {
                const isSelected = jobTitle.toLowerCase() === preset.toLowerCase();
                return (
                  <Pressable
                    key={preset}
                    onPress={() => setJobTitle(preset)}
                    className={`rounded-xl border px-3 py-1.5 ${
                      isSelected
                        ? 'border-[#800020] bg-[#800020]'
                        : 'border-stone-200 bg-stone-100 active:bg-stone-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-white' : 'text-stone-700'
                      }`}
                    >
                      {preset}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View className="flex-col sm:flex-row gap-4">
          <View className="flex-1">
            <AdminInput
              label="Job Title / Designation"
              placeholder="e.g. Head Bartender, Dishwasher, Sound Tech"
              value={jobTitle}
              onChangeText={setJobTitle}
              leftElement={<Briefcase size={16} color="#78716c" />}
            />
          </View>
          <View className="flex-1">
            <AdminNumberInput
              label="Base Daily Shift Rate"
              mode="currency"
              value={baseDailyRate}
              onChangeText={setBaseDailyRate}
              helperText="Adjustable per role (PH Min Wage baseline: ₱645.00)"
            />
          </View>
        </View>

        {/* Role-Based Base Pay Quick Tiers */}
        <View>
          <Text className="mb-1.5 text-xs font-semibold text-stone-500">
            Quick Role Base Pay Tiers
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {[
              { label: '₱645 (Min Wage)', value: '645.00' },
              { label: '₱700 (Barista/Floor)', value: '700.00' },
              { label: '₱750 (Cashier)', value: '750.00' },
              { label: '₱850 (Bartender/Tech)', value: '850.00' },
              { label: '₱1,000 (Head Chef)', value: '1000.00' },
              { label: '₱1,200 (Manager)', value: '1200.00' },
            ].map((tier) => {
              const isSelected = parseFloat(baseDailyRate) === parseFloat(tier.value);
              return (
                <Pressable
                  key={tier.value}
                  onPress={() => setBaseDailyRate(tier.value)}
                  className={`rounded-xl border px-3 py-1.5 ${
                    isSelected
                      ? 'border-[#800020] bg-[#800020]'
                      : 'border-stone-200 bg-stone-100 active:bg-stone-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-stone-700'}`}
                  >
                    {tier.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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

        {/* Active / Inactive Toggle */}
        <View className="flex-row items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3.5">
          <View className="flex-1 pr-4">
            <Text className="text-base font-bold text-stone-900">Active Roster Status</Text>
            <Text className="text-xs text-stone-500">
              Inactive staff are hidden from active shift logins while preserving historical payroll
              records.
            </Text>
          </View>
          <Pressable
            onPress={() => setIsActive(!isActive)}
            className={`rounded-xl px-4 py-2.5 ${isActive ? 'bg-emerald-600' : 'bg-stone-300'}`}
          >
            <Text className="text-sm font-bold text-white">{isActive ? 'Active' : 'Inactive'}</Text>
          </Pressable>
        </View>
      </View>
    </AdminModal>
  );
};
