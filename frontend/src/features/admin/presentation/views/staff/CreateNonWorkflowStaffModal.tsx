import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Users, Briefcase, Phone, Mail, Hash } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';
import { AdminNumberInput } from '../../components/AdminNumberInput';

interface CreateNonWorkflowStaffModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VENUE_STAFF_PRESETS = [
  'Dishwasher',
  'Security',
  'Cleaner',
  'Sound Tech',
  'Musician',
  'Barback',
  'Kitchen Prep',
];

export const CreateNonWorkflowStaffModal: React.FC<CreateNonWorkflowStaffModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('Dishwasher');
  const [staffIdCode, setStaffIdCode] = useState('');
  const [baseDailyRate, setBaseDailyRate] = useState('645.00');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setDisplayName('');
      setJobTitle('Dishwasher');
      setStaffIdCode('');
      setBaseDailyRate('645.00');
      setPhone('');
      setEmail('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast.error('Staff member full name is required', { title: 'Validation Error' });
      return;
    }
    if (!jobTitle.trim()) {
      toast.error('Job Title / Designation is required', { title: 'Validation Error' });
      return;
    }

    const parsedRate = parseFloat(baseDailyRate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      toast.error('Please enter a valid daily shift rate', { title: 'Validation Error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.createNonWorkflowStaff({
        display_name: displayName.trim(),
        job_title: jobTitle.trim(),
        username: staffIdCode.trim() || undefined,
        base_daily_rate: parsedRate,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });

      toast.success(`Added ${displayName.trim()} (${jobTitle.trim()}) to venue staff roster`, {
        title: 'Venue Staff Added',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.message?.includes('duplicate key')
        ? 'That Staff Reference ID is already used. Leave blank to auto-generate.'
        : err?.message || 'Failed to add venue staff member';
      toast.error(msg, { title: 'Error Adding Staff' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title="Add Venue Staff (Non-User of App)"
      subtitle="Register support, security, kitchen utility, or sound personnel for payroll & attendance"
      icon={<Users size={20} color="#6d28d9" />}
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
              {isSubmitting ? 'Saving...' : 'Add Staff Member'}
            </Text>
          </Pressable>
        </>
      }
    >
      <View className="space-y-4">
        {/* Non-User Info Banner */}
        <View className="rounded-xl border border-purple-200 bg-purple-50/70 p-3.5">
          <Text className="text-sm font-bold text-purple-900">
            Non-User Venue Personnel (No POS Login)
          </Text>
          <Text className="mt-0.5 text-sm text-purple-800">
            This staff member is included in daily shift payroll and discretionary bonuses, but
            cannot log into POS terminals and does not require a PIN.
          </Text>
        </View>

        <AdminInput
          label="Full Name"
          required
          placeholder="e.g. Art Blakey or Rosa Cruz"
          value={displayName}
          onChangeText={setDisplayName}
        />

        {/* Quick Preset Tags */}
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
                  className={`rounded-xl border px-3.5 py-2 ${
                    isSelected
                      ? 'border-[#800020] bg-[#800020] shadow-xs'
                      : 'border-stone-200 bg-stone-100 active:bg-stone-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-stone-700'}`}
                  >
                    {preset}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="flex-col sm:flex-row gap-4">
          <View className="flex-1">
            <AdminInput
              label="Job Title / Designation"
              required
              placeholder="e.g. Dishwasher, Bouncer, Sound Tech"
              value={jobTitle}
              onChangeText={setJobTitle}
              leftElement={<Briefcase size={16} color="#78716c" />}
              helperText="Select a preset above or type a custom job title"
            />
          </View>
          <View className="flex-1">
            <AdminNumberInput
              label="Base Daily Shift Rate"
              mode="currency"
              value={baseDailyRate}
              onChangeText={setBaseDailyRate}
              placeholder="645.00"
              helperText="PH Minimum Wage baseline: ₱645.00 / shift"
            />
          </View>
        </View>

        <View className="flex-col sm:flex-row gap-4">
          <View className="flex-1">
            <AdminInput
              label="Contact Phone (Optional)"
              placeholder="+63 917 000 0000"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              leftElement={<Phone size={16} color="#78716c" />}
            />
          </View>
          <View className="flex-1">
            <AdminInput
              label="Email Address (Optional)"
              placeholder="name@monksdream.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              leftElement={<Mail size={16} color="#78716c" />}
            />
          </View>
        </View>

        <AdminInput
          label="Staff Reference ID (Optional)"
          autoCapitalize="none"
          placeholder="Leave blank to auto-generate (e.g. staff_art_blakey_4821)"
          value={staffIdCode}
          onChangeText={(val) => setStaffIdCode(val.toLowerCase().replace(/\s+/g, '_'))}
          leftElement={<Hash size={16} color="#78716c" />}
          helperText="Internal roster identifier — automatically generated if left empty"
        />
      </View>
    </AdminModal>
  );
};
